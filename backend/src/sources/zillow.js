'use strict';

const axios = require('axios');

const HOST = 'zillow-com1.p.rapidapi.com';
function isEnabled() { return !!process.env.RAPIDAPI_KEY; }

function sleep(ms) {
  return new Promise(r => setTimeout(r, ms));
}

function normalize(hit, areaId) {
  return {
    id: `zillow:${hit.zpid || hit.hdpData?.homeInfo?.zpid || hit.listingId}`,
    source: 'zillow',
    address: hit.address || hit.hdpData?.homeInfo?.streetAddress || '',
    city: hit.hdpData?.homeInfo?.city || '',
    state: hit.hdpData?.homeInfo?.state || '',
    zipCode: hit.hdpData?.homeInfo?.zipcode || '',
    purchasePrice: hit.price || hit.hdpData?.homeInfo?.price || 0,
    beds: hit.bedrooms || hit.hdpData?.homeInfo?.bedrooms || 0,
    baths: hit.bathrooms || hit.hdpData?.homeInfo?.bathrooms || 0,
    sqft: hit.livingArea || hit.hdpData?.homeInfo?.livingArea || null,
    yearBuilt: hit.yearBuilt || hit.hdpData?.homeInfo?.yearBuilt || null,
    propertyType: hit.homeType || hit.hdpData?.homeInfo?.homeType || '',
    hoaMonthly: hit.hdpData?.homeInfo?.hoaFee || null,
    daysOnMarket: hit.daysOnMarket || null,
    priceReduced: !!(hit.priceReduction || hit.hdpData?.homeInfo?.priceReduction),
    listingUrl: hit.detailUrl
      ? `https://www.zillow.com${hit.detailUrl}`
      : `https://www.zillow.com/homes/${hit.zpid}_zpid/`,
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
  for (const zip of area.zipCodes) {
    try {
      const resp = await axios.get(`https://${HOST}/propertyExtendedSearch`, {
        headers: {
          'X-RapidAPI-Key': process.env.RAPIDAPI_KEY,
          'X-RapidAPI-Host': HOST,
        },
        params: {
          location: zip,
          home_type: (area.propertyTypes || []).join(','),
          minPrice: area.priceMin,
          maxPrice: area.priceMax,
          bedsMin: area.bedsMin,
          bedsMax: area.bedsMax,
        },
      });

      const props = resp.data?.props || [];
      for (const p of props) {
        const listing = normalize(p, area.id);
        if (listing.purchasePrice > 0) results.push(listing);
        if (results.length >= maxResults) break;
      }
    } catch (err) {
      console.error(`[zillow] Error fetching zip ${zip}:`, err.message);
    }

    if (area.zipCodes.indexOf(zip) < area.zipCodes.length - 1) {
      await sleep(300);
    }
  }

  console.log(`[zillow] Fetched ${results.length} listings for ${area.id}`);
  return results;
}

module.exports = { fetchListings, get enabled() { return isEnabled(); } };
