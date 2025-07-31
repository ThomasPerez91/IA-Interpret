print('Initializing MongoDB...');
const dbName = process.env.MONGO_INITDB_DATABASE;
db = db.getSiblingDB(dbName);
db.createCollection('USERS');
