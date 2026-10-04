const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const JoinRequest = require("../models/JoinRequest");

// --------------------------------------------------
// GENERATE JWT
// --------------------------------------------------

const generateToken = (userId) => {
  return jwt.sign(
    { id: userId },
    process.env.JWT_SECRET,
    {
      expiresIn: process.env.JWT_EXPIRES_IN || "7d",
    }
  );
};

// --------------------------------------------------
// GENERATE ADMIN CODE
// --------------------------------------------------

const generateAdminCode = async () => {
  const latestAdmin = await User.findOne({
    role: "admin",
    isDemo: { $ne: true },
    adminCode: {
      $exists: true,
      $ne: null,
    },
  })
    .sort({ createdAt: -1 })
    .select("adminCode");

  if (!latestAdmin?.adminCode) {
    return "ADM-001";
  }

  const currentNumber = Number(
    latestAdmin.adminCode.replace("ADM-", "")
  );

  if (Number.isNaN(currentNumber)) {
    return "ADM-001";
  }

  return `ADM-${String(currentNumber + 1).padStart(3, "0")}`;
};

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

const registerUser = async (req, res) => {
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

    if (!name || !email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, phone number and password are required",
      });
    }

    if (password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();
    const normalizedName = String(name).trim();

    const existingEmail = await User.findOne({
      email: normalizedEmail,
    });

    if (existingEmail) {
      return res.status(400).json({
        success: false,
        message: "An account with this email already exists",
      });
    }

    const existingPhone = await User.findOne({
      phone: normalizedPhone,
    });

    if (existingPhone) {
      return res.status(400).json({
        success: false,
        message: "An account with this phone number already exists",
      });
    }

    const adminEmails = (
      process.env.ADMIN_EMAILS ||
      process.env.ADMIN_EMAIL ||
      ""
    )
      .split(",")
      .map((adminEmail) => adminEmail.trim().toLowerCase())
      .filter(Boolean);

    const isAdmin = adminEmails.includes(normalizedEmail);
    const MAX_ADMINS = 2;

    if (isAdmin) {
      const adminCount = await User.countDocuments({
        role: "admin",
        isDemo: { $ne: true },
      });

      if (adminCount >= MAX_ADMINS) {
        return res.status(403).json({
          success: false,
          message:
            "Maximum admin limit reached. Only 2 admin accounts are allowed.",
        });
      }
    }

    let adminCode;

    if (isAdmin) {
      adminCode = await generateAdminCode();
    }

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: isAdmin ? "admin" : "member",
      status: isAdmin ? "active" : "pending",
      adminCode: isAdmin ? adminCode : undefined,
      isDemo: false,
      dataScope: "live",
    });

    // Admin registration
    if (isAdmin) {
      const token = generateToken(user._id);

      return res.status(201).json({
        success: true,
        message: "Admin account created successfully",
        token,
        user: {
          id: user._id,
          adminCode: user.adminCode,
          name: user.name,
          email: user.email,
          phone: user.phone,
          role: user.role,
          status: user.status,
          isDemo: user.isDemo === true,
          dataScope: user.dataScope || "live",
        },
      });
    }

    // Member join request
    const joinRequest = await JoinRequest.create({
      user: user._id,
      phone: normalizedPhone,
      address: address ? String(address).trim() : "",
      nidNumber: nidNumber ? String(nidNumber).trim() : "",
      passportNumber: passportNumber
        ? String(passportNumber).trim().toUpperCase()
        : "",
      reason: reason
        ? String(reason).trim()
        : "Requested membership during registration",
      status: "pending",
      dataScope: "live",
    });

    return res.status(201).json({
      success: true,
      message:
        "Registration successful. Your membership application is waiting for admin approval.",
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        isDemo: user.isDemo === true,
        dataScope:
          user.dataScope || (user.isDemo ? "demo" : "live"),
      },
      joinRequest: {
        id: joinRequest._id,
        status: joinRequest.status,
      },
    });
  } catch (error) {
    console.error("Register user error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Registration failed",
    });
  }
};

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

const loginUser = async (req, res) => {
  try {
    const { email, phone, password } = req.body;

    if (!email || !phone || !password) {
      return res.status(400).json({
        success: false,
        message: "Email, phone number and password are required",
      });
    }

    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();

    const user = await User.findOne({
      email: normalizedEmail,
      phone: normalizedPhone,
    }).select("+password");

    if (!user) {
      return res.status(401).json({
        success: false,
        message: "Email, phone number or password is incorrect",
      });
    }

    const passwordMatches = await user.comparePassword(password);

    if (!passwordMatches) {
      return res.status(401).json({
        success: false,
        message: "Email, phone number or password is incorrect",
      });
    }

    if (user.status === "pending") {
      return res.status(403).json({
        success: false,
        message:
          "Your membership application is waiting for admin approval",
      });
    }

    if (user.status === "suspended") {
      return res.status(403).json({
        success: false,
        message: "Your account has been suspended",
      });
    }

    const token = generateToken(user._id);

    return res.status(200).json({
      success: true,
      message: "Login successful",
      token,
      user: {
        id: user._id,
        adminCode:
          user.role === "admin" ? user.adminCode : undefined,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
      },
    });
  } catch (error) {
    console.error("Login user error:", error);

    return res.status(500).json({
      success: false,
      message: error?.message || "Login failed",
    });
  }
};

// --------------------------------------------------
// FORGOT PASSWORD
// --------------------------------------------------

const forgotPassword = async (req, res) => {
  try {
    const email = String(req.body.email || "")
      .trim()
      .toLowerCase();

    if (!email) {
      return res.status(400).json({
        success: false,
        message: "Email is required",
      });
    }

    const user = await User.findOne({ email });

    // Don't reveal whether an email is registered.
    const message =
      "If an account exists for that email, a password reset link will be sent.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message,
      });
    }

    const resetToken = crypto.randomBytes(32).toString("hex");

    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
    }

    const resetUrl =
      `${frontendUrl.replace(/\/$/, "")}` +
      `/reset-password?token=${resetToken}`;

    const transporter = nodemailer.createTransport({
      host: process.env.SMTP_HOST,
      port: Number(process.env.SMTP_PORT || 587),
      secure: process.env.SMTP_SECURE === "true",
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_FROM,
      to: user.email,
      subject: "Reset your password",
      text:
        `We received a request to reset your password.\n\n` +
        `Open this link within 15 minutes: ${resetUrl}\n\n` +
        `If you did not request this, you can ignore this email.`,
      html: `
        <p>We received a request to reset your password.</p>
        <p><a href="${resetUrl}">Reset your password</a></p>
        <p>This link expires in 15 minutes. If you didn't request this, you can ignore this email.</p>
      `,
    });

    return res.status(200).json({
      success: true,
      message,
    });
  } catch (error) {
    console.error("Forgot password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to send the reset email right now.",
    });
  }
};

// --------------------------------------------------
// RESET PASSWORD
// --------------------------------------------------

const resetPassword = async (req, res) => {
  try {
    const { token } = req.params;
    const { password } = req.body;

    if (!token) {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (!password || password.length < 6) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const hashedToken = crypto
      .createHash("sha256")
      .update(token)
      .digest("hex");

    const user = await User.findOne({
      resetPasswordToken: hashedToken,
      resetPasswordExpires: { $gt: new Date() },
    }).select(
      "+resetPasswordToken +resetPasswordExpires +password"
    );

    if (!user) {
      return res.status(400).json({
        success: false,
        message: "This password reset link is invalid or has expired.",
      });
    }

    // The User model's pre-save hook hashes the new password.
    user.password = password;
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;

    await user.save();

    return res.status(200).json({
      success: true,
      message: "Password reset successfully. You can now log in.",
    });
  } catch (error) {
    console.error("Reset password error:", error);

    return res.status(500).json({
      success: false,
      message: "Unable to reset the password right now.",
    });
  }
};

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  registerUser,
  loginUser,
  forgotPassword,
  resetPassword,
};