'use strict';

const axios = require('axios');
const db = require('../db');

const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

/**
 * Fetch STR market averages from Rabbu for a given market name.
 * Caches results in the str_market_cache table for 24 hours.
 */
async function fetchMarketData(marketName) {
  const key = `rabbu:${marketName.toLowerCase().replace(/\s+/g, '-')}`;

  // Check cache
  try {
    const cached = await db.query(
      'SELECT data, cached_at FROM str_market_cache WHERE market_key = $1',
      [key]
    );
    if (cached.rows.length > 0) {
      const age = Date.now() - new Date(cached.rows[0].cached_at).getTime();
      if (age < CACHE_TTL_MS) {
        console.log(`[rabbu] Cache hit for ${marketName}`);
        return cached.rows[0].data;
      }
    }
  } catch (err) {
    console.warn('[rabbu] Cache read error:', err.message);
  }

  // Fetch from Rabbu
  try {
    const resp = await axios.get('https://rabbu.com/api/markets', {
      params: { q: marketName },
      headers: { 'User-Agent': 'Mozilla/5.0 (compatible; VRScreener/1.0)' },
      timeout: 10000,
    });

    const markets = resp.data?.markets || resp.data?.results || resp.data || [];
    const match = Array.isArray(markets)
      ? markets.find(m => (m.name || '').toLowerCase().includes(marketName.toLowerCase()))
      : null;

    if (!match) {
      console.warn(`[rabbu] No match found for "${marketName}"`);
      return null;
    }

    const data = {
      avgNightlyRate: match.avg_nightly_rate || match.nightlyRate || null,
      avgOccupancy: match.avg_occupancy || match.occupancy || null,
      source: 'rabbu',
    };

    // Upsert cache
    await db.query(
      `INSERT INTO str_market_cache (market_key, source, data, cached_at)
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT (market_key) DO UPDATE SET data = $3, cached_at = NOW()`,
      [key, 'rabbu', JSON.stringify(data)]
    );

    console.log(`[rabbu] Fetched data for ${marketName}: nightly $${data.avgNightlyRate}, occ ${data.avgOccupancy}%`);
    return data;
  } catch (err) {
    console.warn(`[rabbu] Fetch error for ${marketName}: ${err.message}`);
    return null;
  }
}

module.exports = { fetchMarketData, enabled: true };
