const express = require('express');
const router = express.Router();
const postController = require('../controllers/postController');

router.get('/total-count', postController.getTotalPostCount); //get total count of posts
router.get('/by-date/:date', postController.getPostsByDate);  //get post date wise
router.get('/by-month/:month', postController.getPostsByMonth); //get post month wise
router.get('/tag/:tag', postController.getPostsByTag);

router.post('/', postController.createPost);   //create post
router.get('/', postController.getPosts);      //get all posts
router.get('/:id', postController.getPostById); //get post by id
router.put('/:id', postController.updatePost);   //update post by id
router.delete('/:id', postController.deletePost); //delete post by id


module.exports = router;
