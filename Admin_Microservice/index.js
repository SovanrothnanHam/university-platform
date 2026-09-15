// ============================================================================
//  ADMIN MICROSERVICE  —  the "Admin Office"
// ============================================================================
//  Only administrators are allowed in here (the Gateway already checked the
//  ID card said role=admin before it ever proxied the request to us — but we
//  ALSO double check the gateway-secret so nobody sneaks in a side door).
//
//  This office can:
//     - search for a person by name or email
//     - see the full list of everybody registered
//     - delete somebody's account
// ============================================================================

const express = require('express');
require('dotenv').config();

const connectDB = require('./dbconnect');
const User = require('./models/User');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5003;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

connectDB();

// SECURITY GATE — block anyone who didn't come through the API Gateway.
app.use((req, res, next) => {
  if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
    return res.status(403).json({
      message: 'Direct access blocked. Please call this API through the API Gateway.',
    });
  }
  next();
});

// ----------------------------------------------------------------------------
// API: GET /admin/searchuser?query=john
// Searches by name OR email, case-insensitive, partial match allowed.
// ----------------------------------------------------------------------------
app.get('/admin/searchuser', async (req, res) => {
  try {
    const { query } = req.query;
    if (!query) {
      return res.status(400).json({ message: 'Please provide a ?query= (name or email) to search for.' });
    }

    const regex = new RegExp(query, 'i'); // 'i' = ignore uppercase/lowercase
    const results = await User.find({
      $or: [{ name: regex }, { email: regex }],
    }).select('-password'); // never send password hashes back, even to admins

    if (results.length === 0) {
      return res.status(404).json({ message: 'No user found matching that name or email.' });
    }

    return res.status(200).json({ count: results.length, users: results });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Search failed.', error: err.message });
  }
});

// ----------------------------------------------------------------------------
// API: GET /admin/viewalluser
// Returns every single account in the system.
// ----------------------------------------------------------------------------
app.get('/admin/viewalluser', async (req, res) => {
  try {
    const allUsers = await User.find().select('-password');
    return res.status(200).json({ count: allUsers.length, users: allUsers });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not fetch users.', error: err.message });
  }
});

// ----------------------------------------------------------------------------
// API: DELETE /admin/deluser
// body: { "email": "someone@university.edu" }
// ----------------------------------------------------------------------------
app.delete('/admin/deluser', async (req, res) => {
  try {
    const { email } = req.body;
    if (!email) {
      return res.status(400).json({ message: 'Please provide the email of the user to delete.' });
    }

    const deletedUser = await User.findOneAndDelete({ email: email.toLowerCase() });
    if (!deletedUser) {
      return res.status(404).json({ message: 'No user found with that email.' });
    }

    return res.status(200).json({ message: `User ${email} has been deleted successfully.` });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Delete failed.', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🛡️  Admin Microservice running on http://localhost:${PORT}`);
});
