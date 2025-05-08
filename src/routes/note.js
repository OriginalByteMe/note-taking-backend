import express from 'express';
import { db } from '../config/database.js';

const router = express.Router();

// TODO: This will be replaced with proper authentication middleware
// For now, we're using a fixed user ID for testing
const DEFAULT_USER_ID = 1;

/**
 * Create a new note
 * POST /notes
 */
router.post('/', async (req, res) => {
  try {
    const { title, content } = req.body;
    const userId = DEFAULT_USER_ID;
    
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }
    
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
});

/**
 * Get all notes for authenticated user
 * GET /notes
 */
router.get('/', async (req, res) => {
  try {
    const userId = DEFAULT_USER_ID;
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
});

/**
 * Get a specific note by ID
 * GET /notes/:id
 */
router.get('/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = DEFAULT_USER_ID;
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
});

/**
 * Get note versions
 * GET /notes/:id/versions
 */
router.get('/:id/versions', async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = DEFAULT_USER_ID;
    
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
});

/**
 * Revert to a specific version
 * POST /notes/:id/revert/:version
 */
router.post('/:id/revert/:version', async (req, res) => {
  try {
    const noteId = req.params.id;
    const versionNumber = req.params.version;
    const userId = DEFAULT_USER_ID;
    
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
});

/**
 * Update a note
 * PUT /notes/:id
 */
router.put('/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = DEFAULT_USER_ID;
    const { title, content, version: clientVersion } = req.body;
    
    if (!title || !content || !clientVersion) {
      return res.status(400).json({ error: 'Title, content and version are required' });
    }
    
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
          error: 'Version conflict. Someone else has updated this note.',
          currentVersion: note.version
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
});

/**
 * Search notes by keywords
 * GET /notes/search?q=keyword
 */
router.get('/search', async (req, res) => {
  try {
    const query = req.query.q;
    const userId = DEFAULT_USER_ID;
    
    if (!query) {
      return res.status(400).json({ error: 'Search query is required' });
    }
    
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
});

/**
 * Soft delete a note
 * DELETE /notes/:id
 */
router.delete('/:id', async (req, res) => {
  try {
    const noteId = req.params.id;
    const userId = DEFAULT_USER_ID;
    
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
});

export default router;