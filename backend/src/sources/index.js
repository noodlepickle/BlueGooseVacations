'use strict';

const zillow = require('./zillow');
const realtor = require('./realtor');
const redfin = require('./redfin');
const insideairbnb = require('./insideairbnb');
const rabbu = require('./rabbu');
const airdna = require('./airdna');

/**
 * Deduplicate listings by address+price fingerprint.
 * Keeps the first occurrence (prefer more authoritative sources).
 */
function deduplicate(listings) {
  const seen = new Set();
  return listings.filter(l => {
    const key = `${l.address.toLowerCase().replace(/\s+/g, '')}:${l.purchasePrice}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

/**
 * Enrich listings with STR data from available sources.
 * Priority: AirDNA > Rabbu > Inside Airbnb.
 */
async function enrichWithStr(listings, area) {
  // Fetch area-level STR comps from Inside Airbnb
  const iabComps = await insideairbnb.getStrComps(area);

  // Fetch Rabbu market data for the area
  const rabbuData = await rabbu.fetchMarketData(area.label || area.location);

  // AirDNA per-zip enrichment if enabled
  const airdnaByZip = {};
  if (airdna.enabled) {
    await Promise.all(area.zipCodes.map(async (zip) => {
      const data = await airdna.fetchMarketData(zip);
      if (data) airdnaByZip[zip] = data;
    }));
  }

  return listings.map(listing => {
    // Already has STR data from a listing source, skip
    if (listing.strNightlyRate && listing.strOccupancy) return listing;

    // Try AirDNA first
    const airdnaData = airdnaByZip[listing.zipCode];
    if (airdnaData) {
      return {
        ...listing,
        strNightlyRate: listing.strNightlyRate ?? airdnaData.avgNightlyRate,
        strOccupancy: listing.strOccupancy ?? airdnaData.avgOccupancy,
        strSource: 'airdna',
      };
    }

    // Try Rabbu
    if (rabbuData) {
      return {
        ...listing,
        strNightlyRate: listing.strNightlyRate ?? rabbuData.avgNightlyRate,
        strOccupancy: listing.strOccupancy ?? rabbuData.avgOccupancy,
        strSource: listing.strSource ?? 'rabbu',
      };
    }

    // Fall back to Inside Airbnb
    if (iabComps.avgNightlyRate) {
      return {
        ...listing,
        strNightlyRate: listing.strNightlyRate ?? iabComps.avgNightlyRate,
        strOccupancy: listing.strOccupancy ?? iabComps.avgOccupancy,
        strSource: listing.strSource ?? 'insideairbnb',
      };
    }

    return listing;
  });
}

/**
 * Fetch all listings for an area from all enabled sources in parallel.
 * Returns deduplicated, STR-enriched array.
 */
async function fetchAllSources(area, maxResults = 40) {
  const sources = [
    { name: 'zillow', mod: zillow },
    { name: 'realtor', mod: realtor },
    { name: 'redfin', mod: redfin },
  ];

  const active = sources.filter(s => s.mod.enabled);
  const inactive = sources.filter(s => !s.mod.enabled);

  console.log(`[sources] Active for ${area.id}: ${active.map(s => s.name).join(', ')}`);
  if (inactive.length) {
    console.log(`[sources] Inactive (no key): ${inactive.map(s => s.name).join(', ')}`);
  }

  const results = await Promise.allSettled(
    active.map(s => s.mod.fetchListings(area, maxResults))
  );

  const all = [];
  results.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      all.push(...r.value);
    } else {
      console.error(`[sources] ${active[i].name} failed:`, r.reason?.message);
    }
  });

  const deduped = deduplicate(all);
  console.log(`[sources] ${area.id}: ${all.length} total → ${deduped.length} after dedup`);

  const enriched = await enrichWithStr(deduped, area);
  return enriched;
}

function getSourceStatus() {
  return [
    { name: 'zillow', enabled: zillow.enabled, note: zillow.enabled ? 'active' : 'requires RAPIDAPI_KEY' },
    { name: 'realtor', enabled: realtor.enabled, note: realtor.enabled ? 'active' : 'requires RAPIDAPI_KEY' },
    { name: 'redfin', enabled: redfin.enabled, note: redfin.enabled ? 'active' : 'disabled (set REDFIN_ENABLED=true to enable — API is unreliable)' },
    { name: 'insideairbnb', enabled: insideairbnb.enabled, note: 'always active (STR comps)' },
    { name: 'rabbu', enabled: rabbu.enabled, note: 'always active (STR market averages)' },
    { name: 'airdna', enabled: airdna.enabled, note: airdna.enabled ? 'active' : 'stubbed — set AIRDNA_API_KEY to enable' },
  ];
}

module.exports = { fetchAllSources, getSourceStatus };
