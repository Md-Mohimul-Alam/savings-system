const mongoose = require("mongoose");

const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

// Same model and collection used by expenses, loans, and exits.
const CashLock =
  mongoose.models.CashLock ||
  mongoose.model(
    "CashLock",
    new mongoose.Schema({
      _id: { type: String },
      version: { type: Number, default: 0 },
    })
  );

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const readText = (value, label, required = false) => {
  if (value === undefined && !required) {
    return "";
  }

  if (
    typeof value !== "string" ||
    (required && !value.trim())
  ) {
    fail(
      `${label} must be ${
        required ? "non-empty " : ""
      }text`
    );
  }

  return value.trim();
};

const readMoney = (value, label, allowZero = false) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail(`Invalid ${label}`);
  }

  const amount = Number(value);
  const paisa = Math.round(amount * 100);

  if (
    !Number.isFinite(amount) ||
    !Number.isSafeInteger(paisa) ||
    amount < 0 ||
    (!allowZero && amount === 0) ||
    Math.abs(amount * 100 - paisa) > 0.000001
  ) {
    fail(
      `${label} must be ${
        allowZero ? "non-negative" : "positive"
      } with at most 2 decimals`
    );
  }

  return paisa / 100;
};

const readDate = (value, label) => {
  if (typeof value !== "string" || !value.trim()) {
    fail(`Invalid ${label}`);
  }

  const result = new Date(value);

  if (
    Number.isNaN(result.getTime()) ||
    result > new Date()
  ) {
    fail(
      `${label} must be a valid date that is not in the future`
    );
  }

  return result;
};

const validateId = (id) => {
  if (
    typeof id !== "string" ||
    !/^[a-f\d]{24}$/i.test(id)
  ) {
    fail("Invalid investment ID");
  }
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
    console.error("Investment controller error:", error);

    const status =
      error.statusCode ||
      (error.code === 11000
        ? 409
        : ["ValidationError", "CastError"].includes(error.name)
          ? 400
          : 500);

    return res.status(status).json({
      success: false,
      message:
        status < 500
          ? error.code === 11000
            ? "A conflicting record already exists"
            : error.message
          : "Failed to process investment request",
    });
  }
};

// --------------------------------------------------
// SHARED CASH LOCK AND DATABASE TRANSACTION
// --------------------------------------------------

const withCashTransaction = async (dataScope, action) => {
  try {
    await CashLock.updateOne(
      { _id: dataScope },
      { $setOnInsert: { version: 0 } },
      { upsert: true }
    );
  } catch (error) {
    if (error.code !== 11000) {
      throw error;
    }
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

// --------------------------------------------------
// CHECK AVAILABLE CASH
// --------------------------------------------------

const checkAvailableCash = async (
  amount,
  dataScope,
  session
) => {
  const entries = await Transaction.find({
    dataScope,
  })
    .select("amount direction")
    .session(session)
    .lean();

  let balancePaisa = 0;

  for (const entry of entries) {
    const value = readMoney(
      entry.amount,
      "Ledger amount",
      true
    );

    if (!["IN", "OUT"].includes(entry.direction)) {
      fail(
        "Invalid ledger direction; reconcile the ledger",
        409
      );
    }

    balancePaisa +=
      Math.round(value * 100) *
      (entry.direction === "IN" ? 1 : -1);

    if (!Number.isSafeInteger(balancePaisa)) {
      fail(
        "Ledger balance exceeds supported range",
        409
      );
    }
  }

  if (Math.round(amount * 100) > balancePaisa) {
    fail("Insufficient available cash", 409);
  }
};

const loadInvestment = (id, dataScope) =>
  Investment.findOne({
    _id: id,
    dataScope,
  }).populate("createdBy", "name email");

// --------------------------------------------------
// ADD INVESTMENT
// ADMIN
// --------------------------------------------------

const addInvestment = handler(true, async (req, res) => {
  const body = req.body || {};

  const name = readText(body.name, "Name", true);

  const description = readText(
    body.description,
    "Description"
  );

  const investedAmount = readMoney(
    body.investedAmount,
    "Invested amount"
  );

  const currentValue =
    body.currentValue === undefined
      ? investedAmount
      : readMoney(
          body.currentValue,
          "Current value",
          true
        );

  const startDate =
    body.startDate === undefined
      ? new Date()
      : readDate(body.startDate, "Start date");

  if (
    (body.status !== undefined &&
      body.status !== "active") ||
    body.endDate !== undefined ||
    body.returnedAmount !== undefined
  ) {
    fail(
      "Create an active investment first; record its closure separately"
    );
  }

  let savedId;

  await withCashTransaction(
    req.dataScope,
    async (session) => {
      await checkAvailableCash(
        investedAmount,
        req.dataScope,
        session
      );

      const [investment] = await Investment.create(
        [
          {
            name,
            description,
            investedAmount,
            currentValue,
            startDate,
            status: "active",
            createdBy: req.user._id,
            dataScope: req.dataScope,
          },
        ],
        { session }
      );

      await Transaction.create(
        [
          {
            type: "INVESTMENT",
            direction: "OUT",
            amount: investedAmount,
            referenceType: "Investment",
            referenceId: investment._id,
            description: `Investment created: ${name}`,
            transactionDate: startDate,
            createdBy: req.user._id,
            dataScope: req.dataScope,
          },
        ],
        { session }
      );

      savedId = investment._id;
    }
  );

  return res.status(201).json({
    success: true,
    message: "Investment created successfully",
    investment: await loadInvestment(
      savedId,
      req.dataScope
    ),
  });
});

// --------------------------------------------------
// GET ALL INVESTMENTS
// --------------------------------------------------

const getAllInvestments = handler(
  false,
  async (req, res) => {
    const filter = {
      dataScope: req.dataScope,
    };

    if (req.query.status !== undefined) {
      if (
        !["active", "closed"].includes(
          req.query.status
        )
      ) {
        fail("Invalid investment status");
      }

      filter.status = req.query.status;
    }

    const investments = await Investment.find(filter)
      .populate("createdBy", "name email")
      .sort({
        createdAt: -1,
        _id: -1,
      });

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      count: investments.length,
      investments,
    });
  }
);

// --------------------------------------------------
// GET ONE INVESTMENT
// --------------------------------------------------

const getInvestmentById = handler(
  false,
  async (req, res) => {
    validateId(req.params.id);

    const investment = await loadInvestment(
      req.params.id,
      req.dataScope
    );

    if (!investment) {
      fail("Investment not found", 404);
    }

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      investment,
    });
  }
);

// --------------------------------------------------
// UPDATE OR CLOSE INVESTMENT
// ADMIN
//
// Valuation updates do not move cash.
//
// Closing requires returnedAmount:
// actual total cash received, including principal.
// --------------------------------------------------

const updateInvestment = handler(
  true,
  async (req, res) => {
    validateId(req.params.id);

    const body = req.body || {};

    if (
      body.investedAmount !== undefined ||
      body.startDate !== undefined
    ) {
      fail(
        "Original invested amount and start date cannot be edited here"
      );
    }

    const updates = {};

    if (body.name !== undefined) {
      updates.name = readText(
        body.name,
        "Name",
        true
      );
    }

    if (body.description !== undefined) {
      updates.description = readText(
        body.description,
        "Description"
      );
    }

    if (body.currentValue !== undefined) {
      updates.currentValue = readMoney(
        body.currentValue,
        "Current value",
        true
      );
    }

    if (
      body.status !== undefined &&
      !["active", "closed"].includes(body.status)
    ) {
      fail("Invalid investment status");
    }

    const closing = body.status === "closed";

    let returnedAmount;
    let endDate;

    if (closing) {
      returnedAmount = readMoney(
        body.returnedAmount,
        "Returned amount",
        true
      );

      endDate =
        body.endDate === undefined
          ? new Date()
          : readDate(body.endDate, "End date");

      if (
        updates.currentValue !== undefined &&
        updates.currentValue !== returnedAmount
      ) {
        fail(
          "On closure, currentValue must equal actual returnedAmount"
        );
      }
    } else if (
      body.returnedAmount !== undefined ||
      body.endDate !== undefined
    ) {
      fail(
        "Returned amount and end date are only accepted when closing"
      );
    }

    if (
      !Object.keys(updates).length &&
      body.status === undefined
    ) {
      fail("No supported updates supplied");
    }

    await withCashTransaction(
      req.dataScope,
      async (session) => {
        const investment = await Investment.findOne({
          _id: req.params.id,
          dataScope: req.dataScope,
        }).session(session);

        if (!investment) {
          fail("Investment not found", 404);
        }

        if (investment.status !== "active") {
          fail(
            "Closed investments cannot be edited or reopened; reconcile corrections separately",
            409
          );
        }

        if (closing) {
          if (endDate < investment.startDate) {
            fail(
              "End date cannot be before start date"
            );
          }

          const existingReturn =
            await Transaction.exists({
              referenceType: "Investment",
              referenceId: investment._id,
              type: "INVESTMENT_RETURN",
              dataScope: req.dataScope,
            }).session(session);

          if (existingReturn) {
            fail(
              "This investment already has return entries; reconcile them before closure",
              409
            );
          }

          // Zero proceeds represent a full loss.
          if (returnedAmount > 0) {
            await Transaction.create(
              [
                {
                  type: "INVESTMENT_RETURN",
                  direction: "IN",
                  amount: returnedAmount,
                  referenceType: "Investment",
                  referenceId: investment._id,
                  description:
                    `Investment closed: ${
                      updates.name || investment.name
                    }`,
                  transactionDate: endDate,
                  createdBy: req.user._id,
                  dataScope: req.dataScope,
                },
              ],
              { session }
            );
          }

          investment.currentValue = returnedAmount;
          investment.status = "closed";
          investment.endDate = endDate;
        }

        Object.assign(investment, updates);

        await investment.save({ session });
      }
    );

    return res.status(200).json({
      success: true,
      message: closing
        ? "Investment closed and proceeds recorded successfully"
        : "Investment updated successfully",
      investment: await loadInvestment(
        req.params.id,
        req.dataScope
      ),
    });
  }
);

// --------------------------------------------------
// EXPORTS
// --------------------------------------------------

module.exports = {
  addInvestment,
  getAllInvestments,
  getInvestmentById,
  updateInvestment,
};