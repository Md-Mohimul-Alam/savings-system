const mongoose = require("mongoose");

const Contribution = require("../models/Contribution");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

const {
  createNotification,
} = require("../services/notificationService");

const CashLock =
  mongoose.models.CashLock ||
  mongoose.model(
    "CashLock",
    new mongoose.Schema({
      _id: { type: String },
      version: { type: Number, default: 0 },
    })
  );

const memberPopulation = {
  path: "member",
  populate: {
    path: "user",
    select: "name email",
  },
};

// --------------------------------------------------
// HELPERS
// --------------------------------------------------

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateRequest = (req, adminOnly = false) => {
  if (!req.user?._id) {
    fail("Authentication required", 401);
  }

  if (!["live", "demo"].includes(req.dataScope)) {
    fail("Invalid data scope");
  }

  if (adminOnly && req.user.role !== "admin") {
    fail("Admin access required", 403);
  }
  if (adminOnly && (req.dataScope === "demo" || req.user.isDemo)) {
    fail("Demo mode is read-only", 403);
  }
};

const validateId = (value, label) => {
  if (
    typeof value !== "string" ||
    !/^[a-f\d]{24}$/i.test(value)
  ) {
    fail(`Invalid ${label}`);
  }
};

const money = (value, label) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail(`${label} must be a valid amount`);
  }

  const amount = Number(value);
  const paisa = Math.round(amount * 100);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(paisa) ||
    Math.abs(amount * 100 - paisa) > 0.000001
  ) {
    fail(
      `${label} must be non-negative with at most 2 decimals`
    );
  }

  return paisa / 100;
};

const toPaisa = (amount) => Math.round(amount * 100);

const integer = (value, label, minimum, maximum) => {
  if (
    !["number", "string"].includes(typeof value) ||
    (typeof value === "string" && !value.trim())
  ) {
    fail(`Invalid ${label}`);
  }

  const number = Number(value);

  if (
    !Number.isInteger(number) ||
    number < minimum ||
    number > maximum
  ) {
    fail(
      `${label} must be an integer from ${minimum} to ${maximum}`
    );
  }

  return number;
};

const validatePeriod = (month, year) => ({
  month: integer(month, "Month", 1, 12),
  year: integer(year, "Year", 2026, 9999),
});

const readPaymentDate = (value) => {
  if (value === undefined) return null;

  if (typeof value !== "string" || !value.trim()) {
    fail("Payment date must be a date string");
  }

  const date = new Date(value);

  if (
    Number.isNaN(date.getTime()) ||
    date.getTime() > Date.now()
  ) {
    fail("Payment date must be valid and cannot be in the future");
  }

  return date;
};

const fineEligibleAt = (month, year) =>
  new Date(Date.UTC(year, month - 1, 15, 18));

const savingsStatus = (paid, expected) =>
  paid >= expected ? "paid" : paid > 0 ? "partial" : "due";

const checkFineSchema = () => {
  for (const field of [
    "fineAmount",
    "finePaidAmount",
    "fineAppliedAt",
    "finePaymentDate",
  ]) {
    if (!Contribution.schema.path(field)) {
      fail(`Contribution model is missing ${field}`, 409);
    }
  }

  const types = Transaction.schema.path("type")?.enumValues || [];

  if (!types.includes("FINE")) {
    fail("Transaction model must allow the FINE type", 409);
  }
};

const handleError = (res, error, fallback) => {
  console.error(fallback, error);

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
        ? "A contribution already exists for this member and month"
        : status < 500
          ? error.message
          : fallback,
  });
};

// --------------------------------------------------
// SERIALIZATION
// Show overdue fines without writing during GET requests.
// --------------------------------------------------

const serializeContribution = (document) => {
  const item = document.toObject();

  const expected = money(item.expectedAmount, "Expected amount");
  const paid = money(item.paidAmount ?? 0, "Paid amount");
  const finePaid = money(
    item.finePaidAmount ?? 0,
    "Fine paid amount"
  );

  let assessedFine = money(
    item.fineAmount ?? 0,
    "Assessed fine"
  );

  if (
    paid < expected &&
    new Date() >= fineEligibleAt(item.month, item.year)
  ) {
    assessedFine = Math.max(assessedFine, 50);
  }

  const remainingAmount =
    Math.max(0, toPaisa(expected) - toPaisa(paid)) / 100;

  const remainingFine =
    Math.max(0, toPaisa(assessedFine) - toPaisa(finePaid)) / 100;

  return {
    ...item,
    fineAmount: assessedFine,
    remainingAmount,
    remainingFine,
    totalDue:
      (toPaisa(remainingAmount) + toPaisa(remainingFine)) / 100,
    totalPaid: (toPaisa(paid) + toPaisa(finePaid)) / 100,
    status: savingsStatus(paid, expected),
    fineStatus:
      assessedFine === 0
        ? "not_applicable"
        : remainingFine === 0
          ? "paid"
          : finePaid > 0
            ? "partial"
            : "due",
  };
};

// --------------------------------------------------
// CASH LOCK AND TRANSACTION
// --------------------------------------------------

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

const checkAvailableCash = async (
  requiredPaisa,
  dataScope,
  session
) => {
  const entries = await Transaction.find({ dataScope })
    .select("amount direction")
    .session(session)
    .lean();

  let balancePaisa = 0;

  for (const entry of entries) {
    const amount = money(entry.amount, "Ledger amount");

    if (!["IN", "OUT"].includes(entry.direction)) {
      fail("Invalid ledger direction; reconcile the ledger", 409);
    }

    balancePaisa +=
      toPaisa(amount) * (entry.direction === "IN" ? 1 : -1);

    if (!Number.isSafeInteger(balancePaisa)) {
      fail("Ledger balance exceeds the supported range", 409);
    }
  }

  if (requiredPaisa > balancePaisa) {
    fail(
      "Insufficient available cash to reduce recorded payments",
      409
    );
  }
};

// --------------------------------------------------
// LEDGER AND NOTIFICATIONS
// --------------------------------------------------

const writeTransaction = async ({
  req,
  session,
  contribution,
  type,
  differencePaisa,
  date,
}) => {
  if (differencePaisa === 0) return;

  await Transaction.create(
    [
      {
        type,
        direction: differencePaisa > 0 ? "IN" : "OUT",
        amount: Math.abs(differencePaisa) / 100,
        member: contribution.member,
        referenceType: "Contribution",
        referenceId: contribution._id,
        description:
          `${type === "FINE" ? "Fine" : "Savings"} ` +
          `${differencePaisa > 0 ? "recorded" : "corrected"} ` +
          `for ${contribution.month}/${contribution.year}`,
        transactionDate: date,
        createdBy: req.user._id,
        dataScope: req.dataScope,
      },
    ],
    { session }
  );
};

const notifyMember = async (member, contribution, isUpdate) => {
  if (!member.user) return;

  try {
    await createNotification({
      user: member.user,
      title: isUpdate
        ? "Contribution Updated"
        : "Contribution Recorded",
      message:
        `Savings: ৳${contribution.paidAmount}; ` +
        `fine paid: ৳${contribution.finePaidAmount || 0} ` +
        `for ${contribution.month}/${contribution.year}.`,
      type: "CONTRIBUTION",
      link: "/dashboard/my-contributions",
    });
  } catch (error) {
    // Financial changes have already committed.
    console.error("Contribution notification failed:", error);
  }
};

// Date-only correction is deliberately limited to one unreversed savings
// receipt. Multiple instalments require selecting an individual ledger entry.
const correctSavingsDate = async (req, session, contribution, date) => {
  if (!req.body.note?.trim()) fail("Provide a note explaining the date correction");
  if (contribution.paidAmount <= 0) fail("There is no savings payment to redate");
  const entries = await Transaction.find({
    dataScope: req.dataScope,
    referenceType: "Contribution",
    referenceId: contribution._id,
    type: { $in: ["CONTRIBUTION", "ADJUSTMENT"] },
  }).session(session);
  if (entries.length !== 1 || entries[0].type !== "CONTRIBUTION" ||
      entries[0].direction !== "IN" ||
      String(entries[0].member) !== String(contribution.member) ||
      toPaisa(money(entries[0].amount, "Ledger savings")) !== toPaisa(contribution.paidAmount)) {
    fail("Date correction requires one matching savings receipt with no reversals. Reconcile instalments or missing ledger entries separately.", 409);
  }
  const entry = entries[0];
  const previous = new Date(entry.transactionDate);
  if (!contribution.paymentDate || Number.isNaN(previous.getTime()) ||
      previous.getTime() !== new Date(contribution.paymentDate).getTime()) {
    fail("Savings and ledger dates do not match; reconcile before correcting", 409);
  }
  const deadline = fineEligibleAt(contribution.month, contribution.year);
  const fine = (date >= deadline ||
    (contribution.paidAmount < contribution.expectedAmount && new Date() >= deadline)) ? 50 : 0;
  if (contribution.finePaidAmount > fine) {
    fail("This correction would remove a collected fine. Reconcile or refund the fine first; no money was changed.", 409);
  }
  entry.description += ` | Payment date corrected from ${previous.toISOString()} to ${date.toISOString()} by ${req.user._id} at ${new Date().toISOString()}: ${req.body.note.trim()}`;
  entry.transactionDate = date;
  await entry.save({ session });
  contribution.paymentDate = date;
  contribution.fineAmount = fine;
  contribution.fineAppliedAt = fine ? deadline : null;
};

// --------------------------------------------------
// CREATE / UPDATE
//
// paidAmount and finePaidAmount are cumulative totals.
// Changing savings from 500 to 1000 records only 500.
// --------------------------------------------------

const saveContribution = async (req, res, isUpdate) => {
  try {
    validateRequest(req, true);
    checkFineSchema();

    const body = req.body || {};

    const permittedFields = isUpdate
      ? ["paidAmount", "finePaidAmount", "paymentDate", "note"]
      : [
          "memberId",
          "month",
          "year",
          "paidAmount",
          "finePaidAmount",
          "paymentDate",
          "note",
        ];

    const unsupported = Object.keys(body).filter(
      (field) => !permittedFields.includes(field)
    );

    if (unsupported.length) {
      fail(`Unsupported fields: ${unsupported.join(", ")}`);
    }

    if (isUpdate) {
      validateId(req.params.id, "contribution ID");

      if (
        body.paidAmount === undefined &&
        body.finePaidAmount === undefined &&
        body.paymentDate === undefined &&
        body.note === undefined
      ) {
        fail("Provide a savings total, fine total, payment date, or note");
      }
    } else {
      validateId(body.memberId, "member ID");
      validatePeriod(body.month, body.year);

      if (body.paidAmount === undefined) {
        fail("Paid amount is required");
      }
    }

    const savings =
      body.paidAmount === undefined
        ? undefined
        : money(body.paidAmount, "Paid amount");

    const finePaid =
      body.finePaidAmount === undefined
        ? undefined
        : money(body.finePaidAmount, "Fine paid amount");

    if (
      body.note !== undefined &&
      typeof body.note !== "string"
    ) {
      fail("Note must be text");
    }

    const suppliedDate = readPaymentDate(body.paymentDate);

    let responseContribution;
    let notificationMember;
    let notificationContribution;
    let shouldNotify = false;

    await withCashTransaction(req.dataScope, async (session) => {
      let contribution;

      if (isUpdate) {
        contribution = await Contribution.findOne({
          _id: req.params.id,
          dataScope: req.dataScope,
        }).session(session);

        if (!contribution) {
          fail("Contribution not found", 404);
        }
      } else {
        const period = validatePeriod(body.month, body.year);

        const existing = await Contribution.findOne({
          member: body.memberId,
          ...period,
          dataScope: req.dataScope,
        }).session(session);

        if (existing) {
          fail("Contribution already exists; update that record", 409);
        }

        contribution = new Contribution({
          member: body.memberId,
          ...period,
          dataScope: req.dataScope,
          paidAmount: 0,
          fineAmount: 0,
          finePaidAmount: 0,
        });
      }

      // 2021–2025 savings are imported separately as opening balances.
      validatePeriod(contribution.month, contribution.year);

      const member = await Member.findOne({
        _id: contribution.member,
        dataScope: req.dataScope,
      }).session(session);

      if (!member) {
        fail("Member not found", 404);
      }

      if (member.membershipStatus !== "active") {
        fail(
          "Only active members can have contributions recorded or corrected",
          409
        );
      }

      if (!isUpdate) {
        contribution.expectedAmount = money(
          member.monthlyContribution ?? 1000,
          "Monthly contribution"
        );
      }

      const expected = money(
        contribution.expectedAmount,
        "Expected amount"
      );

      const oldSavings = money(
        contribution.paidAmount ?? 0,
        "Existing savings"
      );

      const oldFinePaid = money(
        contribution.finePaidAmount ?? 0,
        "Existing fine payment"
      );

      const newSavings = savings ?? oldSavings;
      const newFinePaid = finePaid ?? oldFinePaid;

      if (newSavings > expected) {
        fail(
          "Savings exceed this month's contribution. " +
          "Record other months separately and fines in finePaidAmount."
        );
      }

      const savingsDifferencePaisa =
        toPaisa(newSavings) - toPaisa(oldSavings);

      const fineDifferencePaisa =
        toPaisa(newFinePaid) - toPaisa(oldFinePaid);

      const hasPaymentChange =
        savingsDifferencePaisa !== 0 ||
        fineDifferencePaisa !== 0;

      // Require actual payment dates for money received.
      if (
        (savingsDifferencePaisa > 0 || fineDifferencePaisa > 0) &&
        !suppliedDate
      ) {
        fail(
          "Actual payment date is required when recording savings or fines"
        );
      }

      const dateOnlyCorrection = Boolean(isUpdate && suppliedDate && !hasPaymentChange);
      if (dateOnlyCorrection) {
        await correctSavingsDate(req, session, contribution, suppliedDate);
      } else if (suppliedDate && !hasPaymentChange) {
        fail("Do not supply a payment date when no payment is recorded");
      }

      // Reductions without a supplied date are recorded now.
      const receiptDate = suppliedDate || new Date();

      const netDifferencePaisa =
        savingsDifferencePaisa + fineDifferencePaisa;

      if (!Number.isSafeInteger(netDifferencePaisa)) {
        fail("Payment change exceeds the supported range");
      }

      const deadline = fineEligibleAt(
        contribution.month,
        contribution.year
      );

      let assessedFine = money(
        contribution.fineAmount ?? 0,
        "Assessed fine"
      );

      // Retain existing assessments.
      // New full payments received before the deadline incur no fine,
      // even if entered later.
      if (
        (savingsDifferencePaisa > 0 &&
          oldSavings < expected &&
          receiptDate >= deadline) ||
        (newSavings < expected && new Date() >= deadline)
      ) {
        assessedFine = Math.max(assessedFine, 50);
      }

      if (newFinePaid > assessedFine) {
        fail("Fine payment exceeds the assessed fine");
      }

      if (
        fineDifferencePaisa > 0 &&
        receiptDate < deadline
      ) {
        fail("Fine payment cannot precede the fine deadline");
      }

      // Check the net cash reduction, including reclassifications.
      if (netDifferencePaisa < 0) {
        await checkAvailableCash(
          -netDifferencePaisa,
          req.dataScope,
          session
        );
      }

      if (savingsDifferencePaisa !== 0) {
        const currentTotal = money(
          member.totalContribution ?? 0,
          "Member total contribution"
        );

        const nextTotalPaisa =
          toPaisa(currentTotal) + savingsDifferencePaisa;

        if (
          !Number.isSafeInteger(nextTotalPaisa) ||
          nextTotalPaisa < 0
        ) {
          fail(
            "Member savings need reconciliation before this correction",
            409
          );
        }

        // Preserve opening savings by applying only this payment delta.
        member.totalContribution = nextTotalPaisa / 100;
        await member.save({ session });
      }

      contribution.paidAmount = newSavings;
      contribution.finePaidAmount = newFinePaid;
      contribution.fineAmount = assessedFine;
      contribution.status = savingsStatus(newSavings, expected);

      if (assessedFine > 0 && !contribution.fineAppliedAt) {
        contribution.fineAppliedAt = deadline;
      }

      if (savingsDifferencePaisa > 0) {
        contribution.paymentDate = receiptDate;
      } else if (newSavings === 0) {
        contribution.paymentDate = null;
      }

      if (fineDifferencePaisa > 0) {
        contribution.finePaymentDate = receiptDate;
      } else if (newFinePaid === 0) {
        contribution.finePaymentDate = null;
      }

      if (body.note !== undefined) {
        contribution.note = body.note.trim();
      }

      await contribution.save({ session });

      await writeTransaction({
        req,
        session,
        contribution,
        type:
          savingsDifferencePaisa < 0
            ? "ADJUSTMENT"
            : "CONTRIBUTION",
        differencePaisa: savingsDifferencePaisa,
        date: receiptDate,
      });

      // Keeping FINE on reversals preserves net collected-fine totals.
      await writeTransaction({
        req,
        session,
        contribution,
        type: "FINE",
        differencePaisa: fineDifferencePaisa,
        date: receiptDate,
      });

      // Populate sequentially within the transaction.
      const populated = await Contribution.findOne({
        _id: contribution._id,
        dataScope: req.dataScope,
      })
        .session(session)
        .populate(memberPopulation);

      if (!populated) {
        fail("Saved contribution could not be loaded", 409);
      }

      responseContribution = serializeContribution(populated);
      notificationMember = { user: member.user };
      notificationContribution = {
        paidAmount: contribution.paidAmount,
        finePaidAmount: contribution.finePaidAmount,
        month: contribution.month,
        year: contribution.year,
      };
      shouldNotify = hasPaymentChange || dateOnlyCorrection;
    });

    if (shouldNotify) {
      await notifyMember(
        notificationMember,
        notificationContribution,
        isUpdate
      );
    }

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate
        ? "Contribution updated successfully"
        : "Contribution added successfully",
      contribution: responseContribution,
    });
  } catch (error) {
    return handleError(res, error, "Failed to save contribution");
  }
};

const addContribution = (req, res) =>
  saveContribution(req, res, false);

const updateContribution = (req, res) =>
  saveContribution(req, res, true);

// --------------------------------------------------
// READ ENDPOINTS
// Existing route permissions still apply.
// --------------------------------------------------

const getAllContributions = async (req, res) => {
  try {
    validateRequest(req);

    const filter = { dataScope: req.dataScope };
    const { month, year, memberId, status } = req.query;

    if (month !== undefined) {
      filter.month = integer(month, "Month", 1, 12);
    }

    if (year !== undefined) {
      filter.year = integer(year, "Year", 2021, 9999);
    }

    if (memberId !== undefined) {
      validateId(memberId, "member ID");
      filter.member = memberId;
    }

    if (
      status !== undefined &&
      !["due", "partial", "paid"].includes(status)
    ) {
      fail("Invalid status");
    }

    const records = await Contribution.find(filter)
      .populate(memberPopulation)
      .sort({ year: -1, month: -1, createdAt: -1, _id: -1 });

    let contributions = records.map(serializeContribution);

    if (status !== undefined) {
      contributions = contributions.filter(
        (item) => item.status === status
      );
    }

    return res.status(200).json({
      success: true,
      count: contributions.length,
      contributions,
    });
  } catch (error) {
    return handleError(res, error, "Failed to get contributions");
  }
};

const getContributionById = async (req, res) => {
  try {
    validateRequest(req);
    validateId(req.params.id, "contribution ID");

    const contribution = await Contribution.findOne({
      _id: req.params.id,
      dataScope: req.dataScope,
    }).populate(memberPopulation);

    if (!contribution) {
      fail("Contribution not found", 404);
    }

    return res.status(200).json({
      success: true,
      contribution: serializeContribution(contribution),
    });
  } catch (error) {
    return handleError(res, error, "Failed to get contribution");
  }
};

const getMyContributions = async (req, res) => {
  try {
    validateRequest(req);

    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!member) {
      fail("Member profile not found", 404);
    }

    const records = await Contribution.find({
      member: member._id,
      dataScope: req.dataScope,
    })
      .populate(memberPopulation)
      .sort({ year: -1, month: -1, _id: -1 });

    const contributions = records.map(serializeContribution);

    return res.status(200).json({
      success: true,
      count: contributions.length,
      contributions,
    });
  } catch (error) {
    return handleError(res, error, "Failed to get contributions");
  }
};

module.exports = {
  addContribution,
  getAllContributions,
  getContributionById,
  updateContribution,
  getMyContributions,
};
