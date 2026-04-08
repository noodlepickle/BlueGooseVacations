'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { runProforma, meetsGoals } = require('../proforma');

// GET /api/goals
router.get('/', async (req, res) => {
  try {
    const result = await db.query('SELECT data, updated_at FROM goals ORDER BY id DESC LIMIT 1');
    res.json(result.rows[0] || {});
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// PUT /api/goals — update goals and re-screen all existing listings
router.put('/', async (req, res) => {
  try {
    const goals = req.body;

    await db.query(
      'INSERT INTO goals (data, updated_at) VALUES ($1, NOW())',
      [JSON.stringify(goals)]
    );

    // Re-screen all existing listings
    const listings = await db.query(
      'SELECT id, area_id, listing_data, hoa_monthly, str_nightly_rate, str_occupancy, str_source FROM listings'
    );
    const markets = await db.query('SELECT id, data FROM markets');
    const areaMap = Object.fromEntries(markets.rows.map(m => [m.id, { id: m.id, ...m.data }]));

    let rescreened = 0;
    for (const row of listings.rows) {
      const area = areaMap[row.area_id];
      if (!area || !row.listing_data) continue;
      try {
        const listing = {
          ...row.listing_data,
          hoaMonthly: row.hoa_monthly,
          strNightlyRate: row.str_nightly_rate,
          strOccupancy: row.str_occupancy,
          strSource: row.str_source,
        };
        const proforma = runProforma(listing, area, goals);
        const { qualifies } = meetsGoals(proforma, goals);
        await db.query(
          'UPDATE listings SET proforma = $1, qualifies = $2 WHERE id = $3',
          [JSON.stringify(proforma), qualifies, row.id]
        );
        rescreened++;
      } catch (e) {
        // Skip individual errors
      }
    }

    res.json({ updated: true, rescreened });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
