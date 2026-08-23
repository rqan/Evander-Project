const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { triggerMorningGreeting } = require('../services/cronService');

router.post('/send', chatController.handleIncomingMessage);
router.get('/history', chatController.getHistory);

// Secret endpoint to be called by external cron services (like cron-job.org)
router.get('/trigger-cron', async (req, res) => {
  await triggerMorningGreeting();
  res.json({ success: true, message: "Morning greeting triggered!" });
});

module.exports = router;
