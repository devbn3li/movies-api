const User = require("../models/User");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { generateUniqueUsername } = require("../utils/helpers");
const {
  generateVerificationCode,
  sendVerificationEmail,
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
      verificationCode
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
      verificationCode
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

module.exports = {
  registerUser,
  loginUser,
  verifyEmail,
  resendVerificationCode,
};
