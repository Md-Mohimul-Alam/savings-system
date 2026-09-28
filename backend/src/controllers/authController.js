const jwt = require("jsonwebtoken");

const User = require("../models/User");
const JoinRequest = require("../models/JoinRequest");

// --------------------------------------------------
// GENERATE JWT
// --------------------------------------------------

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
        process.env.JWT_EXPIRES_IN ||
        "7d",
    }
  );
};

// --------------------------------------------------
// GENERATE ADMIN CODE
// --------------------------------------------------

const generateAdminCode =
  async () => {
    const latestAdmin =
      await User.findOne({
        role: "admin",
        isDemo: { $ne: true },

        adminCode: {
          $exists: true,
          $ne: null,
        },
      })
        .sort({
          createdAt: -1,
        })
        .select(
          "adminCode"
        );

    if (
      !latestAdmin
        ?.adminCode
    ) {
      return "ADM-001";
    }

    const currentNumber =
      Number(
        latestAdmin.adminCode.replace(
          "ADM-",
          ""
        )
      );

    if (
      Number.isNaN(
        currentNumber
      )
    ) {
      return "ADM-001";
    }

    return `ADM-${String(
      currentNumber + 1
    ).padStart(3, "0")}`;
  };

// --------------------------------------------------
// REGISTER
// --------------------------------------------------

const registerUser =
  async (
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

      // -----------------------------------
      // Required fields
      // -----------------------------------

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

      // -----------------------------------
      // Password validation
      // -----------------------------------

      if (
        password.length <
        6
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "Password must be at least 6 characters",
          });
      }

      // -----------------------------------
      // Normalize input
      // -----------------------------------

      const normalizedEmail =
        String(
          email
        )
          .trim()
          .toLowerCase();

      const normalizedPhone =
        String(
          phone
        ).trim();

      const normalizedName =
        String(
          name
        ).trim();

      // -----------------------------------
      // Existing email
      // -----------------------------------

      const existingEmail =
        await User.findOne({
          email:
            normalizedEmail,
        });

      if (
        existingEmail
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An account with this email already exists",
          });
      }

      // -----------------------------------
      // Existing phone
      // -----------------------------------

      const existingPhone =
        await User.findOne({
          phone:
            normalizedPhone,
        });

      if (
        existingPhone
      ) {
        return res
          .status(400)
          .json({
            success: false,

            message:
              "An account with this phone number already exists",
          });
      }

      // -----------------------------------
      // MULTIPLE ADMIN EMAILS
      // -----------------------------------

      const adminEmails =
        (
          process.env
            .ADMIN_EMAILS ||
          process.env
            .ADMIN_EMAIL ||
          ""
        )
          .split(",")
          .map(
            (
              adminEmail
            ) =>
              adminEmail
                .trim()
                .toLowerCase()
          )
          .filter(
            Boolean
          );

      const isAdmin =
        adminEmails.includes(
          normalizedEmail
        );

      // -----------------------------------
      // MAXIMUM ADMIN LIMIT
      // -----------------------------------

      const MAX_ADMINS = 2;

      if (isAdmin) {
        const adminCount =
          await User.countDocuments({
            role: "admin",
            isDemo: { $ne: true },
          });

        if (
          adminCount >=
          MAX_ADMINS
        ) {
          return res
            .status(403)
            .json({
              success: false,

              message:
                "Maximum admin limit reached. Only 2 admin accounts are allowed.",
            });
        }
      }

      // -----------------------------------
      // Generate admin code
      // -----------------------------------

      let adminCode;

      if (isAdmin) {
        adminCode =
          await generateAdminCode();
      }

      // -----------------------------------
      // CREATE USER
      // -----------------------------------

      const user =
        await User.create({
          name:
            normalizedName,

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

          adminCode:
            isAdmin
              ? adminCode
              : undefined,

          isDemo: false,
          dataScope: "live",
        });

      // -----------------------------------
      // ADMIN REGISTRATION
      // -----------------------------------

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
              id:
                user._id,

              adminCode:
                user.adminCode,

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

              isDemo:
                user.isDemo === true,

              dataScope:
                user.dataScope || "live",
            },
          });
      }

      // -----------------------------------
      // MEMBER JOIN REQUEST
      // -----------------------------------

      const joinRequest =
        await JoinRequest.create({
          user:
            user._id,

          phone:
            normalizedPhone,

          address:
            address
              ? String(
                  address
                ).trim()
              : "",

          nidNumber:
            nidNumber
              ? String(
                  nidNumber
                ).trim()
              : "",

          passportNumber:
            passportNumber
              ? String(
                  passportNumber
                )
                  .trim()
                  .toUpperCase()
              : "",

          reason:
            reason
              ? String(
                  reason
                ).trim()
              : "Requested membership during registration",

          status:
            "pending",

          dataScope: "live",
        });

      return res
        .status(201)
        .json({
          success: true,

          message:
            "Registration successful. Your membership application is waiting for admin approval.",

          user: {
            id:
              user._id,

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

            isDemo:
              user.isDemo === true,

            dataScope:
              user.dataScope ||
              (user.isDemo ? "demo" : "live"),
          },

          joinRequest: {
            id:
              joinRequest._id,

            status:
              joinRequest.status,
          },
        });
    } catch (
      error
    ) {
      console.error(
        "Register user error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Registration failed",
        });
    }
  };

// --------------------------------------------------
// LOGIN
// --------------------------------------------------

const loginUser =
  async (
    req,
    res
  ) => {
    try {
      const {
        email,
        phone,
        password,
      } = req.body;

      // -----------------------------------
      // Required fields
      // -----------------------------------

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

      // -----------------------------------
      // Normalize
      // -----------------------------------

      const normalizedEmail =
        String(
          email
        )
          .trim()
          .toLowerCase();

      const normalizedPhone =
        String(
          phone
        ).trim();

      // -----------------------------------
      // Find user
      // -----------------------------------

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

      // -----------------------------------
      // Password check
      // -----------------------------------

      const passwordMatches =
        await user.comparePassword(
          password
        );

      if (
        !passwordMatches
      ) {
        return res
          .status(401)
          .json({
            success: false,

            message:
              "Email, phone number or password is incorrect",
          });
      }

      // -----------------------------------
      // Pending
      // -----------------------------------

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

      // -----------------------------------
      // Suspended
      // -----------------------------------

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

      // -----------------------------------
      // Generate token
      // -----------------------------------

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
            id:
              user._id,

            adminCode:
              user.role ===
              "admin"
                ? user.adminCode
                : undefined,

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
    } catch (
      error
    ) {
      console.error(
        "Login user error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,

          message:
            error?.message ||
            "Login failed",
        });
    }
  };

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  registerUser,
  loginUser,
};