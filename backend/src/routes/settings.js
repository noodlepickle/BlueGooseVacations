'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');

// Keys that hold sensitive values — mask on GET
const SECRET_KEYS = new Set([
  'RAPIDAPI_KEY', 'RESEND_API_KEY', 'NOTION_TOKEN', 'AIRDNA_API_KEY',
]);

// Keys allowed to be managed via this API
const ALLOWED_KEYS = new Set([
  'RAPIDAPI_KEY',
  'RESEND_API_KEY',
  'DIGEST_FROM',
  'DIGEST_TO',
  'NOTION_TOKEN',
  'NOTION_DATABASE_ID',
  'AIRDNA_API_KEY',
  'SCREENER_CRON',
]);

function maskValue(key, value) {
  if (!value) return '';
  if (SECRET_KEYS.has(key) && value.length > 4) {
    return '••••••••' + value.slice(-4);
  }
  return value;
}

// GET /api/settings — return all settings, secrets masked
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT key, value, updated_at FROM settings ORDER BY key');

    // Merge with current process.env for allowed keys
    const stored = Object.fromEntries(result.rows.map(r => [r.key, r]));

    const settings = Array.from(ALLOWED_KEYS).map(key => {
      const row = stored[key];
      const rawValue = row?.value ?? process.env[key] ?? '';
      return {
        key,
        set: !!rawValue,
        masked: maskValue(key, rawValue),
        updated_at: row?.updated_at ?? null,
        source: row ? 'db' : (process.env[key] ? 'env' : 'unset'),
      };
    });

    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/settings/:key — upsert a setting, immediately apply to process.env
router.put('/:key', async (req, res) => {
  const { key } = req.params;
  const { value } = req.body;

  if (!ALLOWED_KEYS.has(key)) {
    return res.status(400).json({ error: `Key "${key}" is not configurable via this API` });
  }

  try {
    if (value === '' || value == null) {
      // Clear the setting
      await db.query('DELETE FROM settings WHERE key = $1', [key]);
      delete process.env[key];
    } else {
      await db.query(
        `INSERT INTO settings (key, value, updated_at) VALUES ($1, $2, NOW())
         ON CONFLICT (key) DO UPDATE SET value = $2, updated_at = NOW()`,
        [key, value]
      );
      process.env[key] = value;
    }

    res.json({ key, set: !!(value), source: 'db' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// DELETE /api/settings/:key — clear a setting
router.delete('/:key', async (req, res) => {
  const { key } = req.params;
  if (!ALLOWED_KEYS.has(key)) {
    return res.status(400).json({ error: `Key "${key}" is not configurable` });
  }
  try {
    await db.query('DELETE FROM settings WHERE key = $1', [key]);
    delete process.env[key];
    res.status(204).send();
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
