const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

// Routes
const authRoutes = require("./routes/authRoutes");
const memberRoutes = require("./routes/memberRoutes");
const contributionRoutes = require("./routes/contributionRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const investmentRoutes = require("./routes/investmentRoutes");
const ownershipRoutes = require("./routes/ownershipRoutes");
const profitDistributionRoutes = require(
  "./routes/profitDistributionRoutes"
);
const joinRequestRoutes = require("./routes/joinRequestRoutes");
const exitRequestRoutes = require("./routes/exitRequestRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const auditRoutes = require("./routes/auditRoutes");

const app = express();

// Allowed frontend origins
const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "http://localhost:3001",
  "http://127.0.0.1:3001",
];

// CORS
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests from Postman, curl, mobile apps, etc.
      if (!origin) {
        return callback(null, true);
      }

      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }

      return callback(
        new Error(`CORS blocked for origin: ${origin}`)
      );
    },

    credentials: true,

    methods: [
      "GET",
      "POST",
      "PUT",
      "PATCH",
      "DELETE",
      "OPTIONS",
    ],

    allowedHeaders: [
      "Content-Type",
      "Authorization",
    ],
  })
);

// Body parsers
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Cookie parser
app.use(cookieParser());

// Health check
app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Group Savings API is running",
  });
});

// API Routes
app.use("/api/auth", authRoutes);

app.use("/api/members", memberRoutes);

app.use("/api/contributions", contributionRoutes);

app.use("/api/transactions", transactionRoutes);

app.use("/api/expenses", expenseRoutes);

app.use("/api/investments", investmentRoutes);

app.use("/api/ownership", ownershipRoutes);

app.use(
  "/api/profit-distributions",
  profitDistributionRoutes
);

app.use("/api/join-requests", joinRequestRoutes);

app.use("/api/exit-requests", exitRequestRoutes);

app.use("/api/dashboard", dashboardRoutes);

app.use("/api/notifications", notificationRoutes);

app.use("/api/audit-logs", auditRoutes);

// 404 Handler
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Global Error Handler
app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  return res.status(err.status || 500).json({
    success: false,
    message: err.message || "Internal server error",
  });
});

module.exports = app;
