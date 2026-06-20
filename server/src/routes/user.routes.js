const express = require('express');
const bcrypt = require('bcryptjs');
const { requireAuth } = require('../middleware/authJwt');
const User = require('../models/User');
const { uploadImage } = require('../utils/cloudinary');

const router = express.Router();

router.get('/me', requireAuth, async (req, res) => {
  const u = await User.findById(req.user.id).select('name email avatar cursorColor createdAt');
  if (!u) return res.status(404).json({ message: 'User not found' });
  res.json({ user: { id: u._id, name: u.name, email: u.email, avatar: u.avatar, cursorColor: u.cursorColor || '#6366f1', createdAt: u.createdAt } });
});

router.patch('/me', requireAuth, async (req, res) => {
  try {
    const u = await User.findById(req.user.id);
    if (!u) return res.status(404).json({ message: 'User not found' });

    const { name, avatar, cursorColor, currentPassword, newPassword } = req.body;

    if (name?.trim()) u.name = name.trim();

    if (avatar !== undefined && avatar !== null) {
      if (avatar && typeof avatar === 'string' && avatar.startsWith('data:')) {
        const result = await uploadImage(avatar);
        u.avatar = result.url;
      } else {
        u.avatar = avatar || '';
      }
    }

    if (cursorColor) {
      u.cursorColor = cursorColor;
    }

    if (newPassword) {
      if (!currentPassword) return res.status(400).json({ message: 'Current password required' });
      const ok = await bcrypt.compare(currentPassword, u.password);
      if (!ok) return res.status(401).json({ message: 'Current password is incorrect' });
      if (newPassword.length < 6) return res.status(400).json({ message: 'Password must be at least 6 characters' });
      u.password = await bcrypt.hash(newPassword, 10);
    }

    await u.save();
    res.json({ user: { id: u._id, name: u.name, email: u.email, avatar: u.avatar, cursorColor: u.cursorColor || '#6366f1', createdAt: u.createdAt } });
  } catch (e) {
    res.status(500).json({ message: 'Update failed', error: String(e) });
  }
});

module.exports = router;
