// src/routes/feedback.js
const express = require('express');
const router = express.Router();
const Feedback = require('../models/Feedback');

// Submit feedback
router.post('/', async (req, res) => {
  try {
    const { tableNumber, rating, foodQuality, serviceQuality, ambience, cleanliness, comment, orderId } = req.body;
    
    const feedback = new Feedback({
      tableNumber,
      orderId,
      rating,
      foodQuality,
      serviceQuality,
      ambience,
      cleanliness,
      comment,
      createdAt: new Date()
    });
    
    await feedback.save();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// Get all feedback (for admin)
router.get('/', async (req, res) => {
  try {
    const feedback = await Feedback.find().sort('-createdAt');
    res.json(feedback);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

module.exports = router;