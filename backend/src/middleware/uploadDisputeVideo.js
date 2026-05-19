const multer = require('multer');
const { CloudinaryStorage } = require('multer-storage-cloudinary');
const cloudinary = require('../config/cloudinary');

// Upload dispute unboxing video to Cloudinary under bukuta/dispute_videos
const storage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder: 'bukuta/dispute_videos',
    resource_type: 'video',
    allowed_formats: ['mp4', 'webm', 'mov'],
  },
});

const fileFilter = (_req, file, cb) => {
  const allowedMimes = ['video/mp4', 'video/webm', 'video/quicktime', 'video/mov'];
  if (allowedMimes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Hanya file video yang diizinkan (MP4, WEBM, MOV).'), false);
  }
};

const uploadDisputeVideo = multer({
  storage,
  fileFilter,
  limits: { fileSize: 100 * 1024 * 1024 }, // 100 MB max for videos
});

module.exports = uploadDisputeVideo;
