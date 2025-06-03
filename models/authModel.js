const mongoose = require("mongoose");
const bcrypt = require("bcrypt");

const userSchema = new mongoose.Schema({
    userName: { 
        type: String, 
        required: true 
    },
    email: { 
        type: String, 
        required: true, 
        unique: true 
    },
    mobileNumber: { 
        type: String 
    },
    password: { 
        type: String, 
        required: true 
    },
    accessToken: { 
        type: String 
    },
    companyId: { 
        type: String 
    },
    userId: { 
        type: String 
    },
    instagramUsername: { 
        type: String 
    },
    instagramPassword: { 
        type: String 
    },
    // For password reset
  resetPasswordToken: { type: String },
  resetPasswordExpires: { type: Date },
});

// Hash password before saving
userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 10);
  next();
});

// Compare password method
userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compare(candidatePassword, this.password);
};

module.exports = mongoose.model("User", userSchema);
