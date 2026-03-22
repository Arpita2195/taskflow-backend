const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI, {
      // These options ensure clean connection logging
    });
    console.log(`✅  MongoDB Connected: ${conn.connection.host}`);
    console.log(`📦  Database: ${conn.connection.name}`);
  } catch (err) {
    console.error('❌  MongoDB connection failed:', err.message);
    console.error('💡  Check your MONGO_URI in backend/.env');
    process.exit(1);
  }
};

// Log when disconnected
mongoose.connection.on('disconnected', () => {
  console.log('⚠️   MongoDB disconnected');
});

module.exports = connectDB;

/*
═══════════════════════════════════════════════════════
  HOW TO CONNECT WITH MONGODB COMPASS (Local)
═══════════════════════════════════════════════════════

1. Download MongoDB Community Server (free):
   https://www.mongodb.com/try/download/community

2. Install and start MongoDB — it runs on port 27017 by default

3. Download MongoDB Compass (GUI):
   https://www.mongodb.com/try/download/compass

4. Open Compass → New Connection → paste:
   mongodb://localhost:27017

5. Click Connect → you'll see the "taskflow" database
   appear automatically once the backend has started

6. In backend/.env set:
   MONGO_URI=mongodb://localhost:27017/taskflow

═══════════════════════════════════════════════════════
  HOW TO CONNECT WITH MONGODB ATLAS (Cloud, free)
═══════════════════════════════════════════════════════

1. Go to https://mongodb.com/atlas → sign up free
2. Create M0 cluster → Database Access → add user
3. Network Access → Allow 0.0.0.0/0
4. Connect → Compass → copy the connection string
5. In backend/.env set:
   MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/taskflow

   Then open Compass → paste the same URI → Connect
═══════════════════════════════════════════════════════
*/
