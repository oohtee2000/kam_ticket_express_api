const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/db2');
const verifyToken = require('../middleware/authMiddleware');

// GET /api/auth/protected
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: `Hello ${req.user.email}, you accessed a protected route!`,
    data: { 'email': req.user.email,
      
      'id' : req.user.id

    }
   });
});

// Sign Up Route
router.post('/signup', async (req, res) => {
  const { name, email, password } = req.body;

  if (!name || !email || !password) {
    return res.status(400).json({ message: 'All fields are required' });
  }

  try {
    const [existingUser] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);
    if (existingUser.length > 0) {
      return res.status(400).json({ message: 'Email already in use' });
    }

    const hashedPassword = await bcrypt.hash(password, 10);
    await db.execute(
      'INSERT INTO users (name, email, password) VALUES (?, ?, ?)',
      [name, email, hashedPassword]
    );

    res.status(201).json({ message: 'User registered successfully' });
  } catch (err) {
    console.error('Signup error:', err);
    res.status(500).json({ error: 'An error occurred while registering the user' });
  }
});

// Login Route
router.post('/login', async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ message: 'Email and password are required' });
  }

  try {
    const [rows] = await db.execute('SELECT * FROM users WHERE email = ?', [email]);

    if (rows.length === 0) {
      return res.status(404).json({ message: 'User not found' });
    }

    const valid = await bcrypt.compare(password, rows[0].password);
    if (!valid) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    // 🔑 Generate new token every time
    const payload = { id: rows[0].id, email: rows[0].email };
    const token = jwt.sign(payload, process.env.JWT_SECRET, { expiresIn: '1h' });

    console.log('✅ New Token Generated:', token);

    const decoded = jwt.decode(token); // for readable timestamps

    res.status(200).json({
      token,
      issuedAt: new Date(decoded.iat * 1000).toISOString(),
      expiresAt: new Date(decoded.exp * 1000).toISOString(),
      user: {
        id: rows[0].id,
        name: rows[0].name,
        email: rows[0].email,
      },
    });
  } catch (err) {
    console.error('Login error:', err);
    res.status(500).json({ error: 'An error occurred during login' });
  }
});

// Logout Route
router.post('/logout', (req, res) => {
  // Just a client-side operation: remove token
  res.status(200).json({ message: 'Logged out successfully (token should be discarded on client)' });
});

module.exports = router;
