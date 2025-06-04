const axios = require("axios");
const Post = require("../models/postModel");
const linkedinService = require("../services/linkedinService");
const moment = require('moment'); // For date parsing and manipulation

/**
 * @desc Create a new LinkedIn user post (text only for now)
 * @route POST /api/post
 * @access Private (assumes auth in place elsewhere)
 */

const createPost = async (req, res) => {
  try {
    const { content, author = "admin" } = req.body;

    // Basic validation
    if (!content || content.trim() === "") {
      return res.status(400).json({
        success: false,
        error: {
          type: 'VALIDATION_ERROR',
          message: 'Post content is required.'
        }
      });
    }

    // Call LinkedIn service to create the post
    const result = await linkedinService.createPost(content, false); // false = user post

    // Save to MongoDB
    const newPost = new Post({
      content,
      linkedInId: result.linkedInId,
      author,
      isCompanyPost: false,
    });

    await newPost.save();

    // Respond with success and saved post
    return res.status(201).json({ success: true, post: newPost });

  } catch (error) {
    console.error("ERROR in createPost:", error);
    return res.status(500).json({
      success: false,
      error: {
        type: 'SERVER_ERROR',
        message: error.message || 'Failed to create post'
      }
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


module.exports = {
  createPost,
  deletePost,
  getAllPosts,
  updatePost,
  getPostById,
  getPostsByDate,
  getPostsByMonth
};
