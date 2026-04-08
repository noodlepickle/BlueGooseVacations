'use strict';

const axios = require('axios');
const { parse } = require('csv-parse/sync');

// Rough lat/lng centers for common beach zip codes — fallback bounding boxes
const ZIP_COORDS = {
  '32459': [30.395, -86.195],
  '32461': [30.28, -85.96],
  '32550': [30.40, -86.47],
  '36542': [30.29, -87.70],
  '36561': [30.27, -87.57],
  '27959': [35.56, -75.47],
  '27948': [35.90, -75.61],
  '27949': [36.07, -75.71],
  '27982': [35.57, -75.46],
  '27981': [35.67, -75.53],
  '29928': [32.15, -80.73],
  '29926': [32.22, -80.80],
};
const DELTA = 0.15; // ~10 mile bounding box half-width

function zipToBbox(zip) {
  const coords = ZIP_COORDS[zip];
  if (!coords) return null;
  const [lat, lng] = coords;
  return {
    al: lat - DELTA,
    ab: lat + DELTA,
    xl: lng - DELTA,
    xr: lng + DELTA,
  };
}

function normalize(row, areaId) {
  const price = parseFloat((row['PRICE'] || '').replace(/[$,]/g, '')) || 0;
  return {
    id: `redfin:${row['MLS#'] || row['ADDRESS'] + price}`,
    source: 'redfin',
    address: row['ADDRESS'] || '',
    city: row['CITY'] || '',
    state: row['STATE OR PROVINCE'] || '',
    zipCode: row['ZIP OR POSTAL CODE'] || '',
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

async function fetchListings(area, maxResults = 40) {
  const results = [];

  for (const zip of area.zipCodes) {
    const bbox = zipToBbox(zip);
    if (!bbox) {
      console.warn(`[redfin] No bbox for zip ${zip}, skipping`);
      continue;
    }

    try {
      const resp = await axios.get('https://www.redfin.com/stingray/api/gis-csv', {
        params: {
          al: bbox.al,
          ab: bbox.ab,
          xl: bbox.xl,
          xr: bbox.xr,
          market: 'miami', // required param, value doesn't restrict results
          num_homes: maxResults,
          uipt: '1,2,3', // single family, condo, townhouse
          status: 1,
        },
        headers: {
          'User-Agent': 'Mozilla/5.0 (compatible; VRScreener/1.0)',
          'Accept': 'text/csv',
        },
        responseType: 'text',
        timeout: 15000,
      });

      const rows = parse(resp.data, { columns: true, skip_empty_lines: true, relax_quotes: true });
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
      console.error(`[redfin] Error fetching zip ${zip}:`, err.message);
    }
  }

  console.log(`[redfin] Fetched ${results.length} listings for ${area.id}`);
  return results;
}

module.exports = { fetchListings, enabled: true };
