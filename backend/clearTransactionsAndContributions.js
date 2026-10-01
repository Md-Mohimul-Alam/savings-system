const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const resetFinancialData = async () => {
  let session;

  try {
    const uri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    if (!uri) {
      throw new Error("MongoDB URI is missing from .env");
    }

    await mongoose.connect(uri);

    const db = mongoose.connection.db;

    console.log(`Connected to database: ${db.databaseName}`);

    // Financial records to clear in both live and demo scopes.
    // Members and users are NOT deleted.
    const financialCollections = [
      "transactions",
      "contributions",
      "loans",
      "loanrepayments",
      "investments",
      "expenses",
      "profitdistributions",
      "ownerships",
      "exitrequests",
    ];

    const existingCollections = await db
      .listCollections({}, { nameOnly: true })
      .toArray();

    const existingNames = new Set(
      existingCollections.map((item) => item.name)
    );

    if (!existingNames.has("members")) {
      throw new Error(
        "Members collection not found. Check your database configuration."
      );
    }

    session = await mongoose.startSession();

    let report;

    await session.withTransaction(async () => {
      const rows = [];

      // Sequential operations within one transaction.
      for (const name of financialCollections) {
        if (!existingNames.has(name)) continue;

        const result = await db
          .collection(name)
          .deleteMany({}, { session });

        rows.push({
          collection: name,
          action: "Records deleted",
          count: result.deletedCount,
        });
      }

      const members = await db.collection("members").updateMany(
        {},
        {
          $set: {
            totalContribution: 0,
            openingContribution: 0,
            openingBalanceDate: null,
            ownershipPercentage: 0,
            updatedAt: new Date(),
          },
        },
        { session }
      );

      rows.push({
        collection: "members",
        action: "Financial totals reset; profiles kept",
        count: members.modifiedCount,
      });

      report = rows;
    });

    console.table(report);

    const memberCount = await db
      .collection("members")
      .countDocuments();

    console.log(`Reset completed. ${memberCount} members retained.`);
    console.log("Login accounts and passwords were preserved.");
  } catch (error) {
    console.error("Financial reset failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (session) {
      await session.endSession();
    }

    await mongoose.disconnect();
  }
};

resetFinancialData();