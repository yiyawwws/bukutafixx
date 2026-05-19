const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Upload avatar profil ke folder bukuta/avatars di Cloudinary
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bukuta/avatars',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp'],
    transformation: [{ width: 400, height: 400, crop: 'fill', gravity: 'face', quality: 'auto' }],
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

const uploadAvatar = multer({
  storage,
  fileFilter,
  limits: { fileSize: 2 * 1024 * 1024 }, // 2MB max
});

module.exports = uploadAvatar;
