'use strict';

const axios = require('axios');

const HOST = 'realtor-com4.p.rapidapi.com';
function isEnabled() { return !!process.env.RAPIDAPI_KEY; }

function normalize(hit, areaId) {
  const loc = hit.location?.address || {};
  const desc = hit.description || {};
  return {
    id: `realtor:${hit.property_id || hit.listing_id}`,
    source: 'realtor',
    address: [loc.line, loc.street_direction, loc.street_name, loc.street_suffix]
      .filter(Boolean).join(' ') || loc.line || '',
    city: loc.city || '',
    state: loc.state_code || '',
    zipCode: loc.postal_code || '',
    purchasePrice: hit.list_price || 0,
    beds: desc.beds || 0,
    baths: desc.baths_consolidated || desc.baths || 0,
    sqft: desc.sqft || null,
    yearBuilt: desc.year_built || null,
    propertyType: desc.type || '',
    hoaMonthly: hit.hoa?.fee || null,
    daysOnMarket: hit.list_date
      ? Math.floor((Date.now() - new Date(hit.list_date)) / 86400000)
      : null,
    priceReduced: !!(hit.price_reduces?.length),
    listingUrl: hit.href || `https://www.realtor.com/realestateandhomes-detail/${hit.property_id}`,
    fetchedAt: new Date().toISOString(),
    areaId,
    strNightlyRate: null,
    strOccupancy: null,
    strSource: null,
  };
}

async function fetchListings(area, maxResults = 40) {
  if (!isEnabled()) {
    console.log('[realtor] Disabled — set RAPIDAPI_KEY to enable');
    return [];
  }

  const results = [];
  try {
    const resp = await axios.get(`https://${HOST}/for-sale/search`, {
      headers: {
        'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
        'X-RapidAPI-Host': HOST,
      },
      params: {
        location: area.location,
        beds_min: area.bedsMin,
        beds_max: area.bedsMax,
        price_min: area.priceMin,
        price_max: area.priceMax,
        limit: maxResults,
      },
    });

    const props = resp.data?.data?.results || resp.data?.results || [];
    for (const p of props) {
      const listing = normalize(p, area.id);
      if (listing.purchasePrice > 0) results.push(listing);
    }
  } catch (err) {
    const status = err.response?.status;
    if (status === 403) {
      console.warn(`[realtor] 403 Forbidden on ${area.id} — your RapidAPI key may not be subscribed to realtor-com4. Check rapidapi.com/dashboard.`);
    } else if (status === 429) {
      console.warn(`[realtor] Rate limited on ${area.id}`);
    } else {
      console.error(`[realtor] Error fetching ${area.id}:`, err.response?.data?.message || err.message);
    }
  }

  console.log(`[realtor] Fetched ${results.length} listings for ${area.id}`);
  return results;
}

module.exports = { fetchListings, get enabled() { return isEnabled(); } };
