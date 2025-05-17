const axios = require('axios'); 
const linkedinConfig = require('../config/linkedin');
require("dotenv").config(); // Load environment variables from .env

// Create LinkedIn API instance
/**
 * A reusable Axios instance pre-configured for LinkedIn API calls.
 * Includes Authorization header, Content-Type, and REST API version.
 */
const api = axios.create({
  baseURL: process.env.LINKEDIN_API_URL || 'https://api.linkedin.com/v2',
  headers: {
    'Authorization': `Bearer ${process.env.LINKEDIN_ACCESS_TOKEN}`,
    'Content-Type': 'application/json',
    'X-Restli-Protocol-Version': '2.0.0' // Required by LinkedIn API
  }
});


// Build the payload for a LinkedIn UGC/ (User generated content) post

/**
 * Constructs the LinkedIn post payload for either a user or company.
 * @param {string} content - Text content of the post
 * @param {boolean} isCompanyPost - Whether the post is from a company
 * @returns {Object} Payload to be sent to LinkedIn API
 */
const buildPost = (content, isCompanyPost) => ({
  author: isCompanyPost
    ? `urn:li:organization:${process.env.LINKEDIN_COMPANY_ID}`
    : `urn:li:person:${process.env.LINKEDIN_USER_ID}`,
  lifecycleState: "PUBLISHED", // Sets the post as live
  specificContent: {
    "com.linkedin.ugc.ShareContent": {
      shareCommentary: { text: content }, // Actual post text
      shareMediaCategory: "NONE" // Can be changed to IMAGE, VIDEO, etc.
    }
  },
  visibility: {
    "com.linkedin.ugc.MemberNetworkVisibility": "PUBLIC" // Visible to everyone
  }
});

module.exports = {   

/**
 * Posts a simple text-only post to LinkedIn.
 *
 * @param {string} content - The post text
 * @param {boolean} isCompanyPost - Whether to post as a company (default: true)
 * @returns {Promise<{success: boolean, message: string, linkedInId?: string}>}
 */
async postToLinkedIn(content, isCompanyPost = false) {
  try {
    // Call the createPost method from the module that handles the LinkedIn API interaction
    const postResponse = await this.createPost(content, isCompanyPost);

    // Return the success response with the LinkedIn ID
    return {
      success: true,
      message: "Text post published successfully on LinkedIn",
      linkedInId: postResponse.id  // Assuming postResponse contains LinkedIn post ID
    };

  } catch (error) {
    console.error('Post failed:', error.response?.data || error.message);

    // Provide more detailed error handling
    const errorMessage = error.response?.data?.message || 'Failed to post to LinkedIn';
    throw new Error(errorMessage);
  }
},

  // Create a LinkedIn post (UGC - User Generated Content)
 

  /**
   * Publishes a LinkedIn post (text only for now).
   * @param {string} content - The post text
   * @param {boolean} isCompanyPost - Whether to post as a company
   * @returns {Promise<{success: boolean, message: string, linkedInId?: string}>}
   */
  async createPost(content, isCompanyPost = false) {
    try {
      const payload = buildPost(content, isCompanyPost); // Build post data
      const response = await api.post('/ugcPosts', payload); // Send request to LinkedIn


      console.log("Full LinkedIn API Response:", response.data); // Debug output

      // If LinkedIn doesn't return an ID, treat as an error
      if (!response.data || !response.data.id) {
        throw new Error("LinkedIn response does not contain a post ID.");
      }

      // Return success response with LinkedIn post ID
      return {
        success: true,
        message: "Post created successfully on LinkedIn",
        linkedInId: response.data.id
      };

    } catch (error) {
      // Handle and log any LinkedIn API errors
      console.error('LinkedIn API Error:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to create post');
    }
  },

   //Update contentPost on Linkedin
    /**
   * Updates a LinkedIn post by deleting the old one and creating a new one.
   * @param {string} postId - The URN of the existing post to update
   * @param {string} newContent - The new content for the post
   * @param {boolean} isCompanyPost - Whether the post is from a company
   * @returns {Promise<{success: boolean, message: string, newPostId?: string}>}
   */
    async updatePost(postId, newContent, isCompanyPost = false) {
      try {
        // Step 1: Delete the existing post
        const deleteResult = await this.deletePost(postId);
        console.log('Deleted old post:', deleteResult.message);
  
        // Step 2: Create the new post with updated content
        const newPost = await this.createPost(newContent, isCompanyPost);
  
        return {
          success: true,
          message: 'Post updated successfully by deleting and recreating',
          newPostId: newPost.linkedInId
        };
      } catch (error) {
        console.error('Update failed:', error.response?.data || error.message);
        throw new Error(error.response?.data?.message || 'Failed to update the LinkedIn post');
      }
    },

  // ======================================
  // Delete a LinkedIn post (UGC or Share)
  // ======================================

  /**
   * Deletes a LinkedIn post using its URN.
   * Supports both UGC posts and shares.
   * @param {string} postId - Full URN (e.g., "urn:li:ugcPost:1234")
   * @returns {Promise<{success: boolean, message: string}>}
   */
  async deletePost(postId) {
    try {
      let endpoint = '';

      // Determine the correct endpoint based on the post type
      if (postId.startsWith("urn:li:ugcPost:")) {
        endpoint = `/ugcPosts/${postId.replace("urn:li:ugcPost:", "")}`;
      } else if (postId.startsWith("urn:li:share:")) {
        endpoint = `/shares/${postId.replace("urn:li:share:", "")}`;
      } else {
        throw new Error('Invalid LinkedIn post ID format');
      }

      // Send DELETE request to LinkedIn API
      await api.delete(endpoint);

      return {
        success: true,
        message: "Post deleted successfully from LinkedIn"
      };

    } catch (error) {
      // Handle and log any LinkedIn API errors
      console.error('Delete failed:', error.response?.data || error.message);
      throw new Error(error.response?.data?.message || 'Failed to delete LinkedIn post');
    }
  }
};

async function publish(content, mediaUrl, mediaType) {
  // Detect type and call LinkedIn API accordingly
  if (mediaType === 'image') {
    // Post image
  } else if (mediaType === 'video') {
    // Post video
  } else {
    // Post text-only
  }
}
// module.exports = { publish };