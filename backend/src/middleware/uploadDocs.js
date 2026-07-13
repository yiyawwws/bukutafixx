const multer = require('multer');

// Gunakan memory storage agar file disimpan di RAM sementara
// sebelum kita proses dan simpan ke database (tabel files)
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format dokumen tidak didukung. Gunakan JPG, PNG, atau WebP.'), false);
  }
};

const uploadDocs = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // Maksimal 5MB per file
});

module.exports = uploadDocs;
