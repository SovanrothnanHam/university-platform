// ============================================================================
//  USER MICROSERVICE  —  the "My Own Desk" (self-service office)
// ============================================================================
//  A regular user can only ever see and change THEIR OWN information here —
//  never anybody else's. That's why we never ask "whose profile do you want?"
//  Instead, the API Gateway already read the user's email out of their ID
//  card (JWT) and quietly passed it along in a header (x-user-email). This
//  microservice trusts that header ONLY because it already checked the
//  request truly came from the Gateway (gateway-secret check below).
// ============================================================================

const express = require('express');
require('dotenv').config();

const connectDB = require('./dbconnect');
const User = require('./models/User');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5004;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

connectDB();

// SECURITY GATE — block anyone who didn't come through the API Gateway.
app.use((req, res, next) => {
  if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
    return res.status(403).json({
      message: 'Direct access blocked. Please call this API through the API Gateway.',
    });
  }
  // Grab "who is asking" from the header the Gateway stamped on for us.
  req.callerEmail = req.headers['x-user-email'];
  if (!req.callerEmail) {
    return res.status(401).json({ message: 'Could not identify the logged-in user.' });
  }
  next();
});

// ----------------------------------------------------------------------------
// API: GET /user/viewprofile
// Shows only the profile that belongs to the logged-in user.
// ----------------------------------------------------------------------------
app.get('/user/viewprofile', async (req, res) => {
  try {
    const myProfile = await User.findOne({ email: req.callerEmail }).select('-password');
    if (!myProfile) {
      return res.status(404).json({ message: 'Profile not found.' });
    }
    return res.status(200).json({ user: myProfile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Could not fetch profile.', error: err.message });
  }
});

// ----------------------------------------------------------------------------
// API: PUT /user/updateprofile
// body: { "name": "...", "phone": "..." }
// On purpose, we do NOT let this endpoint change email, password or role —
// those are sensitive fields with their own dedicated, more careful flows.
// ----------------------------------------------------------------------------
app.put('/user/updateprofile', async (req, res) => {
  try {
    const { name, phone } = req.body;

    const updates = {};
    if (name) updates.name = name;
    if (phone) updates.phone = phone;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: 'Nothing to update. Provide name and/or phone.' });
    }

    const updatedProfile = await User.findOneAndUpdate(
      { email: req.callerEmail },
      updates,
      { new: true } // return the NEW version, not the old one
    ).select('-password');

    if (!updatedProfile) {
      return res.status(404).json({ message: 'Profile not found.' });
    }

    return res.status(200).json({ message: 'Profile updated successfully.', user: updatedProfile });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Update failed.', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`👤 User Microservice running on http://localhost:${PORT}`);
});
