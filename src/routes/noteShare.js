import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  shareNote,
  getSharedNotes,
  getNoteShares,
  removeShare,
  checkNoteAccess
} from '../controllers/noteShareController.js';
import {
  validateShareNote,
  validateNoteId,
  validateGetNoteShares,
  validateRemoveShare
} from '../middlewares/validators/noteShareValidators.js';

/**
 * @apiDefine NoteNotFoundError
 * @apiError (404) {String} message Note not found
 */

/**
 * @apiDefine AuthenticationError
 * @apiError (401) {String} message Authentication failed
 */

/**
 * @apiDefine ForbiddenError
 * @apiError (403) {String} message You do not have permission for this action
 */

/**
 * @apiDefine ConflictError
 * @apiError (409) {String} message Conflict with existing resource
 */

const router = express.Router();

/**
 * @api {post} /notes/:noteId/share Share a note with a user
 * @apiName ShareNote
 * @apiGroup NoteSharing
 * @apiVersion 1.0.0
 *
 * @apiDescription Share a note with another user, granting them read or write access
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} noteId Note's unique ID
 * @apiParam (Body) {Number} sharedWithId ID of the user to share with
 * @apiParam (Body) {String} [permission=read] Permission level ('read' or 'write')
 *
 * @apiSuccess {Boolean} success Indicates if sharing was successful
 * @apiSuccess {String} message Success message
 * @apiSuccess {Object} noteShare The share record
 * @apiSuccess {Number} noteShare.id Share record ID
 * @apiSuccess {Number} noteShare.noteId Note ID
 * @apiSuccess {Number} noteShare.ownerId ID of the note owner
 * @apiSuccess {Number} noteShare.sharedWithId ID of the user the note is shared with
 * @apiSuccess {String} noteShare.permission Permission level granted
 *
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 * @apiUse ConflictError
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *     -d '{"sharedWithId":2,"permission":"read"}' \
 *     http://localhost:3000/notes/1/share
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "success": true,
 *       "message": "Note shared successfully",
 *       "noteShare": {
 *         "id": 1,
 *         "noteId": 1,
 *         "ownerId": 1,
 *         "sharedWithId": 2,
 *         "permission": "read",
 *         "createdAt": "2025-05-09T14:30:25.000Z",
 *         "updatedAt": "2025-05-09T14:30:25.000Z"
 *       }
 *     }
 */
router.post('/:noteId/share', authenticate, validateShareNote, shareNote);

/**
 * @api {get} /notes/shared Get all notes shared with me
 * @apiName GetSharedNotes
 * @apiGroup NoteSharing
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all notes that have been shared with the authenticated user
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {Object[]} notes List of notes shared with the user
 * @apiSuccess {Number} notes.id Note ID
 * @apiSuccess {String} notes.title Note title
 * @apiSuccess {String} notes.content Note content
 * @apiSuccess {Number} notes.version Current version
 * @apiSuccess {String} notes.permission Permission level for the user
 * @apiSuccess {Object} notes.owner Owner information
 * @apiSuccess {Number} notes.owner.id Owner's user ID
 * @apiSuccess {String} notes.owner.username Owner's username
 * @apiSuccess {String} notes.owner.email Owner's email
 *
 * @apiUse AuthenticationError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/shared
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": 1,
 *         "title": "Shared Note Title",
 *         "content": "This note has been shared with me",
 *         "version": 2,
 *         "permission": "read",
 *         "owner": {
 *           "id": 2,
 *           "username": "janedoe",
 *           "email": "jane@example.com"
 *         },
 *         "createdAt": "2025-05-09T14:30:25.000Z",
 *         "updatedAt": "2025-05-09T14:35:15.000Z"
 *       }
 *     ]
 */
router.get('/shared', authenticate, getSharedNotes);

/**
 * @api {get} /notes/:noteId/shares Get all users with whom a note is shared
 * @apiName GetNoteShares
 * @apiGroup NoteSharing
 * @apiVersion 1.0.0
 *
 * @apiDescription Get a list of all users with whom a specific note is shared
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} noteId Note's unique ID
 *
 * @apiSuccess {Object[]} shares List of share records
 * @apiSuccess {Number} shares.id Share record ID
 * @apiSuccess {Number} shares.noteId Note ID
 * @apiSuccess {Number} shares.ownerId ID of the note owner
 * @apiSuccess {String} shares.permission Permission level granted
 * @apiSuccess {Object} shares.sharedWith User the note is shared with
 * @apiSuccess {Number} shares.sharedWith.id User's ID
 * @apiSuccess {String} shares.sharedWith.username User's username
 * @apiSuccess {String} shares.sharedWith.email User's email
 *
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 * @apiUse ForbiddenError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1/shares
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": 1,
 *         "noteId": 1,
 *         "ownerId": 1,
 *         "permission": "read",
 *         "sharedWith": {
 *           "id": 2,
 *           "username": "janedoe",
 *           "email": "jane@example.com"
 *         },
 *         "createdAt": "2025-05-09T14:30:25.000Z",
 *         "updatedAt": "2025-05-09T14:30:25.000Z"
 *       }
 *     ]
 */
router.get('/:noteId/shares', authenticate, validateGetNoteShares, getNoteShares);

/**
 * @api {delete} /notes/:noteId/shares/:shareId Remove a note share
 * @apiName RemoveShare
 * @apiGroup NoteSharing
 * @apiVersion 1.0.0
 *
 * @apiDescription Remove a share record to revoke a user's access to a note
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} noteId Note's unique ID
 * @apiParam {Number} shareId Share record's unique ID
 *
 * @apiSuccess {Boolean} success Indicates if removal was successful
 * @apiSuccess {String} message Success message
 *
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 * @apiUse ForbiddenError
 *
 * @apiExample {curl} Example usage:
 *     curl -X DELETE -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1/shares/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Share removed successfully"
 *     }
 */
router.delete('/:noteId/shares/:shareId', authenticate, validateRemoveShare, removeShare);

/**
 * @api {get} /notes/:noteId/access Check access to a note
 * @apiName CheckNoteAccess
 * @apiGroup NoteSharing
 * @apiVersion 1.0.0
 *
 * @apiDescription Check if the current user has access to a specific note
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} noteId Note's unique ID
 *
 * @apiSuccess {Boolean} hasAccess Whether the user has any access to the note
 * @apiSuccess {Boolean} isOwner Whether the user is the owner of the note
 * @apiSuccess {String} permission The level of permission ("read", "write", "owner", or null if no access)
 *
 * @apiUse AuthenticationError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1/access
 *
 * @apiSuccessExample {json} Success-Response (Owner):
 *     HTTP/1.1 200 OK
 *     {
 *       "hasAccess": true,
 *       "isOwner": true,
 *       "permission": "owner"
 *     }
 * 
 * @apiSuccessExample {json} Success-Response (Shared):
 *     HTTP/1.1 200 OK
 *     {
 *       "hasAccess": true,
 *       "isOwner": false,
 *       "permission": "read"
 *     }
 *
 * @apiSuccessExample {json} Success-Response (No Access):
 *     HTTP/1.1 200 OK
 *     {
 *       "hasAccess": false,
 *       "isOwner": false,
 *       "permission": null
 *     }
 */
router.get('/:noteId/access', authenticate, validateNoteId, checkNoteAccess);

export default router;
