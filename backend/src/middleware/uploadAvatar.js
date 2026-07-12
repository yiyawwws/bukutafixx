const multer = require('multer');
// Upload avatar profil disimpan ke memory sebelum di-insert ke DB
const storage = multer.memoryStorage();

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
