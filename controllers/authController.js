const jwt = require("jsonwebtoken");
const otpGenerator = require("otp-generator");
const User = require("../models/user");
const filterObj = require("../utils/filterObj");
const crypto = require("crypto");
const { promisify } = require("util");
const mailService = require("../services/mailer");
const dotenv = require("dotenv");
const resetPassword = require("../Templates/Mail/resetPassword");
const otp = require("../Templates/Mail/otp");
dotenv.config({ path: "../.env" });

const signToken = (userId) => jwt.sign({ userId }, process.env.JWT_SECRET);

exports.register = async (req, res, next) => {
  const { firstName, lastName, email, password } = req.body;

  const filteredBody = filterObj(
    req.body,
    "firstName",
    "lastName",
    "password",
    "passwordConfirm",
    "email"
  );
  filteredBody["createdAt"] = Date.now();
  filteredBody["passwordChangedAt"] = Date.now();

  const existing_user = await User.findOne({ email: email });

  if (existing_user && existing_user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is already in use, Please login",
    });
  } else if (existing_user) {
    try {
      await User.findOneAndUpdate({ email: email }, filteredBody, {
        new: true,
        validateModifiedOnly: true,
      });
    } catch (err) {
      console.log(err);
      res.status(500).json({
        status: "error",
        message: "Error updating user",
      });
    }

    req.userId = existing_user._id;
    next();
  } else {
    try {
      const new_user = await User.create(filteredBody);
      req.userId = new_user._id;
      next();
    } catch (err) {
      console.log(err);
      res.status(500).json({
        status: "error",
        message: "Error creating user",
      });
    }
  }
};

exports.sendOTP = async (req, res, next) => {
  const { userId } = req;
  const new_otp = otpGenerator.generate(6, {
    upperCaseAlphabets: false,
    lowerCaseAlphabets: false,
    specialChars: false,
  });

  const otp_expiry_time = Date.now() + 10 * 60 * 1000; //10 min

  const user = await User.findByIdAndUpdate(userId, {
    otp_expiry_time,
  });

  user.otp = new_otp.toString();

  await user.save({ new: true, validateModifiedOnly: true });

  //send mail
  mailService.sendEmail({
    from: {
      name: "Talky",
      address: process.env.EMAIL,
    },
    to: user.email,
    subject: "OTP for email verification in Talky",
    html: otp(user.firstName, new_otp),
  });

  res.status(200).json({
    status: "success",
    message: "OTP send successfully",
  });
};

exports.verifyOTP = async (req, res, next) => {
  const { email, otp } = req.body;

  const user = await User.findOne({
    email,
    otp_expiry_time: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Email is invalid or OTP expired",
    });
    return;
  }

  if (!(await user.correctOTP(otp, user.otp.toString()))) {
    res.status(400).json({
      status: "error",
      message: "OTP is incorrect",
    });
    return;
  }

  user.verified = true;
  user.otp = undefined;
  user.otp_expiry_time = undefined;

  await user.save({ new: true, validateModifiedOnly: true });

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "OTP verified successfully",
    token,
    user_id:user._id,
  });
};

exports.login = async (req, res, next) => {
  const { email, password } = req.body;

  if (!email || !password) {
    res.status(400).json({
      status: "error",
      message: "Both email and password are required",
    });
  }
  let user=null;
  try {
    user = await User.findOne({ email: email }).select("+password");
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error finding user",
    });
    return;
  }
  if (user && !user.verified) {
    res.status(400).json({
      status: "error",
      message: "Email is not verified",
    });
    return;
  }

  if (!user || !(await user.correctPassword(password, user.password))) {
    res.status(400).json({
      status: "error",
      message: "Email or Password is incorrect",
    });
    return;
  }

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Logged in successfully",
    token,
    user_id:user._id,
  });
};

exports.protect = async (req, res, next) => {
  let token;

  if (
    req.headers.authorization &&
    req.headers.authorization.startsWith("Bearer")
  ) {
    token = req.headers.authorization.split(" ")[1];
  } else if (req.cookies.jwt) {
    token = req.cookies.jwt;
  } else {
    req.status(400).json({
      status: "error",
      message: "You are not logged in",
    });

    return;
  }

  const decoded = await promisify(jwt.verify)(token, process.env.JWT_SECRET);

  const this_user = await User.findById(decoded.userId);

  if (!this_user) {
    res.status(400).json({
      status: "error",
      message: "User does not exist",
    });
    return;
  }

  if (this_user.changedPasswordAfter(decoded.iat)) {
    res.status(400).json({
      status: "error",
      message: "User recently changed password, please login again",
    });
    return;
  }

  req.user = this_user;
  next();
};

exports.forgotPassword = async (req, res, next) => {
  const { email } = req.body;

  const user = await User.findOne({ email: email });

  if (!user) {
    res.status(404).json({
      status: "error",
      message: "Email is invalid",
    });

    return;
  }

  const resetToken = user.createPasswordResetToken();
  console.log(resetToken);
  await user.save({ validateBeforeSave: false });

  const resetURL = `${process.env.RESET_URL}${resetToken}`;

  try {
    //send mail
    mailService.sendEmail({
      from: {
        name: "Talky",
        address: process.env.EMAIL,
      },
      to: user.email,
      subject: "Reset password link for Talky",
      html: resetPassword(user.firstName, resetURL),
    });

    res.status(200).json({
      status: "success",
      message: "Reset password link send to email",
    });
  } catch (err) {
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;

    await user.save({ validateBeforeSave: false });

    res.status(500).json({
      status: "error",
      message: "Error sending email",
    });
  }
};

exports.resetPassword = async (req, res, next) => {
  const hashedToken = crypto
    .createHash("sha256")
    .update(req.body.token)
    .digest("hex");

  const user = await User.findOne({
    passwordResetToken: hashedToken,
    passwordResetExpires: { $gt: Date.now() },
  });

  if (!user) {
    res.status(400).json({
      status: "error",
      message: "Token is invalid or expired",
    });
    return;
  }
  try {
    user.password = req.body.password;
    user.passwordConfirm = req.body.passwordConfirm;
    user.passwordResetToken = undefined;
    user.passwordResetExpires = undefined;
    user.passwordChangedAt = Date.now();

    await user.save();
  } catch (err) {
    res.status(500).json({
      status: "error",
      message: "Error updating password",
    });
  }

  //send mail

  const token = signToken(user._id);

  res.status(200).json({
    status: "success",
    message: "Password reset successfully",
    token,
    user_id:user._id,
  });
};
