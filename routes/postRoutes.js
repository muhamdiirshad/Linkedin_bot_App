const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.post('/', postController.createPost);
router.get('/', postController.getPosts);
router.get('/:id', postController.getPostById);
router.put('/:id', postController.updatePost);
router.delete('/:id', postController.deletePost);

// router.get("/total-count", postController.getTotalPostCount);
// router.post('/upload', uploadMediaPost);

// getTotalCountofPosts
router.get("/total-count", postController.getTotalPostCount);


// Date-based filtering
router.get('/by-date/:date', postController.getPostsByDate);

// Month-based filtering
router.get('/by-month/:month', postController.getPostsByMonth);

// 📌 Route: GET /api/posts/tag/:tag
router.get('/tag/:tag', postController.getPostsByTag);

module.exports = router;
