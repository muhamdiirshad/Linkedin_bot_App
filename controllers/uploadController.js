const uploadService = require('../services/uploadService');
const cloudinaryService = require('../services/cloudinaryService');
const flaskApiService = require('../services/flaskApiService');

// POST /api/upload/media
exports.uploadMedia = async (req, res) => {
  try {
    const { type, text, prompt } = req.body; // 👈 Allow optional prompt
    const file = req.file;

    if (!file) {
      return res.status(400).json({ success: false, error: "No file uploaded." });
    }

    if (!['image', 'video'].includes(type)) {
      return res.status(400).json({ success: false, error: "Invalid file type. Expected 'image' or 'video'." });
    }

    const MAX_FILE_SIZE = 50 * 1024 * 1024;
    if (file.size > MAX_FILE_SIZE) {
      return res.status(400).json({ success: false, error: "File size exceeds the 50MB limit." });
    }

    // 👇 Use Flask API if no text is provided
    let caption = text;
    if (!caption) {
      if (!prompt) {
        return res.status(400).json({ success: false, error: "Prompt is required for AI caption generation." });
      }

      caption = await flaskApiService.getRegeneratedContent(prompt);
    }

    // Upload to Cloudinary
    const cloudinaryUrl = await cloudinaryService.uploadToCloudinary(
      file.buffer,
      file.originalname,
      type
    );

    // Create LinkedIn post
    const result = await uploadService.handleMediaPost({
      url: cloudinaryUrl,
      type,
      text: caption
    });

    res.status(200).json({
      success: true,
      message: 'Posted to LinkedIn!',
      caption,
      post: result 
    });

  } catch (error) {
    console.error("Error in uploadMedia:", error);
    res.status(500).json({
      success: false,
      error: error.message || "Something went wrong"
    });
  }
};
