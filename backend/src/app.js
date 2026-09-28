const express = require("express");
const cors = require("cors");
const cookieParser = require("cookie-parser");

const connectDB = require("./config/db");

// Routes
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
  const frontendUrl =
    process.env.FRONTEND_URL.replace(
      /\/$/,
      ""
    );

  if (
    !allowedOrigins.includes(
      frontendUrl
    )
  ) {
    allowedOrigins.push(
      frontendUrl
    );
  }
}

// --------------------------------------------------
// CORS OPTIONS
// --------------------------------------------------

const corsOptions = {
  origin: (
    origin,
    callback
  ) => {
    // Allow curl, Postman, server-to-server
    if (!origin) {
      return callback(
        null,
        true
      );
    }

    if (
      allowedOrigins.includes(
        origin
      )
    ) {
      return callback(
        null,
        true
      );
    }

    console.error(
      `CORS blocked for origin: ${origin}`
    );

    // Do not throw a normal Error here.
    // Just reject the origin.
    return callback(
      null,
      false
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

  optionsSuccessStatus: 204,
};

// --------------------------------------------------
// CORS MIDDLEWARE
// --------------------------------------------------

app.use(
  cors(
    corsOptions
  )
);

// Explicitly handle OPTIONS before DB middleware
app.options(
  /.*/,
  cors(
    corsOptions
  )
);

// --------------------------------------------------
// BODY PARSERS
// --------------------------------------------------

app.use(
  express.json()
);

app.use(
  express.urlencoded({
    extended: true,
  })
);

// --------------------------------------------------
// COOKIE PARSER
// --------------------------------------------------

app.use(
  cookieParser()
);

// --------------------------------------------------
// ROOT HEALTH CHECK
// --------------------------------------------------

app.get(
  "/",
  (
    req,
    res
  ) => {
    return res
      .status(200)
      .json({
        success: true,
        message:
          "Group Savings API is running",
      });
  }
);

// --------------------------------------------------
// API HEALTH CHECK
// --------------------------------------------------

app.get(
  "/api/health",
  (
    req,
    res
  ) => {
    return res
      .status(200)
      .json({
        success: true,
        message:
          "API is healthy",
      });
  }
);

// --------------------------------------------------
// MONGODB CONNECTION MIDDLEWARE
// --------------------------------------------------

app.use(
  "/api",
  async (
    req,
    res,
    next
  ) => {
    try {
      await connectDB();

      next();
    } catch (
      error
    ) {
      console.error(
        "Database connection middleware error:",
        error
      );

      return res
        .status(500)
        .json({
          success: false,
          message:
            "Database connection failed",
        });
    }
  }
);

// --------------------------------------------------
// API ROUTES
// --------------------------------------------------

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

// --------------------------------------------------
// 404 HANDLER
// --------------------------------------------------

app.use(
  (
    req,
    res
  ) => {
    return res
      .status(404)
      .json({
        success: false,
        message:
          "API route not found",
      });
  }
);

// --------------------------------------------------
// GLOBAL ERROR HANDLER
// --------------------------------------------------

app.use(
  (
    err,
    req,
    res,
    next
  ) => {
    console.error(
      "Unhandled error:",
      err
    );

    return res
      .status(
        err.status ||
          500
      )
      .json({
        success: false,
        message:
          err.message ||
          "Internal server error",
      });
  }
);

module.exports =
  app;