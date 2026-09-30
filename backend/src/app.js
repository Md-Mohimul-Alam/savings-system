const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

// Middleware
const {
  protect,
} = require("./middleware/authMiddleware");

const {
  dataScopeMiddleware,
} = require("./middleware/dataScopeMiddleware");

// Existing routes
const authRoutes = require("./routes/authRoutes");
const memberRoutes = require("./routes/memberRoutes");
const contributionRoutes = require("./routes/contributionRoutes");
const transactionRoutes = require("./routes/transactionRoutes");
const expenseRoutes = require("./routes/expenseRoutes");
const investmentRoutes = require("./routes/investmentRoutes");
const ownershipRoutes = require("./routes/ownershipRoutes");
const profitDistributionRoutes = require("./routes/profitDistributionRoutes");
const joinRequestRoutes = require("./routes/joinRequestRoutes");
const exitRequestRoutes = require("./routes/exitRequestRoutes");
const dashboardRoutes = require("./routes/dashboardRoutes");
const notificationRoutes = require("./routes/notificationRoutes");
const auditRoutes = require("./routes/auditRoutes");

// New loan router factory
const createLoanRouter = require("./routes/loanRoutes");

const app = express();

// --------------------------------------------------
// ALLOWED FRONTEND ORIGINS
// --------------------------------------------------

const allowedOrigins = [
  "http://localhost:3000",
  "http://127.0.0.1:3000",
  "https://fames-org-savings-system.vercel.app",
];

if (process.env.FRONTEND_URL) {
  const frontendUrl = process.env.FRONTEND_URL
    .trim()
    .replace(/\/$/, "");

  if (
    frontendUrl &&
    !allowedOrigins.includes(frontendUrl)
  ) {
    allowedOrigins.push(frontendUrl);
  }
}

// --------------------------------------------------
// CORS
// --------------------------------------------------

const corsOptions = {
  origin: (origin, callback) => {
    // Requests without an Origin header:
    // curl, Postman, and server-to-server requests.
    if (!origin) {
      return callback(null, true);
    }

    if (allowedOrigins.includes(origin)) {
      return callback(null, true);
    }

    console.error(`CORS blocked for origin: ${origin}`);

    return callback(null, false);
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

  optionsSuccessStatus: 204,
};

app.use(cors(corsOptions));

// Handle preflight before database connection middleware.
app.options(/.*/, cors(corsOptions));

// --------------------------------------------------
// BODY AND COOKIE PARSERS
// --------------------------------------------------

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

// --------------------------------------------------
// HEALTH CHECKS
// --------------------------------------------------

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "Group Savings API is running",
  });
});

app.get("/api/health", (req, res) => {
  return res.status(200).json({
    success: true,
    message: "API is healthy",
  });
});

// --------------------------------------------------
// DATABASE CONNECTION
// --------------------------------------------------

app.use("/api", async (req, res, next) => {
  try {
    await connectDB();
    return next();
  } catch (error) {
    console.error(
      "Database connection middleware error:",
      error
    );

    return res.status(500).json({
      success: false,
      message: "Database connection failed",
    });
  }
});

// --------------------------------------------------
// EXISTING API ROUTES
// Their existing route-level middleware remains in place.
// --------------------------------------------------

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

// --------------------------------------------------
// LOAN ROUTES
// Authentication runs before data-scope resolution.
// Admin checks are enforced by the loan controller.
// --------------------------------------------------

app.use(
  "/api/loans",
  createLoanRouter({
    authenticate: protect,
    resolveDataScope: dataScopeMiddleware,
  })
);

// --------------------------------------------------
// 404 HANDLER
// --------------------------------------------------

app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);

  if (res.headersSent) {
    return next(err);
  }

  const candidate = Number(
    err.statusCode || err.status || 500
  );

  const status =
    Number.isInteger(candidate) &&
    candidate >= 400 &&
    candidate <= 599
      ? candidate
      : 500;

  return res.status(status).json({
    success: false,
    message:
      status >= 500
        ? "Internal server error"
        : err.message || "Request failed",
  });
});

module.exports = app;