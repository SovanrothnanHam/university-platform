// ============================================================================
//  REGISTRATION MICROSERVICE  —  the "sign-up desk"
// ============================================================================
//  This office does ONE job only: create brand new accounts.
//  Flow for every request:
//     1) Make sure it really came through the API Gateway (not a shortcut)
//     2) Check the person filled the form correctly (validation)
//     3) Check nobody else already used that email (uniqueness)
//     4) Scramble (hash) the password so nobody can ever read it, even us
//     5) Save the new user into MongoDB
//     6) Say "Success!" back to the client (never send the password back)
// ============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
require('dotenv').config();

const connectDB = require('./dbconnect');
const User = require('./models/User');

const app = express();
app.use(express.json()); // lets us read JSON bodies like { "name": "..." }

const PORT = process.env.PORT || 5001;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

// Connect to MongoDB as soon as this microservice starts
connectDB();

// ----------------------------------------------------------------------------
// SECURITY GATE: reject any request that did NOT come from our API Gateway.
// The Gateway secretly stamps every request with a header only it knows.
// If someone calls this microservice directly (e.g. http://localhost:5001/..),
// skipping the Gateway, that header will be missing -> we block them.
// ----------------------------------------------------------------------------
app.use((req, res, next) => {
  if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
    return res.status(403).json({
      message: 'Direct access blocked. Please call this API through the API Gateway.',
    });
  }
  next();
});

// ----------------------------------------------------------------------------
// API: POST /register/userregister
// ----------------------------------------------------------------------------
app.post('/register/userregister', async (req, res) => {
  try {
    const { name, email, password, phone, role } = req.body;

    // STEP 1: Validate input — every field must actually be there
    if (!name || !email || !password) {
      return res.status(400).json({ message: 'name, email and password are required.' });
    }

    // STEP 2: Check email uniqueness — no two people can share an email
    const existingUser = await User.findOne({ email: email.toLowerCase() });
    if (existingUser) {
      return res.status(409).json({ message: 'This email is already registered. Please login instead.' });
    }

    // STEP 3: Hash the password — turn "mypassword123" into unreadable gibberish
    // The number 10 is the "salt rounds" — how many times we scramble it.
    // Even we (the developers) can never turn a hash back into the real password.
    const hashedPassword = await bcrypt.hash(password, 10);

    // STEP 4: Save the new user to MongoDB
    const newUser = new User({
      name,
      email: email.toLowerCase(),
      password: hashedPassword,
      phone,
      role: role === 'admin' ? 'admin' : 'user', // only allow user/admin, default user
    });
    await newUser.save();

    // STEP 5: Return success — NEVER send the password (even the hashed one) back
    return res.status(201).json({
      message: 'Registration successful!',
      user: {
        id: newUser._id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        phone: newUser.phone,
      },
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong during registration.', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`📝 Registration Microservice running on http://localhost:${PORT}`);
});
