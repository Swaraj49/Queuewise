const cloudinary = require('cloudinary').v2;
const multer = require('multer');

// Configure Cloudinary from environment
cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

// Configure Multer Memory Storage
const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 } // 5MB limit
});

/**
 * Uploads file buffer to Cloudinary (or fallback base64 Data URL if credentials unconfigured)
 */
const uploadToCloudinary = (fileBuffer, mimetype) => {
  return new Promise((resolve, reject) => {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const isMockCredentials = !cloudName || cloudName === 'queuewise_demo' || process.env.CLOUDINARY_API_SECRET?.includes('your_cloudinary');

    if (isMockCredentials) {
      // Fallback: return data URL so upload works out of the box
      const base64Data = fileBuffer.toString('base64');
      const dataUrl = `data:${mimetype || 'image/jpeg'};base64,${base64Data}`;
      return resolve(dataUrl);
    }

    const uploadStream = cloudinary.uploader.upload_stream(
      { folder: 'queuewise_storefronts' },
      (error, result) => {
        if (error) return reject(error);
        resolve(result.secure_url);
      }
    );

    uploadStream.end(fileBuffer);
  });
};

/**
 * Deletes file from Cloudinary if possible
 */
const deleteFromCloudinary = async (imageUrl) => {
  try {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    if (!cloudName || cloudName === 'queuewise_demo' || imageUrl.startsWith('data:')) {
      return;
    }
    // Extract public_id from secure_url
    const parts = imageUrl.split('/');
    const filename = parts[parts.length - 1];
    const publicId = `queuewise_storefronts/${filename.split('.')[0]}`;
    await cloudinary.uploader.destroy(publicId);
  } catch (err) {
    console.error('Cloudinary destruction notice:', err.message);
  }
};

module.exports = {
  upload,
  uploadToCloudinary,
  deleteFromCloudinary
};
