import { db } from '../config/database.js';
import { asyncHandler, NotFoundError, ForbiddenError, ConflictError } from '../middlewares/errorHandler.js';
import noteCache from '../cache/noteCache.js';

/**
 * Share a note with another user
 */
export const shareNote = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const { userId: currentUserId } = req.user;
  const { sharedWithId, permission = 'read' } = req.body;
  
  // Validate that the note exists and belongs to the current user
  const note = await db.Note.findOne({
    where: { 
      id: noteId,
      userId: currentUserId
    }
  });
  
  if (!note) {
    throw new NotFoundError('Note not found or you do not have permission to share it');
  }

  // Validate that the user to share with exists
  const userToShareWith = await db.User.findByPk(sharedWithId);
  if (!userToShareWith) {
    throw new NotFoundError('User to share with not found');
  }

  // Prevent sharing with yourself
  if (parseInt(sharedWithId) === currentUserId) {
    throw new ConflictError('Cannot share a note with yourself');
  }

  try {
    // Create or update the share record
    const [noteShare, created] = await db.NoteShare.findOrCreate({
      where: {
        noteId,
        sharedWithId
      },
      defaults: {
        noteId,
        ownerId: currentUserId,
        sharedWithId,
        permission
      }
    });

    // If the share already exists, update the permission
    if (!created) {
      // Verify current user is still the owner
      if (noteShare.ownerId !== currentUserId) {
        throw new ForbiddenError('You do not have permission to modify this share');
      }
      
      await noteShare.update({ permission });
    }

    // Invalidate cache for the shared user
    await noteCache.invalidateUserNotes(sharedWithId);

    return res.status(created ? 201 : 200).json({
      success: true,
      message: created ? 'Note shared successfully' : 'Share permission updated',
      noteShare
    });
  } catch (error) {
    if (error.name === 'SequelizeUniqueConstraintError') {
      throw new ConflictError('Note is already shared with this user');
    }
    throw error;
  }
});

/**
 * Get all notes shared with the current user
 */
export const getSharedNotes = asyncHandler(async (req, res) => {
  const { userId } = req.user;
  
  // Try to get from cache first
  const cachedNotes = await noteCache.getSharedNotes(userId);
  if (cachedNotes) {
    return res.json(cachedNotes);
  }
  
  // If not in cache, get from database
  const sharedNotes = await db.Note.findAll({
    include: [
      {
        model: db.NoteShare,
        where: { sharedWithId: userId },
        as: 'NoteShares',
        attributes: ['permission']
      },
      {
        model: db.User,
        as: 'User',
        attributes: ['id', 'username', 'email']
      }
    ],
    where: { isDeleted: false }
  });
  
  // Format the response to include permission
  const formattedNotes = sharedNotes.map(note => {
    const noteObj = note.toJSON();
    noteObj.permission = noteObj.NoteShares[0].permission;
    noteObj.owner = noteObj.User;
    delete noteObj.NoteShares;
    return noteObj;
  });
  
  // Store in cache for future requests
  await noteCache.cacheSharedNotes(userId, formattedNotes);
  
  return res.json(formattedNotes);
});

/**
 * Get all users with whom a note is shared
 */
export const getNoteShares = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const { userId } = req.user;
  
  try {
    // Validate that the note exists and belongs to the current user
    const note = await db.Note.findOne({
      where: { 
        id: noteId,
        userId
      }
    });
    
    if (!note) {
      throw new NotFoundError('Note not found or you do not have permission to view shares');
    }
  
    // Get all shares for this note
    const shares = await db.NoteShare.findAll({
      where: { noteId },
      include: [{
        model: db.User,
        as: 'sharedWith',
        attributes: ['id', 'username', 'email']
      }]
    });
    
    return res.json(shares);
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request parameters',
        error: error.message
      });
    }
    throw error; // Let the global error handler deal with other errors
  }
});

/**
 * Remove a share (unshare a note)
 */
export const removeShare = asyncHandler(async (req, res) => {
  const { noteId, shareId } = req.params;
  const { userId } = req.user;
  
  try {
    // Validate that the note exists and belongs to the current user
    const note = await db.Note.findOne({
      where: { 
        id: noteId,
        userId
      }
    });
    
    if (!note) {
      return res.status(400).json({
        status: 'error',
        message: 'Note not found or you do not have permission to manage shares'
      });
    }
  
    // Find the share record
    const shareRecord = await db.NoteShare.findOne({
      where: { 
        id: shareId,
        noteId,
        ownerId: userId
      }
    });
    
    if (!shareRecord) {
      return res.status(400).json({
        status: 'error',
        message: 'Share record not found'
      });
    }
  
    const sharedWithId = shareRecord.sharedWithId;
    
    // Delete the share record
    await shareRecord.destroy();
    
    // Invalidate cache for the user who lost access
    await noteCache.invalidateUserNotes(sharedWithId);
    
    return res.json({
      success: true,
      message: 'Share removed successfully'
    });
  } catch (error) {
    if (error.name === 'SequelizeDatabaseError' || error.name === 'SequelizeValidationError') {
      return res.status(400).json({
        status: 'error',
        message: 'Invalid request parameters',
        error: error.message
      });
    }
    // If we hit an unexpected error, return 500
    return res.status(500).json({
      status: 'error',
      message: 'Server error processing the request',
      error: error.message
    });
  }
});

/**
 * Check if current user has access to a note
 */
export const checkNoteAccess = asyncHandler(async (req, res) => {
  const { noteId } = req.params;
  const { userId } = req.user;
  
  // Check if user owns the note
  const ownedNote = await db.Note.findOne({
    where: { 
      id: noteId,
      userId
    }
  });
  
  if (ownedNote) {
    return res.json({
      hasAccess: true,
      isOwner: true,
      permission: 'owner'
    });
  }
  
  // Check if note is shared with user
  const sharedNote = await db.NoteShare.findOne({
    where: { 
      noteId,
      sharedWithId: userId
    },
    include: [{
      model: db.Note,
      where: { isDeleted: false }
    }]
  });
  
  if (sharedNote) {
    return res.json({
      hasAccess: true,
      isOwner: false,
      permission: sharedNote.permission
    });
  }
  
  // No access found
  return res.json({
    hasAccess: false,
    isOwner: false,
    permission: null
  });
});
