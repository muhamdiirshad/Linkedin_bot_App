const mongoose = require('mongoose');

const postSchema = new mongoose.Schema({
  content: {
    type: String,
    required: true,
    trim: true,
  },
  status: {
    type: String,
    enum: ['draft', 'published', 'scheduled'],
    default: 'draft',
  },
  platform: {
    type: String,
    enum: ['linkedin', 'instagram'],
    required: true,
  },
  linkedInId: {
    type: String,
    default: null,
  },
  author: {
    type: String,
    required: true,
  },
  isCompanyPost: {
    type: Boolean,
    default: false,
  },

  // Engagement
  likes: [{
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  }],
  comments: [{
    text: {
      type: String,
      required: true,
      trim: true,
    },
    author: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    }
  }],

  // Scheduling & Posting
  scheduled: {
    type: Boolean,
    default: false,
  },
  posted: {
    type: Boolean,
    default: false,
  },
  postedAt: {
    type: Date,
  },

}, {
  timestamps: true, // createdAt, updatedAt
});


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


