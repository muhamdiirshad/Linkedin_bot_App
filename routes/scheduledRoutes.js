const express = require('express');
const router = express.Router();
const scheduledController = require('../controllers/scheduledController');

// Create
router.post('/', scheduledController.createPost);

// Read All
router.get('/', scheduledController.getAllPosts);

// Read One
router.get('/:id', scheduledController.getPostById);

// Update
router.put('/:id', scheduledController.updatePost);

// Delete
router.delete('/:id', scheduledController.deletePost);

module.exports = router;
