'use strict';

const express = require('express');
const router = express.Router();
const db = require('../db');
const { runProforma, meetsGoals } = require('../proforma');

// GET /api/properties
router.get('/', async (req, res) => {
  try {
    const { areaId, qualifiesOnly, sortBy = 'perFamilyNetCost', limit = 50, offset = 0, source } = req.query;

    let where = [];
    const params = [];

    if (areaId) {
      params.push(areaId);
      where.push(`area_id = $${params.length}`);
    }
    if (qualifiesOnly === 'true') {
      where.push('qualifies = TRUE');
    }
    if (source) {
      params.push(source);
      where.push(`source = $${params.length}`);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(' AND ')}` : '';

    // Sort mapping
    const sortMap = {
      perFamilyNetCost: "(proforma->>'perFamilyNetCost')::numeric",
      capRate: "(proforma->>'capRate')::numeric DESC",
      price: 'purchase_price',
      daysOnMarket: 'days_on_market',
    };
    const orderBy = sortMap[sortBy] || sortMap.perFamilyNetCost;

    params.push(parseInt(limit, 10), parseInt(offset, 10));

    const result = await db.query(
      `SELECT id, area_id, source, address, purchase_price, beds, baths, sqft,
              listing_url, hoa_monthly, days_on_market, price_reduced,
              str_nightly_rate, str_occupancy, str_source,
              qualifies, proforma, listing_data, first_seen, last_seen
       FROM listings
       ${whereClause}
       ORDER BY ${orderBy} NULLS LAST
       LIMIT $${params.length - 1} OFFSET $${params.length}`,
      params
    );

    const countResult = await db.query(
      `SELECT COUNT(*) FROM listings ${whereClause}`,
      params.slice(0, -2)
    );

    // Flag listings seen for first time in the latest run
    const latestRunRes = await db.query('SELECT id FROM runs ORDER BY id DESC LIMIT 1');
    const latestRunDate = latestRunRes.rows[0]
      ? await db.query('SELECT run_date FROM runs ORDER BY id DESC LIMIT 1')
      : null;

    res.json({
      total: parseInt(countResult.rows[0].count, 10),
      listings: result.rows.map(row => ({
        ...row,
        isNew: row.first_seen && row.last_seen &&
          Math.abs(new Date(row.first_seen) - new Date(row.last_seen)) < 60000,
      })),
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

// GET /api/properties/:id
router.get('/:id', async (req, res) => {
  try {
    const result = await db.query(
      'SELECT *, listing_data FROM listings WHERE id = $1',
      [req.params.id]
    );
    if (!result.rows.length) return res.status(404).json({ error: 'Not found' });

    const row = result.rows[0];

    // Recalculate proforma with latest goals and area config
    const goalsRes = await db.query('SELECT data FROM goals ORDER BY id DESC LIMIT 1');
    const goals = goalsRes.rows[0]?.data;
    const areaRes = await db.query('SELECT data FROM markets WHERE id = $1', [row.area_id]);
    const area = areaRes.rows[0]?.data ? { id: row.area_id, ...areaRes.rows[0].data } : null;

    let proforma = row.proforma;
    if (goals && area && row.listing_data) {
      try {
        const listing = { ...row.listing_data, hoaMonthly: row.hoa_monthly, strNightlyRate: row.str_nightly_rate, strOccupancy: row.str_occupancy, strSource: row.str_source };
        proforma = runProforma(listing, area, goals);
      } catch (e) {
        // Use stored proforma
      }
    }

    res.json({ ...row, proforma });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
});

module.exports = router;
