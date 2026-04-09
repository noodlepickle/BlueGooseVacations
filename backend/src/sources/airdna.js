'use strict';

const axios = require('axios');

function isEnabled() { return !!process.env.AIRDNA_API_KEY; }

/**
 * Fetch AirDNA market summary for a zip code.
 * Returns { avgNightlyRate, avgOccupancy, avgAnnualRevenue, marketScore } or null.
 * Automatically active when AIRDNA_API_KEY is set.
 */
async function fetchMarketData(zipCode) {
  if (!isEnabled()) {
    console.log('[airdna] Not configured — set AIRDNA_API_KEY to enable');
    return null;
  }

  try {
    const resp = await axios.get('https://api.airdna.co/v1/market/summary', {
      params: { zipcode: zipCode },
      headers: { 'Authorization': `Bearer ${process.env.AIRDNA_API_KEY}` },
      timeout: 10000,
    });

    const d = resp.data?.data || resp.data || {};
    return {
      avgNightlyRate: d.avg_nightly_rate || d.adr || null,
      avgOccupancy: d.avg_occupancy || d.occupancy_rate || null,
      avgAnnualRevenue: d.avg_annual_revenue || d.annual_revenue || null,
      marketScore: d.market_score || d.score || null,
      source: 'airdna',
    };
  } catch (err) {
    console.error(`[airdna] Error fetching zip ${zipCode}:`, err.message);
    return null;
  }
}

module.exports = { fetchMarketData, get enabled() { return isEnabled(); } };
