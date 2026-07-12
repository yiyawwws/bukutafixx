const express = require('express');
const router = express.Router();
const FileController = require('../controllers/FileController');

router.get('/:id', FileController.getFile);

module.exports = router;
