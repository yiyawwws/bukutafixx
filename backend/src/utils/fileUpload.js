const cloudinary = require('cloudinary').v2;
const pool = require('../config/database');

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET
});

/**
 * Menyimpan file buffer ke Cloudinary dan mereturn URL-nya.
 * Jika gagal atau file tidak valid, mengembalikan null.
 * @param {Object} file - Object multer file (req.file)
 * @returns {Promise<string>} URL Cloudinary
 */
async function saveFileToDB(file) {
  if (!file || !file.buffer) return null;
  
  try {
    return new Promise((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        { resource_type: "auto" },
        (error, result) => {
          if (error) {
            console.error('Cloudinary upload error:', error);
            reject(error);
          } else {
            resolve(result.secure_url);
          }
        }
      );
      uploadStream.end(file.buffer);
    });
  } catch (err) {
    console.error('saveFileToDB error:', err);
    return null;
  }
}

module.exports = { saveFileToDB };
