const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateUniqueUsername } = require("../utils/helpers");
const {
  generateVerificationCode,
  sendVerificationEmail,
  sendPasswordResetEmail,
} = require("../utils/emailService");

const generateToken = (userId) => {
  return jwt.sign({ id: userId }, process.env.JWT_SECRET, { expiresIn: "7d" });
};

const registerUser = async (req, res) => {
  try {
    const { name, email, password, country, profilePicture, isAdmin } =
      req.body;

    const userExists = await User.findOne({ email });
    if (userExists)
      return res.status(400).json({ message: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate unique username from name
    const username = await generateUniqueUsername(name, User);

    // Generate verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    const newUser = await User.create({
      name,
      username,
      email,
      password: hashedPassword,
      country,
      profilePicture,
      isAdmin,
      emailVerificationCode: verificationCode,
      emailVerificationExpires: verificationExpires,
      isEmailVerified: false,
    });

    // Send verification code via email
    const emailSent = await sendVerificationEmail(
      email,
      name,
      verificationCode,
    );

    if (!emailSent) {
      // If email sending fails, delete the created user
      await User.findByIdAndDelete(newUser._id);
      return res.status(500).json({
        message: "Failed to send verification code. Please try again.",
      });
    }

    res.status(201).json({
      message:
        "Account created successfully. Please check your email for verification code.",
      userId: newUser._id,
      email: newUser.email,
      requiresVerification: true,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

const loginUser = async (req, res) => {
  try {
    const { email, password } = req.body;

    const user = await User.findOne({ email });
    if (!user) return res.status(400).json({ message: "Invalid credentials" });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch)
      return res.status(400).json({ message: "Invalid credentials" });

    // Check email verification
    if (!user.isEmailVerified) {
      return res.status(400).json({
        message: "Please verify your email first",
        requiresVerification: true,
        userId: user._id,
      });
    }

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      token: generateToken(user._id),
      user: userWithoutPassword,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error: ", error: err.message });
  }
};

// Email verification
const verifyEmail = async (req, res) => {
  try {
    const { userId, verificationCode } = req.body;

    if (!userId || !verificationCode) {
      return res.status(400).json({
        message: "User ID and verification code are required",
      });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Check if verification code has expired
    if (user.emailVerificationExpires < new Date()) {
      return res.status(400).json({
        message: "Verification code has expired. Please request a new one",
      });
    }

    // Check if verification code is correct
    if (user.emailVerificationCode !== verificationCode) {
      return res.status(400).json({ message: "Invalid verification code" });
    }

    // Verify email
    user.isEmailVerified = true;
    user.emailVerificationCode = undefined;
    user.emailVerificationExpires = undefined;
    await user.save();

    const { password: _, ...userWithoutPassword } = user.toObject();

    res.json({
      message: "Email verified successfully",
      token: generateToken(user._id),
      user: userWithoutPassword,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Resend verification code
const resendVerificationCode = async (req, res) => {
  try {
    const { userId } = req.body;

    if (!userId) {
      return res.status(400).json({ message: "User ID is required" });
    }

    const user = await User.findById(userId);
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    if (user.isEmailVerified) {
      return res.status(400).json({ message: "Email already verified" });
    }

    // Generate new verification code
    const verificationCode = generateVerificationCode();
    const verificationExpires = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes

    user.emailVerificationCode = verificationCode;
    user.emailVerificationExpires = verificationExpires;
    await user.save();

    // Send new verification code
    const emailSent = await sendVerificationEmail(
      user.email,
      user.name,
      verificationCode,
    );

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send verification code. Please try again.",
      });
    }

    res.json({
      message: "New verification code sent to your email",
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Forgot Password - Send reset code to email
const forgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ message: "Email is required" });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Generate reset code
    const resetCode = generateVerificationCode();
    const resetExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes

    user.passwordResetCode = resetCode;
    user.passwordResetExpires = resetExpires;
    await user.save();

    // Send reset code via email
    const emailSent = await sendPasswordResetEmail(
      user.email,
      user.name,
      resetCode,
    );

    if (!emailSent) {
      return res.status(500).json({
        message: "Failed to send reset code. Please try again.",
      });
    }

    res.json({
      message: "Password reset code sent to your email",
      email: user.email,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Verify Reset Code
const verifyResetCode = async (req, res) => {
  try {
    const { email, resetCode } = req.body;

    if (!email || !resetCode) {
      return res.status(400).json({
        message: "Email and reset code are required",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if reset code has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        message: "Reset code has expired. Please request a new one",
      });
    }

    // Check if reset code is correct
    if (user.passwordResetCode !== resetCode) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    res.json({
      message: "Reset code verified successfully",
      verified: true,
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

// Reset Password
const resetPassword = async (req, res) => {
  try {
    const { email, resetCode, newPassword } = req.body;

    if (!email || !resetCode || !newPassword) {
      return res.status(400).json({
        message: "Email, reset code, and new password are required",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        message: "Password must be at least 6 characters long",
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() });
    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    // Check if new password is the same as old password
    const isSamePassword = await bcrypt.compare(newPassword, user.password);
    if (isSamePassword) {
      return res.status(400).json({
        message: "New password cannot be the same as the old password",
      });
    }

    // Check if reset code has expired
    if (!user.passwordResetExpires || user.passwordResetExpires < new Date()) {
      return res.status(400).json({
        message: "Reset code has expired. Please request a new one",
      });
    }

    // Check if reset code is correct
    if (user.passwordResetCode !== resetCode) {
      return res.status(400).json({ message: "Invalid reset code" });
    }

    // Hash new password and update
    const hashedPassword = await bcrypt.hash(newPassword, 10);
    user.password = hashedPassword;
    user.passwordResetCode = undefined;
    user.passwordResetExpires = undefined;
    await user.save();

    res.json({
      message:
        "Password reset successfully. You can now login with your new password.",
    });
  } catch (err) {
    res.status(500).json({ message: "Server Error", error: err.message });
  }
};

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationCode,
  forgotPassword,
  verifyResetCode,
  resetPassword,
};
