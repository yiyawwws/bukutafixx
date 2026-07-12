const multer = require('multer');
// Upload dispute video disimpan ke memory sebelum di-insert ke DB
const storage = multer.memoryStorage();

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
