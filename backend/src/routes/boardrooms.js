const express = require('express');
const { 
  getAllBoardrooms, 
  getBoardroomById, 
  createBoardroom, 
  updateBoardroom, 
  deleteBoardroom,
  getAllBoardroomsAdmin,
  addBoardroomImage,
  removeBoardroomImage
} = require('../controllers/boardroomController');
const { validateBoardroom } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

const router = express.Router();

// Public routes
router.get('/', getAllBoardrooms);
router.get('/:id', getBoardroomById);

// Admin routes
router.get('/admin/all', authenticateToken, requireAdmin, getAllBoardroomsAdmin);
router.post('/', authenticateToken, requireAdmin, validateBoardroom, createBoardroom);
router.put('/:id', authenticateToken, requireAdmin, validateBoardroom, updateBoardroom);
router.delete('/:id', authenticateToken, requireAdmin, deleteBoardroom);
router.post('/:id/images', authenticateToken, requireAdmin, addBoardroomImage);
router.delete('/:id/images/:imageIndex', authenticateToken, requireAdmin, removeBoardroomImage);

module.exports = router; 