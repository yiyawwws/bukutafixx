const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Upload KTM ke folder bukuta/ktms di Cloudinary
// Folder ini sebaiknya diset sebagai "restricted" di Cloudinary dashboard
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bukuta/ktms',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    // Tidak ada transformasi agar dokumen KTM tetap terbaca jelas
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format foto tidak didukung. Gunakan JPG, PNG, atau WebP.'), false);
  }
};

const uploadKtm = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max untuk KTM
});

module.exports = uploadKtm;
