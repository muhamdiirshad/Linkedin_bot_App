const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");
const authValidators = require("../validators/authValidators");
const validate = require("../middleware/validate");

// 1. Auth Routes
router.post("/signup",authValidators.signupValidator, validate, authController.signup);
router.post("/login",authValidators.loginValidator, validate, authController.login);

//2 forget password authRoutes
router.post("/forgot-password",authValidators.forgotPasswordValidator, validate, authController.forgotPassword);

// 3. Password Reset Routes
router.post("/request-reset-password",authController.requestResetPassword);
router.get("/validate-reset-token", authValidators.validateResetTokenValidator, validate, authController.validateResetToken);
router.post("/reset-password", authValidators.resetPasswordValidator, validate,  authController.resetPassword);

// 4. CRUD Routes
router.get("/user/:id", authValidators.getUserByIdValidator, validate,  authController.getUserById);
router.post("/create",authValidators.createUserValidator, validate, authController.createUser);
router.put("/update/:id",authValidators.updateUserValidator, validate, authController.updateUser);
router.delete("/delete/:id", authValidators.deleteUserValidator, validate,  authController.deleteUser);

module.exports = router;
