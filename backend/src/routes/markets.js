'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

// GET /api/markets
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT id, data, active, created_at FROM markets ORDER BY created_at');
    res.json(result.rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// POST /api/markets
router.post('/', async (req, res) => {
  try {
    const { id, ...data } = req.body;
    if (!id) return res.status(400).json({ error: 'id is required' });

    await db.query(
      'INSERT INTO markets (id, data) VALUES ($1, $2)',
      [id, JSON.stringify(data)]
    );
    res.status(201).json({ id, data });
  } catch (err) {
    if (err.code === '23505') return res.status(409).json({ error: 'Market ID already exists' });
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/markets/:id
router.put('/:id', async (req, res) => {
  try {
    const { active, ...data } = req.body;
    const result = await db.query(
      `UPDATE markets SET data = $1, active = COALESCE($2, active) WHERE id = $3 RETURNING *`,
      [JSON.stringify(data), active ?? null, req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });
    res.json(result.rows[0]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/markets/:id
router.delete('/:id', async (req, res) => {
  try {
    await db.query('DELETE FROM markets WHERE id = $1', [req.params.id]);
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
