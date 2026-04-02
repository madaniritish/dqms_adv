const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri = process.env.MONGO_URI;
    if (!mongoUri) {
      throw new Error('MONGO_URI is not set');
    }

    const conn = await mongoose.connect(mongoUri);
    process.env.DB_MODE = 'mongo';
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);

    // Create indexes
    mongoose.connection.once('open', () => {
      console.log('📦 MongoDB indexes will be ensured by Mongoose models');
    });
  } catch (error) {
    const isDev = (process.env.NODE_ENV || 'development') === 'development';
    if (!isDev) {
      console.error(`❌ MongoDB Connection Error: ${error.message}`);
      process.exit(1);
    }

    // Dev fallback: boot with an ephemeral in-memory MongoDB so the backend can run
    // even when local MongoDB isn't installed/running.
    console.warn(`⚠️ MongoDB unavailable (${error.message}). Falling back to in-memory MongoDB for development.`);

    const { MongoMemoryServer } = require('mongodb-memory-server');
    const mem = await MongoMemoryServer.create();
    const memUri = mem.getUri();

    const conn = await mongoose.connect(memUri);
    process.env.DB_MODE = 'memory';
    console.log(`✅ In-memory MongoDB Connected: ${conn.connection.host}`);

    mongoose.connection.once('open', () => {
      console.log('📦 MongoDB indexes will be ensured by Mongoose models');
    });
  }
};

module.exports = connectDB;
