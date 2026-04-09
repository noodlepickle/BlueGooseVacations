'use strict';

const axios = require('axios');

const HOST = 'zillow-com1.p.rapidapi.com';
function isEnabled() { return !!process.env.RAPIDAPI_KEY; }

// Map our internal property type names to Zillow's expected values
const TYPE_MAP = {
  SingleFamily: 'Houses',
  Townhouse: 'Townhomes',
  Condo: 'Condos',
  MultiFamily: 'Multi-family',
};

function mapTypes(types) {
  return (types || []).map(t => TYPE_MAP[t] || t).join(',');
}

function normalize(hit, areaId) {
  const info = hit.hdpData?.homeInfo || {};
  return {
    id: `zillow:${hit.zpid || info.zpid || hit.listingId}`,
    source: 'zillow',
    address: hit.address || info.streetAddress || '',
    city: info.city || '',
    state: info.state || '',
    zipCode: info.zipcode || '',
    purchasePrice: hit.price || info.price || 0,
    beds: hit.bedrooms || info.bedrooms || 0,
    baths: hit.bathrooms || info.bathrooms || 0,
    sqft: hit.livingArea || info.livingArea || null,
    yearBuilt: hit.yearBuilt || info.yearBuilt || null,
    propertyType: hit.homeType || info.homeType || '',
    hoaMonthly: info.hoaFee || null,
    daysOnMarket: hit.daysOnMarket || null,
    priceReduced: !!(hit.priceReduction || info.priceReduction),
    listingUrl: hit.detailUrl
      ? `https://www.zillow.com${hit.detailUrl}`
      : `https://www.zillow.com/homes/${hit.zpid || info.zpid}_zpid/`,
    fetchedAt: new Date().toISOString(),
    areaId,
    strNightlyRate: null,
    strOccupancy: null,
    strSource: null,
  };
}

async function fetchListings(area, maxResults = 40) {
  if (!isEnabled()) {
    console.log('[zillow] Disabled — set RAPIDAPI_KEY to enable');
    return [];
  }

  const results = [];

  try {
    const resp = await axios.get(`https://${HOST}/propertyExtendedSearch`, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': HOST,
      },
      params: {
        location: area.location || area.label,
        home_type: mapTypes(area.propertyTypes),
        minPrice: area.priceMin,
        maxPrice: area.priceMax,
        bedsMin: area.bedsMin,
        bedsMax: area.bedsMax,
        status_type: 'ForSale',
        sort: 'Newest',
      },
      timeout: 15000,
    });

    const props = resp.data?.props || [];
    for (const p of props) {
      const listing = normalize(p, area.id);
      if (listing.purchasePrice > 0) results.push(listing);
      if (results.length >= maxResults) break;
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 404) {
      console.log(`[zillow] No results for ${area.id}`);
    } else if (status === 429) {
      console.warn(`[zillow] Rate limited on ${area.id} — try again later or upgrade your RapidAPI plan`);
    } else {
      console.error(`[zillow] Error fetching ${area.id}:`, err.response?.data?.message || err.message);
    }
  }

  console.log(`[zillow] Fetched ${results.length} listings for ${area.id}`);
  return results;
}

module.exports = { fetchListings, get enabled() { return isEnabled(); } };
