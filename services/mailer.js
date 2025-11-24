const nodemailer = require("nodemailer");
require("dotenv").config();

const transporter = nodemailer.createTransport({
  service: "gmail",
  host: "smtp.gmail.com",
  port: 465,
  secure: true,
  auth:{
    user: process.env.EMAIL,
    pass: process.env.EMAIL_PASSWORD,
  },
});

exports.sendEmail = async (args) =>{
  if (process.env.NODE_ENV != "development") {
    await transporter.sendMail(args);
    console.log("Email sent successfully");
  }
};