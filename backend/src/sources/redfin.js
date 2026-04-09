'use strict';

const axios = require('axios');
const { parse } = require('csv-parse/sync');

// Redfin region IDs for our target markets.
// To find a region ID: search on redfin.com, open DevTools Network tab,
// look for a request to /stingray/api/gis-csv and note the region_id param.
const REGION_MAP = {
  '32459': { region_id: '26493', region_type: 2 },  // Destin, FL
  '32461': { region_id: '26493', region_type: 2 },  // 30A area
  '32550': { region_id: '26493', region_type: 2 },  // Miramar Beach area
  '36542': { region_id: '14626', region_type: 2 },  // Gulf Shores, AL
  '36561': { region_id: '14626', region_type: 2 },  // Orange Beach, AL
  '27959': { region_id: '22218', region_type: 2 },  // Outer Banks, NC
  '27948': { region_id: '22218', region_type: 2 },  // Kitty Hawk, NC
  '27949': { region_id: '22218', region_type: 2 },  // Kill Devil Hills, NC
  '27982': { region_id: '22218', region_type: 2 },  // Manteo, NC
  '27981': { region_id: '22218', region_type: 2 },  // Wanchese, NC
  '29928': { region_id: '29098', region_type: 2 },  // Hilton Head Island, SC
  '29926': { region_id: '29098', region_type: 2 },  // Hilton Head Island, SC
};

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalize(row, areaId) {
  const price = parseFloat((row['PRICE'] || '').replace(/[$,]/g, '')) || 0;
  const address = row['ADDRESS'] || '';
  const city = row['CITY'] || '';
  const state = row['STATE OR PROVINCE'] || '';
  const zip = String(row['ZIP OR POSTAL CODE'] || '').trim();
  return {
    id: `redfin:${row['MLS#'] || (address + city + price).replace(/\s+/g, '')}`,
    source: 'redfin',
    address,
    city,
    state,
    zipCode: zip,
    purchasePrice: price,
    beds: parseInt(row['BEDS'] || '0', 10),
    baths: parseFloat(row['BATHS'] || '0'),
    sqft: parseInt((row['SQUARE FEET'] || '').replace(/,/g, ''), 10) || null,
    yearBuilt: parseInt(row['YEAR BUILT'] || '0', 10) || null,
    propertyType: row['PROPERTY TYPE'] || '',
    hoaMonthly: parseFloat(row['HOA/MONTH'] || '0') || null,
    daysOnMarket: parseInt(row['DAYS ON MARKET'] || '0', 10) || null,
    priceReduced: false,
    listingUrl: row['URL (SEE https://www.redfin.com/buy-a-home/comparative-market-analysis for info on pricing)'] || '',
    fetchedAt: new Date().toISOString(),
    areaId,
    strNightlyRate: null,
    strOccupancy: null,
    strSource: null,
  };
}

async function fetchForRegion(regionId, regionType, area, maxResults) {
  const resp = await axios.get('https://www.redfin.com/stingray/api/gis-csv', {
    params: {
      region_id: regionId,
      region_type: regionType,
      status: 9,           // active for sale
      uipt: '1,2,3,4',    // single family, condo, townhouse, multi-family
      min_price: area.priceMin,
      max_price: area.priceMax,
      min_beds: area.bedsMin,
      max_beds: area.bedsMax,
      num_homes: maxResults,
      v: 8,
    },
    headers: {
      'User-Agent': 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
      'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
      'Referer': 'https://www.redfin.com/',
    },
    responseType: 'text',
    timeout: 20000,
  });
  return resp.data;
}

async function fetchListings(area, maxResults = 40) {
  const results = [];

  // Find unique region IDs for this area's zip codes
  const seen = new Set();
  const regions = [];
  for (const zip of (area.zipCodes || [])) {
    const r = REGION_MAP[zip];
    if (r && !seen.has(r.region_id)) {
      seen.add(r.region_id);
      regions.push(r);
    }
  }

  if (regions.length === 0) {
    console.log(`[redfin] No region IDs mapped for ${area.id} — add zip codes to REGION_MAP in sources/redfin.js`);
    return [];
  }

  for (const { region_id, region_type } of regions) {
    try {
      const csv = await fetchForRegion(region_id, region_type, area, maxResults);
      const rows = parse(csv, { columns: true, skip_empty_lines: true, relax_quotes: true, from_line: 2 });

      for (const row of rows) {
        const listing = normalize(row, area.id);
        if (listing.purchasePrice >= (area.priceMin || 0) &&
            listing.purchasePrice <= (area.priceMax || Infinity) &&
            listing.beds >= (area.bedsMin || 0)) {
          results.push(listing);
        }
        if (results.length >= maxResults) break;
      }
    } catch (err) {
      const status = err.response?.status;
      if (status === 400 || status === 403) {
        console.warn(`[redfin] ${status} for region ${region_id} — Redfin may have changed their API. Check REGION_MAP in sources/redfin.js.`);
      } else {
        console.error(`[redfin] Error for region ${region_id}:`, err.message);
      }
    }

    if (regions.indexOf({ region_id, region_type }) < regions.length - 1) {
      await sleep(500);
    }
  }

  console.log(`[redfin] Fetched ${results.length} listings for ${area.id}`);
  return results;
}

// Redfin's stingray API has become unreliable — disabled by default.
// To re-enable: set REDFIN_ENABLED=true in .env or Settings.
function isEnabled() { return process.env.REDFIN_ENABLED === 'true'; }
module.exports = { fetchListings, get enabled() { return isEnabled(); } };
