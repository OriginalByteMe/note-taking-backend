import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  createNote,
  getAllNotes,
  getNoteById,
  getNoteVersions,
  revertToVersion,
  updateNote,
  searchNotes,
  deleteNote,
  softDeleteNote,
  resolveConflict
} from '../controllers/noteController.js';
import {
  validateCreateNote,
  validateNoteId,
  validateUpdateNote,
  validateRevertNote,
  validateSearchNote,
  validateDeleteNote,
  validateResolveConflict
} from '../middlewares/validators/noteValidators.js';

/**
 * @apiDefine NoteNotFoundError
 * @apiError (404) {String} message Note not found
 */

/**
 * @apiDefine AuthenticationError
 * @apiError (401) {String} message Authentication failed
 */

/**
 * @apiDefine NoteSuccessResponse
 * @apiSuccess {Number} id Note ID
 * @apiSuccess {String} title Note title
 * @apiSuccess {String} content Note content
 * @apiSuccess {Number} version Current version number
 * @apiSuccess {Number} userId User ID of the note owner
 * @apiSuccess {Boolean} isDeleted Whether the note is soft deleted
 * @apiSuccess {Date} createdAt Note creation date
 * @apiSuccess {Date} updatedAt Note last update date
 */

/**
 * @apiDefine VersionSuccessResponse
 * @apiSuccess {Number} id Version ID
 * @apiSuccess {Number} noteId Note ID
 * @apiSuccess {String} title Note title at this version
 * @apiSuccess {String} content Note content at this version
 * @apiSuccess {Number} version Version number
 * @apiSuccess {Number} createdBy User ID who created this version
 * @apiSuccess {Number} [revertedFrom] Version this was reverted from (if applicable)
 * @apiSuccess {Date} createdAt Version creation date
 */

const router = express.Router();

/**
 * @api {post} /notes Create a new note
 * @apiName CreateNote
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Create a new note with title and content
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam (Body) {String} title Note title
 * @apiParam (Body) {String} content Note content
 *
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 * @apiError (400) {String} message Validation error message
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *     -d '{"title":"My First Note","content":"This is the content of my first note"}' \
 *     http://localhost:3000/notes
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "id": 1,
 *       "title": "My First Note",
 *       "content": "This is the content of my first note",
 *       "version": 1,
 *       "userId": 1,
 *       "isDeleted": false,
 *       "createdAt": "2025-05-09T15:23:45.000Z",
 *       "updatedAt": "2025-05-09T15:23:45.000Z"
 *     }
 */
router.post('/', authenticate, validateCreateNote, createNote);

/**
 * @api {get} /notes Get all notes
 * @apiName GetAllNotes
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all notes for the authenticated user
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {Object[]} notes List of notes
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": 1,
 *         "title": "My First Note",
 *         "content": "This is the content of my first note",
 *         "version": 1,
 *         "userId": 1,
 *         "isDeleted": false,
 *         "createdAt": "2025-05-09T15:23:45.000Z",
 *         "updatedAt": "2025-05-09T15:23:45.000Z"
 *       },
 *       {
 *         "id": 2,
 *         "title": "Another Note",
 *         "content": "Content of my second note",
 *         "version": 1,
 *         "userId": 1,
 *         "isDeleted": false,
 *         "createdAt": "2025-05-09T16:42:12.000Z",
 *         "updatedAt": "2025-05-09T16:42:12.000Z"
 *       }
 *     ]
 */
router.get('/', authenticate, getAllNotes);

/**
 * @api {get} /notes/search?q=keyword Search notes
 * @apiName SearchNotes
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Search for notes by keywords in title or content
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam (Query) {String} q Query string to search for
 *
 * @apiSuccess {Object[]} notes List of matching notes
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/search?q=first
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": 1,
 *         "title": "My First Note",
 *         "content": "This is the content of my first note",
 *         "version": 1,
 *         "userId": 1,
 *         "isDeleted": false,
 *         "createdAt": "2025-05-09T15:23:45.000Z",
 *         "updatedAt": "2025-05-09T15:23:45.000Z"
 *       }
 *     ]
 */
router.get('/search', authenticate, validateSearchNote, searchNotes);

/**
 * @api {get} /notes/:id Get note by ID
 * @apiName GetNoteById
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Get a specific note by ID
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 *
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "title": "My First Note",
 *       "content": "This is the content of my first note",
 *       "version": 1,
 *       "userId": 1,
 *       "isDeleted": false,
 *       "createdAt": "2025-05-09T15:23:45.000Z",
 *       "updatedAt": "2025-05-09T15:23:45.000Z"
 *     }
 */
router.get('/:id', authenticate, validateNoteId, getNoteById);

/**
 * @api {get} /notes/:id/versions Get note versions
 * @apiName GetNoteVersions
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Get all versions of a specific note
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 *
 * @apiSuccess {Object[]} versions List of note versions
 * @apiUse VersionSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1/versions
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": 2,
 *         "noteId": 1,
 *         "title": "My Updated Note",
 *         "content": "This note has been updated",
 *         "version": 2,
 *         "createdBy": 1,
 *         "createdAt": "2025-05-09T15:30:12.000Z"
 *       },
 *       {
 *         "id": 1,
 *         "noteId": 1,
 *         "title": "My First Note",
 *         "content": "This is the content of my first note",
 *         "version": 1,
 *         "createdBy": 1,
 *         "createdAt": "2025-05-09T15:23:45.000Z"
 *       }
 *     ]
 */
router.get('/:id/versions', authenticate, validateNoteId, getNoteVersions);

/**
 * @api {post} /notes/:id/revert/:version Revert to a specific version
 * @apiName RevertToVersion
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Revert a note to a previous version
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 * @apiParam {Number} version Version number to revert to
 *
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 * @apiError (404) {String} message Version not found
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1/revert/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "title": "My First Note",
 *       "content": "This is the content of my first note",
 *       "version": 3,
 *       "userId": 1,
 *       "isDeleted": false,
 *       "createdAt": "2025-05-09T15:23:45.000Z",
 *       "updatedAt": "2025-05-09T15:45:22.000Z"
 *     }
 */
router.post('/:id/revert/:version', authenticate, validateNoteId, validateRevertNote, revertToVersion);

/**
 * @api {put} /notes/:id Update a note
 * @apiName UpdateNote
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Update a note's title or content
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 * @apiParam (Body) {String} [title] Note's new title
 * @apiParam (Body) {String} [content] Note's new content
 * @apiParam (Body) {Number} expectedVersion Current version number for optimistic locking
 *
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 * @apiError (400) {String} message Validation error message
 * @apiError (409) {String} message Version conflict error
 *
 * @apiExample {curl} Example usage:
 *     curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *     -d '{"title":"My Updated Note","content":"This note has been updated","expectedVersion":1}' \
 *     http://localhost:3000/notes/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "title": "My Updated Note",
 *       "content": "This note has been updated",
 *       "version": 2,
 *       "userId": 1,
 *       "isDeleted": false,
 *       "createdAt": "2025-05-09T15:23:45.000Z",
 *       "updatedAt": "2025-05-09T15:30:12.000Z"
 *     }
 */
router.put('/:id', authenticate, validateNoteId, validateUpdateNote, updateNote);

/**
 * @api {delete} /notes/:id Delete a note permanently
 * @apiName DeleteNote
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Permanently delete a note and all its versions
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 *
 * @apiSuccess {Boolean} success Indicates if deletion was successful
 * @apiSuccess {String} message Confirmation message
 *
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 *
 * @apiExample {curl} Example usage:
 *     curl -X DELETE -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Note deleted permanently"
 *     }
 */
router.delete('/:id', authenticate, validateNoteId, deleteNote);

/**
 * @api {put} /notes/:id/soft-delete Soft delete a note
 * @apiName SoftDeleteNote
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Mark a note as deleted but preserve it in the database
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 * @apiParam (Query) {Number} version Current version number for optimistic locking
 *
 * @apiSuccess {Boolean} success Indicates if soft deletion was successful
 * @apiSuccess {String} message Confirmation message
 *
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 * @apiError (409) {String} message Version conflict error
 *
 * @apiExample {curl} Example usage:
 *     curl -X PUT -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/notes/1/soft-delete?version=2
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "Note marked as deleted"
 *     }
 */
router.put('/:id/soft-delete', authenticate, validateNoteId, validateDeleteNote, softDeleteNote);

/**
 * @api {post} /notes/:id/resolve-conflict Resolve a version conflict
 * @apiName ResolveConflict
 * @apiGroup Notes
 * @apiVersion 1.0.0
 *
 * @apiDescription Resolve a version conflict by manually merging changes
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id Note's unique ID
 * @apiParam (Body) {String} title Resolved title
 * @apiParam (Body) {String} content Resolved content
 * @apiParam (Body) {Number} conflictingVersion The version that had a conflict
 *
 * @apiUse NoteSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse NoteNotFoundError
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." \
 *     -d '{"title":"Resolved Note Title","content":"Resolved content with merged changes","conflictingVersion":2}' \
 *     http://localhost:3000/notes/1/resolve-conflict
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "title": "Resolved Note Title",
 *       "content": "Resolved content with merged changes",
 *       "version": 3,
 *       "userId": 1,
 *       "isDeleted": false,
 *       "createdAt": "2025-05-09T15:23:45.000Z",
 *       "updatedAt": "2025-05-09T15:55:18.000Z"
 *     }
 */
router.post('/:id/resolve-conflict', authenticate, validateNoteId, validateResolveConflict, resolveConflict);

export default router;
