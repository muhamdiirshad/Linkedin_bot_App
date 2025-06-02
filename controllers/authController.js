const User = require("../models/User");
const generateToken = require("../utils/generateToken");

// Signup Controller
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

    const token = generateToken(newUser);
    newUser.accessToken = token;
    await newUser.save();

    res.status(201).json({
      message: "Signup successful",
      token,
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

// Login Controller
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
        instagramUsername: user.instagramUsername
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: "Server error" });
  }
};
