const fs = require("fs");
const path = require("path");

loadEnvFile();

const { MongoClient } = require("mongodb");

const root = __dirname;
const dbPath = path.join(root, "data", "db.json");
const mongoUri = process.env.MONGODB_URI;
const mongoDbName = process.env.MONGODB_DB || "skillarion_meet";
const collectionNames = ["meetings", "guests", "candidates", "whatsappCampaigns", "attendance", "transcripts"];

async function main() {
  if (!mongoUri) {
    throw new Error("MONGODB_URI is required in .env before migration.");
  }
  const localDb = JSON.parse(fs.readFileSync(dbPath, "utf8"));
  const client = new MongoClient(mongoUri);
  await client.connect();
  try {
    const database = client.db(mongoDbName);
    await database.collection("settings").deleteMany({});
    await database.collection("settings").insertOne({ ...(localDb.settings || {}), key: "singleton" });
    for (const name of collectionNames) {
      const collection = database.collection(name);
      await collection.deleteMany({});
      if (Array.isArray(localDb[name]) && localDb[name].length) {
        await collection.insertMany(localDb[name]);
      }
    }
    console.log(`Migrated local JSON data to MongoDB database "${mongoDbName}".`);
  } finally {
    await client.close();
  }
}

function loadEnvFile() {
  const envPath = path.join(__dirname, ".env");
  if (!fs.existsSync(envPath)) {
    return;
  }
  const lines = fs.readFileSync(envPath, "utf8").split(/\r?\n/);
  lines.forEach(line => {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) {
      return;
    }
    const separator = trimmed.indexOf("=");
    if (separator === -1) {
      return;
    }
    const key = trimmed.slice(0, separator).trim();
    const value = trimmed.slice(separator + 1).trim().replace(/^["']|["']$/g, "");
    if (key && process.env[key] === undefined) {
      process.env[key] = value;
    }
  });
}

main().catch(error => {
  console.error(error.message);
  process.exit(1);
});
