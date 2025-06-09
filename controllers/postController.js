const axios = require("axios");
const Post = require("../models/postModel");
const linkedinService = require("../services/linkedinService");
const moment = require('moment'); // For date parsing and manipulation

/**
 * @desc Create a new LinkedIn user post (text only for now)
 * @route POST /api/post
 * @access Private (assumes auth in place elsewhere)
 */

// 📌 Create a new LinkedIn or Instagram user post (text only for now)
const createPost = async (req, res) => {
  try {
    let { content, author = 'admin', status = 'draft', platform, scheduledAt } = req.body;

    // ✅ Validation: content required
    if (!content || content.trim() === '') {
      return res.status(400).json({
        success: false,
        message: 'Post content is required.',
      });
    }

    // ✅ Validation: allowed statuses
    const allowedStatuses = ['draft', 'published', 'scheduled'];
    if (status && !allowedStatuses.includes(status)) {
      return res.status(400).json({
        success: false,
        message: `Invalid status '${status}'. Allowed statuses: ${allowedStatuses.join(', ')}`,
      });
    }

    // ✅ Validation: platform
    const allowedPlatforms = ['linkedin', 'instagram'];
    if (!platform || !allowedPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `Invalid platform '${platform}'. Allowed platforms: ${allowedPlatforms.join(', ')}`,
      });
    }

    // ✅ Auto-mark as 'scheduled' if scheduledAt is provided
    if (scheduledAt && status !== 'scheduled') {
      status = 'scheduled';
    }

    // ✅ If status is 'scheduled', scheduledAt is mandatory
    if (status === 'scheduled' && !scheduledAt) {
      return res.status(400).json({
        success: false,
        message: 'Scheduled posts require a scheduledAt datetime.',
      });
    }

    // ✅ Optional LinkedIn post if published immediately
    let linkedInResult = null;
    if (status === 'published' && platform === 'linkedin') {
      linkedInResult = await linkedinService.createPost(content, false); // false = user post
    }

    // ✅ Create and save post
    const newPost = new Post({
      content,
      linkedInId: linkedInResult?.linkedInId || null,
      author,
      isCompanyPost: false,
      status,
      platform,
      scheduledAt: scheduledAt || null,
      posted: status === 'published', // already posted if status is published
      postedAt: status === 'published' ? new Date() : null,
    });

    await newPost.save();

    return res.status(201).json({
      success: true,
      post: newPost,
    });
  } catch (error) {
    console.error('Error in createPost:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create post. Please try again later.',
    });
  }
};


const getAllPosts = async (req, res) => {
  try {
    // Fetch all posts using the model method
    const posts = await Post.find(); // This retrieves all posts in the database

    console.log("Fetched posts:", posts); // Log the posts for debugging

    // Check if no posts are found
    if (posts.length === 0) {
      return res.status(404).json({
        success: false,
        message: 'No posts available'
      });
    }

    // Respond with the posts
    res.status(200).json({
      success: true,
      message: 'Posts fetched successfully',
      posts
    });

  } catch (error) {
    console.error("Error in getAllPosts:", error);
    // Handle any errors during the fetching process
    res.status(500).json({
      success: false,
      message: 'Failed to fetch posts',
      error: error.message
    });
  }
};

const getPostById = async (req, res) => {
  try {
    const postId = req.params.id;
    const post = await Post.findById(postId);

    if (!post) {
      return res.status(404).json({
        success: false,
        message: 'Post not found'
      });
    }

    res.json({
      success: true,
      post
    });

  } catch (error) {
    console.error("Error fetching post by ID:", error);
    res.status(500).json({
      success: false,
      message: 'Failed to fetch post',
      error: error.message
    });
  }
};


//Update contentPost on Linkedin
const updatePost = async (req, res) => {
  const { postId, newContent } = req.body;
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;

  // Step 1: Remove "urn:li:share:" if included
  const idOnly = postId.replace("urn:li:share:", "");

  try {
    // Step 2: Delete existing post
    await axios.delete(`${process.env.LINKEDIN_API_URL}/shares/${idOnly}`, {
      headers: { Authorization: `Bearer ${accessToken}` }
    });

    // Step 3: Create new post with newContent
    const result = await linkedinService.createPost(newContent, false); // false = user post

    res.json({
      success: true,
      message: "Post updated (old one deleted, new one created)",
      linkedInId: result.linkedInId
    });
  } catch (error) {
    console.error("Update Post Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: {
        type: "SERVER_ERROR",
        message: "Failed to update the LinkedIn post"
      }
    });
  }
};


/**
 * @desc Delete a LinkedIn post by its ID
 * @route DELETE /api/post/:postId
 * @access Private
 */

const deletePost = async (req, res) => {
  // Log the request parameters for debugging
  console.log("Post deleted successfully from LinkedIn:", req.params);

  const { postId } = req.params;

  // If postId is not provided, return a 400 Bad Request
  if (!postId) {
    return res.status(400).json({
      success: false,
      error: {
        type: "BAD_REQUEST",
        message: "Post ID is required",
      },
    });
  }

  // Construct the LinkedIn URN (Uniform Resource Name) for the post
  const accessToken = process.env.LINKEDIN_ACCESS_TOKEN;
  const urn = `urn:li:share:${postId}`;

  try {
    // Send a DELETE request to LinkedIn's API to remove the post
    await axios.delete(`${process.env.LINKEDIN_API_URL}/shares/${urn}`, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });


    // Remove the post record from the local MongoDB database
    await Post.findOneAndDelete({ linkedinId: urn });

    // Respond with success
    res.json({
      success: true,
      message: "Post deleted successfully from LinkedIn",
      linkedInId: urn,
    });
  } catch (error) {
    
    console.error("LinkedIn Delete Error:", error.response?.data || error.message);
    res.status(500).json({
      success: false,
      error: error.response?.data || error.message,
    });
  }
};

/**
 * Get posts by specific date
 * GET /posts/by-date/:date
 * date format: dd-mm-yy (e.g., 15-06-25)
 * Optional query params: status, platform
 */
const getPostsByDate = async (req, res) => {
  try {
    const { date } = req.params; // dd-mm-yy
    const { status, platform } = req.query;

    // Parse date using moment
    const parsedDate = moment(date, "DD-MM-YY", true);
    if (!parsedDate.isValid()) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid date format. Use dd-mm-yy" 
      });
    }

    // Create date range for the day (start to end)
    const startOfDay = parsedDate.startOf('day').toDate();
    const endOfDay = parsedDate.endOf('day').toDate();

    // Build the query
    const query = {
      createdAt: { $gte: startOfDay, $lte: endOfDay }
    };

    if (status) query.status = status;
    if (platform) query.platform = platform;

    const posts = await Post.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error("Error in getPostsByDate:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts by date",
      error: error.message
    });
  }
};

/**
 * Get posts by month
 * GET /posts/by-month/:month
 * month format: mm-yy (e.g., 06-25)
 * Optional query params: status, platform
 */
const getPostsByMonth = async (req, res) => {
  try {
    const { month } = req.params; // mm-yy
    const { status, platform } = req.query;

    // Parse month-year using moment
    const parsedMonth = moment(month, "MM-YY", true);
    if (!parsedMonth.isValid()) {
      return res.status(400).json({ 
        success: false, 
        message: "Invalid month format. Use mm-yy" 
      });
    }

    // Get start and end of the month
    const startOfMonth = parsedMonth.startOf('month').toDate();
    const endOfMonth = parsedMonth.endOf('month').toDate();

    // Build the query
    const query = {
      createdAt: { $gte: startOfMonth, $lte: endOfMonth }
    };

    if (status) query.status = status;
    if (platform) query.platform = platform;

    const posts = await Post.find(query).sort({ createdAt: -1 });

    res.json({
      success: true,
      count: posts.length,
      posts
    });
  } catch (error) {
    console.error("Error in getPostsByMonth:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch posts by month",
      error: error.message
    });
  }
};

/* @desc Get total post count grouped by platform, optionally filter by status
  @route GET /api/post/total-count 
*/ 
const getTotalPostCount = async (req, res) => {
  try {
    const { status } = req.query; // optional filter by status

    // Build the match stage
    const matchStage = {};
    if (status) {
      matchStage.status = status;
    }

    // Use aggregation to group by platform and count
    const breakdown = await Post.aggregate([
      { $match: matchStage },
      {
        $group: {
          _id: "$platform", // assuming field name is 'platform'
          count: { $sum: 1 }
        }
      }
    ]);

    // Convert aggregation result into { platformName: count }
    const formattedBreakdown = {};
    let totalCount = 0;

    breakdown.forEach(item => {
      formattedBreakdown[item._id] = item.count;
      totalCount += item.count;
    });

    return res.json({ success: true, totalCount, breakdown: formattedBreakdown});
  } catch (error) {
    console.error("Error in getTotalPostCount:", error);
    res.status(500).json({ success: false, message: "Failed to fetch total post count", error: error.message});
  }
};

// 📌 Get posts by tag (with pagination and optional platform filter)
const getPostsByTag = async (req, res) => {
  try {
    const allowedTags = ['all', 'published', 'scheduled', 'draft'];
    const { tag } = req.params;
    const { page = 1, limit = 10, platform } = req.query;

    // ✅ Validate the tag
    if (!allowedTags.includes(tag)) {
      return res.status(400).json({
        success: false,
        message: `Invalid tag '${tag}'. Allowed tags: ${allowedTags.join(', ')}`,
      });
    }

    // ✅ Validate platform, if provided
    const allowedPlatforms = ['linkedin', 'instagram'];
    if (platform && !allowedPlatforms.includes(platform)) {
      return res.status(400).json({
        success: false,
        message: `Invalid platform '${platform}'. Allowed platforms: ${allowedPlatforms.join(', ')}`,
      });
    }

    // ✅ Build query dynamically
    const query = {};
    if (tag !== 'all') query.status = tag;
    if (platform) query.platform = platform;

    const skip = (parseInt(page) - 1) * parseInt(limit);

    const [posts, total] = await Promise.all([
      Post.find(query)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(parseInt(limit)),
      Post.countDocuments(query),
    ]);

    return res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        total,
        page: parseInt(page),
        limit: parseInt(limit),
        pages: Math.ceil(total / limit),
      },
    });
  } catch (err) {
    console.error("Error in getPostsByTag:", err);
    return res.status(500).json({ success: false, message: 'Failed to retrieve posts.' });
  }
};

module.exports = {
  createPost,
  deletePost,
  getAllPosts,
  updatePost,
  getPostById,
  getPostsByDate,
  getPostsByMonth,
  getTotalPostCount,
  getPostsByTag
};
