const axios = require('axios'); 
const ScheduledPost = require('../models/scheduledModel');
const scheduler = require('../cron/scheduler');


/**
 * Fetch scheduled posts that are due to be posted
 * @returns {Promise<Array>} List of scheduled posts
 */
const fetchScheduledPostsToPost = async () => {
  try {
    const now = new Date();

    const postsToPost = await ScheduledPost.find({
      scheduleTime: { $lte: now },
      isCompanyPost: false, // prevent reposting
    });

    return postsToPost;
  } catch (error) {
    console.error('Error fetching scheduled posts:', error.message);
    return [];
  }
};

// CREATE a scheduled post with duplicate title check
const createPost = async (postData) => {
  const { content } = postData;
  if (existingPost) {
    throw new Error('Post with this title already exists');
  }

  const post = new ScheduledPost(postData);
  await post.save();
  return post;
};

// READ all scheduled posts
const getAllPosts = async () => {
  return await ScheduledPost.find();
};

// READ a single post by ID
const getPostById = async (postId) => {
  const post = await ScheduledPost.findById(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  return post;
};

// UPDATE a post by ID
const updatePost = async (postId, postData) => {
  const post = await ScheduledPost.findByIdAndUpdate(postId, postData, { new: true });
  if (!post) {
    throw new Error('Post not found');
  }
  return post;
};

// DELETE a post by ID
const deletePost = async (postId) => {
  const post = await ScheduledPost.findByIdAndDelete(postId);
  if (!post) {
    throw new Error('Post not found');
  }
  return { message: 'Schedule Post deleted successfully' };
};

// ✅ Export all functions in one object
module.exports = {
  fetchScheduledPostsToPost,
  createPost,
  getAllPosts,
  getPostById,
  updatePost,
  deletePost,
};