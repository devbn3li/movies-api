const nodemailer = require("nodemailer");

// Create email transporter
const createTransporter = () => {
  // Check if email credentials are provided
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    throw new Error('Email credentials not configured. Please set EMAIL_USER and EMAIL_PASSWORD environment variables.');
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
              Thank you for registering with Movies API. To complete your account registration, please use the following verification code:
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
    if (error.code === 'EAUTH') {
      console.error('Authentication failed. Check EMAIL_USER and EMAIL_PASSWORD.');
    } else if (error.code === 'ECONNECTION') {
      console.error('Connection failed. Check internet connection.');
    } else if (error.code === 'EMESSAGE') {
      console.error('Message error. Check email format and content.');
    }
    
    return false;
  }
};

module.exports = {
  generateVerificationCode,
  sendVerificationEmail,
};