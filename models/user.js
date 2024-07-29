const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");
const crypto = require("crypto");
const e = require("cors");

const userSchema = new mongoose.Schema({
  firstName: {
    type: String,
    required: [true, "Please provide your first name"],
  },
  lastName: {
    type: String,
    required: [true, "Please provide your last name"],
  },
  avatar: {
    type: String,
  },
  email: {
    type: String,
    required: [true, "Please provide your email"],
    validate: {
      validator: function (val) {
        return String(val)
          .toLowerCase()
          .match(/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/);
      },
      message: (props) => `Email ${props.value} is not valid`,
    },
  },
  password: {
    type: String,
    required: [true, "Please provide your password"],
    select: false,
  },
  passwordConfirm: {
    type: String,
    required: [true, "Please confirm your password"],
    validate: {
      validator: function (val) {
        return val === this.password;
      },
      message: "Passwords are not the same",
    },
  },
  passwordChangedAt: {
    type: Date,
  },
  passwordResetToken: {
    type: String,
  },
  passwordResetExpires: {
    type: Date,
  },
  createdAt: {
    type: Date,
  },
  updatedAt: {
    type: Date,
  },
  verified: {
    type: Boolean,
    default: false,
  },
  otp: {
    type: String,
  },
  otp_expiry_time: {
    type: Date,
  },
  socket_id: {
    type: String,
  },
  friends: [
    {
      type: mongoose.Schema.ObjectId,
      ref: "User",
    },
  ],
  status: {
    type: String,
    enum: ["Online", "Offline"],
  },
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("password") || !this.password) return next();

  this.password = await bcrypt.hash(this.password, 12); //hash password with cost of 12

  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("passwordConfirm") || !this.passwordConfirm)
    return next();

  this.passwordConfirm = await bcrypt.hash(this.passwordConfirm, 12); //hash password with cost of 12

  next();
});

userSchema.pre("save", async function (next) {
  if (!this.isModified("otp") || !this.otp) return next();

  this.otp = await bcrypt.hash(this.otp.toString(), 12); // hash otp with cost of 12

  next();
});

userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.correctOTP = async function (candidateOTP, userOTP) {
  return await bcrypt.compare(candidateOTP, userOTP);
};

userSchema.methods.createPasswordResetToken = function () {
  const resetToken = crypto.randomBytes(32).toString("hex");

  this.passwordResetToken = crypto
    .createHash("sha256")
    .update(resetToken)
    .digest("hex");

  this.passwordResetExpires = Date.now() + 10 * 60 * 1000; //10 minutes

  return resetToken;
};

userSchema.methods.changedPasswordAfter = function (timestamp) {
  const changedTimeStamp = parseInt(
    this.passwordChangedAt.getTime() / 1000,
    10
  );

  return timestamp < changedTimeStamp;
};

const User = new mongoose.model("User", userSchema);
module.exports = User;
