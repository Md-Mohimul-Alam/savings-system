const path = require("path");
const mongoose = require("mongoose");

require("dotenv").config({
  path: path.resolve(__dirname, ".env"),
});

const removeDemoData = async () => {
  let session;

  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI;

    if (!mongoUri) {
      throw new Error(
        "MONGO_URI / MONGODB_URI is missing from backend/.env"
      );
    }

    await mongoose.connect(mongoUri);

    const db = mongoose.connection.db;

    console.log(`Connected to database: ${db.databaseName}`);

    // Discover existing collections, including newer loan collections.
    const collections = await db
      .listCollections({}, { nameOnly: false })
      .toArray();

    const collectionNames = collections
      .filter(
        (item) =>
          item.type === "collection" &&
          !item.name.startsWith("system.")
      )
      .map((item) => item.name)
      .sort();

    const filter = { dataScope: "demo" };

    session = await mongoose.startSession();

    let results = [];

    // All deletions commit together or roll back together.
    await session.withTransaction(async () => {
      const attemptResults = [];

      for (const name of collectionNames) {
        const collection = db.collection(name);

        const result = await collection.deleteMany(
          filter,
          { session }
        );

        const remaining = await collection.countDocuments(
          filter,
          { session }
        );

        if (remaining !== 0) {
          throw new Error(
            `Demo records remain in ${name}; cleanup rolled back`
          );
        }

        attemptResults.push({
          collection: name,
          deleted: result.deletedCount,
          demoRemaining: remaining,
        });
      }

      results = attemptResults;
    });

    console.table(results);

    const totalDeleted = results.reduce(
      (total, item) => total + item.deleted,
      0
    );

    console.log(
      `Demo cleanup completed: ${totalDeleted} record(s) deleted.`
    );

    console.log(
      "Records marked live or without a demo scope were preserved."
    );
  } catch (error) {
    console.error("Demo cleanup failed:", error.message);
    process.exitCode = 1;
  } finally {
    if (session) {
      await session.endSession();
    }

    await mongoose.disconnect();
  }
};

removeDemoData();