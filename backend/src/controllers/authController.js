const jwt = require("jsonwebtoken");

const User = require("../models/User");
const JoinRequest = require("../models/JoinRequest");

const generateToken = (
  userId
) => {
  return jwt.sign(
    {
      id: userId,
    },
    process.env.JWT_SECRET,
    {
      expiresIn:
        process.env
          .JWT_EXPIRES_IN ||
        "7d",
    }
  );
};

const registerUser = async (
  req,
  res
) => {
  try {
    const {
      name,
      email,
      phone,
      password,
      address,
      nidNumber,
      passportNumber,
      reason,
    } = req.body;

    if (
      !name ||
      !email ||
      !phone ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Name, email, phone number and password are required",
        });
    }

    if (
      password.length < 6
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Password must be at least 6 characters",
        });
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedPhone =
      String(phone)
        .trim();

    const existingEmail =
      await User.findOne({
        email:
          normalizedEmail,
      });

    if (existingEmail) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "An account with this email already exists",
        });
    }

    const existingPhone =
      await User.findOne({
        phone:
          normalizedPhone,
      });

    if (existingPhone) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "An account with this phone number already exists",
        });
    }

    const adminEmail =
      process.env.ADMIN_EMAIL
        ?.trim()
        .toLowerCase();

    const isAdmin =
      normalizedEmail ===
      adminEmail;

    const user =
      await User.create({
        name:
          name.trim(),

        email:
          normalizedEmail,

        phone:
          normalizedPhone,

        password,

        role:
          isAdmin
            ? "admin"
            : "member",

        status:
          isAdmin
            ? "active"
            : "pending",
      });

    if (isAdmin) {
      const token =
        generateToken(
          user._id
        );

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Admin account created successfully",

          token,

          user: {
            id: user._id,
            name:
              user.name,
            email:
              user.email,
            phone:
              user.phone,
            role:
              user.role,
            status:
              user.status,
          },
        });
    }

    const joinRequest =
      await JoinRequest.create({
        user:
          user._id,

        phone:
          normalizedPhone,

        address:
          address?.trim() ||
          "",

        nidNumber:
          nidNumber?.trim() ||
          "",

        passportNumber:
          passportNumber
            ?.trim()
            .toUpperCase() ||
          "",

        reason:
          reason?.trim() ||
          "Requested membership during registration",

        status:
          "pending",
      });

    return res
      .status(201)
      .json({
        success: true,

        message:
          "Registration successful. Your membership application is waiting for admin approval.",

        user: {
          id: user._id,
          name:
            user.name,
          email:
            user.email,
          phone:
            user.phone,
          role:
            user.role,
          status:
            user.status,
        },

        joinRequest: {
          id:
            joinRequest._id,
          status:
            joinRequest.status,
        },
      });
  } catch (error) {
    console.error(
      "Register user error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Registration failed",
      });
  }
};

const loginUser = async (
  req,
  res
) => {
  try {
    const {
      email,
      phone,
      password,
    } = req.body;

    if (
      !email ||
      !phone ||
      !password
    ) {
      return res
        .status(400)
        .json({
          success: false,
          message:
            "Email, phone number and password are required",
        });
    }

    const normalizedEmail =
      email
        .trim()
        .toLowerCase();

    const normalizedPhone =
      String(phone)
        .trim();

    const user =
      await User.findOne({
        email:
          normalizedEmail,
        phone:
          normalizedPhone,
      }).select(
        "+password"
      );

    if (!user) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Email, phone number or password is incorrect",
        });
    }

    const passwordMatches =
      await user.comparePassword(
        password
      );

    if (!passwordMatches) {
      return res
        .status(401)
        .json({
          success: false,
          message:
            "Email, phone number or password is incorrect",
        });
    }

    if (
      user.status ===
      "pending"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Your membership application is waiting for admin approval",
        });
    }

    if (
      user.status ===
      "suspended"
    ) {
      return res
        .status(403)
        .json({
          success: false,
          message:
            "Your account has been suspended",
        });
    }

    const token =
      generateToken(
        user._id
      );

    return res
      .status(200)
      .json({
        success: true,
        message:
          "Login successful",

        token,

        user: {
          id: user._id,
          name:
            user.name,
          email:
            user.email,
          phone:
            user.phone,
          role:
            user.role,
          status:
            user.status,
        },
      });
  } catch (error) {
    console.error(
      "Login user error:",
      error
    );

    return res
      .status(500)
      .json({
        success: false,
        message:
          "Login failed",
      });
  }
};

module.exports = {
  registerUser,
  loginUser,
};
