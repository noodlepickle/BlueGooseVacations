'use strict';

const axios = require('axios');
const fs = require('fs');
const path = require('path');
const { parse } = require('csv-parse/sync');

const CACHE_DIR = process.env.INSIDEAIRBNB_CACHE_DIR || '/app/data/insideairbnb';
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000; // 1 week

// Map area location keywords to Inside Airbnb city slugs + CSV URLs
// These are known stable dataset paths from insideairbnb.com
const MARKET_MAP = {
  'destin': { city: 'destin', url: null }, // may not exist, skip gracefully
  '30a': { city: 'destin', url: null },
  'gulf shores': { city: 'gulf-shores', url: null },
  'outer banks': { city: 'asheville', url: null }, // placeholder
  'hilton head': { city: 'hilton-head', url: null },
  // Add real URLs as they become available on insideairbnb.com
};

// Attempt to find a cached STR dataset for an area
function getCachePath(areaId) {
  return path.join(CACHE_DIR, `${areaId}.csv`);
}

function isCacheFresh(cachePath) {
  try {
    const stat = fs.statSync(cachePath);
    return Date.now() - stat.mtimeMs < CACHE_TTL_MS;
  } catch {
    return false;
  }
}

async function downloadDataset(url, cachePath) {
  const resp = await axios.get(url, { responseType: 'text', timeout: 30000 });
  fs.mkdirSync(path.dirname(cachePath), { recursive: true });
  fs.writeFileSync(cachePath, resp.data);
}

/**
 * Returns a map of { normalizedAddress -> { strNightlyRate, strOccupancy } }
 * derived from Inside Airbnb listings CSV for the given area.
 */
async function getStrComps(area) {
  const cachePath = getCachePath(area.id);
  const marketInfo = Object.entries(MARKET_MAP).find(([key]) =>
    (area.location || area.id).toLowerCase().includes(key)
  );

  if (!isCacheFresh(cachePath)) {
    if (marketInfo && marketInfo[1].url) {
      try {
        console.log(`[insideairbnb] Downloading dataset for ${area.id}...`);
        await downloadDataset(marketInfo[1].url, cachePath);
      } catch (err) {
        console.warn(`[insideairbnb] Download failed for ${area.id}: ${err.message}`);
        return {};
      }
    } else {
      console.log(`[insideairbnb] No dataset URL configured for ${area.id} — skipping enrichment`);
      return {};
    }
  }

  try {
    const csv = fs.readFileSync(cachePath, 'utf8');
    const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true });

    // Aggregate by neighborhood / zip to get avg nightly rate and occupancy
    const totals = {};
    const counts = {};
    for (const row of rows) {
      const zip = (row.zipcode || row.zip || '').trim();
      if (!zip || !area.zipCodes.includes(zip)) continue;
      const price = parseFloat((row.price || '').replace(/[$,]/g, '')) || 0;
      const occ = parseFloat(row.review_scores_value || row.occupancy_rate || '0') || 0;
      if (price > 0) {
        totals[zip] = (totals[zip] || 0) + price;
        counts[zip] = (counts[zip] || 0) + 1;
      }
    }

    // Return area-level averages
    const prices = Object.values(totals);
    const cnts = Object.values(counts);
    const totalCount = cnts.reduce((s, c) => s + c, 0);
    if (totalCount === 0) return {};

    const avgNightly = prices.reduce((s, t, i) => s + t, 0) / totalCount;
    return { avgNightlyRate: avgNightly, avgOccupancy: null, source: 'insideairbnb' };
  } catch (err) {
    console.warn(`[insideairbnb] Parse error for ${area.id}: ${err.message}`);
    return {};
  }
}

/**
 * Enrich a listing with STR comps from Inside Airbnb.
 * Returns listing with strNightlyRate / strOccupancy / strSource set if available.
 */
async function enrichListing(listing, areaComps) {
  if (areaComps.avgNightlyRate) {
    return {
      ...listing,
      strNightlyRate: listing.strNightlyRate ?? areaComps.avgNightlyRate,
      strOccupancy: listing.strOccupancy ?? areaComps.avgOccupancy,
      strSource: listing.strSource ?? 'insideairbnb',
    };
  }
  return listing;
}

module.exports = { getStrComps, enrichListing, enabled: true };
