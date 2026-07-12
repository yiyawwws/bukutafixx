const multer = require('multer');
// Upload foto buku disimpan ke memory sebelum di-insert ke DB
const storage = multer.memoryStorage();

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
