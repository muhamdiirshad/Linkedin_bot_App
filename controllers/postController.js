const mongoose = require('mongoose');
const Post = require("../models/postModel");
const linkedinService = require("../services/linkedinService"); // Assuming this exists
const moment = require('moment'); // For date parsing and manipulation
const axios = require("axios"); // For updatePost and deletePost LinkedIn interactions


/**
 * @desc Create a new dynamic post (direct or scheduled)
 * @route POST /api/posts
 * @access Private (Assumes authentication middleware is applied)
 */
const createPost = async (req, res) => {
    console.log('Incoming createPost Request Body:', req.body);
    try {
        let { content, author, status, platform, scheduledAt } = req.body;

        // 1. Basic Field Validation
        if (!content || content.trim() === '') {
            return res.status(400).json({
                success: false,
                message: 'Post content is required.'
            });
        }
        if (!platform) {
            return res.status(400).json({
                success: false,
                message: 'Platform is required (e.g., "linkedin", "instagram").'
            });
        }

        // Default author if not provided (consider using req.user.id from auth middleware)
        author = author || (req.user ? req.user.username : 'system'); // Use authenticated user or 'system'
        // If you are using req.user.id for linking posts to users, you'd save req.user.id as the author_id in the DB

        // 2. Platform Validation
        const allowedPlatforms = ['linkedin', 'instagram'];
        if (!allowedPlatforms.includes(platform.toLowerCase())) {
            return res.status(400).json({
                success: false,
                message: `Invalid platform '${platform}'. Allowed platforms: ${allowedPlatforms.join(', ')}.`,
            });
        }
        platform = platform.toLowerCase(); // Standardize platform name

        // 3. Status and Scheduling Logic
        const allowedStatuses = ['draft', 'published', 'scheduled'];
        let finalStatus = (status && allowedStatuses.includes(status.toLowerCase())) ? status.toLowerCase() : 'draft'; // Default to 'draft'

        let postDate = null; // Will store the date the post was actually published
        let isPosted = false; // Flag if the post has been published to a platform

        // If scheduledAt is provided, force status to 'scheduled'
        if (scheduledAt) {
            finalStatus = 'scheduled';
            const parsedScheduledAt = moment(scheduledAt);
            if (!parsedScheduledAt.isValid() || parsedScheduledAt.isBefore(moment())) {
                return res.status(400).json({
                    success: false,
                    message: 'Invalid or past scheduledAt datetime. Use ISO 8601 format (e.g., "YYYY-MM-DDTHH:mm:ssZ") and ensure it is in the future.',
                });
            }
            // Store as Date object for MongoDB
            scheduledAt = parsedScheduledAt.toDate();
        } else if (finalStatus === 'scheduled') {
            // If status is explicitly 'scheduled' but no scheduledAt is provided
            return res.status(400).json({
                success: false,
                message: 'A post with status "scheduled" requires a "scheduledAt" datetime.',
            });
        } else if (finalStatus === 'published') {
            // If direct post (published immediately)
            isPosted = true;
            postDate = new Date();
        }

        // 4. Optional LinkedIn Post for 'published' status
        let linkedInId = null;
        if (finalStatus === 'published' && platform === 'linkedin') {
            try {
                // Assuming linkedinService.createPost returns { linkedInId: "urn:li:share:..." }
                const linkedInResult = await linkedinService.createPost(content); // Adjust this call based on your service
                linkedInId = linkedInResult.linkedInId;
            } catch (linkedInError) {
                console.error('Failed to post to LinkedIn immediately:', linkedInError.message);
                // Decide if you want to fail the whole post creation or save as draft/scheduled
                // For now, we'll return an error, but you might want to save it as 'draft'
                return res.status(500).json({
                    success: false,
                    message: `Failed to publish to LinkedIn: ${linkedInError.message}. Post not created.`,
                    errorDetails: linkedInError.response?.data || linkedInError.message
                });
            }
        }

        // 5. Create and Save Post to DB
        const newPost = new Post({
            content,
            author, // Assuming author is just a string, otherwise use req.user.id for user relationship
            status: finalStatus,
            platform,
            scheduledAt: scheduledAt,
            posted: isPosted,
            postedAt: postDate,
            linkedInId: linkedInId, // Will be null if not posted to LinkedIn immediately
            // Add user ID if you implemented user-specific posts
            // user: req.user.id // Requires authMiddleware to set req.user.id
        });

        await newPost.save();

        return res.status(201).json({
            success: true,
            message: 'Post created successfully!',
            post: newPost,
        });

    } catch (error) {
        console.error('Error in createPost:', error);
        // Handle Mongoose validation errors
        if (error.name === 'ValidationError') {
            const messages = Object.values(error.errors).map(val => val.message);
            return res.status(400).json({ success: false, message: messages.join(', ') });
        }
        return res.status(500).json({
            success: false,
            message: 'Failed to create post. Please try again later.',
            error: error.message
        });
    }
};

/**
 * @desc Get all posts (optionally filtered by status, platform, date, month, tag)
 * @route GET /api/posts
 * @queryParams status, platform, date (DD-MM-YY), month (MM-YY), tag (all, published, scheduled, draft), page, limit
 * @access Private
 */
const getPosts = async (req, res) => {
    try {
        const { status, platform, date, month, tag, page = 1, limit = 10 } = req.query; // Use req.query for all filters

        const query = {};
        // If you're managing user-specific posts:
        // query.user = req.user.id;

         // Pagination
        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);

        // 1. Prevent both date and month being used together
        if (date && month) {
            return res.status(400).json({
                success: false,
                message: "Please provide either 'date' or 'month', not both.",
            });
        }

        // 2. Validate and parse pagination
        if (isNaN(pageNum) || pageNum <= 0 || isNaN(limitNum) || limitNum <= 0) {
            return res.status(400).json({
                success: false,
                message: "'page' and 'limit' must be positive integers.",
            });
        }
        const skip = (pageNum - 1) * limitNum;

        // Filtering by status
        const allowedStatuses = ['draft', 'published', 'scheduled'];
        if (status) {
            const lowerStatus = status.toLowerCase();
            if (!allowedStatuses.includes(lowerStatus)) {
                return res.status(400).json({ success: false, message: `Invalid status '${status}'. Allowed: ${allowedStatuses.join(', ')}.` });
            }
            query.status = lowerStatus;
        }

        // Filtering by platform
        const allowedPlatforms = ['linkedin', 'instagram'];
        if (platform) {
            const lowerPlatform = platform.toLowerCase();
            if (!allowedPlatforms.includes(lowerPlatform)) {
                return res.status(400).json({ success: false, message: `Invalid platform '${platform}'. Allowed: ${allowedPlatforms.join(', ')}.` });
            }
            query.platform = lowerPlatform;
        }

        // Filtering by date (DD-MM-YY)
        if (date) {
            const parsedDate = moment(date, "DD-MM-YY", true);
            if (!parsedDate.isValid()) {
                return res.status(400).json({ success: false, message: "Invalid date format for 'date' query. Use DD-MM-YY." });
            }
            query.createdAt = {
                $gte: parsedDate.startOf('day').toDate(),
                $lte: parsedDate.endOf('day').toDate()
            };
        }

        // Filtering by month (MM-YY)
        if (month) {
            const parsedMonth = moment(month, "MM-YY", true);
            if (!parsedMonth.isValid()) {
                return res.status(400).json({ success: false, message: "Invalid month format for 'month' query. Use MM-YY." });
            }
            query.createdAt = {
                $gte: parsedMonth.startOf('month').toDate(),
                $lte: parsedMonth.endOf('month').toDate()
            };
        }

        // Filtering by tag (from your `getPostsByTag` logic)
        // Note: Using 'tag' as a query parameter in `getPosts` rather than a path parameter
        if (tag) {
            const allowedTags = ['all', ...allowedStatuses]; // 'all' covers all statuses
            const lowerTag = tag.toLowerCase();
            if (!allowedTags.includes(lowerTag)) {
                return res.status(400).json({ success: false, message: `Invalid tag '${tag}'. Allowed: ${allowedTags.join(', ')}.` });
            }
            if (lowerTag !== 'all') {
                query.status = lowerTag;
            }
        }

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(limitNum),
            Post.countDocuments(query),
        ]);

        if (posts.length === 0 && total === 0) { // Check both to avoid 404 on valid empty filters
            return res.status(404).json({
                success: false,
                message: 'No posts found matching the criteria.'
            });
        }

        return res.status(200).json({
            success: true,
            message: 'Posts fetched successfully',
            data: posts,
            pagination: {
                total,
                page: pageNum,
                limit: limitNum,
                pages: Math.ceil(total / limitNum),
            },
        });

    } catch (error) {
        console.error("Error in getPosts:", error);
        res.status(500).json({
            success: false,
            message: 'Failed to fetch posts',
            error: error.message
        });
    }
};

/**
 * @desc Get a single post by ID
 * @route GET /api/posts/:id
 * @access Private
 */
const getPostById = async (req, res) => {
    try {
        const postId = req.params.id;

         // 1. Validate MongoDB ObjectId
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({
                success: false,
                message: 'Invalid Post ID format.'
            });
        }
         // Find post by ID, ensure it belongs to the authenticated user if applicable
        const post = await Post.findOne({ _id: postId /* , user: req.user.id */ });

        if (!post) {
            return res.status(404).json({
                success: false,
                message: 'Post not found'
            });
        }

        res.status(200).json({
            success: true,
            post
        });

    } catch (error) {
        console.error("Error fetching post by ID:", error);
        if (error.name === 'CastError') { // Handle invalid MongoDB ID format
            return res.status(400).json({ success: false, message: 'Invalid Post ID format.' });
        }
        res.status(500).json({
            success: false,
            message: 'Failed to fetch post',
            error: error.message
        });
    }
};


/**
 * @desc Update a post by ID (updates local DB and optionally LinkedIn)
 * @route PUT /api/posts/:id
 * @access Private
 */
const updatePost = async (req, res) => {
    try {
        const postId = req.params.id;
        const { content, status, platform, scheduledAt } = req.body;

        // 1. Validate Post ID
        if (!postId || !mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: 'Invalid Post ID format.' });
        }

        // 2. Find the post
        const post = await Post.findById(postId);
        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        // 3. Validate and update content
        if (content !== undefined) {
            if (typeof content !== 'string' || content.trim() === '') {
                return res.status(400).json({ success: false, message: 'Content cannot be empty.' });
            }
            post.content = content;
        }

        // 4. Validate and update platform
        const allowedPlatforms = ['linkedin', 'instagram'];
        if (platform !== undefined) {
            const lowerPlatform = platform.toLowerCase();
            if (!allowedPlatforms.includes(lowerPlatform)) {
                return res.status(400).json({ success: false, message: `Invalid platform. Allowed: ${allowedPlatforms.join(', ')}` });
            }
            post.platform = lowerPlatform;
        }

        // 5. Validate and update status
        const allowedStatuses = ['draft', 'published', 'scheduled'];
        if (status !== undefined) {
            const lowerStatus = status.toLowerCase();
            if (!allowedStatuses.includes(lowerStatus)) {
                return res.status(400).json({ success: false, message: `Invalid status. Allowed: ${allowedStatuses.join(', ')}` });
            }
            post.status = lowerStatus;
        }

        // 6. Validate and update scheduledAt
        if (scheduledAt !== undefined) {
            if (post.status === 'scheduled') {
                const date = moment(scheduledAt);
                if (!date.isValid() || date.isBefore(moment())) {
                    return res.status(400).json({ success: false, message: 'Invalid scheduledAt. Must be a future datetime.' });
                }
                post.scheduledAt = date.toDate();
            } else {
                // If scheduledAt is provided but status is not 'scheduled'
                post.scheduledAt = null;
            }
        }

        // 7. Reset publishing fields if post is no longer published
        if (post.status !== 'published') {
            post.posted = false;
            post.postedAt = null;
            post.linkedInId = null;
        }

        // 8. Save the updated post
        const updatedPost = await post.save();

        return res.status(200).json({
            success: true,
            message: 'Post updated successfully!',
            post: updatedPost
        });

    } catch (err) {
        console.error(" Error updating post:", err);
        return res.status(500).json({
            success: false,
            message: 'Internal Server Error.',
            error: err.message
        });
    }
};


/**
 * @desc Delete a post by its ID (from local DB and optionally LinkedIn)
 * @route DELETE /api/posts/:id
 * @access Private
 */
const deletePost = async (req, res) => {
    const postId = req.params.id;

    try {
        if (!mongoose.Types.ObjectId.isValid(postId)) {
            return res.status(400).json({ success: false, message: 'Invalid Post ID format.' });
        }
        // Find the post to get its details before deleting
        // Ensure post belongs to authenticated user if applicable
        const post = await Post.findOne({ _id: postId /* , user: req.user.id */ });

        if (!post) {
            return res.status(404).json({ success: false, message: 'Post not found.' });
        }

        // If the post was published to LinkedIn, attempt to delete it there
        if (post.platform === 'linkedin' && post.linkedInId) {
            try {
                // LinkedIn requires the URN without "urn:li:share:" for DELETE
                const linkedInIdOnly = post.linkedInId.replace("urn:li:share:", "");
                const accessToken = process.env.LINKEDIN_ACCESS_TOKEN; // Ensure you have this token
                await axios.delete(`${process.env.LINKEDIN_API_URL}/shares/${linkedInIdOnly}`, {
                    headers: { Authorization: `Bearer ${accessToken}` }
                });
                console.log(`LinkedIn post ${post.linkedInId} deleted successfully.`);
            } catch (linkedinError) {
                console.warn(`Could not delete LinkedIn post ${post.linkedInId}: ${linkedinError.response?.data?.message || linkedinError.message}`);
                // Don't block local deletion even if LinkedIn fails, just log a warning
            }
        }

        // Delete the post from the local database
        await Post.deleteOne({ _id: postId });

        return res.status(200).json({
            success: true,
            message: 'Post deleted successfully from local database and LinkedIn (if applicable).'
        });

    } catch (error) {
        console.error("Error deleting post:", error);
        if (error.name === 'CastError') {
            return res.status(400).json({ success: false, message: 'Invalid Post ID format.' });
        }
        res.status(500).json({ success: false, message: 'Failed to delete post.', error: error.message });
    }
};


/* @desc Get total post count grouped by platform, optionally filter by status
 * @route GET /api/post/total-count
 */
const getTotalPostCount = async (req, res) => {
    try {
        const { status } = req.query; // optional filter by status

        // Build the match stage
        const allowedStatuses = ['draft', 'published', 'scheduled'];
        const matchStage = {};
         if (status) {
            const lowerStatus = status.toLowerCase();
            if (!allowedStatuses.includes(lowerStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status '${status}'. Allowed values: ${allowedStatuses.join(', ')}.`
                });
            }
            matchStage.status = lowerStatus;
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

        return res.status(200).json({
            success: true,
            message: `Total post count${status ? ` for status '${status}'` : ''} fetched successfully.`,
            totalCount,
            breakdown: formattedBreakdown
        });

    } catch (error) {
        console.error("Error in getTotalPostCount:", error);
        return res.status(500).json({ success: false, message: "Failed to fetch total post count", error: error.message});
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

       // Optional filters
        const allowedStatuses = ['draft', 'published', 'scheduled'];
        const allowedPlatforms = ['linkedin', 'instagram'];

        if (status) {
            const lowerStatus = status.toLowerCase();
            if (!allowedStatuses.includes(lowerStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status '${status}'. Allowed: ${allowedStatuses.join(', ')}.`
                });
            }
            query.status = lowerStatus;
        }

        if (platform) {
            const lowerPlatform = platform.toLowerCase();
            if (!allowedPlatforms.includes(lowerPlatform)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid platform '${platform}'. Allowed: ${allowedPlatforms.join(', ')}.`
                });
            }
            query.platform = lowerPlatform;
        }

        const posts = await Post.find(query).sort({ createdAt: -1 });

        return res.json({
            success: true,
            message: `Fetched ${posts.length} post(s) on ${date}${status ? ` with status '${status}'` : ''}${platform ? ` on '${platform}'` : ''}.`,
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

        // Allowed filters
        const allowedStatuses = ['draft', 'published', 'scheduled'];
        const allowedPlatforms = ['linkedin', 'instagram'];

        if (status) {
            const lowerStatus = status.toLowerCase();
            if (!allowedStatuses.includes(lowerStatus)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid status '${status}'. Allowed values: ${allowedStatuses.join(', ')}`
                });
            }
            query.status = lowerStatus;
        }

        if (platform) {
            const lowerPlatform = platform.toLowerCase();
            if (!allowedPlatforms.includes(lowerPlatform)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid platform '${platform}'. Allowed values: ${allowedPlatforms.join(', ')}`
                });
            }
            query.platform = lowerPlatform;
        }

        const posts = await Post.find(query).sort({ createdAt: -1 });

        res.json({
            success: true,
            message: `Fetched ${posts.length} post(s) for month ${month}${status ? ` with status '${status}'` : ''}${platform ? ` on '${platform}'` : ''}.`,
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

// 📌 Get posts by tag (with pagination and optional platform filter)
const getPostsByTag = async (req, res) => {
    try {
        const allowedTags = ['all', 'published', 'scheduled', 'draft'];
         const allowedPlatforms = ['linkedin', 'instagram'];

        const { tag } = req.params; // Changed from req.query to req.params for /by-tag/:tag route
        const { page = 1, limit = 10, platform } = req.query;

        // ✅ Validate the tag
        const lowerTag = tag.toLowerCase();
        if (!allowedTags.includes(lowerTag)) {
            return res.status(400).json({
                success: false,
                message: `Invalid tag '${tag}'. Allowed tags: ${allowedTags.join(', ')}`,
            });
        }

        // ✅ Validate platform, if provided
       if (platform) {
            platform = platform.toLowerCase();
            if (!allowedPlatforms.includes(platform)) {
                return res.status(400).json({
                    success: false,
                    message: `Invalid platform '${platform}'. Allowed platforms: ${allowedPlatforms.join(', ')}`,
                });
            }
        }

        const skip = (parseInt(page) - 1) * parseInt(limit);

        // ✅ Build query dynamically
        const query = {};

        if (lowerTag !== 'all') query.status = lowerTag;
        if (platform) query.platform = platform;

        const [posts, total] = await Promise.all([
            Post.find(query)
                .sort({ createdAt: -1 })
                .skip(skip)
                .limit(parseInt(limit)),
            Post.countDocuments(query),
        ]);

        return res.status(200).json({
            success: true,
            message: `Fetched ${posts.length} post(s)${lowerTag !== 'all' ? ` with status '${lowerTag}'` : ''}${platform ? ` on '${platform}'` : ''}.`,
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
        return res.status(500).json({ success: false, message: 'Failed to retrieve posts.', error: err.message });
    }
};


module.exports = {
    createPost,
    getPosts,
    getPostById,
    updatePost,
    deletePost,
    getTotalPostCount,
    getPostsByDate,    
    getPostsByMonth,  
    getPostsByTag    
};