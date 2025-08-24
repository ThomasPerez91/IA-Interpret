print("Initializing MongoDB...");
const dbName = "ia_interpret";
db = db.getSiblingDB(dbName);
db.createCollection("users");
