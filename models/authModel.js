const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema(
  {
    userName: {
      type: String,
      required: true,
      trim: true,
    },
    email: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, "Please use a valid email address"],
    },
    mobileNumber: {
      type: String,
    },
    password: {
      type: String,
      required: true,
    },
    accessToken: {
      type: String,
    },
    companyId: {
      type: String,
    },
    userId: {
      type: String,
    },
    instagramUsername: {
      type: String,
    },
    instagramPassword: {
      type: String,
    },
    resetPasswordToken: {
      type: String,
      index: true,
    },
    resetPasswordExpires: {
      type: Date,
    },
  },
  { timestamps: true }
);

// 🔐 Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  const SALT_ROUNDS = parseInt(process.env.SALT_ROUNDS) || 10;
  this.password = await bcrypt.hash(this.password, SALT_ROUNDS);
  next();
});

// 🔍 Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

// 🧹 Hide sensitive fields in JSON output
userSchema.methods.toJSON = function () {
  const userObject = this.toObject();
  delete userObject.password;
  delete userObject.resetPasswordToken;
  delete userObject.resetPasswordExpires;
  delete userObject.instagramPassword;
  return userObject;
};

module.exports = mongoose.model("User", userSchema);
