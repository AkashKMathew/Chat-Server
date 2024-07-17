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
});

userSchema.methods.correctPassword = async function(
    candidatePassword,
    userPassword
){
    return await bcrypt.compare(candidatePassword,userPassword);
}

const User = new mongoose.model("User", userSchema);
module.exports = User;
