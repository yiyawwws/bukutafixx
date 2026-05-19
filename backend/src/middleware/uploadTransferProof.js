const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Upload transfer proof to Cloudinary under bukuta/transfer_proofs
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bukuta/transfer_proofs',
    allowed_formats: ['jpg', 'jpeg', 'png', 'webp', 'pdf'],
    transformation: [{ quality: 'auto' }],
  },
});

const fileFilter = (_req, file, cb) => {
  const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'application/pdf'];
  if (allowed.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Format file tidak didukung. Gunakan JPG, PNG, WebP, atau PDF.'), false);
  }
};

const uploadTransferProof = multer({
  storage,
  fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5MB max
});

module.exports = uploadTransferProof;
