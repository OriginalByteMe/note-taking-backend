import express from 'express';
import { authenticate } from '../middlewares/auth.js';
import {
  registerUser,
  loginUser,
  getAllUsers,
  getUserById,
  updateUser,
  deleteUser
} from '../controllers/userController.js';
import {
  validateRegisterUser,
  validateLoginUser,
  validateUserId,
  validateUpdateUser
} from '../middlewares/validators/userValidators.js';

/**
 * @apiDefine UserNotFoundError
 * @apiError (404) {String} message User not found
 */

/**
 * @apiDefine AuthenticationError
 * @apiError (401) {String} message Authentication failed
 */

/**
 * @apiDefine UserSuccessResponse
 * @apiSuccess {Number} id User ID
 * @apiSuccess {String} username User's username
 * @apiSuccess {String} email User's email address
 * @apiSuccess {Date} createdAt User creation date
 * @apiSuccess {Date} updatedAt User last update date
 */

const router = express.Router();

/**
 * @api {post} /users/register Register a new user
 * @apiName RegisterUser
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiDescription Register a new user with username, email, and password
 *
 * @apiParam (Body) {String} username User's unique username
 * @apiParam (Body) {String} email User's unique email address
 * @apiParam (Body) {String} password User's password (min 8 chars)
 *
 * @apiSuccess {String} token JWT authentication token
 * @apiUse UserSuccessResponse
 *
 * @apiError (400) {String} message Validation error message
 * @apiError (409) {String} message Username or email already exists
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" -d '{"username":"johndoe","email":"john@example.com","password":"password123"}' http://localhost:3000/users/register
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 201 Created
 *     {
 *       "id": 1,
 *       "username": "johndoe",
 *       "email": "john@example.com",
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "createdAt": "2025-05-09T13:35:12.000Z",
 *       "updatedAt": "2025-05-09T13:35:12.000Z"
 *     }
 */
router.post('/register', validateRegisterUser, registerUser);

/**
 * @api {post} /users/login Login a user
 * @apiName LoginUser
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiDescription Authenticate a user and get a JWT token
 *
 * @apiParam (Body) {String} email User's email address
 * @apiParam (Body) {String} password User's password
 *
 * @apiSuccess {String} token JWT authentication token
 * @apiUse UserSuccessResponse
 *
 * @apiError (400) {String} message Validation error message
 * @apiError (401) {String} message Invalid email or password
 *
 * @apiExample {curl} Example usage:
 *     curl -X POST -H "Content-Type: application/json" -d '{"email":"john@example.com","password":"password123"}' http://localhost:3000/users/login
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "username": "johndoe",
 *       "email": "john@example.com",
 *       "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
 *       "createdAt": "2025-05-09T13:35:12.000Z",
 *       "updatedAt": "2025-05-09T13:35:12.000Z"
 *     }
 */
router.post('/login', validateLoginUser, loginUser);

/**
 * @api {get} /users Get all users
 * @apiName GetAllUsers
 * @apiGroup Users
 * @apiVersion 1.0.0
 * @apiPermission admin
 *
 * @apiDescription Get a list of all users (admin only functionality)
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiSuccess {Object[]} users List of users
 * @apiSuccess {Number} users.id User ID
 * @apiSuccess {String} users.username User's username
 * @apiSuccess {String} users.email User's email address
 * @apiSuccess {Date} users.createdAt User creation date
 * @apiSuccess {Date} users.updatedAt User last update date
 *
 * @apiUse AuthenticationError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/users
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     [
 *       {
 *         "id": 1,
 *         "username": "johndoe",
 *         "email": "john@example.com",
 *         "createdAt": "2025-05-09T13:35:12.000Z",
 *         "updatedAt": "2025-05-09T13:35:12.000Z"
 *       },
 *       {
 *         "id": 2,
 *         "username": "janedoe",
 *         "email": "jane@example.com",
 *         "createdAt": "2025-05-09T14:12:07.000Z",
 *         "updatedAt": "2025-05-09T14:12:07.000Z"
 *       }
 *     ]
 */
router.get('/', authenticate, getAllUsers);

/**
 * @api {get} /users/:id Get user by ID
 * @apiName GetUserById
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiDescription Get a specific user by their ID
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id User's unique ID
 *
 * @apiUse UserSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse UserNotFoundError
 *
 * @apiExample {curl} Example usage:
 *     curl -X GET -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/users/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "username": "johndoe",
 *       "email": "john@example.com",
 *       "createdAt": "2025-05-09T13:35:12.000Z",
 *       "updatedAt": "2025-05-09T13:35:12.000Z"
 *     }
 */
router.get('/:id', authenticate, validateUserId, getUserById);

/**
 * @api {put} /users/:id Update a user
 * @apiName UpdateUser
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiDescription Update a user's information
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id User's unique ID
 * @apiParam (Body) {String} [username] User's new username
 * @apiParam (Body) {String} [email] User's new email address
 * @apiParam (Body) {String} [password] User's new password
 *
 * @apiUse UserSuccessResponse
 * @apiUse AuthenticationError
 * @apiUse UserNotFoundError
 * @apiError (400) {String} message Validation error message
 *
 * @apiExample {curl} Example usage:
 *     curl -X PUT -H "Content-Type: application/json" -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." -d '{"username":"johndoe_updated"}' http://localhost:3000/users/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "id": 1,
 *       "username": "johndoe_updated",
 *       "email": "john@example.com",
 *       "createdAt": "2025-05-09T13:35:12.000Z",
 *       "updatedAt": "2025-05-09T14:12:07.000Z"
 *     }
 */
router.put('/:id', authenticate, validateUserId, validateUpdateUser, updateUser);

/**
 * @api {delete} /users/:id Delete a user
 * @apiName DeleteUser
 * @apiGroup Users
 * @apiVersion 1.0.0
 *
 * @apiDescription Delete a user account
 *
 * @apiHeader {String} Authorization Bearer JWT token
 *
 * @apiParam {Number} id User's unique ID
 *
 * @apiSuccess {Boolean} success Indicates if deletion was successful
 * @apiSuccess {String} message Confirmation message
 *
 * @apiUse AuthenticationError
 * @apiUse UserNotFoundError
 *
 * @apiExample {curl} Example usage:
 *     curl -X DELETE -H "Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9..." http://localhost:3000/users/1
 *
 * @apiSuccessExample {json} Success-Response:
 *     HTTP/1.1 200 OK
 *     {
 *       "success": true,
 *       "message": "User deleted successfully"
 *     }
 */
router.delete('/:id', authenticate, validateUserId, deleteUser);

export default router;
