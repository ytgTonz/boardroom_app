const ImageKit = require('imagekit');

// Initialize ImageKit with your credentials
const imagekit = new ImageKit({
  publicKey: process.env.IMAGEKIT_PUBLIC_KEY,
  privateKey: process.env.IMAGEKIT_PRIVATE_KEY,
  urlEndpoint: process.env.IMAGEKIT_URL_ENDPOINT
});

const uploadImage = async (file, fileName) => {
  try {
    const result = await imagekit.upload({
      file: file.buffer, // file buffer
      fileName: fileName || `boardroom_${Date.now()}_${file.originalname}`,
      folder: '/boardrooms/', // organize images in folders
      useUniqueFileName: true,
      tags: ['boardroom', 'upload']
    });

    return {
      success: true,
      url: result.url,
      fileId: result.fileId,
      name: result.name
    };
  } catch (error) {
    console.error('ImageKit upload error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const deleteImage = async (fileId) => {
  try {
    await imagekit.deleteFile(fileId);
    return { success: true };
  } catch (error) {
    console.error('ImageKit delete error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

const getAuthenticationParameters = () => {
  try {
    const authenticationParameters = imagekit.getAuthenticationParameters();
    return {
      success: true,
      ...authenticationParameters
    };
  } catch (error) {
    console.error('ImageKit auth error:', error);
    return {
      success: false,
      error: error.message
    };
  }
};

module.exports = {
  uploadImage,
  deleteImage,
  getAuthenticationParameters,
  imagekit
};