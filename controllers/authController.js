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

// Forgot Password
exports.forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: "Please provide your registered email" });
    }

    const user = await User.findOne({ email });

     if (!user) {
      return res.status(404).json({
        success: false,
        message: "This email is not registered with us.",
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");
    const resetTokenHash = crypto.createHash("sha256").update(resetToken).digest("hex");
    const resetTokenExpiry = Date.now() + 15 * 60 * 1000;

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpires = resetTokenExpiry;
    await user.save();

    const resetUrl = `https://yourdomain.com/reset-password?token=${resetToken}`;

    const message = `
      <div style="font-family: Arial, sans-serif; background-color: #f4f4f4; padding: 30px;">
        <div style="max-width: 600px; margin: auto; background-color: #ffffff; padding: 30px; border-radius: 8px; box-shadow: 0 0 10px rgba(0,0,0,0.05);">
          
          <div style="text-align: center; margin-bottom: 30px;">
            <img src="https://i.ibb.co/600Q4cw/logo.png" alt="Your Company Logo" style="height: 50px;">
          </div>

          <h2 style="color: #333;">🔐 Password Reset Request</h2>

          <p>Hi <strong>${user.userName}</strong>,</p>

          <p>We received a request to reset the password associated with your account.</p>
          
          <p>To reset your password, please click the button below:</p>

          <div style="text-align: center; margin: 30px 0;">
            <a href="${resetUrl}" style="background-color: #1a73e8; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">Reset Password</a>
          </div>

          <p style="color: #555;">This link will expire in <strong>15 minutes</strong> for your security.</p>

          <p>If you did not request this password reset, you can safely ignore this email. Your password will remain unchanged.</p>

          <hr style="margin: 30px 0; border: none; border-top: 1px solid #eee;">

          <p style="font-size: 14px; color: #888;">If you have any issues, please contact our support team at <a href="mailto:support@yourdomain.com">support@yourdomain.com</a>.</p>

          <p style="font-size: 14px; color: #888;">Thank you,<br/>The Your Company Team</p>
        </div>
      </div>
    `;


    await sendEmail({
      to: user.email,
      subject: "Your Password Reset Link",
      html: message,
    });

    return res.status(200).json({
      success: true,
      message: "Password reset link sent to your email.",
    });

  } catch (error) {
    console.error("Forgot Password Error:", error);
    res.status(500).json({
      success: false,
      message: "Server error. Please try again later.",
    });
  }
};

// 3.1 Request Password Reset Token
exports.requestResetPassword = async (req, res) => {
  const { email } = req.body;

  if (!email)
    return res.status(400).json({ message: "Email is required" });

  try {
    const user = await User.findOne({ email });
    if (!user) return res.status(404).json({ message: "User not found" });

    const token = crypto.randomBytes(32).toString("hex");
    const expiry = Date.now() + 1000 * 60 * 60; // 1 hour

    user.resetPasswordToken = token;
    user.resetPasswordExpires = expiry;
    await user.save();

    // TODO: Send token to user email here instead of returning
    res.status(200).json({
      message: "Reset token generated. (Use only for dev/debug)",
      token, // Remove in production
    });
  } catch (err) {
    console.error("Error generating reset token:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3.2 Validate Reset Token
exports.validateResetToken = async (req, res) => {
  const { token } = req.query;

  if (!token) return res.status(400).json({ message: "Token is required" });

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    res.status(200).json({ message: "Token is valid" });
  } catch (err) {
    console.error("Token validation error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

// 3.3 Reset Password
exports.resetPassword = async (req, res) => {
  const { token, newPassword, confirmPassword } = req.body;

  if (!token || !newPassword || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (newPassword !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });

    if (!user) {
      return res.status(400).json({ message: "Invalid or expired token" });
    }

    // Since you have pre-save hook hashing, just assign plain password
    user.password = newPassword;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    res.status(200).json({ message: "Password reset successful" });
  } catch (err) {
    console.error("Password reset error:", err);
    res.status(500).json({ message: "Internal server error" });
  }
};

