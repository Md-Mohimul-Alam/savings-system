const Investment = require("../models/Investment");
const Transaction = require("../models/Transaction");

const addInvestment = async (req, res) => {
  try {
    const {
      name,
      description,
      investedAmount,
      currentValue,
      startDate,
    } = req.body;

    if (!name || investedAmount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Name and investedAmount are required",
      });
    }

    if (Number(investedAmount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invested amount must be greater than 0",
      });
    }

    const investment = await Investment.create({
      name: name.trim(),
      description: description || "",
      investedAmount: Number(investedAmount),
      currentValue:
        currentValue !== undefined
          ? Number(currentValue)
          : Number(investedAmount),
      startDate: startDate || new Date(),
      createdBy: req.user._id,
    });

    await Transaction.create({
      type: "INVESTMENT",
      direction: "OUT",
      amount: Number(investedAmount),
      referenceType: "Investment",
      referenceId: investment._id,
      description: `Investment created: ${investment.name}`,
      createdBy: req.user._id,
    });

    const populatedInvestment =
      await Investment.findById(
        investment._id
      ).populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Investment created successfully",
      investment: populatedInvestment,
    });
  } catch (error) {
    console.error("Add investment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getAllInvestments = async (req, res) => {
  try {
    const { status } = req.query;

    const filter = {};

    if (status) {
      filter.status = status;
    }

    const investments = await Investment.find(filter)
      .populate("createdBy", "name email")
      .sort({ createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: investments.length,
      investments,
    });
  } catch (error) {
    console.error("Get investments error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getInvestmentById = async (req, res) => {
  try {
    const investment =
      await Investment.findById(
        req.params.id
      ).populate("createdBy", "name email");

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    return res.status(200).json({
      success: true,
      investment,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const updateInvestment = async (req, res) => {
  try {
    const investment =
      await Investment.findById(req.params.id);

    if (!investment) {
      return res.status(404).json({
        success: false,
        message: "Investment not found",
      });
    }

    const {
      name,
      description,
      currentValue,
      status,
      endDate,
    } = req.body;

    if (name !== undefined) {
      investment.name = name.trim();
    }

    if (description !== undefined) {
      investment.description = description;
    }

    if (currentValue !== undefined) {
      if (Number(currentValue) < 0) {
        return res.status(400).json({
          success: false,
          message: "Current value cannot be negative",
        });
      }

      investment.currentValue =
        Number(currentValue);
    }

    if (status !== undefined) {
      investment.status = status;

      if (status === "closed" && !investment.endDate) {
        investment.endDate = new Date();
      }
    }

    if (endDate !== undefined) {
      investment.endDate = endDate;
    }

    await investment.save();

    return res.status(200).json({
      success: true,
      message: "Investment updated successfully",
      investment,
    });
  } catch (error) {
    console.error("Update investment error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  addInvestment,
  getAllInvestments,
  getInvestmentById,
  updateInvestment,
};