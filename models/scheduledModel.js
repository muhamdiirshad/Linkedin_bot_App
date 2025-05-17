const mongoose = require('mongoose');

const scheduledPostSchema = new mongoose.Schema({
  content: String,
  mediaUrl: String,
  mediaType: String, // 'image', 'video', etc.
  scheduleTime: Date,
  isPosted: {
    type: Boolean,
    default: false,
  },
  postedAt: {
    type: Date,
  },
  isCompanyPost: { type: Boolean, default: false },
});

module.exports = mongoose.model('ScheduledPost', scheduledPostSchema);