
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const nodemailer = require("nodemailer");

const User = require("../models/User");
const JoinRequest = require("../models/JoinRequest");

// --------------------------------------------------
// GENERATE JWT
// --------------------------------------------------

const generateToken = (userId) => {
  if (!process.env.JWT_SECRET) {
    throw new Error("JWT_SECRET is not configured");
  }

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
// REGISTER USER
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
        message:
          "Name, email, phone number and password are required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
      return res.status(400).json({
        success: false,
        message: "Password must be at least 6 characters",
      });
    }

    const normalizedName = String(name).trim();
    const normalizedEmail = String(email).trim().toLowerCase();
    const normalizedPhone = String(phone).trim();

    if (!normalizedName || !normalizedEmail || !normalizedPhone) {
      return res.status(400).json({
        success: false,
        message: "Name, email and phone number cannot be empty",
      });
    }

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

    // Only emails explicitly configured by the owner can register
    // as admins through this registration flow.
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

    const adminCode = isAdmin
      ? await generateAdminCode()
      : undefined;

    const user = await User.create({
      name: normalizedName,
      email: normalizedEmail,
      phone: normalizedPhone,
      password,
      role: isAdmin ? "admin" : "member",
      status: isAdmin ? "active" : "pending",
      adminCode,
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

    // Create a membership application for regular users
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
        dataScope: user.dataScope || "live",
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
      message: "Registration failed",
    });
  }
};

// --------------------------------------------------
// LOGIN USER
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
      message: "Login failed",
    });
  }
};

// --------------------------------------------------
// EMAIL TRANSPORTER
// --------------------------------------------------

const createEmailTransporter = () => {
  const {
    SMTP_HOST,
    SMTP_PORT,
    SMTP_USER,
    SMTP_PASS,
  } = process.env;

  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) {
    throw new Error("SMTP environment variables are not configured");
  }

  return nodemailer.createTransport({
    host: SMTP_HOST,
    port: Number(SMTP_PORT || 587),
    secure: process.env.SMTP_SECURE === "true",
    auth: {
      user: SMTP_USER,
      pass: SMTP_PASS,
    },
  });
};

// --------------------------------------------------
// PASSWORD RESET EMAIL TEMPLATE
// --------------------------------------------------

const createPasswordResetEmail = (resetUrl) => {
  const currentYear = new Date().getFullYear();

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Reset Your Password</title>
</head>

<body style="
  margin:0;
  padding:0;
  background-color:#f3f5f9;
  font-family:Arial,Helvetica,sans-serif;
  color:#172033;
">
  <div style="
    display:none;
    max-height:0;
    overflow:hidden;
    opacity:0;
  ">
    Reset your FAMES account password securely.
  </div>

  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
    style="background-color:#f3f5f9;padding:36px 12px;">
    <tr>
      <td align="center">

        <table role="presentation" width="100%" cellpadding="0" cellspacing="0"
          style="
            max-width:560px;
            background-color:#ffffff;
            border-radius:16px;
            overflow:hidden;
            border:1px solid #e5e9f2;
          ">

          <!-- Header -->
          <tr>
            <td align="center" style="
              background-color:#123c32;
              padding:30px 24px;
            ">
              <div style="
                display:inline-block;
                background-color:#ffffff;
                color:#123c32;
                font-size:22px;
                font-weight:800;
                padding:10px 14px;
                border-radius:10px;
                letter-spacing:1px;
              ">
                FAMES
              </div>

              <p style="
                margin:14px 0 0;
                color:#d4e8df;
                font-size:13px;
                letter-spacing:1.5px;
                text-transform:uppercase;
              ">
                Savings Management System
              </p>
            </td>
          </tr>

          <!-- Content -->
          <tr>
            <td style="padding:36px 30px 28px;">

              <div style="
                width:56px;
                height:56px;
                line-height:56px;
                text-align:center;
                background-color:#e8f5ee;
                border-radius:50%;
                font-size:26px;
                margin-bottom:22px;
              ">
                &#128274;
              </div>

              <h1 style="
                margin:0 0 16px;
                font-size:26px;
                line-height:1.3;
                color:#172033;
              ">
                Reset your password
              </h1>

              <p style="
                margin:0 0 16px;
                font-size:15px;
                line-height:1.8;
                color:#526074;
              ">
                We received a request to reset the password for your
                FAMES account.
              </p>

              <p style="
                margin:0 0 26px;
                font-size:15px;
                line-height:1.8;
                color:#526074;
              ">
                Click the button below to choose a new password and
                regain access to your account.
              </p>

              <!-- Reset button -->
              <table role="presentation" cellpadding="0" cellspacing="0"
                style="margin:0 0 26px;">
                <tr>
                  <td align="center" bgcolor="#16845b"
                    style="border-radius:8px;">
                    <a href="${resetUrl}"
                      target="_blank"
                      style="
                        display:inline-block;
                        padding:15px 28px;
                        color:#ffffff;
                        font-size:15px;
                        font-weight:bold;
                        text-decoration:none;
                        border-radius:8px;
                      ">
                      Reset My Password &rarr;
                    </a>
                  </td>
                </tr>
              </table>

              <!-- Expiry notice -->
              <table role="presentation" width="100%" cellpadding="0"
                cellspacing="0"
                style="
                  background-color:#fff8e8;
                  border:1px solid #f5e4b8;
                  border-radius:8px;
                  margin-bottom:26px;
                ">
                <tr>
                  <td style="
                    padding:15px 16px;
                    font-size:13px;
                    line-height:1.7;
                    color:#795b19;
                  ">
                    <strong>Security notice</strong><br />
                    This password reset link expires in
                    <strong>15 minutes</strong>.
                  </td>
                </tr>
              </table>

              <p style="
                margin:0 0 12px;
                font-size:13px;
                line-height:1.8;
                color:#667085;
              ">
                If the button doesn't work, copy and paste this link
                into your browser:
              </p>

              <p style="
                margin:0 0 26px;
                font-size:12px;
                line-height:1.8;
                overflow-wrap:anywhere;
                word-break:break-word;
              ">
                <a href="${resetUrl}"
                  style="color:#16845b;text-decoration:underline;">
                  ${resetUrl}
                </a>
              </p>

              <div style="
                border-top:1px solid #e9edf3;
                padding-top:22px;
              ">
                <p style="
                  margin:0;
                  font-size:13px;
                  line-height:1.8;
                  color:#667085;
                ">
                  <strong>Didn't request this?</strong><br />
                  You can safely ignore this email. Your password will
                  remain unchanged unless you complete the reset process.
                </p>
              </div>

            </td>
          </tr>

          <!-- Footer -->
          <tr>
            <td align="center" style="
              background-color:#f8fafc;
              border-top:1px solid #e9edf3;
              padding:22px 24px;
            ">
              <p style="
                margin:0 0 7px;
                font-size:13px;
                font-weight:bold;
                color:#344054;
              ">
                FAMES Savings Management System
              </p>

              <p style="
                margin:0;
                font-size:12px;
                line-height:1.7;
                color:#98a2b3;
              ">
                This is an automated security email.<br />
                Please do not reply to this message.
              </p>
            </td>
          </tr>

        </table>

        <p style="
          margin:20px 0 0;
          font-size:11px;
          color:#98a2b3;
          text-align:center;
        ">
          &copy; ${currentYear} FAMES. All rights reserved.
        </p>

      </td>
    </tr>
  </table>
</body>
</html>
`;

  const text = [
    "We received a request to reset your FAMES account password.",
    "",
    `Reset your password using this link within 15 minutes: ${resetUrl}`,
    "",
    "If you did not request this, you can ignore this email.",
    "Your password will remain unchanged unless you complete the reset process.",
  ].join("\n");

  return {
    subject: "Reset your FAMES password",
    text,
    html,
  };
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

    const frontendUrl = process.env.FRONTEND_URL;

    if (!frontendUrl) {
      throw new Error("FRONTEND_URL is not configured");
    }

    const user = await User.findOne({ email });

    // Use the same response for existing and non-existing accounts.
    const message =
      "If an account exists for that email, a password reset link will be sent.";

    if (!user) {
      return res.status(200).json({
        success: true,
        message,
      });
    }

    // Generate a cryptographically secure random token.
    const resetToken = crypto.randomBytes(32).toString("hex");

    // Store only the SHA-256 hash in the database.
    user.resetPasswordToken = crypto
      .createHash("sha256")
      .update(resetToken)
      .digest("hex");

    user.resetPasswordExpires = new Date(
      Date.now() + 15 * 60 * 1000
    );

    await user.save();

    const resetUrl =
      `${frontendUrl.replace(/\/+$/, "")}` +
      `/reset-password?token=${encodeURIComponent(resetToken)}`;

    const transporter = createEmailTransporter();
    const emailContent = createPasswordResetEmail(resetUrl);

    await transporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.SMTP_USER,
      to: user.email,
      ...emailContent,
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

    if (!token || typeof token !== "string") {
      return res.status(400).json({
        success: false,
        message: "Reset token is required",
      });
    }

    if (
      typeof password !== "string" ||
      password.length < 6
    ) {
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
        message:
          "This password reset link is invalid or has expired.",
      });
    }

    // The User model's pre-save hook should hash the password.
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
