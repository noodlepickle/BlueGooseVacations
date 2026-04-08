'use strict';

const { runProforma, meetsGoals } = require('./proforma');

/**
 * Score a qualifying property (higher = better).
 * Rewards: lower annual cost, higher cap rate, more personal weeks, lower cost/week.
 */
function score(proforma) {
  // Normalize each dimension to 0-25 range
  const costScore = Math.max(0, 25 - Math.abs(Math.min(proforma.perFamilyNetCost, 0)) / 1000);
  const capScore = Math.min(25, proforma.capRate * 5);
  const weeksScore = Math.min(25, proforma.personalWeeksPerFamily * 2.5);
  const cpwScore = Math.max(0, 25 - proforma.costPerPersonalWeek / 200);
  return costScore + capScore + weeksScore + cpwScore;
}

/**
 * screenListings(listings, area, goals, latestRunListingIds)
 *
 * Runs proforma on each listing, applies goal filters, scores and ranks.
 * Qualifying properties first, then sorted by composite score descending.
 * latestRunListingIds: Set of IDs from the previous run (to flag new listings).
 */
function screenListings(listings, area, goals, latestRunListingIds = new Set()) {
  const results = listings.map((listing) => {
    const proforma = runProforma(listing, area, goals);
    const { qualifies, issues } = meetsGoals(proforma, goals);
    const s = qualifies ? score(proforma) : 0;
    const isNew = !latestRunListingIds.has(listing.id);
    return { listing, proforma, qualifies, issues, score: s, isNew };
  });

  // Qualifying first (by score desc), then non-qualifying (by score desc)
  const qualifying = results.filter(r => r.qualifies).sort((a, b) => b.score - a.score);
  const failing = results.filter(r => !r.qualifies).sort((a, b) => b.score - a.score);

  return [...qualifying, ...failing];
}

module.exports = { screenListings };
