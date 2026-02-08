const express = require('express'); //import express
const multer = require('multer');

// 1. Create route object
const router  = express.Router(); 

// 1b. Create multer object for parsing forms
const storage = multer.memoryStorage();
const upload = multer({
    storage: storage,
    limits: {
        fileSize: 5 * 1024 * 1024 // Límite de 5MB
    },
    fileFilter: (req, file, cb) => {
        // Aceptar solo imágenes
        if (file.mimetype.startsWith('image/')) {
            cb(null, true);
        } else {
            cb(new Error('Can only receive image files'), false);
        }
    }
});

// 2. Import controller
const drawingsController = require('../controllers/drawings-controller.js'); 
// 3. Route to obtain table
router.post('/drawings', upload.single('drawing'), drawingsController.newMessage);
router.get('/drawings', drawingsController.getAllMessages);
router.get('/drawings/pastId/:messageId', drawingsController.getMessagesPastId);
// 4. 
module.exports = router; // export to use in server.js

console.log("Todo ejecutado de routes :-)")