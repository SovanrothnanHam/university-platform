// ============================================================================
//  LOGIN MICROSERVICE  —  the "ID card printing desk"
// ============================================================================
//  This office checks "are you really who you say you are?" and if yes,
//  it prints you a temporary ID card (a JWT token). You will show this
//  card to the API Gateway on every future request instead of retyping
//  your password every time.
//
//  Flow for every request:
//     1) Make sure it really came through the API Gateway
//     2) Check email + password + role were all provided
//     3) Look the user up in MongoDB by email
//     4) Compare the typed password against the stored (hashed) password
//     5) Make sure the role they claim (user/admin) matches their account
//     6) If everything matches -> print the ID card (JWT) and hand it over
//     7) If anything is wrong -> say "Invalid email or password" (on purpose
//        we don't say WHICH one was wrong, so attackers can't guess emails)
// ============================================================================

const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
require('dotenv').config();

const connectDB = require('./dbconnect');
const User = require('./models/User');

const app = express();
app.use(express.json());

const PORT = process.env.PORT || 5002;
const JWT_SECRET = process.env.JWT_SECRET;
const GATEWAY_SECRET = process.env.GATEWAY_SECRET;

connectDB();

// SECURITY GATE — same idea as Registration service: block direct access.
app.use((req, res, next) => {
  if (req.headers['x-gateway-secret'] !== GATEWAY_SECRET) {
    return res.status(403).json({
      message: 'Direct access blocked. Please call this API through the API Gateway.',
    });
  }
  next();
});

// ----------------------------------------------------------------------------
// API: POST /auth/login
// body: { "email": "...", "password": "...", "role": "user" | "admin" }
// ----------------------------------------------------------------------------
app.post('/auth/login', async (req, res) => {
  try {
    const { email, password, role } = req.body;

    if (!email || !password || !role) {
      return res.status(400).json({ message: 'email, password and role are all required.' });
    }
    if (role !== 'user' && role !== 'admin') {
      return res.status(400).json({ message: "role must be exactly 'user' or 'admin'." });
    }

    // STEP 1: find the account by email
    const account = await User.findOne({ email: email.toLowerCase() });
    if (!account) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // STEP 2: compare the password they typed vs the hashed one we saved
    const passwordMatches = await bcrypt.compare(password, account.password);
    if (!passwordMatches) {
      return res.status(401).json({ message: 'Invalid email or password.' });
    }

    // STEP 3: make sure they're logging in as the role they actually own
    // (a "user" account cannot log in claiming to be "admin")
    if (account.role !== role) {
      return res.status(401).json({ message: 'Invalid email, password, or role.' });
    }

    // STEP 4: everything checks out — print the ID card (JWT)
    const token = jwt.sign(
      { email: account.email, role: account.role, name: account.name },
      JWT_SECRET,
      { expiresIn: '1h' }
    );

    return res.status(200).json({
      message: 'Login successful!',
      token,
      expiresIn: '1h',
    });
  } catch (err) {
    console.error(err);
    return res.status(500).json({ message: 'Something went wrong during login.', error: err.message });
  }
});

app.listen(PORT, () => {
  console.log(`🔑 Login Microservice running on http://localhost:${PORT}`);
});
