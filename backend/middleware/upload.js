const multer = require('multer');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');
const { MAX_FILE_SIZE } = require('../config/constants');

// Ensure upload directory exists
const UPLOAD_DIR = path.join(__dirname, '../uploads');
if (!fs.existsSync(UPLOAD_DIR)) {
    fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// Configure multer storage
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        const subDir = path.join(UPLOAD_DIR, 'evidence');
        if (!fs.existsSync(subDir)) {
            fs.mkdirSync(subDir, { recursive: true });
        }
        cb(null, subDir);
    },
    filename: (req, file, cb) => {
        const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
        cb(null, uniqueName);
    }
});

// File filter — allow images, videos, documents, audio
const fileFilter = (req, file, cb) => {
    const allowedMimes = [
        // Images
        'image/jpeg', 'image/png', 'image/gif', 'image/webp', 'image/bmp',
        // Videos
        'video/mp4', 'video/avi', 'video/mkv', 'video/webm',
        // Documents
        'application/pdf',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
        'application/vnd.ms-excel',
        'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        'text/plain',
        // Audio
        'audio/mpeg', 'audio/wav', 'audio/ogg'
    ];

    if (allowedMimes.includes(file.mimetype)) {
        cb(null, true);
    } else {
        cb(new Error(`File type ${file.mimetype} is not allowed. Allowed: images, videos, documents, audio.`), false);
    }
};

// Single file upload
const uploadSingle = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
}).single('file');

// Multiple files upload (max 10)
const uploadMultiple = multer({
    storage,
    fileFilter,
    limits: { fileSize: MAX_FILE_SIZE }
}).array('files', 10);

// Wrapper to handle multer errors gracefully
const handleUpload = (uploadFn) => {
    return (req, res, next) => {
        uploadFn(req, res, (err) => {
            if (err instanceof multer.MulterError) {
                if (err.code === 'LIMIT_FILE_SIZE') {
                    return res.status(413).json({
                        success: false,
                        message: `File too large. Maximum size is ${MAX_FILE_SIZE / (1024 * 1024)}MB.`
                    });
                }
                return res.status(400).json({
                    success: false,
                    message: `Upload error: ${err.message}`
                });
            }
            if (err) {
                return res.status(400).json({
                    success: false,
                    message: err.message
                });
            }
            next();
        });
    };
};

module.exports = {
    uploadSingle: handleUpload(uploadSingle),
    uploadMultiple: handleUpload(uploadMultiple),
    UPLOAD_DIR
};
