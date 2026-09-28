const Contribution = require("../models/Contribution");
const Member = require("../models/Member");
const Transaction = require("../models/Transaction");

const {
  createNotification,
} = require("../services/notificationService");

const addContribution = async (req, res) => {
  try {
    const {
      memberId,
      month,
      year,
      paidAmount,
      note,
    } = req.body;

    if (
      !memberId ||
      !month ||
      !year ||
      paidAmount === undefined
    ) {
      return res.status(400).json({
        success: false,
        message:
          "Member, month, year and paid amount are required",
      });
    }

    if (
      Number(month) < 1 ||
      Number(month) > 12
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid month",
      });
    }

    if (Number(paidAmount) < 0) {
      return res.status(400).json({
        success: false,
        message:
          "Paid amount cannot be negative",
      });
    }

    const member = await Member.findOne({
      _id: memberId,
      dataScope: req.dataScope,
    }).populate(
      "user",
      "name email"
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    const existingContribution =
      await Contribution.findOne({
        member: memberId,
        month: Number(month),
        year: Number(year),
        dataScope: req.dataScope,
      });

    if (existingContribution) {
      return res.status(400).json({
        success: false,
        message:
          "Contribution already exists for this member and month",
      });
    }

    const expectedAmount =
      member.monthlyContribution || 1000;

    const amount = Number(paidAmount);

    let status = "due";

    if (amount >= expectedAmount) {
      status = "paid";
    } else if (amount > 0) {
      status = "partial";
    }

    const contribution =
      await Contribution.create({
        member: member._id,
        month: Number(month),
        year: Number(year),
        expectedAmount,
        paidAmount: amount,
        status,
        dataScope: req.dataScope,
        paymentDate:
          amount > 0 ? new Date() : null,
        note: note?.trim() || "",
      });

    if (amount > 0) {
      member.totalContribution =
        Number(member.totalContribution || 0) +
        amount;

      await member.save();

      await Transaction.create({
        type: "CONTRIBUTION",
        direction: "IN",
        amount,
        member: member._id,
        referenceType: "Contribution",
        referenceId: contribution._id,
        description: `Contribution for ${month}/${year}`,
        createdBy: req.user._id,
        dataScope: req.dataScope,
      });

      if (member.user?._id) {
        await createNotification({
          user: member.user._id,
          title: "Contribution Recorded",
          message: `৳${amount.toLocaleString()} has been recorded for ${month}/${year}.`,
          type: "CONTRIBUTION",
          link: "/dashboard/my-contributions",
        });
      }
    }

    const populatedContribution =
      await Contribution.findOne({
        _id: contribution._id,
        dataScope: req.dataScope,
      }).populate({
        path: "member",
        populate: {
          path: "user",
          select: "name email",
        },
      });

    return res.status(201).json({
      success: true,
      message:
        "Contribution added successfully",
      contribution:
        populatedContribution,
    });
  } catch (error) {
    console.error(
      "Add contribution error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to add contribution",
    });
  }
};

const getAllContributions = async (
  req,
  res
) => {
  try {
    const {
      month,
      year,
      memberId,
      status,
    } = req.query;

    const filter = { dataScope: req.dataScope };

    if (month) {
      filter.month = Number(month);
    }

    if (year) {
      filter.year = Number(year);
    }

    if (memberId) {
      filter.member = memberId;
    }

    if (status) {
      filter.status = status;
    }

    const contributions =
      await Contribution.find(filter)
        .populate({
          path: "member",
          populate: {
            path: "user",
            select: "name email",
          },
        })
        .sort({
          year: -1,
          month: -1,
          createdAt: -1,
        });

    return res.status(200).json({
      success: true,
      count: contributions.length,
      contributions,
    });
  } catch (error) {
    console.error(
      "Get contributions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get contributions",
    });
  }
};

const getContributionById = async (
  req,
  res
) => {
  try {
    const contribution =
      await Contribution.findOne({
        _id: req.params.id,
        dataScope: req.dataScope,
      }).populate({
        path: "member",
        populate: {
          path: "user",
          select: "name email",
        },
      });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message:
          "Contribution not found",
      });
    }

    return res.status(200).json({
      success: true,
      contribution,
    });
  } catch (error) {
    console.error(
      "Get contribution error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get contribution",
    });
  }
};

const updateContribution = async (
  req,
  res
) => {
  try {
    const {
      paidAmount,
      note,
    } = req.body;

    const contribution =
      await Contribution.findOne({
        _id: req.params.id,
        dataScope: req.dataScope,
      });

    if (!contribution) {
      return res.status(404).json({
        success: false,
        message:
          "Contribution not found",
      });
    }

    const oldPaidAmount = Number(
      contribution.paidAmount || 0
    );

    if (paidAmount !== undefined) {
      const newPaidAmount =
        Number(paidAmount);

      if (newPaidAmount < 0) {
        return res.status(400).json({
          success: false,
          message:
            "Paid amount cannot be negative",
        });
      }

      contribution.paidAmount =
        newPaidAmount;

      if (
        newPaidAmount >=
        contribution.expectedAmount
      ) {
        contribution.status =
          "paid";
      } else if (newPaidAmount > 0) {
        contribution.status =
          "partial";
      } else {
        contribution.status =
          "due";
      }

      contribution.paymentDate =
        newPaidAmount > 0
          ? contribution.paymentDate ||
            new Date()
          : null;
    }

    if (note !== undefined) {
      contribution.note =
        String(note).trim();
    }

    await contribution.save();

    const newPaidAmount = Number(
      contribution.paidAmount || 0
    );

    const difference =
      newPaidAmount - oldPaidAmount;

    const member = await Member.findOne({
      _id: contribution.member,
      dataScope: req.dataScope,
    }).populate(
      "user",
      "name email"
    );

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member not found",
      });
    }

    if (difference !== 0) {
      member.totalContribution =
        Number(member.totalContribution || 0) +
        difference;

      if (member.totalContribution < 0) {
        member.totalContribution = 0;
      }

      await member.save();

      await Transaction.create({
        type: "ADJUSTMENT",
        direction:
          difference > 0
            ? "IN"
            : "OUT",
        amount: Math.abs(difference),
        member: member._id,
        referenceType:
          "Contribution",
        referenceId:
          contribution._id,
        description:
          difference > 0
            ? `Contribution increased for ${contribution.month}/${contribution.year}`
            : `Contribution reduced for ${contribution.month}/${contribution.year}`,
        createdBy: req.user._id,
        dataScope: req.dataScope,
      });
    }

    if (member.user?._id) {
      await createNotification({
        user: member.user._id,
        title: "Contribution Updated",
        message: `Your contribution for ${contribution.month}/${contribution.year} has been updated to ৳${newPaidAmount.toLocaleString()}.`,
        type: "CONTRIBUTION",
        link: "/dashboard/my-contributions",
      });
    }

    const populatedContribution =
      await Contribution.findOne({
        _id: contribution._id,
        dataScope: req.dataScope,
      }).populate({
        path: "member",
        populate: {
          path: "user",
          select: "name email",
        },
      });

    return res.status(200).json({
      success: true,
      message:
        "Contribution updated successfully",
      contribution:
        populatedContribution,
    });
  } catch (error) {
    console.error(
      "Update contribution error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to update contribution",
    });
  }
};
const getMyContributions = async (req, res) => {
  try {
    const member = await Member.findOne({
      user: req.user._id,
      dataScope: req.dataScope,
    });

    if (!member) {
      return res.status(404).json({
        success: false,
        message: "Member profile not found",
      });
    }

    const contributions =
      await Contribution.find({
        member: member._id,
        dataScope: req.dataScope,
      })
        .populate({
          path: "member",
          populate: {
            path: "user",
            select: "name email",
          },
        })
        .sort({
          year: -1,
          month: -1,
        });

    return res.status(200).json({
      success: true,
      count: contributions.length,
      contributions,
    });
  } catch (error) {
    console.error(
      "Get my contributions error:",
      error
    );

    return res.status(500).json({
      success: false,
      message:
        "Failed to get contributions",
    });
  }
};

module.exports = {
  addContribution,
  getAllContributions,
  getContributionById,
  updateContribution,
  getMyContributions,
};