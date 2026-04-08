'use strict';

const db = require('./db');
const { fetchAllSources } = require('./sources');
const { screenListings } = require('./screener');
const { buildDigest, sendEmail, writeToNotion } = require('./reporter');

const DRY_RUN = process.argv.includes('--dry-run');

/**
 * Full screening run for all active markets.
 */
async function runScreener() {
  console.log(`\n=== Screener run started at ${new Date().toISOString()} ===`);
  if (DRY_RUN) console.log('[scheduler] DRY RUN — no DB writes or emails');

  // Load goals and active markets
  const goalsRes = await db.query('SELECT data FROM goals ORDER BY id DESC LIMIT 1');
  const goals = goalsRes.rows[0]?.data;
  if (!goals) throw new Error('No goals configured');

  const marketsRes = await db.query('SELECT id, data FROM markets WHERE active = TRUE');
  const markets = marketsRes.rows;

  // Load previous run listing IDs for "new" flagging
  const prevRunRes = await db.query('SELECT id FROM listings WHERE last_seen = first_seen');
  const prevIds = new Set(prevRunRes.rows.map(r => r.id));

  const allAreaResults = [];
  let totalProps = 0;
  let totalQualifying = 0;
  const runDate = new Date().toISOString().split('T')[0];

  for (const market of markets) {
    const area = { id: market.id, ...market.data };
    console.log(`\n--- Fetching ${area.label} ---`);

    try {
      const listings = await fetchAllSources(area, 50);
      const results = screenListings(listings, area, goals, prevIds);

      const qualifying = results.filter(r => r.qualifies);
      totalProps += results.length;
      totalQualifying += qualifying.length;

      allAreaResults.push({ area, results });

      if (!DRY_RUN) {
        // Upsert listings to DB
        for (const { listing, proforma, qualifies } of results) {
          await db.query(
            `INSERT INTO listings (
              id, area_id, source, address, purchase_price, beds, baths, sqft,
              listing_url, hoa_monthly, days_on_market, price_reduced,
              str_nightly_rate, str_occupancy, str_source, qualifies, proforma,
              listing_data, last_seen
            ) VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10,$11,$12,$13,$14,$15,$16,$17,$18,NOW())
            ON CONFLICT (id) DO UPDATE SET
              qualifies = EXCLUDED.qualifies,
              proforma = EXCLUDED.proforma,
              listing_data = EXCLUDED.listing_data,
              str_nightly_rate = EXCLUDED.str_nightly_rate,
              str_occupancy = EXCLUDED.str_occupancy,
              str_source = EXCLUDED.str_source,
              days_on_market = EXCLUDED.days_on_market,
              price_reduced = EXCLUDED.price_reduced,
              last_seen = NOW()`,
            [
              listing.id, listing.areaId, listing.source, listing.address,
              listing.purchasePrice, listing.beds, listing.baths, listing.sqft,
              listing.listingUrl, listing.hoaMonthly, listing.daysOnMarket,
              listing.priceReduced, listing.strNightlyRate, listing.strOccupancy,
              listing.strSource, qualifies, JSON.stringify(proforma),
              JSON.stringify(listing),
            ]
          );
        }
      }

      console.log(`[scheduler] ${area.label}: ${results.length} props, ${qualifying.length} qualifying`);
    } catch (err) {
      console.error(`[scheduler] Error processing ${area.label}:`, err.message);
    }
  }

  // Build digest
  const digest = buildDigest(allAreaResults, goals, runDate);
  console.log('\n--- Digest ---\n');
  console.log(digest);

  if (!DRY_RUN) {
    // Save run record
    const areasSummary = allAreaResults.map(({ area, results }) => ({
      id: area.id,
      label: area.label,
      total: results.length,
      qualifying: results.filter(r => r.qualifies).length,
    }));

    await db.query(
      `INSERT INTO runs (run_date, total_props, qualifying, areas, digest_md)
       VALUES (NOW(), $1, $2, $3, $4)`,
      [totalProps, totalQualifying, JSON.stringify(areasSummary), digest]
    );

    await sendEmail(digest, runDate);
    await writeToNotion(digest, allAreaResults, runDate);
  }

  console.log(`\n=== Run complete: ${totalProps} total, ${totalQualifying} qualifying ===\n`);
  return { totalProps, totalQualifying, allAreaResults, digest };
}

// If run directly (not required as module)
if (require.main === module) {
  runScreener()
    .then(() => process.exit(0))
    .catch(err => {
      console.error('Screener run failed:', err);
      process.exit(1);
    });
}

module.exports = { runScreener };
