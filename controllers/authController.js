const crypto = require("crypto");
const bcrypt = require("bcrypt");
const User = require("../models/authModel");
const sendEmail = require("../utils/sendEmail");
const generateToken = require("../utils/generateToken");


// 1.1 Signup Controller
exports.signup = async (req, res) => {
  try {
    const { userName, email, password, mobileNumber } = req.body;

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User already exists" });
    }

    const newUser = await User.create({
      userName,
      email,
      password,
      mobileNumber
    });
   
    await newUser.save();

    res.status(201).json({
      message: "Signup successful",
      user: {
        id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber
      }
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// 1.2 Login Controller
exports.login = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const token = generateToken(user);
    user.accessToken = token;
    await user.save();

    res.status(200).json({
      message: "Login successful",
      token,
      user: {
        id: user._id,
        userName: user.userName,
        email: user.email,
        mobileNumber: user.mobileNumber,
        companyId: user.companyId,
        userId: user.userId,
        instagramUsername: user.instagramUsername,
      },
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};



// Create a new user (for admin or API use)
exports.createUser = async (req, res) => {
  try {
    const { userName, email, password, mobileNumber, companyId, userId, instagramUsername, instagramPassword } = req.body;

    // Check if the user already exists
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(400).json({ message: "User with this email already exists" });
    }

    // Create and save new user
    const newUser = await User.create({
      userName,
      email,
      password,
      mobileNumber,
      companyId,
      userId,
      instagramUsername,
      instagramPassword
    });

    res.status(201).json({
      message: "User created successfully",
      user: {
        id: newUser._id,
        userName: newUser.userName,
        email: newUser.email,
        mobileNumber: newUser.mobileNumber,
        companyId: newUser.companyId,
        userId: newUser.userId,
        instagramUsername: newUser.instagramUsername
      }
    });
  } catch (error) {
    console.error("Create user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};


// Get user by ID
exports.getUserById = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findById(userId).select("-password -accessToken -instagramPassword");
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({
      message: "User retrieved successfully",
      user
    });
  } catch (error) {
    console.error("Get user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Update user information (including Instagram credentials)
exports.updateUser = async (req, res) => {
  try {
    const userId = req.params.id;
    const updates = req.body;

    // Find the user by ID
    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Handle password update separately if provided
    if (updates.password) {
      // Assuming your User model has a pre-save hook to hash the password
      // If not, you'd need to hash it here: user.password = await bcrypt.hash(updates.password, 10);
      user.password = updates.password; // This will trigger the pre-save hook for hashing
      delete updates.password; // Remove from updates to avoid overwriting with plain text
    }

    // Apply other updates
    Object.keys(updates).forEach(key => {
      user[key] = updates[key];
    });

    await user.save(); // Save the updated user, triggering pre-save hooks if any

    // Return the updated user without sensitive information
    const updatedUser = await User.findById(userId).select("-password -accessToken -instagramPassword");

    res.status(200).json({
      message: "User updated successfully",
      user: updatedUser
    });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};

// Delete a user
exports.deleteUser = async (req, res) => {
  try {
    const userId = req.params.id;

    const user = await User.findByIdAndDelete(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    res.status(200).json({ message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ message: "Server error" });
  }
};