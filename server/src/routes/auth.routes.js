const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { requireAuth } = require('../middleware/authJwt');

const User = require('../models/User');

const router = express.Router();


router.post('/register', async (req, res) => {
  try {
    const { name, email, password, avatar } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'Missing fields' });

    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already in use' });

    const hashed = await bcrypt.hash(password, 10);
    const user = await User.create({ name, email, password: hashed, avatar: avatar || '' });

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(500).json({ message: 'Register failed', error: String(e) });
  }
});

router.post('/login', async (req, res) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) return res.status(400).json({ message: 'Missing fields' });

    const user = await User.findOne({ email });
    if (!user) return res.status(401).json({ message: 'Invalid credentials' });

    const ok = await bcrypt.compare(password, user.password);
    if (!ok) return res.status(401).json({ message: 'Invalid credentials' });

    const token = jwt.sign({ sub: user._id.toString() }, process.env.JWT_SECRET, { expiresIn: '7d' });
    res.json({ token, user: { id: user._id, name: user.name, email: user.email, avatar: user.avatar } });
  } catch (e) {
    res.status(500).json({ message: 'Login failed', error: String(e) });
  }
});

router.get('/me', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id).select('name email avatar');
    if (!u) return res.status(404).json({ message: 'User not found' });
    res.json({ user: { id: u._id, name: u.name, email: u.email, avatar: u.avatar } });
  } catch (e) {
    res.status(500).json({ message: 'Failed to load profile', error: String(e) });
  }
});

module.exports = router;

