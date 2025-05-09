import { db } from '../config/database.js';
import { asyncHandler, NotFoundError, ConflictError } from '../middlewares/errorHandler.js';
import noteCache from '../cache/noteCache.js';

/**
 * Create a new note
 */
export const createNote = asyncHandler(async (req, res) => {
  const { title, content } = req.body;
  const userId = req.user.id; // Get user ID from authenticated user
  
  // Create a new note with initial version 1
  const note = await db.Note.create({
    title,
    content,
    userId,
    version: 1,
    isDeleted: false
  });
  
  // Save version history
  await db.NoteVersion.create({
    noteId: note.id,
    title,
    content,
    version: 1,
    createdBy: userId
  });
  
  // Invalidate user's notes cache since we added a new note
  await noteCache.invalidateUserNotes(userId);
  
  return res.status(201).json(note);
});

/**
 * Get all notes for authenticated user
 */
export const getAllNotes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  
  // Try to get from cache first
  const cachedNotes = await noteCache.getUserNotes(userId);
  if (cachedNotes) {
    return res.json(cachedNotes);
  }
  
  // If not in cache, get notes from database
  const notes = await db.Note.findAll({
    where: {
      userId,
      isDeleted: false
    },
    order: [['updatedAt', 'DESC']]
  });
  
  // Store in cache for future requests
  await noteCache.cacheUserNotes(userId, notes);
  
  return res.json(notes);
});

/**
 * Get a specific note by ID
 */
export const getNoteById = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  
  // Try to get from cache first
  const cachedNote = await noteCache.getNote(noteId);
  if (cachedNote && cachedNote.userId === userId && !cachedNote.isDeleted) {
    return res.json(cachedNote);
  }
  
  // If not in cache, get note from database
  const note = await db.Note.findOne({
    where: {
      id: noteId,
      userId,
      isDeleted: false
    }
  });
  
  if (!note) {
    throw new NotFoundError('Note not found');
  }

  // Store in cache for future requests
  await noteCache.cacheNote(note);

  return res.json(note);
});

/**
 * Get note versions
 */
export const getNoteVersions = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  
  // Try to get versions from cache first
  const cachedVersions = await noteCache.getNoteVersions(noteId);
  if (cachedVersions) {
    // Still need to verify the note belongs to the user
    const cachedNote = await noteCache.getNote(noteId);
    if (cachedNote && cachedNote.userId === userId) {
      return res.json(cachedVersions);
    }
  }
  
  // Check if note belongs to user
  const note = await db.Note.findOne({
    where: {
      id: noteId,
      userId
    }
  });
  
  if (!note) {
    throw new NotFoundError('Note not found');
  }
  
  // Get all versions of the note
  const versions = await db.NoteVersion.findAll({
    where: {
      noteId
    },
    order: [['version', 'DESC']]
  });
  
  // Cache note and versions for future requests
  await Promise.all([
    noteCache.cacheNote(note),
    noteCache.cacheNoteVersions(noteId, versions)
  ]);
  
  return res.json(versions);
});

/**
 * Revert to a specific version
 */
export const revertToVersion = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const versionNumber = req.params.version;
  const userId = req.user.id;
  
  // Start a transaction
  const transaction = await db.sequelize.transaction();
  
  try {
    // Check if note belongs to user
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId,
        isDeleted: false
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Get the version to revert to
    const versionToRevert = await db.NoteVersion.findOne({
      where: {
        noteId,
        version: versionNumber
      },
      transaction
    });
    
    if (!versionToRevert) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Version not found' });
    }
    
    // Increment the current version
    const newVersion = note.version + 1;
    
    // Update the note with contents from the old version
    await note.update({
      title: versionToRevert.title,
      content: versionToRevert.content,
      version: newVersion
    }, { transaction });
    
    // Create a new version entry
    await db.NoteVersion.create({
      noteId,
      title: versionToRevert.title,
      content: versionToRevert.content,
      version: newVersion,
      createdBy: userId,
      revertedFrom: versionNumber
    }, { transaction });
    
    await transaction.commit();
    
    // Invalidate all related caches
    await noteCache.invalidateAllNoteCache(noteId, userId);
    
    return res.json({
      message: `Successfully reverted to version ${versionNumber}`,
      note
    });
  } catch (error) {
    // Only roll back if the transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
});

/**
 * Update a note
 */
export const updateNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  const { title, content, version: clientVersion } = req.body;
  
  // Start a transaction
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get the note with a lock for update
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId,
        isDeleted: false
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check for version conflict (optimistic locking)
    if (parseInt(clientVersion) !== note.version) {
      // Fetch the current server version's data to provide to the client
      const currentVersion = await db.NoteVersion.findOne({
        where: {
          noteId,
          version: note.version
        },
        transaction
      });
      
      await transaction.rollback();
      return res.status(409).json({
        error: 'Version conflict. The note has been modified since you last retrieved it.',
        clientVersion: parseInt(clientVersion),
        serverVersion: note.version,
        serverData: {
          title: note.title,
          content: note.content,
          updatedAt: note.updatedAt
        },
        // Include information about who modified it last if available
        lastModifiedBy: currentVersion ? currentVersion.createdBy : null,
        // Provide resolution endpoint URL
        resolutionEndpoint: `/notes/${noteId}/resolve-conflict`
      });
    }
    
    // Increment version and update note
    const newVersion = note.version + 1;
    
    await note.update({
      title,
      content,
      version: newVersion
    }, { transaction });
    
    // Save version history
    await db.NoteVersion.create({
      noteId,
      title,
      content,
      version: newVersion,
      createdBy: userId
    }, { transaction });
    
    await transaction.commit();
    
    // Invalidate all related caches
    await noteCache.invalidateAllNoteCache(noteId, userId);
    
    return res.json(note);
  } catch (error) {
    // Only roll back if the transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
});

/**
 * Search notes by keywords
 */
export const searchNotes = asyncHandler(async (req, res) => {
  const userId = req.user.id;
  const { q: searchQuery } = req.query;
  
  // Try to get from cache first
  const cachedResults = await noteCache.getSearchResults(userId, searchQuery);
  if (cachedResults) {
    return res.json(cachedResults);
  }
  
  // Use different search strategies based on environment
  let searchResults;
  
  if (process.env.NODE_ENV === 'test') {
    // For testing (SQLite): Use basic LIKE search that works with SQLite
    searchResults = await db.Note.findAll({
      where: {
        userId,
        isDeleted: false,
        [db.Sequelize.Op.or]: [
          { title: { [db.Sequelize.Op.like]: `%${searchQuery}%` } },
          { content: { [db.Sequelize.Op.like]: `%${searchQuery}%` } }
        ]
      }
    });
  } else {
    // For production (MySQL): Use FULLTEXT search for better performance
    searchResults = await db.sequelize.query(
      `SELECT * FROM Notes 
      WHERE userId = :userId 
      AND isDeleted = 0 
      AND MATCH(title, content) AGAINST(:query IN NATURAL LANGUAGE MODE)`,
      {
        replacements: { userId, query: searchQuery },
        type: db.sequelize.QueryTypes.SELECT,
        model: db.Note
      }
    );
  }
  
  // Cache search results
  await noteCache.cacheSearchResults(userId, searchQuery, searchResults);
  
  return res.json(searchResults);
});

/**
 * Permanently delete a note and all its versions 
 * (No version checking required since entire note history is removed)
 */
export const deleteNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  
  // Start a transaction
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get the note
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId
      },
      transaction
    });
    
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Delete all versions of the note
    await db.NoteVersion.destroy({
      where: { noteId },
      transaction
    });
    
    // Delete the note itself
    await note.destroy({ transaction });
    
    await transaction.commit();
    
    // Invalidate all related caches
    await noteCache.invalidateAllNoteCache(noteId, userId);
    // Also invalidate search results as they might contain this note
    await noteCache.invalidateSearchResults(userId);
    
    return res.json({ message: 'Note permanently deleted successfully' });
  } catch (error) {
    // Only roll back if the transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
});

/**
 * Soft delete a note (marks as deleted but preserves in database)
 */
export const softDeleteNote = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  const clientVersion = req.query.version;
  
  // Start a transaction
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get the note with a lock for update
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId,
        isDeleted: false
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Check for version conflict (optimistic locking)
    if (parseInt(clientVersion) !== note.version) {
      await transaction.rollback();
      return res.status(409).json({
        error: 'Version conflict. The note has been modified since you last retrieved it.',
        clientVersion: parseInt(clientVersion),
        serverVersion: note.version
      });
    }
    
    // Increment version for the soft delete operation
    const newVersion = note.version + 1;
    
    // Perform soft delete by setting isDeleted to true
    await note.update({
      isDeleted: true,
      version: newVersion
    }, { transaction });
    
    // Create a version entry for the soft delete action
    await db.NoteVersion.create({
      noteId,
      title: note.title,
      content: note.content,
      version: newVersion,
      createdBy: userId
    }, { transaction });
    
    await transaction.commit();
    
    // Invalidate all related caches
    await noteCache.invalidateAllNoteCache(noteId, userId);
    // Also invalidate search results as they might contain this note
    await noteCache.invalidateSearchResults(userId);
    
    return res.json({ message: 'Note soft-deleted successfully' });
  } catch (error) {
    // Only roll back if the transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
});

/**
 * Resolve a version conflict
 */
export const resolveConflict = asyncHandler(async (req, res) => {
  const noteId = req.params.id;
  const userId = req.user.id;
  const { 
    title, 
    content, 
    serverVersion, // The current server version we're resolving against
    resolutionStrategy // Can be 'client-wins', 'server-wins', or 'merge'
  } = req.body;
  
  // Start a transaction
  const transaction = await db.sequelize.transaction();
  
  try {
    // Get the note with a lock for update
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId,
        isDeleted: false
      },
      lock: transaction.LOCK.UPDATE,
      transaction
    });
    
    if (!note) {
      await transaction.rollback();
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Verify we're still dealing with the same server version
    // This prevents race conditions during conflict resolution
    if (parseInt(serverVersion) !== note.version) {
      await transaction.rollback();
      return res.status(409).json({
        error: 'Server version has changed again while attempting to resolve conflict',
        currentVersion: note.version,
        attemptedResolutionVersion: parseInt(serverVersion)
      });
    }
    
    // Increment version and update note
    const latestVersion = parseInt(serverVersion) + 1;
    
    // Update the note with resolved content and updated version
    await note.update({
      title,
      content,
      version: latestVersion
    }, { transaction });
    
    // Create a version entry for the resolved conflict
    await db.NoteVersion.create({
      noteId,
      title,
      content,
      version: latestVersion,
      createdBy: userId
    }, { transaction });
    
    await transaction.commit();
    
    // Invalidate all related caches
    await noteCache.invalidateAllNoteCache(noteId, userId);
    // Also invalidate search results as they might contain this note
    await noteCache.invalidateSearchResults(userId);
    
    return res.json({
      message: 'Conflict resolved successfully',
      note: {
        ...note.toJSON(),
        version: latestVersion
      },
      resolutionStrategy
    });
  } catch (error) {
    // Only roll back if the transaction is still active
    if (transaction && !transaction.finished) {
      await transaction.rollback();
    }
    throw error;
  }
});
