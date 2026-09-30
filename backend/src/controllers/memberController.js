const mongoose = require("mongoose");
const { randomUUID } = require("crypto");

const User = require("../models/User");
const Member = require("../models/Member");

const USER_FIELDS = "name email role status createdAt";

const PERSONAL_FIELDS = [
  "phone",
  "address",
  "nidNumber",
  "passportNumber",
];

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateId = (value, label = "member ID") => {
  if (
    typeof value !== "string" ||
    !mongoose.Types.ObjectId.isValid(value)
  ) {
    fail(`Invalid ${label}`);
  }
};

const checkContext = (req, adminOnly = false) => {
  if (!req.user?._id) {
    fail("Authentication required", 401);
  }

  if (!["live", "demo"].includes(req.dataScope)) {
    fail("Invalid data scope");
  }

  if (adminOnly && req.user.role !== "admin") {
    fail("Admin access required", 403);
  }
};

const readBody = (req) => {
  const body = req.body || {};

  if (
    typeof body !== "object" ||
    Array.isArray(body)
  ) {
    fail("Request body must be an object");
  }

  return body;
};

const applyPersonalFields = (member, body) => {
  for (const field of PERSONAL_FIELDS) {
    if (body[field] === undefined) {
      continue;
    }

    if (typeof body[field] !== "string") {
      fail(`${field} must be text`);
    }

    const value = body[field].trim();

    member[field] =
      field === "passportNumber"
        ? value.toUpperCase()
        : value;
  }
};

const setName = (member, value) => {
  if (
    typeof value !== "string" ||
    !value.trim()
  ) {
    fail("Member name is required");
  }

  member.name = value.trim();
};

const validateMonthlyContribution = (value) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail("Invalid monthly contribution");
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount * 100 - Math.round(amount * 100)) >
      0.000001
  ) {
    fail(
      "Monthly contribution must be non-negative " +
        "with at most 2 decimal places"
    );
  }

  return amount;
};

const generateMemberCode = () =>
  `MEM-${randomUUID().replace(/-/g, "").toUpperCase()}`;

const formatMember = (member) => {
  const item = member.toObject();

  return {
    ...item,
    name: item.name || item.user?.name || "",
    hasLoginAccount: Boolean(item.user),
  };
};

const loadMember = async (id, dataScope) => {
  return Member.findOne({
    _id: id,
    dataScope,
  }).populate("user", USER_FIELDS);
};

const rejectProtectedFields = (body) => {
  const protectedFields = [
    "user",
    "userId",
    "memberCode",
    "dataScope",
    "totalContribution",
    "openingContribution",
    "openingBalanceDate",
    "ownershipPercentage",
  ];

  for (const field of protectedFields) {
    if (Object.prototype.hasOwnProperty.call(body, field)) {
      fail(
        `${field} cannot be edited through this endpoint`
      );
    }
  }
};

const handler = (adminOnly, action) => {
  return async (req, res) => {
    try {
      checkContext(req, adminOnly);

      await action(req, res);
    } catch (error) {
      console.error("Member controller error:", error);

      const status =
        error.statusCode ||
        (error.code === 11000 ? 409 : 0) ||
        (["ValidationError", "CastError"].includes(error.name)
          ? 400
          : 500);

      return res.status(status).json({
        success: false,
        message:
          error.code === 11000
            ? "Member code or linked account already exists"
            : status < 500
              ? error.message
              : "Failed to process member request",
      });
    }
  };
};

// --------------------------------------------------
// CREATE MEMBER WITHOUT LOGIN ACCOUNT
// ADMIN
// --------------------------------------------------

const createMember = handler(true, async (req, res) => {
  const body = readBody(req);

  rejectProtectedFields(body);

  const member = new Member({
    memberCode: generateMemberCode(),
    monthlyContribution: 1000,
    membershipStatus: "active",
    dataScope: req.dataScope,
  });

  setName(member, body.name);
  applyPersonalFields(member, body);

  if (body.joinDate !== undefined) {
    if (
      typeof body.joinDate !== "string" ||
      !body.joinDate.trim()
    ) {
      fail("Join date must be a valid date string");
    }

    const date = new Date(body.joinDate);

    if (
      Number.isNaN(date.getTime()) ||
      date.getTime() > Date.now()
    ) {
      fail("Join date must be valid and cannot be in the future");
    }

    member.joinDate = date;
  }

  await member.save();

  return res.status(201).json({
    success: true,
    message: "Member profile created without a login account",
    member: formatMember(member),
  });
});

// --------------------------------------------------
// GET ALL MEMBERS
// ADMIN
// --------------------------------------------------

const getAllMembers = handler(true, async (req, res) => {
  const members = await Member.find({
    dataScope: req.dataScope,
  })
    .populate("user", USER_FIELDS)
    .sort({
      createdAt: -1,
      _id: -1,
    });

  return res.status(200).json({
    success: true,
    count: members.length,
    members: members.map(formatMember),
  });
});

// --------------------------------------------------
// GET MEMBER BY ID
// ADMIN
// --------------------------------------------------

const getMemberById = handler(true, async (req, res) => {
  validateId(req.params.id);

  const member = await loadMember(
    req.params.id,
    req.dataScope
  );

  if (!member) {
    fail("Member not found", 404);
  }

  return res.status(200).json({
    success: true,
    member: formatMember(member),
  });
});

// --------------------------------------------------
// APPROVE USER
// ADMIN
//
// body.memberId supplied:
// Link account to an existing unregistered member.
//
// body.memberId omitted:
// Create a new member profile.
// --------------------------------------------------

const approveUser = handler(true, async (req, res) => {
  validateId(req.params.userId, "user ID");

  const body = readBody(req);

  rejectProtectedFields(body);

  if (body.memberId !== undefined) {
    validateId(body.memberId);
  }

  const session = await mongoose.startSession();

  let savedMemberId;

  try {
    await session.withTransaction(async () => {
      const user = await User.findOne({
        _id: req.params.userId,
        dataScope: req.dataScope,
      }).session(session);

      if (!user) {
        fail("User not found", 404);
      }

      if (user.role !== "member") {
        fail("Only member accounts can be approved");
      }

      if (user.status !== "pending") {
        fail(
          "Only pending registrations can be approved",
          409
        );
      }

      const alreadyLinked = await Member.findOne({
        user: user._id,
        dataScope: req.dataScope,
      }).session(session);

      if (alreadyLinked) {
        fail(
          "This account already has a member profile",
          409
        );
      }

      let member;

      if (body.memberId !== undefined) {
        member = await Member.findOne({
          _id: body.memberId,
          dataScope: req.dataScope,
        }).session(session);

        if (!member) {
          fail("Existing member profile not found", 404);
        }

        if (member.user) {
          fail(
            "This profile already has a linked account",
            409
          );
        }

        if (member.membershipStatus !== "active") {
          fail(
            "Only active member profiles can be linked",
            409
          );
        }

        // Preserve historical financial records.
        member.user = user._id;

        if (!member.name) {
          setName(member, user.name);
        }

        // Only explicitly supplied fields replace existing data.
        applyPersonalFields(member, body);
      } else {
        member = new Member({
          user: user._id,
          memberCode: generateMemberCode(),
          monthlyContribution: 1000,
          membershipStatus: "active",
          dataScope: req.dataScope,
        });

        setName(member, user.name);

        const personalData = {};

        for (const field of PERSONAL_FIELDS) {
          personalData[field] =
            body[field] !== undefined
              ? body[field]
              : String(user[field] || "");
        }

        applyPersonalFields(member, personalData);
      }

      await member.save({ session });

      user.status = "active";

      await user.save({ session });

      savedMemberId = member._id;
    });
  } finally {
    await session.endSession();
  }

  const member = await loadMember(
    savedMemberId,
    req.dataScope
  );

  return res.status(
    body.memberId !== undefined ? 200 : 201
  ).json({
    success: true,
    message:
      body.memberId !== undefined
        ? "User approved and linked to the existing member"
        : "User approved and member profile created",
    member: formatMember(member),
  });
});

// --------------------------------------------------
// GET PENDING USERS
// ADMIN
// --------------------------------------------------

const getPendingUsers = handler(true, async (req, res) => {
  const users = await User.find({
    role: "member",
    status: "pending",
    dataScope: req.dataScope,
  })
    .select("-password")
    .sort({
      createdAt: -1,
      _id: -1,
    });

  return res.status(200).json({
    success: true,
    count: users.length,
    users,
  });
});

// --------------------------------------------------
// UPDATE MEMBER
// ADMIN
// --------------------------------------------------

const updateMember = handler(true, async (req, res) => {
  validateId(req.params.id);

  const body = readBody(req);

  rejectProtectedFields(body);

  const member = await Member.findOne({
    _id: req.params.id,
    dataScope: req.dataScope,
  });

  if (!member) {
    fail("Member not found", 404);
  }

  if (body.name !== undefined) {
    setName(member, body.name);
  }

  applyPersonalFields(member, body);

  if (body.monthlyContribution !== undefined) {
    member.monthlyContribution =
      validateMonthlyContribution(
        body.monthlyContribution
      );
  }

  if (body.membershipStatus !== undefined) {
    if (
      !["active", "inactive"].includes(
        body.membershipStatus
      )
    ) {
      fail(
        "Use the exit request workflow to mark a member as exited"
      );
    }

    if (member.membershipStatus === "exited") {
      fail(
        "Exited members cannot be reactivated through this endpoint",
        409
      );
    }

    member.membershipStatus = body.membershipStatus;
  }

  await member.save();

  const updatedMember = await loadMember(
    member._id,
    req.dataScope
  );

  return res.status(200).json({
    success: true,
    message: "Member updated successfully",
    member: formatMember(updatedMember),
  });
});

// --------------------------------------------------
// GET MY MEMBER PROFILE
// AUTHENTICATED MEMBER
// --------------------------------------------------

const getMyMemberProfile = handler(
  false,
  async (req, res) => {
    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    }).populate("user", USER_FIELDS);

    if (!member) {
      fail("Member profile not found", 404);
    }

    return res.status(200).json({
      success: true,
      member: formatMember(member),
    });
  }
);

// --------------------------------------------------
// UPDATE MY MEMBER PROFILE
// AUTHENTICATED MEMBER
// --------------------------------------------------

const updateMyMemberProfile = handler(
  false,
  async (req, res) => {
    const body = readBody(req);

    const allowedFields = new Set(PERSONAL_FIELDS);

    for (const field of Object.keys(body)) {
      if (!allowedFields.has(field)) {
        fail(`${field} cannot be edited through this endpoint`);
      }
    }

    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!member) {
      fail("Member profile not found", 404);
    }

    applyPersonalFields(member, body);

    await member.save();

    const updatedMember = await loadMember(
      member._id,
      req.dataScope
    );

    return res.status(200).json({
      success: true,
      message: "Profile updated successfully",
      member: formatMember(updatedMember),
    });
  }
);

// --------------------------------------------------
// DELETE MEMBER
// ADMIN
//
// Keep the route export, but prevent deletion of
// financial profiles and their historical references.
// --------------------------------------------------

const deleteMember = handler(true, async (req, res) => {
  validateId(req.params.id);

  const member = await Member.findOne({
    _id: req.params.id,
    dataScope: req.dataScope,
  });

  if (!member) {
    fail("Member not found", 404);
  }

  fail(
    "Financial member profiles cannot be permanently deleted. " +
      "Set membershipStatus to inactive or use the exit request workflow.",
    409
  );
});

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  createMember,

  getAllMembers,
  getMemberById,

  getMyMemberProfile,
  updateMyMemberProfile,

  approveUser,
  getPendingUsers,
  updateMember,
  deleteMember,
};