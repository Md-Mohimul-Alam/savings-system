require("dotenv").config();

const crypto = require("crypto");
const mongoose = require("mongoose");

const User = require("../models/User");
const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const Transaction = require("../models/Transaction");
const Investment = require("../models/Investment");
const Expense = require("../models/Expense");
const ProfitDistribution = require("../models/ProfitDistribution");
const Notification = require("../models/Notification");
const AuditLog = require("../models/AuditLog");
const JoinRequest = require("../models/JoinRequest");
const ExitRequest = require("../models/ExitRequest");

const DATA_SCOPE = "demo";
const DEMO_ADMIN_EMAIL =
  process.env.DEMO_ADMIN_EMAIL ||
  "demo.admin@famesorganization.com";
const DEMO_ADMIN_PHONE =
  process.env.DEMO_ADMIN_PHONE ||
  "01000000000";
const DEMO_ADMIN_PASSWORD =
  process.env.DEMO_ADMIN_PASSWORD;

if (!process.env.MONGODB_URI) {
  throw new Error(
    "MONGODB_URI is required."
  );
}

if (!DEMO_ADMIN_PASSWORD) {
  throw new Error(
    "DEMO_ADMIN_PASSWORD is required. Do not hard-code the demo password in this script."
  );
}

const demoMembersSeed = [
  {
    name: "Araf Rahman",
    email: "demo.member1@famesorganization.com",
    phone: "01000000001",
    address: "Dhaka",
    memberCode: "DMEM-001",
  },
  {
    name: "Nafisa Ahmed",
    email: "demo.member2@famesorganization.com",
    phone: "01000000002",
    address: "Chattogram",
    memberCode: "DMEM-002",
  },
  {
    name: "Samiul Hasan",
    email: "demo.member3@famesorganization.com",
    phone: "01000000003",
    address: "Sylhet",
    memberCode: "DMEM-003",
  },
  {
    name: "Tahmina Akter",
    email: "demo.member4@famesorganization.com",
    phone: "01000000004",
    address: "Rajshahi",
    memberCode: "DMEM-004",
  },
  {
    name: "Rafi Islam",
    email: "demo.member5@famesorganization.com",
    phone: "01000000005",
    address: "Khulna",
    memberCode: "DMEM-005",
  },
  {
    name: "Mehjabin Noor",
    email: "demo.member6@famesorganization.com",
    phone: "01000000006",
    address: "Dhaka",
    memberCode: "DMEM-006",
  },
  {
    name: "Tanvir Hossain",
    email: "demo.member7@famesorganization.com",
    phone: "01000000007",
    address: "Cumilla",
    memberCode: "DMEM-007",
  },
  {
    name: "Farzana Kabir",
    email: "demo.member8@famesorganization.com",
    phone: "01000000008",
    address: "Dhaka",
    memberCode: "DMEM-008",
  },
];

const monthPairs = [
  { month: 4, year: 2026 },
  { month: 5, year: 2026 },
  { month: 6, year: 2026 },
  { month: 7, year: 2026 },
  { month: 8, year: 2026 },
  { month: 9, year: 2026 },
];

const cleanupDemoData = async () => {
  await Promise.all([
    ProfitDistribution.deleteMany({ dataScope: DATA_SCOPE }),
    Contribution.deleteMany({ dataScope: DATA_SCOPE }),
    Transaction.deleteMany({ dataScope: DATA_SCOPE }),
    Investment.deleteMany({ dataScope: DATA_SCOPE }),
    Expense.deleteMany({ dataScope: DATA_SCOPE }),
    Notification.deleteMany({ dataScope: DATA_SCOPE }),
    AuditLog.deleteMany({ dataScope: DATA_SCOPE }),
    JoinRequest.deleteMany({ dataScope: DATA_SCOPE }),
    ExitRequest.deleteMany({ dataScope: DATA_SCOPE }),
    Member.deleteMany({ dataScope: DATA_SCOPE }),
  ]);

  await User.deleteMany({
    dataScope: DATA_SCOPE,
  });
};

const seed = async () => {
  await mongoose.connect(
    process.env.MONGODB_URI
  );

  console.log(
    "Connected to MongoDB."
  );

  // This deletes ONLY demo-scoped records.
  // Live records are untouched.
  await cleanupDemoData();

  const demoAdmin =
    await User.create({
      name:
        "FAME'S Demo Admin",
      email:
        DEMO_ADMIN_EMAIL,
      phone:
        DEMO_ADMIN_PHONE,
      password:
        DEMO_ADMIN_PASSWORD,
      adminCode:
        "DEMO-ADMIN",
      role:
        "admin",
      status:
        "active",
      isDemo:
        true,
      dataScope:
        DATA_SCOPE,
    });

  const members = [];

  for (
    let i = 0;
    i <
    demoMembersSeed.length;
    i += 1
  ) {
    const item =
      demoMembersSeed[i];

    // Random unknown password prevents these fake members
    // from being usable as public demo logins.
    const randomPassword =
      crypto
        .randomBytes(24)
        .toString("hex");

    const user =
      await User.create({
        name:
          item.name,
        email:
          item.email,
        phone:
          item.phone,
        password:
          randomPassword,
        role:
          "member",
        status:
          "active",
        isDemo:
          true,
        dataScope:
          DATA_SCOPE,
      });

    const member =
      await Member.create({
        user:
          user._id,
        memberCode:
          item.memberCode,
        phone:
          item.phone,
        address:
          item.address,
        monthlyContribution:
          1000,
        joinDate:
          new Date(
            "2026-04-01T00:00:00.000Z"
          ),
        membershipStatus:
          "active",
        totalContribution:
          0,
        ownershipPercentage:
          0,
        nidNumber:
          `DEMO-NID-${String(
            i + 1
          ).padStart(3, "0")}`,
        passportNumber:
          `DEMO-P-${String(
            i + 1
          ).padStart(3, "0")}`,
        dataScope:
          DATA_SCOPE,
      });

    members.push({
      user,
      member,
    });
  }

  // --------------------------------------------------
  // CONTRIBUTIONS + CONTRIBUTION TRANSACTIONS
  // --------------------------------------------------

  for (
    let memberIndex = 0;
    memberIndex <
    members.length;
    memberIndex += 1
  ) {
    const {
      member,
    } =
      members[memberIndex];

    let totalPaid = 0;

    for (
      let monthIndex = 0;
      monthIndex <
      monthPairs.length;
      monthIndex += 1
    ) {
      const period =
        monthPairs[monthIndex];

      let paidAmount = 1000;

      // Add a little realistic variation.
      if (
        period.month === 9 &&
        memberIndex === 2
      ) {
        paidAmount = 500;
      }

      if (
        period.month === 9 &&
        memberIndex === 6
      ) {
        paidAmount = 0;
      }

      const status =
        paidAmount >= 1000
          ? "paid"
          : paidAmount > 0
          ? "partial"
          : "due";

      const paymentDate =
        paidAmount > 0
          ? new Date(
              Date.UTC(
                period.year,
                period.month - 1,
                5 + memberIndex
              )
            )
          : null;

      const contribution =
        await Contribution.create({
          member:
            member._id,
          month:
            period.month,
          year:
            period.year,
          expectedAmount:
            1000,
          paidAmount,
          status,
          paymentDate,
          note:
            "Demo monthly contribution",
          dataScope:
            DATA_SCOPE,
        });

      if (paidAmount > 0) {
        await Transaction.create({
          type:
            "CONTRIBUTION",
          direction:
            "IN",
          amount:
            paidAmount,
          member:
            member._id,
          referenceType:
            "Contribution",
          referenceId:
            contribution._id,
          description:
            `Demo contribution ${period.month}/${period.year}`,
          transactionDate:
            paymentDate ||
            new Date(),
          createdBy:
            demoAdmin._id,
          dataScope:
            DATA_SCOPE,
        });

        totalPaid +=
          paidAmount;
      }
    }

    member.totalContribution =
      totalPaid;

    await member.save();
  }

  // --------------------------------------------------
  // OWNERSHIP %
  // --------------------------------------------------

  const totalGroupContribution =
    members.reduce(
      (
        sum,
        { member }
      ) =>
        sum +
        Number(
          member.totalContribution ||
            0
        ),
      0
    );

  for (
    const {
      member,
    } of members
  ) {
    member.ownershipPercentage =
      totalGroupContribution > 0
        ? Number(
            (
              (member.totalContribution /
                totalGroupContribution) *
              100
            ).toFixed(4)
          )
        : 0;

    await member.save();
  }

  // --------------------------------------------------
  // INVESTMENTS
  // --------------------------------------------------

  const investment1 =
    await Investment.create({
      name:
        "Demo E-commerce Venture",
      description:
        "Sample investment used only in Demo Mode.",
      investedAmount:
        20000,
      currentValue:
        23500,
      status:
        "active",
      startDate:
        new Date(
          "2026-06-15T00:00:00.000Z"
        ),
      createdBy:
        demoAdmin._id,
      dataScope:
        DATA_SCOPE,
    });

  const investment2 =
    await Investment.create({
      name:
        "Demo Fixed-Term Business Investment",
      description:
        "Second fake investment for dashboard demonstration.",
      investedAmount:
        15000,
      currentValue:
        16250,
      status:
        "active",
      startDate:
        new Date(
          "2026-07-10T00:00:00.000Z"
        ),
      createdBy:
        demoAdmin._id,
      dataScope:
        DATA_SCOPE,
    });

  await Transaction.insertMany([
    {
      type:
        "INVESTMENT",
      direction:
        "OUT",
      amount:
        20000,
      referenceType:
        "Investment",
      referenceId:
        investment1._id,
      description:
        "Demo E-commerce Venture investment",
      transactionDate:
        new Date(
          "2026-06-15T00:00:00.000Z"
        ),
      createdBy:
        demoAdmin._id,
      dataScope:
        DATA_SCOPE,
    },
    {
      type:
        "INVESTMENT",
      direction:
        "OUT",
      amount:
        15000,
      referenceType:
        "Investment",
      referenceId:
        investment2._id,
      description:
        "Demo Fixed-Term Business Investment",
      transactionDate:
        new Date(
          "2026-07-10T00:00:00.000Z"
        ),
      createdBy:
        demoAdmin._id,
      dataScope:
        DATA_SCOPE,
    },
  ]);

  // --------------------------------------------------
  // EXPENSES
  // --------------------------------------------------

  const expenseSeeds = [
    {
      title:
        "Demo Bank Charge",
      category:
        "BANK_FEE",
      amount:
        500,
      expenseDate:
        new Date(
          "2026-06-30T00:00:00.000Z"
        ),
    },
    {
      title:
        "Demo Administrative Cost",
      category:
        "ADMIN",
      amount:
        2500,
      expenseDate:
        new Date(
          "2026-07-20T00:00:00.000Z"
        ),
    },
    {
      title:
        "Demo Transport Cost",
      category:
        "TRANSPORT",
      amount:
        1500,
      expenseDate:
        new Date(
          "2026-08-18T00:00:00.000Z"
        ),
    },
  ];

  for (
    const item
    of expenseSeeds
  ) {
    const expense =
      await Expense.create({
        ...item,
        note:
          "Fake expense for demo presentation.",
        createdBy:
          demoAdmin._id,
        dataScope:
          DATA_SCOPE,
      });

    await Transaction.create({
      type:
        "EXPENSE",
      direction:
        "OUT",
      amount:
        item.amount,
      referenceType:
        "Expense",
      referenceId:
        expense._id,
      description:
        item.title,
      transactionDate:
        item.expenseDate,
      createdBy:
        demoAdmin._id,
      dataScope:
        DATA_SCOPE,
    });
  }

  // --------------------------------------------------
  // PROFIT DISTRIBUTION
  // --------------------------------------------------

  const totalProfit = 3500;

  const distributionMembers =
    members.map(
      ({
        member,
      }) => {
        const ownership =
          Number(
            member.ownershipPercentage ||
              0
          );

        return {
          member:
            member._id,
          ownershipPercentage:
            ownership,
          profitShare:
            Number(
              (
                totalProfit *
                (ownership /
                  100)
              ).toFixed(2)
            ),
        };
      }
    );

  const distribution =
    await ProfitDistribution.create({
      investment:
        investment1._id,
      totalProfit,
      distributionDate:
        new Date(
          "2026-09-01T00:00:00.000Z"
        ),
      members:
        distributionMembers,
      note:
        "Demo profit distribution only.",
      createdBy:
        demoAdmin._id,
      dataScope:
        DATA_SCOPE,
    });

  await Transaction.create({
    type:
      "PROFIT_DISTRIBUTION",
    direction:
      "OUT",
    amount:
      totalProfit,
    referenceType:
      "ProfitDistribution",
    referenceId:
      distribution._id,
    description:
      "Demo profit distribution",
    transactionDate:
      new Date(
        "2026-09-01T00:00:00.000Z"
      ),
    createdBy:
      demoAdmin._id,
    dataScope:
      DATA_SCOPE,
  });

  // --------------------------------------------------
  // DEMO JOIN REQUEST
  // --------------------------------------------------

  const pendingPassword =
    crypto
      .randomBytes(24)
      .toString("hex");

  const pendingUser =
    await User.create({
      name:
        "Demo Pending Applicant",
      email:
        "demo.pending@famesorganization.com",
      phone:
        "01000000009",
      password:
        pendingPassword,
      role:
        "member",
      status:
        "pending",
      isDemo:
        true,
      dataScope:
        DATA_SCOPE,
    });

  await JoinRequest.create({
    user:
      pendingUser._id,
    phone:
      pendingUser.phone,
    address:
      "Demo Address",
    reason:
      "Sample membership request.",
    status:
      "pending",
    nidNumber:
      "DEMO-NID-009",
    passportNumber:
      "DEMO-P-009",
    dataScope:
      DATA_SCOPE,
  });

  // --------------------------------------------------
  // DEMO EXIT REQUEST
  // --------------------------------------------------

  await ExitRequest.create({
    member:
      members[7].member._id,
    reason:
      "Sample exit request for demonstration.",
    status:
      "pending",
    estimatedPayout:
      12500,
    dataScope:
      DATA_SCOPE,
  });

  // --------------------------------------------------
  // NOTIFICATIONS
  // --------------------------------------------------

  await Notification.insertMany([
    {
      user:
        demoAdmin._id,
      title:
        "Demo Mode Ready",
      message:
        "You are viewing sample organization data. All changes are disabled.",
      type:
        "SYSTEM",
      isRead:
        false,
      link:
        "/dashboard",
      dataScope:
        DATA_SCOPE,
    },
    {
      user:
        demoAdmin._id,
      title:
        "Contribution Update",
      message:
        "Seven demo members have activity for the current month.",
      type:
        "CONTRIBUTION",
      isRead:
        false,
      link:
        "/dashboard/contributions",
      dataScope:
        DATA_SCOPE,
    },
    {
      user:
        demoAdmin._id,
      title:
        "Investment Performance",
      message:
        "Demo investments currently show a positive sample return.",
      type:
        "INVESTMENT",
      isRead:
        true,
      link:
        "/dashboard/investments",
      dataScope:
        DATA_SCOPE,
    },
  ]);

  // --------------------------------------------------
  // AUDIT LOGS
  // --------------------------------------------------

  await AuditLog.insertMany([
    {
      user:
        demoAdmin._id,
      action:
        "VIEW DASHBOARD",
      method:
        "GET",
      endpoint:
        "/api/dashboard",
      ipAddress:
        "127.0.0.1",
      statusCode:
        200,
      dataScope:
        DATA_SCOPE,
    },
    {
      user:
        demoAdmin._id,
      action:
        "VIEW MEMBERS",
      method:
        "GET",
      endpoint:
        "/api/members",
      ipAddress:
        "127.0.0.1",
      statusCode:
        200,
      dataScope:
        DATA_SCOPE,
    },
    {
      user:
        demoAdmin._id,
      action:
        "VIEW INVESTMENTS",
      method:
        "GET",
      endpoint:
        "/api/investments",
      ipAddress:
        "127.0.0.1",
      statusCode:
        200,
      dataScope:
        DATA_SCOPE,
    },
  ]);

  console.log("");
  console.log(
    "Demo data seeded successfully."
  );
  console.log({
    adminCode:
      "DEMO-ADMIN",
    email:
      DEMO_ADMIN_EMAIL,
    phone:
      DEMO_ADMIN_PHONE,
    members:
      members.length,
    dataScope:
      DATA_SCOPE,
  });
};

seed()
  .then(async () => {
    await mongoose.disconnect();
    process.exit(0);
  })
  .catch(async (error) => {
    console.error(
      "Demo seed failed:",
      error
    );

    try {
      await mongoose.disconnect();
    } catch (_) {}

    process.exit(1);
  });
