// backend/test/globalTeardown.js - Global test teardown for MongoDB Memory Server
module.exports = async () => {
  if (global.__MONGOD__) {
    await global.__MONGOD__.stop();
    console.log('MongoDB Memory Server stopped');
  }
};