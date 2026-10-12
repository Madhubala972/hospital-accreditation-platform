const mongoose = require('mongoose');

const connectDB = async () => {
  const defaultAtlasURI = 'mongodb+srv://mb9618951_db_user:ma%402110sa@cluster0.z3np1k0.mongodb.net/hospital_accreditation?retryWrites=true&w=majority';
  const mongoURI = process.env.MONGO_URI || (process.env.NODE_ENV === 'production' ? defaultAtlasURI : 'mongodb://127.0.0.1:27017/hospital_accreditation');
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 15000,
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    console.warn(`[MongoDB Warning] Please ensure MongoDB service is running locally on 127.0.0.1:27017.`);
    throw error;
  }
};

module.exports = connectDB;
