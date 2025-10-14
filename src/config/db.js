const mongoose = require('mongoose');

const connectDB = async () => {
  mongoose.set('strictQuery', true);

  // Add mongoose connection event listeners
  mongoose.connection.on('error', (err) => {
    console.error('❌ MongoDB Connection Error:', err);
  });

  mongoose.connection.on('disconnected', () => {
    console.error('❌ MongoDB Disconnected');
  });

  try {
    if (!process.env.MONGO_URI) {
      throw new Error('MongoDB URI is not defined in environment variables');
    }
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
      serverSelectionTimeoutMS: 5000
    });
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error('❌ MongoDB Connection Failed:');
    console.error(`Error Message: ${error.message}`);
    console.error(`Connection URI: ${process.env.MONGO_URI ? '***' + process.env.MONGO_URI.slice(-10) : 'Not provided'}`);
    console.error(`Full Error Stack: ${error.stack}`);
    process.exit(1);
  }
};

module.exports = connectDB;