const express = require('express');
const multer = require('multer');
const { 
  getAllBoardrooms, 
  getBoardroomById, 
  createBoardroom, 
  updateBoardroom, 
  deleteBoardroom,
  getAllBoardroomsAdmin,
  addBoardroomImage,
  removeBoardroomImage,
  uploadBoardroomImage,
  getImageKitAuth
} = require('../controllers/boardroomController');
const { validateBoardroom } = require('../middleware/validation');
const { authenticateToken, requireAdmin } = require('../middleware/auth');

// Configure multer for file uploads (memory storage)
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype.startsWith('image/')) {
      cb(null, true);
    } else {
      cb(new Error('Only image files are allowed'), false);
    }
  }
});

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
router.post('/:id/upload-image', authenticateToken, requireAdmin, upload.single('image'), uploadBoardroomImage);
router.delete('/:id/images/:imageIndex', authenticateToken, requireAdmin, removeBoardroomImage);

// ImageKit authentication endpoint
router.get('/imagekit-auth', authenticateToken, requireAdmin, getImageKitAuth);

module.exports = router; 