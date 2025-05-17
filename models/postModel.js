const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: { type: String, required: true },
  linkedInId: { type: String },
  author: { type: String, required: true },
  isCompanyPost: { type: Boolean, default: false },
  likes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }],
  comments: [{
    text: String,
    author: { type: mongoose.Schema.Types.ObjectId, ref: 'User' }
  }],
  scheduled: { type: Boolean, default: false },
  posted: { type: Boolean, default: false },
  postedAt: Date,
}, { timestamps: true });

// Edit post method
postSchema.statics.updatePost = async function (postId, content) {
  try {
    const post = await this.findById(postId);
    if (!post) throw new Error('Post not found');
    post.content = content;
    return await post.save();
  } catch (error) {
    throw new Error(error.message);
  }
};

// Delete post method
postSchema.statics.deletePost = async function (postId) {
  try {
    const post = await this.findById(postId);
    if (!post) throw new Error('Post not found');
    return await this.findByIdAndDelete(postId);
  } catch (error) {
    throw new Error(error.message);
  }
};

module.exports = mongoose.model('Post', postSchema);


