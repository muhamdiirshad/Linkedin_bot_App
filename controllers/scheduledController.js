const ScheduledPost = require('../models/scheduledModel');

// CREATE a scheduled post with duplicate title check (if needed)
exports.createPost = async (req, res) => {
  try {

    const post = new ScheduledPost(req.body);
    await post.save();
    res.status(201).json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// READ all scheduled posts
exports.getAllPosts = async (req, res) => {
  try {
    const posts = await ScheduledPost.find();
    res.json(posts);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// READ a single post by ID
exports.getPostById = async (req, res) => {
  try {
    const post = await ScheduledPost.findById(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

// UPDATE a post by ID
exports.updatePost = async (req, res) => {
  try {
    const post = await ScheduledPost.findByIdAndUpdate(req.params.id, req.body, { new: true });
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json(post);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
};

// DELETE a post by ID
exports.deletePost = async (req, res) => {
  try {
    const post = await ScheduledPost.findByIdAndDelete(req.params.id);
    if (!post) return res.status(404).json({ error: 'Post not found' });
    res.json({ message: 'Post deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};
