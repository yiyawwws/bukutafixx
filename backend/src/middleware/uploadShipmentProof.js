const multer = require('multer');
// Upload shipment proof disimpan ke memory sebelum di-insert ke DB
const storage = multer.memoryStorage();

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.'), false);
  }
};

const uploadShipmentProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = uploadShipmentProof;
