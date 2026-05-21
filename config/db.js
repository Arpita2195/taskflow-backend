const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const dbUri = process.env.MONGODB_URI || 'mongodb+srv://arpitanathwani2155_db_user:Arpu2192005%40@cluster0.ggvnpjj.mongodb.net/taskflow?retryWrites=true&w=majority';
    const conn = await mongoose.connect(dbUri);
    console.log(`✅ MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`❌ MongoDB Connection Error: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;
