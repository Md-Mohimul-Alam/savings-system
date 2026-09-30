const mongoose = require("mongoose");

const Contribution = require("../models/Contribution");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

const {
  createNotification,
} = require("../services/notificationService");

const memberPopulation = {
  path: "member",
  populate: {
    path: "user",
    select: "name email",
  },
};

const fail = (message, statusCode = 400) => {
  const error = new Error(message);
  error.statusCode = statusCode;
  throw error;
};

const validateId = (value, label) => {
  if (!mongoose.Types.ObjectId.isValid(value)) {
    fail(`Invalid ${label}`);
  }
};

const money = (value, label) => {
  if (
    value === null ||
    value === "" ||
    typeof value === "boolean" ||
    !["number", "string"].includes(typeof value)
  ) {
    fail(`${label} must be a valid amount`);
  }

  const amount = Number(value);

  if (
    !Number.isFinite(amount) ||
    amount < 0 ||
    !Number.isSafeInteger(Math.round(amount * 100)) ||
    Math.abs(amount * 100 - Math.round(amount * 100)) > 0.000001
  ) {
    fail(`${label} must be non-negative with at most 2 decimals`);
  }

  return amount;
};

const validatePeriod = (month, year) => {
  const m = Number(month);
  const y = Number(year);

  if (!Number.isInteger(m) || m < 1 || m > 12) {
    fail("Month must be an integer from 1 to 12");
  }

  if (!Number.isInteger(y) || y < 2026 || y > 9999) {
    fail("Monthly records must use a year from 2026 onward");
  }

  return { month: m, year: y };
};

// 16th, 00:00 Bangladesh time = 15th, 18:00 UTC.
const fineEligibleAt = (month, year) =>
  new Date(Date.UTC(year, month - 1, 15, 18));

const paymentDate = (value) => {
  const date = value === undefined ? new Date() : new Date(value);

  if (
    value === null ||
    value === "" ||
    Number.isNaN(date.getTime()) ||
    date.getTime() > Date.now()
  ) {
    fail("Payment date must be valid and cannot be in the future");
  }

  return date;
};

// Calculate outstanding fines without writing during a GET request.
// Scheduled assessment can persist these fines separately.
const serializeContribution = (document) => {
  const item = document.toObject();
  const expected = Number(item.expectedAmount || 0);
  const paid = Number(item.paidAmount || 0);

  let assessedFine = Number(item.fineAmount || 0);

  if (
    paid < expected &&
    new Date() >= fineEligibleAt(item.month, item.year)
  ) {
    assessedFine = 50;
  }

  const finePaid = Number(item.finePaidAmount || 0);
  const remainingAmount = Math.max(0, expected - paid);
  const remainingFine = Math.max(0, assessedFine - finePaid);

  return {
    ...item,
    fineAmount: assessedFine,
    remainingAmount,
    remainingFine,
    totalDue: remainingAmount + remainingFine,
    totalPaid: paid + finePaid,
    status: paid >= expected ? "paid" : paid > 0 ? "partial" : "due",
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

const handleError = (res, error, fallback) => {
  console.error(fallback, error);

  const status =
    error.statusCode ||
    (error.code === 11000 ? 409 : 0) ||
    (["ValidationError", "CastError"].includes(error.name) ? 400 : 500);

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

const notifyMember = async (member, contribution) => {
  if (!member.user) return;

  try {
    await createNotification({
      user: member.user,
      title: "Contribution Recorded",
      message:
        `Savings: ৳${contribution.paidAmount}; ` +
        `fine paid: ৳${contribution.finePaidAmount || 0} ` +
        `for ${contribution.month}/${contribution.year}.`,
      type: "CONTRIBUTION",
      link: "/dashboard/my-contributions",
    });
  } catch (error) {
    // Payment already committed; notification failure must not
    // report the payment as failed and encourage a duplicate retry.
    console.error("Contribution notification failed:", error);
  }
};

const writeTransaction = async ({
  req,
  session,
  contribution,
  type,
  difference,
  date,
}) => {
  if (difference === 0) return;

  await Transaction.create(
    [
      {
        type,
        direction: difference > 0 ? "IN" : "OUT",
        amount: Math.abs(difference),
        member: contribution.member,
        referenceType: "Contribution",
        referenceId: contribution._id,
        description:
          `${type === "FINE" ? "Fine" : "Savings"} ` +
          `${difference > 0 ? "recorded" : "corrected"} ` +
          `for ${contribution.month}/${contribution.year}`,
        transactionDate: date,
        createdBy: req.user._id,
        dataScope: req.dataScope,
      },
    ],
    { session }
  );
};

// paidAmount and finePaidAmount are cumulative totals for this month.
// Example: changing paidAmount from 500 to 1000 adds only 500.
const saveContribution = async (req, res, isUpdate) => {
  let session;

  try {
    const body = req.body || {};

    if (!req.dataScope) {
      fail("Data scope is missing", 400);
    }

    if (isUpdate) {
      validateId(req.params.id, "contribution ID");

      if (
        body.memberId !== undefined ||
        body.month !== undefined ||
        body.year !== undefined
      ) {
        fail("Member, month and year cannot be changed");
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

    if (body.note !== undefined && typeof body.note !== "string") {
      fail("Note must be text");
    }

    const receiptDate = paymentDate(body.paymentDate);

    session = await mongoose.startSession();

    let member;
    let savedId;

    await session.withTransaction(async () => {
      let contribution;

      if (isUpdate) {
        contribution = await Contribution.findOne({
          _id: req.params.id,
          dataScope: req.dataScope,
        }).session(session);

        if (!contribution) fail("Contribution not found", 404);
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

      member = await Member.findOne({
        _id: contribution.member,
        dataScope: req.dataScope,
      }).session(session);

      if (!member) fail("Member not found", 404);

      if (!isUpdate) {
        contribution.expectedAmount = money(
          member.monthlyContribution ?? 1000,
          "Monthly contribution"
        );
      }

      const expected = Number(contribution.expectedAmount);
      const oldSavings = Number(contribution.paidAmount || 0);
      const oldFinePaid = Number(contribution.finePaidAmount || 0);
      const newSavings = savings ?? oldSavings;
      const newFinePaid = finePaid ?? oldFinePaid;

      if (newSavings > expected) {
        fail(
          "Savings exceed this month's contribution. " +
          "Record other months separately and fines in finePaidAmount."
        );
      }

      const savingsDifference =
        Math.round((newSavings - oldSavings) * 100) / 100;

      const fineDifference =
        Math.round((newFinePaid - oldFinePaid) * 100) / 100;

      const deadline = fineEligibleAt(
        contribution.month,
        contribution.year
      );

      // Preserve previously assessed fines.
      let assessedFine = Number(contribution.fineAmount || 0);

      // A late payment is fined if savings were incomplete before it.
      // A remaining unpaid balance is also overdue as of today.
      if (
        (savingsDifference > 0 &&
          oldSavings < expected &&
          receiptDate >= deadline) ||
        (newSavings < expected && new Date() >= deadline)
      ) {
        assessedFine = 50;
      }

      if (newFinePaid > assessedFine) {
        fail("Fine payment exceeds the assessed fine");
      }

      contribution.fineAmount = assessedFine;

      if (assessedFine > 0 && !contribution.fineAppliedAt) {
        contribution.fineAppliedAt = deadline;
      }

      contribution.paidAmount = newSavings;
      contribution.finePaidAmount = newFinePaid;

      if (savingsDifference > 0) {
        contribution.paymentDate = receiptDate;
      } else if (newSavings === 0) {
        contribution.paymentDate = null;
      }

      if (fineDifference > 0) {
        contribution.finePaymentDate = receiptDate;
      } else if (newFinePaid === 0) {
        contribution.finePaymentDate = null;
      }

      if (body.note !== undefined) {
        contribution.note = body.note.trim();
      }

      await contribution.save({ session });

      if (savingsDifference !== 0) {
        const result = await Member.updateOne(
          {
            _id: member._id,
            dataScope: req.dataScope,
            totalContribution: {
              $gte: Math.max(0, -savingsDifference),
            },
          },
          { $inc: { totalContribution: savingsDifference } },
          { session }
        );

        if (result.matchedCount !== 1) {
          fail("Member savings need reconciliation before this correction", 409);
        }
      }

      await writeTransaction({
        req,
        session,
        contribution,
        type: savingsDifference < 0 ? "ADJUSTMENT" : "CONTRIBUTION",
        difference: savingsDifference,
        date: receiptDate,
      });

      await writeTransaction({
        req,
        session,
        contribution,
        type: "FINE",
        difference: fineDifference,
        date: receiptDate,
      });

      savedId = contribution._id;
    });

    const saved = await Contribution.findOne({
      _id: savedId,
      dataScope: req.dataScope,
    }).populate(memberPopulation);

    await notifyMember(member, saved);

    return res.status(isUpdate ? 200 : 201).json({
      success: true,
      message: isUpdate
        ? "Contribution updated successfully"
        : "Contribution added successfully",
      contribution: serializeContribution(saved),
    });
  } catch (error) {
    return handleError(res, error, "Failed to save contribution");
  } finally {
    if (session) await session.endSession();
  }
};

const addContribution = (req, res) =>
  saveContribution(req, res, false);

const updateContribution = (req, res) =>
  saveContribution(req, res, true);

const getAllContributions = async (req, res) => {
  try {
    const filter = { dataScope: req.dataScope };
    const { month, year, memberId, status } = req.query;

    if (month !== undefined) {
      const m = Number(month);

      if (!Number.isInteger(m) || m < 1 || m > 12) {
        fail("Invalid month");
      }

      filter.month = m;
    }

    if (year !== undefined) {
      const y = Number(year);

      if (!Number.isInteger(y) || y < 2021 || y > 9999) {
        fail("Invalid year");
      }

      filter.year = y;
    }

    if (memberId !== undefined) {
      validateId(memberId, "member ID");
      filter.member = memberId;
    }

    if (status !== undefined) {
      if (!["due", "partial", "paid"].includes(status)) {
        fail("Invalid status");
      }

      filter.status = status;
    }

    const records = await Contribution.find(filter)
      .populate(memberPopulation)
      .sort({ year: -1, month: -1, createdAt: -1 });

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

const getContributionById = async (req, res) => {
  try {
    validateId(req.params.id, "contribution ID");

    const contribution = await Contribution.findOne({
      _id: req.params.id,
      dataScope: req.dataScope,
    }).populate(memberPopulation);

    if (!contribution) fail("Contribution not found", 404);

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
    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!member) fail("Member profile not found", 404);

    const records = await Contribution.find({
      member: member._id,
      dataScope: req.dataScope,
    })
      .populate(memberPopulation)
      .sort({ year: -1, month: -1 });

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