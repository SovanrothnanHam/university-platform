// ============================================================
//  DBCONNECT.JS  -  "the phone call to MongoDB"
// ============================================================
// Imagine MongoDB is a librarian sitting in a room far away.
// Before we can ask her to save or find any books (data), we
// first have to "call" her and say "Hello, are you there?"
// This file does exactly that call, using a library called
// Mongoose (Mongoose talks to MongoDB for us in plain JavaScript).
// ============================================================

const mongoose = require('mongoose');
require('dotenv').config();

const MONGO_URI = process.env.MONGO_URI;

async function connectDB() {
  try {
    // STEP 1: dial the number (connect)
    await mongoose.connect(MONGO_URI);
    // STEP 2: say hello and make sure she picks up (ping)
    await mongoose.connection.db.admin().command({ ping: 1 });
    console.log('✅ MongoDB connected successfully:', mongoose.connection.name);
  } catch (err) {
    console.error('❌ MongoDB connection failed:', err.message);
    // We do NOT crash the whole server just because the DB is
    // unreachable right this second - we just warn loudly so
    // whoever is running this notices the problem immediately.
  }
}

module.exports = connectDB;
