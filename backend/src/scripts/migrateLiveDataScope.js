const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.resolve(
    __dirname,
    "../../.env"
  ),
});

const User = require("../models/User");
const Member = require("../models/Member");
const Contribution = require("../models/Contribution");
const Transaction = require("../models/Transaction");
const Investment = require("../models/Investment");
const Expense = require("../models/Expense");
const ProfitDistribution = require(
  "../models/ProfitDistribution"
);
const Notification = require(
  "../models/Notification"
);
const AuditLog = require(
  "../models/AuditLog"
);
const JoinRequest = require(
  "../models/JoinRequest"
);
const ExitRequest = require(
  "../models/ExitRequest"
);

// --------------------------------------------------
// MIGRATE EXISTING RECORDS TO LIVE DATA SCOPE
// --------------------------------------------------

const migrateDataScope = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI / MONGODB_URI is missing"
      );
    }

    await mongoose.connect(
      mongoUri
    );

    console.log(
      "MongoDB connected"
    );

    const models = [
      {
        name: "User",
        model: User,
      },

      {
        name: "Member",
        model: Member,
      },

      {
        name: "Contribution",
        model: Contribution,
      },

      {
        name: "Transaction",
        model: Transaction,
      },

      {
        name: "Investment",
        model: Investment,
      },

      {
        name: "Expense",
        model: Expense,
      },

      {
        name:
          "ProfitDistribution",
        model:
          ProfitDistribution,
      },

      {
        name:
          "Notification",
        model:
          Notification,
      },

      {
        name:
          "AuditLog",
        model:
          AuditLog,
      },

      {
        name:
          "JoinRequest",
        model:
          JoinRequest,
      },

      {
        name:
          "ExitRequest",
        model:
          ExitRequest,
      },
    ];

    console.log("");
    console.log(
      "Starting migration..."
    );
    console.log("");

    // --------------------------------------------------
    // ADD dataScope: "live" TO OLD RECORDS
    // --------------------------------------------------

    for (
      const item
      of models
    ) {
      const result =
        await item.model.updateMany(
          {
            $or: [
              {
                dataScope: {
                  $exists:
                    false,
                },
              },

              {
                dataScope:
                  null,
              },

              {
                dataScope:
                  "",
              },
            ],
          },

          {
            $set: {
              dataScope:
                "live",
            },
          }
        );

      console.log(
        `${item.name}: ${result.modifiedCount} record(s) updated`
      );
    }

    // --------------------------------------------------
    // SET OLD USERS AS NON-DEMO
    // --------------------------------------------------

    const userDemoResult =
      await User.updateMany(
        {
          $or: [
            {
              isDemo: {
                $exists:
                  false,
              },
            },

            {
              isDemo:
                null,
            },
          ],
        },

        {
          $set: {
            isDemo:
              false,
          },
        }
      );

    console.log("");
    console.log(
      `User isDemo: ${userDemoResult.modifiedCount} record(s) updated`
    );

    // --------------------------------------------------
    // VERIFY LIVE COUNTS
    // --------------------------------------------------

    console.log("");
    console.log(
      "Verifying live data..."
    );
    console.log("");

    for (
      const item
      of models
    ) {
      const liveCount =
        await item.model.countDocuments({
          dataScope:
            "live",
        });

      console.log(
        `${item.name}: ${liveCount} live record(s)`
      );
    }

    // --------------------------------------------------
    // VERIFY DEMO COUNTS
    // --------------------------------------------------

    console.log("");
    console.log(
      "Checking demo data..."
    );
    console.log("");

    for (
      const item
      of models
    ) {
      const demoCount =
        await item.model.countDocuments({
          dataScope:
            "demo",
        });

      console.log(
        `${item.name}: ${demoCount} demo record(s)`
      );
    }

    console.log("");
    console.log(
      "Migration completed successfully."
    );

    console.log(
      "Existing organization data is now marked as dataScope: live."
    );

    console.log("");

    await mongoose.disconnect();

    process.exit(0);
  } catch (error) {
    console.error("");
    console.error(
      "Migration failed:"
    );

    console.error(
      error
    );

    try {
      await mongoose.disconnect();
    } catch (
      disconnectError
    ) {
      console.error(
        "MongoDB disconnect error:",
        disconnectError
      );
    }

    process.exit(1);
  }
};

migrateDataScope();