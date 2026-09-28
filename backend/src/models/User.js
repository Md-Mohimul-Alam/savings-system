const mongoose = require("mongoose");
const bcrypt = require("bcryptjs");

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [
        true,
        "Name is required",
      ],
      trim: true,
    },

    email: {
      type: String,
      required: [
        true,
        "Email is required",
      ],
      unique: true,
      lowercase: true,
      trim: true,
    },

    phone: {
      type: String,
      required: [
        true,
        "Phone number is required",
      ],
      trim: true,
    },

    password: {
      type: String,
      required: [
        true,
        "Password is required",
      ],
      minlength: 6,
      select: false,
    },

    adminCode: {
      type: String,
      unique: true,
      sparse: true,
      trim: true,
      uppercase: true,
    },

    role: {
      type: String,
      enum: [
        "admin",
        "member",
      ],
      default: "member",
    },

    status: {
      type: String,
      enum: [
        "active",
        "pending",
        "suspended",
      ],
      default: "pending",
    },
  },
  {
    timestamps: true,
  }
);

userSchema.pre(
  "save",
  async function () {
    if (
      !this.isModified(
        "password"
      )
    ) {
      return;
    }

    const salt =
      await bcrypt.genSalt(10);

    this.password =
      await bcrypt.hash(
        this.password,
        salt
      );
  }
);

userSchema.methods.comparePassword =
  async function (
    enteredPassword
  ) {
    return bcrypt.compare(
      enteredPassword,
      this.password
    );
  };

module.exports =
  mongoose.model(
    "User",
    userSchema
  );