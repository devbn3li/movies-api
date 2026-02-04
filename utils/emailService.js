const nodemailer = require("nodemailer");
const crypto = require("crypto");

// Create email transporter
const createTransporter = () => {
  // Check if email credentials are provided
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error(
      "Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.",
    );
  }

  return nodemailer.createTransport({
    service: "gmail",
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASSWORD,
    },
  });
};

// Generate 6-digit verification code
const generateVerificationCode = () => {
  return Math.floor(100000 + Math.random() * 900000).toString();
};

// Generate verification token for link-based verification
const generateVerificationToken = () => {
  return crypto.randomBytes(32).toString("hex");
};

// Send verification email
const sendVerificationEmail = async (email, name, verificationCode) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Email Verification - Movies API",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Hello ${name}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
              Welcome to Moviezone. To complete your account registration, please use the following verification code:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <h1 style="color: #007bff; font-size: 36px; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                ${verificationCode}
              </h1>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 20px;">
              This code is valid for 10 minutes only
            </p>
            
            <p style="color: #999; font-size: 12px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              If you did not request this verification, please ignore this email.
            </p>
            <a href="https://moviezone-inky.vercel.app/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #007bff; color: white; text-decoration: none; border-radius: 5px;">Visit Moviezone</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification code sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending email:", error);

    // Log specific error details for debugging
    if (error.code === "EAUTH") {
      console.error(
        "Authentication failed. Check EMAIL_USER and EMAIL_PASSWORD.",
      );
    } else if (error.code === "ECONNECTION") {
      console.error("Connection failed. Check internet connection.");
    } else if (error.code === "EMESSAGE") {
      console.error("Message error. Check email format and content.");
    }

    return false;
  }
};

// Send password reset email
const sendPasswordResetEmail = async (email, name, resetCode) => {
  try {
    const transporter = createTransporter();

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Password Reset - Moviezone API",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Hello ${name}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
              We received a request to reset your password for your Moviezone account. Use the following code to reset your password:
            </p>
            
            <div style="background-color: #f8f9fa; padding: 20px; border-radius: 8px; text-align: center; margin: 30px 0;">
              <h1 style="color: #dc3545; font-size: 36px; margin: 0; letter-spacing: 5px; font-family: 'Courier New', monospace;">
                ${resetCode}
              </h1>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 20px;">
              This code is valid for 10 minutes only
            </p>
            
            <p style="color: #999; font-size: 12px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              If you did not request a password reset, please ignore this email or contact support if you have concerns.
            </p>
            <a href="https://moviezone-inky.vercel.app/" style="display: inline-block; margin-top: 20px; padding: 10px 20px; background-color: #dc3545; color: white; text-decoration: none; border-radius: 5px;">Visit Moviezone</a>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Password reset code sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending password reset email:", error);
    return false;
  }
};

// Send verification reminder email with link (for unverified old users)
const sendVerificationReminderEmail = async (
  email,
  name,
  verificationToken,
  deletionDate,
) => {
  try {
    const transporter = createTransporter();

    // Use BACKEND_URL for the verification link (API endpoint)
    const backendUrl =
      process.env.BACKEND_URL || "https://movies-api-theta-weld.vercel.app";
    const frontendUrl =
      process.env.FRONTEND_URL || "https://moviezone-inky.vercel.app";
    const verificationLink = `${frontendUrl}/verify-email-link?token=${verificationToken}`;
    const formattedDate = new Date(deletionDate).toLocaleDateString("en-US", {
      year: "numeric",
      month: "long",
      day: "numeric",
    });

    const mailOptions = {
      from: process.env.EMAIL_USER,
      to: email,
      subject: "[Action required] Verify Your Email",
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px; background-color: #f4f4f4;">
          <div style="background-color: white; padding: 30px; border-radius: 10px; box-shadow: 0 0 10px rgba(0,0,0,0.1);">
            <h2 style="color: #333; text-align: center; margin-bottom: 30px;">Hello ${name}!</h2>
            
            <p style="color: #666; font-size: 16px; line-height: 1.6; text-align: center;">
              We noticed that your email address hasn't been verified yet. To keep your Moviezone account active, please verify your email by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationLink}" style="display: inline-block; padding: 15px 40px; background-color: #28a745; color: white; text-decoration: none; border-radius: 8px; font-size: 18px; font-weight: bold;">
                ✓ Verify My Email
              </a>
            </div>
            
            <div style="background-color: #fff3cd; padding: 15px; border-radius: 8px; border-left: 4px solid #ffc107; margin: 20px 0;">
              <p style="color: #856404; font-size: 14px; margin: 0;">
                <strong>Important:</strong> If you don't verify your email by <strong>${formattedDate}</strong>, your account will be automatically deleted.
              </p>
            </div>
            
            <p style="color: #666; font-size: 14px; text-align: center; margin-bottom: 20px;">
              If the button doesn't work, copy and paste this link into your browser:
            </p>
            <p style="color: #007bff; font-size: 12px; text-align: center; word-break: break-all;">
              ${verificationLink}
            </p>
            
            <p style="color: #999; font-size: 12px; text-align: center; border-top: 1px solid #eee; padding-top: 20px; margin-top: 30px;">
              If you did not create this account, please ignore this email and the account will be deleted automatically.
            </p>
          </div>
        </div>
      `,
    };

    await transporter.sendMail(mailOptions);
    console.log(`Verification reminder sent to ${email}`);
    return true;
  } catch (error) {
    console.error("Error sending verification reminder email:", error);
    return false;
  }
};

module.exports = {
  generateVerificationCode,
  generateVerificationToken,
  sendVerificationEmail,
  sendPasswordResetEmail,
  sendVerificationReminderEmail,
};
