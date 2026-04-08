'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const { runScreener } = require('./scheduler');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

// Routes
app.use('/api/properties', require('./routes/properties'));
app.use('/api/markets', require('./routes/markets'));
app.use('/api/goals', require('./routes/goals'));
app.use('/api/runs', require('./routes/runs'));
app.use('/api/sources', require('./routes/sources'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Scheduler
const cronExpr = process.env.SCREENER_CRON || '0 6 * * *';
if (cron.validate(cronExpr)) {
  cron.schedule(cronExpr, () => {
    console.log(`[scheduler] Cron triggered: ${cronExpr}`);
    runScreener().catch(err => console.error('[scheduler] Cron run error:', err));
  });
  console.log(`[scheduler] Cron scheduled: ${cronExpr}`);
} else {
  console.warn(`[scheduler] Invalid cron expression: ${cronExpr}`);
}

app.listen(PORT, () => {
  console.log(`Backend listening on port ${PORT}`);
});
