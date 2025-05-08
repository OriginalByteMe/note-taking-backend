import { db } from '../config/database.js';

/**
 * Create a new note
 */
export const createNote = async (req, res) => {
  try {
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
    
    return res.status(201).json(note);
  } catch (error) {
    console.error('Error creating note:', error);
    return res.status(500).json({ error: 'Failed to create note' });
  }
};

/**
 * Get all notes for authenticated user
 */
export const getAllNotes = async (req, res) => {
  try {
    const userId = req.user.id;
    // Get notes from database
    const notes = await db.Note.findAll({
      where: {
        userId,
        isDeleted: false
      },
      order: [['updatedAt', 'DESC']]
    });
    
    return res.json(notes);
  } catch (error) {
    console.error('Error fetching notes:', error);
    return res.status(500).json({ error: 'Failed to fetch notes' });
  }
};

/**
 * Get a specific note by ID
 */
export const getNoteById = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    // Get note from database
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId,
        isDeleted: false
      }
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }

    return res.json(note);
  } catch (error) {
    console.error('Error fetching note:', error);
    return res.status(500).json({ error: 'Failed to fetch note' });
  }
};

/**
 * Get note versions
 */
export const getNoteVersions = async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = req.user.id;
    
    // Check if note belongs to user
    const note = await db.Note.findOne({
      where: {
        id: noteId,
        userId
      }
    });
    
    if (!note) {
      return res.status(404).json({ error: 'Note not found' });
    }
    
    // Get all versions of the note
    const versions = await db.NoteVersion.findAll({
      where: {
        noteId
      },
      order: [['version', 'DESC']]
    });
    
    return res.json(versions);
  } catch (error) {
    console.error('Error fetching note versions:', error);
    return res.status(500).json({ error: 'Failed to fetch note versions' });
  }
};

/**
 * Revert to a specific version
 */
export const revertToVersion = async (req, res) => {
  try {
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
      
      return res.json({
        message: `Successfully reverted to version ${versionNumber}`,
        note
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error reverting note:', error);
    return res.status(500).json({ error: 'Failed to revert note' });
  }
};

/**
 * Update a note
 */
export const updateNote = async (req, res) => {
  try {
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
      
      return res.json(note);
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error updating note:', error);
    return res.status(500).json({ error: 'Failed to update note' });
  }
};

/**
 * Search notes by keywords
 */
export const searchNotes = async (req, res) => {
  try {
    const query = req.query.q;
    const userId = req.user.id;
    
    // Search in database
    // Using LIKE for basic search, would use full-text search in production
    const notes = await db.Note.findAll({
      where: {
        userId,
        isDeleted: false,
        [db.Sequelize.Op.or]: [
          { title: { [db.Sequelize.Op.like]: `%${query}%` } },
          { content: { [db.Sequelize.Op.like]: `%${query}%` } }
        ]
      }
    });
    
    return res.json(notes);
  } catch (error) {
    console.error('Error searching notes:', error);
    return res.status(500).json({ error: 'Failed to search notes' });
  }
};

/**
 * Soft delete a note
 */
export const deleteNote = async (req, res) => {
  try {
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
          serverVersion: note.version,
          message: 'Please refresh and try again'
        });
      }
      
      // Soft delete by updating isDeleted flag
      await note.update({
        isDeleted: true
      }, { transaction });
      
      await transaction.commit();
      
      return res.json({ message: 'Note deleted successfully' });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error deleting note:', error);
    return res.status(500).json({ error: 'Failed to delete note' });
  }
};

/**
 * Resolve a version conflict
 */
export const resolveConflict = async (req, res) => {
  try {
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
      const newVersion = note.version + 1;
      
      // Update the note with resolved content
      await note.update({
        title,
        content,
        version: newVersion
      }, { transaction });
      
      // Save version history with conflict resolution metadata
      await db.NoteVersion.create({
        noteId,
        title,
        content,
        version: newVersion,
        createdBy: userId,
        metadata: {
          conflictResolution: resolutionStrategy,
          resolvedFrom: serverVersion
        }
      }, { transaction });
      
      await transaction.commit();
      
      return res.json({
        message: 'Conflict successfully resolved',
        note,
        resolutionStrategy
      });
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  } catch (error) {
    console.error('Error resolving conflict:', error);
    return res.status(500).json({ error: 'Failed to resolve conflict' });
  }
};
