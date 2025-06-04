const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// 1. Auth Routes
router.post("/signup", authController.signup);
router.post("/login", authController.login);

//2
router.post("/forgot-password", authController.forgotPassword);

// 3. Password Reset Routes
router.post("/request-reset-password", authController.requestResetPassword);
router.get("/validate-reset-token",  authController.validateResetToken);
router.post("/reset-password",  authController.resetPassword);


router.post("/signup",  authController.signup);
router.post("/login",  authController.login);
router.get("/user/:id", authController.getUserById);
router.post("/create", authController.createUser);


module.exports = router;
