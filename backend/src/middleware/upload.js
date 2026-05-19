const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Upload foto buku ke folder bukuta/books di Cloudinary
// Mendukung multi-upload hingga 5 foto per buku
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bukuta/books',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 1000, height: 1400, crop: 'limit', quality: 'auto' }],
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format gambar tidak didukung. Gunakan JPG, PNG, atau WebP.'), false);
  }
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max per foto
});

module.exports = upload;
