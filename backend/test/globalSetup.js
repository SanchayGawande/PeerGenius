// backend/test/globalSetup.js - Global test setup for MongoDB Memory Server
const { MongoMemoryServer } = require('mongodb-memory-server');

module.exports = async () => {
  // Start MongoDB Memory Server
  const mongod = await MongoMemoryServer.create({
    binary: {
      version: '7.0.0', // Use a stable MongoDB version
    },
  });

  const uri = mongod.getUri();
  
  // Store the URI and server instance for global teardown
  global.__MONGOD__ = mongod;
  process.env.MONGO_URI = uri;
  
  console.log(`MongoDB Memory Server started at: ${uri}`);
};