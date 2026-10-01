const mongoose = require("mongoose");

const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");

const CashLock =
  mongoose.models.CashLock ||
  mongoose.model(
    "CashLock",
    new mongoose.Schema({
      _id: { type: String },
      version: { type: Number, default: 0 },
    })
  );

const CATEGORIES = [
  "GENERAL",
  "ADMIN",
  "INVESTMENT",
  "BANK_FEE",
  "TRANSPORT",
  "OTHER",
];

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateId = (id) => {
  if (
    typeof id !== "string" ||
    !mongoose.Types.ObjectId.isValid(id)
  ) {
    fail("Invalid expense ID");
  }
};

const readText = (value, label, required = false) => {
  if (value === undefined && !required) return "";

  if (
    typeof value !== "string" ||
    (required && !value.trim())
  ) {
    fail(`${label} must be ${required ? "non-empty " : ""}text`);
  }

  return value.trim();
};

const readAmount = (value) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail("Invalid expense amount");
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount <= 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount * 100 - Math.round(amount * 100)) >
      0.000001
  ) {
    fail("Amount must be positive with at most 2 decimals");
  }

  return amount;
};

const readDate = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(`${label} must be a date string`);
  }

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    fail(`Invalid ${label}`);
  }

  return date;
};

const readCategory = (value) => {
  if (!CATEGORIES.includes(value)) {
    fail("Invalid expense category");
  }

  return value;
};

const handler = (adminOnly, action) => async (req, res) => {
  try {
    if (!req.user?._id) {
      fail("Authentication required", 401);
    }

    if (!["live", "demo"].includes(req.dataScope)) {
      fail("Invalid data scope");
    }

    if (adminOnly && req.user.role !== "admin") {
      fail("Admin access required", 403);
    }

    await action(req, res);
  } catch (error) {
    console.error("Expense controller error:", error);

    const status =
      error.statusCode ||
      (["ValidationError", "CastError"].includes(error.name)
        ? 400
        : 500);

    return res.status(status).json({
      success: false,
      message:
        status < 500
          ? error.message
          : "Failed to process expense request",
    });
  }
};

const withCashTransaction = async (dataScope, action) => {
  try {
    await CashLock.updateOne(
      { _id: dataScope },
      { $setOnInsert: { version: 0 } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) throw error;
  }

  const session = await mongoose.startSession();

  try {
    await session.withTransaction(async () => {
      await CashLock.updateOne(
        { _id: dataScope },
        { $inc: { version: 1 } },
        { session }
      );

      await action(session);
    });
  } finally {
    await session.endSession();
  }
};

const checkAvailableCash = async (amount, dataScope, session) => {
  const [result] = await Transaction.aggregate([
    { $match: { dataScope } },
    {
      $group: {
        _id: null,
        balance: {
          $sum: {
            $cond: [
              { $eq: ["$direction", "IN"] },
              "$amount",
              { $multiply: ["$amount", -1] },
            ],
          },
        },
      },
    },
  ]).session(session);

  if (
    Math.round(amount * 100) >
    Math.round(Number(result?.balance || 0) * 100)
  ) {
    fail("Insufficient available cash", 409);
  }
};

const loadExpense = (id, dataScope) =>
  Expense.findOne({
    _id: id,
    dataScope,
  }).populate("createdBy", "name email");

// --------------------------------------------------
// ADD EXPENSE
// ADMIN
// --------------------------------------------------

const addExpense = handler(true, async (req, res) => {
  const body = req.body || {};

  const title = readText(body.title, "Title", true);
  const amount = readAmount(body.amount);
  const category = readCategory(body.category ?? "GENERAL");
  const note = readText(body.note, "Note");

  const expenseDate =
    body.expenseDate === undefined
      ? new Date()
      : readDate(body.expenseDate, "Expense date");

  if (expenseDate > new Date()) {
    fail("Expense date cannot be in the future");
  }

  let savedId;

  await withCashTransaction(req.dataScope, async (session) => {
    await checkAvailableCash(amount, req.dataScope, session);

    const [expense] = await Expense.create(
      [
        {
          title,
          category,
          amount,
          expenseDate,
          note,
          createdBy: req.user._id,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    await Transaction.create(
      [
        {
          type: "EXPENSE",
          direction: "OUT",
          amount,
          referenceType: "Expense",
          referenceId: expense._id,
          description: title,
          transactionDate: expenseDate,
          createdBy: req.user._id,
          dataScope: req.dataScope,
        },
      ],
      { session }
    );

    savedId = expense._id;
  });

  return res.status(201).json({
    success: true,
    message: "Expense added successfully",
    expense: await loadExpense(savedId, req.dataScope),
  });
});

// --------------------------------------------------
// GET ALL EXPENSES
// Existing route permissions still apply.
// --------------------------------------------------

const getAllExpenses = handler(false, async (req, res) => {
  const { category, fromDate, toDate } = req.query;

  const filter = {
    dataScope: req.dataScope,
  };

  if (category !== undefined) {
    filter.category = readCategory(category);
  }

  if (fromDate !== undefined || toDate !== undefined) {
    filter.expenseDate = {};

    if (fromDate !== undefined) {
      filter.expenseDate.$gte = readDate(fromDate, "From date");
    }

    if (toDate !== undefined) {
      filter.expenseDate.$lte = readDate(toDate, "To date");
    }

    if (
      filter.expenseDate.$gte &&
      filter.expenseDate.$lte &&
      filter.expenseDate.$gte > filter.expenseDate.$lte
    ) {
      fail("From date cannot be after to date");
    }
  }

  const expenses = await Expense.find(filter)
    .populate("createdBy", "name email")
    .sort({
      expenseDate: -1,
      createdAt: -1,
      _id: -1,
    });

  return res.status(200).json({
    success: true,
    demoMode: req.user?.isDemo === true,
    count: expenses.length,
    expenses,
  });
});

// --------------------------------------------------
// GET ONE EXPENSE
// --------------------------------------------------

const getExpenseById = handler(false, async (req, res) => {
  validateId(req.params.id);

  const expense = await loadExpense(req.params.id, req.dataScope);

  if (!expense) {
    fail("Expense not found", 404);
  }

  return res.status(200).json({
    success: true,
    demoMode: req.user?.isDemo === true,
    expense,
  });
});

// --------------------------------------------------
// UPDATE EXPENSE
// ADMIN
//
// amount is the corrected total, not an additional payment.
// --------------------------------------------------

const updateExpense = handler(true, async (req, res) => {
  validateId(req.params.id);

  const body = req.body || {};
  const updates = {};

  if (body.title !== undefined) {
    updates.title = readText(body.title, "Title", true);
  }

  if (body.category !== undefined) {
    updates.category = readCategory(body.category);
  }

  if (body.amount !== undefined) {
    updates.amount = readAmount(body.amount);
  }

  if (body.note !== undefined) {
    updates.note = readText(body.note, "Note");
  }

  if (body.expenseDate !== undefined) {
    updates.expenseDate = readDate(
      body.expenseDate,
      "Expense date"
    );

    if (updates.expenseDate > new Date()) {
      fail("Expense date cannot be in the future");
    }
  }

  await withCashTransaction(req.dataScope, async (session) => {
    const expense = await Expense.findOne({
      _id: req.params.id,
      dataScope: req.dataScope,
    }).session(session);

    if (!expense) {
      fail("Expense not found", 404);
    }

    const oldAmount = Number(expense.amount);
    const newAmount = updates.amount ?? oldAmount;

    const difference =
      Math.round((newAmount - oldAmount) * 100) / 100;

    if (difference > 0) {
      await checkAvailableCash(
        difference,
        req.dataScope,
        session
      );
    }

    Object.assign(expense, updates);

    await expense.save({ session });

    if (difference !== 0) {
      await Transaction.create(
        [
          {
            type: "ADJUSTMENT",
            direction: difference > 0 ? "OUT" : "IN",
            amount: Math.abs(difference),
            referenceType: "Expense",
            referenceId: expense._id,
            description:
              difference > 0
                ? `Expense increased: ${expense.title}`
                : `Expense reduced: ${expense.title}`,
            transactionDate: new Date(),
            createdBy: req.user._id,
            dataScope: req.dataScope,
          },
        ],
        { session }
      );
    }
  });

  return res.status(200).json({
    success: true,
    message: "Expense updated successfully",
    expense: await loadExpense(req.params.id, req.dataScope),
  });
});

module.exports = {
  addExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
};