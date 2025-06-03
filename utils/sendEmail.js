const nodemailer = require("nodemailer");

const sendEmail = async ({ to, subject, html }) => {
  const transporter = nodemailer.createTransport({
    service: "gmail", // 👈 This handles host/port internally
    auth: {
      user: process.env.EMAIL_USER,
      pass: process.env.EMAIL_PASS, // App Password, NOT Gmail password
    },
  });

  const mailOptions = {
    from: `"SocialMedia_Bot_App" <${process.env.EMAIL_USER}>`,
    to,
    subject,
    html,
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log("📨 Email sent successfully");
  } catch (error) {
    console.error("Email sending error:", error);
    throw new Error("Email could not be sent");
  }
};

module.exports = sendEmail;
