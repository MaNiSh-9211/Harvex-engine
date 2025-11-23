const express = require('express');
const UserController = require('../controllers/userController');

const router = express.Router();

// GET /api/users - Get all users with calculations
router.get('/', UserController.getAllUsers);

// GET /api/users/:id - Get user by ID with score calculation
router.get('//:id', UserController.getUserById);

// POST /api/users - Create new user with Zod validation
router.post('/', UserController.createUser);

// GET /api/users/:id/stats - Get advanced user statistics
router.get('/:id/stats', UserController.calculateUserStats);

module.exports = router;
