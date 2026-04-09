'use strict';

require('dotenv').config();
const express = require('express');
const cors = require('cors');
const cron = require('node-cron');
const db = require('./db');

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
app.use('/api/settings', require('./routes/settings'));

app.get('/api/health', (req, res) => res.json({ status: 'ok', ts: new Date().toISOString() }));

// Load persisted settings from DB into process.env, then start server
async function loadSettingsAndStart() {
  try {
    const result = await db.query('SELECT key, value FROM settings');
    for (const { key, value } of result.rows) {
      if (value) process.env[key] = value;
    }
    console.log(`[settings] Loaded ${result.rows.length} setting(s) from DB`);
  } catch (err) {
    // Table may not exist yet on first boot — migrations run async via initdb
    console.warn('[settings] Could not load settings from DB (will retry after migrations):', err.message);
  }

  // Scheduler — read cron after settings loaded
  const cronExpr = process.env.SCREENER_CRON || '0 6 * * *';
  if (cron.validate(cronExpr)) {
    cron.schedule(cronExpr, () => {
      const { runScreener } = require('./scheduler');
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
}

loadSettingsAndStart();
