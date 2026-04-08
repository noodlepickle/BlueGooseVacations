'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { runScreener } = require('../scheduler');

// POST /api/runs/trigger
router.post('/trigger', async (req, res) => {
  try {
    res.json({ status: 'started', message: 'Screener run initiated' });
    // Run async after response
    runScreener().catch(err => console.error('[runs] Trigger error:', err));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/runs/latest/digest
router.get('/latest/digest', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT digest_md, run_date FROM runs ORDER BY id DESC LIMIT 1'
    );
    if (!result.rows.length) return res.status(404).json({ error: 'No runs yet' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/runs
router.get('/', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT id, run_date, total_props, qualifying, areas FROM runs ORDER BY id DESC LIMIT 50'
    );
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// GET /api/runs/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM runs WHERE id = $1', [req.params.id]);
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
