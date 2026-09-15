// ============================================================
//  USER MODEL  (this is like a "form template" for MongoDB)
// ============================================================
// Think of this file as a cookie-cutter. Every time we save a
// user (student/staff or admin) into the database, MongoDB uses
// this exact shape (fields) to store the data.
// ============================================================

const mongoose = require('mongoose');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true,
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,       // <-- MongoDB will not allow two users with the same email
      lowercase: true,
      trim: true,
    },
    password: {
      type: String,
      required: [true, 'Password is required'],
      // NOTE: we NEVER store the real password here.
      // By the time it reaches this field, it is already
      // scrambled (hashed) by bcrypt. See Registration service.
    },
    role: {
      type: String,
      enum: ['user', 'admin'],   // only these two words are allowed
      default: 'user',
      required: true,
    },
    phone: {
      type: String,
      trim: true,
    },
  },
  {
    timestamps: true, // this automatically adds createdAt + updatedAt
  }
);

// Every microservice that needs the "users" table/collection will
// require() this same file, so they all talk to the exact same
// collection in MongoDB: "users"
module.exports = mongoose.model('User', UserSchema);
