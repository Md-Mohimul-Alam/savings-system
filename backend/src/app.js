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

const joinRequestRoutes = require(
  "./routes/joinRequestRoutes"
);

const exitRequestRoutes = require(
  "./routes/exitRequestRoutes"
);

const dashboardRoutes = require(
  "./routes/dashboardRoutes"
);

const notificationRoutes = require(
  "./routes/notificationRoutes"
);

const auditRoutes = require(
  "./routes/auditRoutes"
);

const app = express();

const allowedOrigins = [
  "http://localhost:3000",
  "https://savings-system-coral.vercel.app/login"
];

if (process.env.FRONTEND_URL) {
  allowedOrigins.push(
    process.env.FRONTEND_URL
  );
}

app.use(
  cors({
    origin: (origin, callback) => {
      // Postman, curl, server-to-server
      if (!origin) {
        return callback(null, true);
      }

      if (
        allowedOrigins.includes(origin)
      ) {
        return callback(null, true);
      }

      return callback(
        new Error(
          `CORS blocked for origin: ${origin}`
        )
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

app.use(express.json());

app.use(
  express.urlencoded({
    extended: true,
  })
);

app.use(cookieParser());

app.get("/", (req, res) => {
  return res.status(200).json({
    success: true,
    message:
      "Group Savings API is running",
  });
});

app.get(
  "/api/health",
  (req, res) => {
    return res.status(200).json({
      success: true,
      message: "API is healthy",
    });
  }
);

// API Routes
app.use(
  "/api/auth",
  authRoutes
);

app.use(
  "/api/members",
  memberRoutes
);

app.use(
  "/api/contributions",
  contributionRoutes
);

app.use(
  "/api/transactions",
  transactionRoutes
);

app.use(
  "/api/expenses",
  expenseRoutes
);

app.use(
  "/api/investments",
  investmentRoutes
);

app.use(
  "/api/ownership",
  ownershipRoutes
);

app.use(
  "/api/profit-distributions",
  profitDistributionRoutes
);

app.use(
  "/api/join-requests",
  joinRequestRoutes
);

app.use(
  "/api/exit-requests",
  exitRequestRoutes
);

app.use(
  "/api/dashboard",
  dashboardRoutes
);

app.use(
  "/api/notifications",
  notificationRoutes
);

app.use(
  "/api/audit-logs",
  auditRoutes
);

// 404
app.use((req, res) => {
  return res.status(404).json({
    success: false,
    message: "API route not found",
  });
});

// Error handler
app.use(
  (err, req, res, next) => {
    console.error(
      "Unhandled error:",
      err
    );

    return res
      .status(
        err.status || 500
      )
      .json({
        success: false,
        message:
          err.message ||
          "Internal server error",
      });
  }
);

module.exports = app;