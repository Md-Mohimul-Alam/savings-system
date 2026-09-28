const Expense = require("../models/Expense");
const Transaction = require("../models/Transaction");

const addExpense = async (req, res) => {
  try {
    const {
      title,
      category,
      amount,
      expenseDate,
      note,
    } = req.body;

    if (!title || amount === undefined) {
      return res.status(400).json({
        success: false,
        message: "Title and amount are required",
      });
    }

    if (Number(amount) <= 0) {
      return res.status(400).json({
        success: false,
        message: "Expense amount must be greater than 0",
      });
    }

    const expense = await Expense.create({
      title: title.trim(),
      category: category || "GENERAL",
      amount: Number(amount),
      expenseDate: expenseDate || new Date(),
      note: note || "",
      createdBy: req.user._id,
      dataScope: req.dataScope,
    });

    await Transaction.create({
      type: "EXPENSE",
      direction: "OUT",
      amount: Number(amount),
      referenceType: "Expense",
      referenceId: expense._id,
      description: title.trim(),
      createdBy: req.user._id,
      dataScope: req.dataScope,
    });

    const populatedExpense = await Expense.findOne({
      _id: expense._id,
      dataScope: req.dataScope,
    }).populate("createdBy", "name email");

    return res.status(201).json({
      success: true,
      message: "Expense added successfully",
      expense: populatedExpense,
    });
  } catch (error) {
    console.error("Add expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getAllExpenses = async (req, res) => {
  try {
    const {
      category,
      fromDate,
      toDate,
    } = req.query;

    const filter = {
      dataScope: req.dataScope,
    };

    if (category) {
      filter.category = category;
    }

    if (fromDate || toDate) {
      filter.expenseDate = {};

      if (fromDate) {
        filter.expenseDate.$gte = new Date(fromDate);
      }

      if (toDate) {
        filter.expenseDate.$lte = new Date(toDate);
      }
    }

    const expenses = await Expense.find(filter)
      .populate("createdBy", "name email")
      .sort({
        expenseDate: -1,
        createdAt: -1,
      });

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      count: expenses.length,
      expenses,
    });
  } catch (error) {
    console.error("Get expenses error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const getExpenseById = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      dataScope: req.dataScope,
    }).populate("createdBy", "name email");

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    return res.status(200).json({
      success: true,
      demoMode: req.user?.isDemo === true,
      expense,
    });
  } catch (error) {
    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

const updateExpense = async (req, res) => {
  try {
    const expense = await Expense.findOne({
      _id: req.params.id,
      dataScope: req.dataScope,
    });

    if (!expense) {
      return res.status(404).json({
        success: false,
        message: "Expense not found",
      });
    }

    const oldAmount = expense.amount;

    const {
      title,
      category,
      amount,
      expenseDate,
      note,
    } = req.body;

    if (title !== undefined) {
      expense.title = title;
    }

    if (category !== undefined) {
      expense.category = category;
    }

    if (expenseDate !== undefined) {
      expense.expenseDate = expenseDate;
    }

    if (note !== undefined) {
      expense.note = note;
    }

    if (amount !== undefined) {
      if (Number(amount) <= 0) {
        return res.status(400).json({
          success: false,
          message: "Expense amount must be greater than 0",
        });
      }

      expense.amount = Number(amount);
    }

    await expense.save();

    const difference = expense.amount - oldAmount;

    if (difference !== 0) {
      await Transaction.create({
        type: "ADJUSTMENT",
        direction: difference > 0 ? "OUT" : "IN",
        amount: Math.abs(difference),
        referenceType: "Expense",
        referenceId: expense._id,
        description:
          difference > 0
            ? `Expense increased: ${expense.title}`
            : `Expense reduced: ${expense.title}`,
        createdBy: req.user._id,
        dataScope: req.dataScope,
      });
    }

    return res.status(200).json({
      success: true,
      message: "Expense updated successfully",
      expense,
    });
  } catch (error) {
    console.error("Update expense error:", error);

    return res.status(500).json({
      success: false,
      message: "Server error",
    });
  }
};

module.exports = {
  addExpense,
  getAllExpenses,
  getExpenseById,
  updateExpense,
};
