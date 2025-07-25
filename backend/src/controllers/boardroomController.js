const Boardroom = require('../models/Boardroom');
const { uploadImage, deleteImage, getAuthenticationParameters } = require('../services/imagekitService');

const getAllBoardrooms = async (req, res) => {
  try {
    const boardrooms = await Boardroom.find({ isActive: true }).sort({ name: 1 });
    res.json(boardrooms);
  } catch (error) {
    console.error('Get boardrooms error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getBoardroomById = async (req, res) => {
  try {
    const boardroom = await Boardroom.findById(req.params.id);
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found' });
    }
    res.json(boardroom);
  } catch (error) {
    console.error('Get boardroom error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const createBoardroom = async (req, res) => {
  try {
    const { name, capacity, location, amenities, description, images } = req.body;
    const boardroom = new Boardroom({ 
      name, 
      capacity, 
      location, 
      amenities: amenities || [], 
      description,
      images: images || []
    });
    await boardroom.save();
    res.status(201).json(boardroom);
  } catch (error) {
    console.error('Create boardroom error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const updateBoardroom = async (req, res) => {
  try {
    const { name, capacity, location, amenities, description, isActive, images } = req.body;
    const boardroom = await Boardroom.findByIdAndUpdate(
      req.params.id,
      { name, capacity, location, amenities, description, isActive, images },
      { new: true, runValidators: true }
    );
    
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found' });
    }
    
    res.json(boardroom);
  } catch (error) {
    console.error('Update boardroom error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const deleteBoardroom = async (req, res) => {
  try {
    const boardroom = await Boardroom.findByIdAndUpdate(
      req.params.id,
      { isActive: false },
      { new: true }
    );
    
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found' });
    }
    
    res.json({ message: 'Boardroom deactivated successfully' });
  } catch (error) {
    console.error('Delete boardroom error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getAllBoardroomsAdmin = async (req, res) => {
  try {
    const boardrooms = await Boardroom.find().sort({ name: 1 });
    res.json(boardrooms);
  } catch (error) {
    console.error('Get all boardrooms admin error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const addBoardroomImage = async (req, res) => {
  try {
    const { imageUrl, alt, isPrimary } = req.body;
    const boardroom = await Boardroom.findById(req.params.id);
    
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found' });
    }
    
    // If this is a primary image, unset other primary images
    if (isPrimary) {
      boardroom.images.forEach(img => img.isPrimary = false);
    }
    
    boardroom.images.push({ url: imageUrl, alt, isPrimary });
    await boardroom.save();
    
    res.json(boardroom);
  } catch (error) {
    console.error('Add boardroom image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const removeBoardroomImage = async (req, res) => {
  try {
    const { imageIndex } = req.params;
    const boardroom = await Boardroom.findById(req.params.id);
    
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found' });
    }
    
    if (imageIndex >= 0 && imageIndex < boardroom.images.length) {
      boardroom.images.splice(imageIndex, 1);
      await boardroom.save();
    }
    
    res.json(boardroom);
  } catch (error) {
    console.error('Remove boardroom image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const uploadBoardroomImage = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({ message: 'No image file provided' });
    }

    const { alt, isPrimary } = req.body;
    const boardroom = await Boardroom.findById(req.params.id);
    
    if (!boardroom) {
      return res.status(404).json({ message: 'Boardroom not found' });
    }

    // Upload image to ImageKit
    const uploadResult = await uploadImage(req.file, `boardroom_${boardroom.name}_${Date.now()}`);
    
    if (!uploadResult.success) {
      return res.status(500).json({ message: 'Failed to upload image', error: uploadResult.error });
    }

    // If this is a primary image, unset other primary images
    if (isPrimary === 'true') {
      boardroom.images.forEach(img => img.isPrimary = false);
    }

    // Add image to boardroom
    boardroom.images.push({
      url: uploadResult.url,
      alt: alt || 'Boardroom image',
      isPrimary: isPrimary === 'true',
      fileId: uploadResult.fileId // Store ImageKit file ID for deletion
    });

    await boardroom.save();
    
    res.json({
      message: 'Image uploaded successfully',
      image: {
        url: uploadResult.url,
        alt: alt || 'Boardroom image',
        isPrimary: isPrimary === 'true'
      },
      boardroom
    });
  } catch (error) {
    console.error('Upload boardroom image error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

const getImageKitAuth = async (req, res) => {
  try {
    const authParams = getAuthenticationParameters();
    
    if (!authParams.success) {
      return res.status(500).json({ message: 'Failed to get authentication parameters' });
    }

    res.json(authParams);
  } catch (error) {
    console.error('ImageKit auth error:', error);
    res.status(500).json({ message: 'Server error' });
  }
};

module.exports = {
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
}; 