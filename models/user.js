const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

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
        return String(email)
          .toLowerCase()
          .match(/^[a-zA-Z0-9+_.-]+@[a-zA-Z0-9.-]+$/);
      },
      message: (props) => `Email ${props.value} is not valid`,
    },
  },
  password: {
    type: String,
    required: [true, "Please provide your password"],
    select: false,
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
    type: Number,
  },
  otp_expiry_time: {
    type: Date,
  },
});

userSchema.pre("save",async function(next){
    if(!this.isModified("otp")) return next();

    this.otp = await bcrypt.hash(this.otp,12);  //hash otp with cost of 12

    next();
});



userSchema.methods.correctPassword = async function (
  candidatePassword,
  userPassword
) {
  return await bcrypt.compare(candidatePassword, userPassword);
};

userSchema.methods.correctOTP = async function (
    candidateOTP,
    userOTP
  ) {
    return await bcrypt.compare(candidateOTP, userOTP);
  };

const User = new mongoose.model("User", userSchema);
module.exports = User;
