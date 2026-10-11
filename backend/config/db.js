const mongoose = require('mongoose');

const connectDB = async () => {
  const defaultAtlasURI = 'mongodb+srv://mb9618951_db_user:ma%402110sa@cluster0.z3np1k0.mongodb.net/hospital_accreditation?retryWrites=true&w=majority';
  const mongoURI = process.env.MONGO_URI || defaultAtlasURI;
  
  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 20000,
      connectTimeoutMS: 20000,
      retryWrites: true,
      w: 'majority'
    });
    console.log(`[MongoDB] Connected successfully to host: ${conn.connection.host}, database: ${conn.connection.name}`);
    return conn;
  } catch (error) {
    console.error(`[MongoDB Connection Error] ${error.message}`);
    // If Atlas fails locally, try local fallback
    if (mongoURI.includes('mongodb+srv://')) {
      console.warn(`[MongoDB Warning] Attempting local MongoDB fallback at mongodb://127.0.0.1:27017/hospital_accreditation...`);
      try {
        const localConn = await mongoose.connect('mongodb://127.0.0.1:27017/hospital_accreditation', {
          serverSelectionTimeoutMS: 5000
        });
        console.log(`[MongoDB] Connected successfully to local database: ${localConn.connection.name}`);
        return localConn;
      } catch (localErr) {
        console.error(`[MongoDB Local Fallback Error] ${localErr.message}`);
      }
    }
    console.warn(`[MongoDB Warning] Retrying connection in 5 seconds...`);
    setTimeout(connectDB, 5000);
  }
};

module.exports = connectDB;
