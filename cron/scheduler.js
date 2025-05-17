const cron = require('node-cron');
const linkedinService = require('../services/linkedinService');
const { fetchScheduledPostsToPost } = require('../services/schedulerService');
const ScheduledPost = require('../models/scheduledModel');

cron.schedule('* * * * *', async () => {
  console.log("🔍 Checking for scheduled posts...");

  try {
    const posts = await fetchScheduledPostsToPost();
    if (!posts.length) {
      return console.log("📭 No scheduled posts found.");
    }

    for (let post of posts) {
      if (post.isPosted) {
        console.log(`⚠️ Skipping already posted content: "${post._id}"`);
        continue;
      }

      try {
               
        // Update DB to mark as posted
        await ScheduledPost.findByIdAndUpdate(post._id, {
          isCompanyPost: false,
          postedAt: new Date()
        });

        console.log(`✅ Successfully posted: "${post._id}"`);

      } catch (error) {
        if (error.message.includes("Content is a duplicate")) {
          console.warn(`⚠️ Duplicate content error for "${post._id}". Consider altering content.`);
        } else {
          console.error(`❌ Failed to post "${post._id}":`, error);
        }
      }
    }

  } catch (error) {
    console.error("🔥 Error in scheduled task:", error);
  }
});
