require('dotenv').config();
const express = require('express');
const cors = require('cors');
const chatRoutes = require('./routes/chatRoutes');
const { initCronJobs } = require('./services/cronService');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));

app.use((req, res, next) => {
  console.log(`[${new Date().toISOString()}] INCOMING:`, req.method, req.url);
  next();
});

// API Routes
app.use('/api/chat', chatRoutes);

// Basic health check
app.get('/', (req, res) => {
  res.send('VBChat API is running.');
});

// Initialize background tasks (Push Notifications)
initCronJobs();

// Global error handler
app.use((err, req, res, next) => {
  console.error("Express Global Error:", err);
  res.status(500).json({ error: err.message });
});

app.listen(PORT, () => {
  console.log(`VBChat Server is running on port ${PORT}`);
});
