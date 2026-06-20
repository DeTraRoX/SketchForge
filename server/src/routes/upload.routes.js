const express = require('express');
const { requireAuth } = require('../middleware/authJwt');
const { uploadImage } = require('../utils/cloudinary');

const router = express.Router();

router.post('/image', requireAuth, async (req, res) => {
  try {
    const { image } = req.body;
    if (!image || typeof image !== 'string') {
      return res.status(400).json({ message: 'image (base64) required' });
    }
    const result = await uploadImage(image);
    res.json(result);
  } catch (e) {
    res.status(500).json({ message: 'Upload failed', error: String(e) });
  }
});

module.exports = router;
