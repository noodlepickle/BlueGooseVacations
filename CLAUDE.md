# BlueGooseVacations — Investment Screener

Full-stack vacation rental investment screening application for a two-family 50/50 LLC evaluating beach house purchases.

**Hero Metric:** Net Annual Cost to Own — what each family actually writes a check for each year after rental income offsets all expenses.

---

## Architecture Overview

```
Browser → Nginx :80
              ├── /api/*  → backend:3001 (Express)
              └── /*      → frontend:80 (React/Vite, built static)

backend:3001 → Postgres:5432
backend:3001 → Zillow RapidAPI (optional)
backend:3001 → Realtor.com RapidAPI (optional)
backend:3001 → Redfin public CSV API (always)
backend:3001 → Inside Airbnb CSV cache (always)
backend:3001 → Rabbu markets API (always)
backend:3001 → AirDNA API (optional)
backend:3001 → Resend (email, optional)
backend:3001 → Notion API (optional)
```

## Data Flow

1. Cron triggers `runScreener()` in `scheduler.js`
2. For each active market in the DB, `fetchAllSources(area)` runs all enabled listing sources in parallel
3. Results are merged and deduplicated by address+price fingerprint
4. STR enrichment: AirDNA (per zip) → Rabbu (per market) → Inside Airbnb (CSV cache)
5. `screenListings()` runs `runProforma()` on each listing, applies `meetsGoals()` filter, scores and ranks
6. Listings are upserted to DB with `first_seen` / `last_seen` tracking
7. `buildDigest()` generates markdown summary
8. Digest is saved to runs table, emailed via Resend, optionally written to Notion

---

## Financial Model (`backend/src/proforma.js`)

All formulas operate on annual USD. The 50/50 LLC split is applied at the end.

```
loanAmt           = purchasePrice × (1 - downPaymentPct/100)
monthlyMortgage   = loanAmt × (mr × (1+mr)^n) / ((1+mr)^n - 1)
                    where mr = interestRate/100/12, n = loanTermYears×12
annualMortgage    = monthlyMortgage × 12
totalCashIn       = downPayment + purchasePrice × 0.02   // 2% closing costs

rentedNights      = rentalWeeks × 7 × (occupancyRate/100)
grossRevenue      = rentedNights × nightlyRate
mgmtFee           = grossRevenue × mgmtPct/100
platformFees      = grossRevenue × 0.03
propertyTax       = purchasePrice × propertyTaxRate/100
annualHOA         = hoaMonthly × 12
totalOpEx         = mgmtFee + platformFees + propertyTax + insurance + annualHOA + maintenance + utilities

NOI               = grossRevenue - totalOpEx
cashFlow          = NOI - annualMortgage
capRate           = NOI / purchasePrice × 100
cocReturn         = cashFlow / totalCashIn × 100

perFamilyNetCost      = cashFlow / 2                ← HERO METRIC
perFamilyCashIn       = totalCashIn / 2
personalWeeksPerFamily = (52 - rentalWeeks) / 2
costPerPersonalWeek   = |min(perFamilyNetCost, 0)| / personalWeeksPerFamily
```

**STR data priority:** listing enrichment (from source) → AirDNA → Rabbu → Inside Airbnb → area config defaults.

---

## Screening Logic (`backend/src/screener.js`)

A property **fails** if ANY of:
- `purchasePrice > goals.maxPurchasePrice`
- `|perFamilyNetCost| > goals.maxNetCostPerFamily` (when net cost is negative)
- `personalWeeksPerFamily < goals.minPersonalWeeksPerFamily`

**Score** (higher = better, qualifying only):
- Cost score: `25 - |min(perFamilyNetCost,0)| / 1000`
- Cap rate score: `capRate × 5` (capped at 25)
- Weeks score: `personalWeeksPerFamily × 2.5` (capped at 25)
- Cost-per-week score: `25 - costPerPersonalWeek / 200`

Results are sorted: qualifying (score desc) first, then failing (score desc).

---

## Source Abstraction (`backend/src/sources/`)

Each source module exports:
```js
{ fetchListings(area, maxResults): Promise<Listing[]>, enabled: boolean }
```

`sources/index.js` orchestrates:
- Runs all enabled listing sources in parallel
- Deduplicates by `address.toLowerCase().replace(/\s+/g,'') + ':' + price`
- Enriches with STR data from InsideAirbnb, Rabbu, AirDNA

### Adding a New Source

1. Create `backend/src/sources/mynewsource.js` exporting `{ fetchListings, enabled }`
2. Normalize to the listing schema (see below)
3. Import and add to the `sources` array in `sources/index.js`

### Listing Schema
```js
{
  id: string,            // "source:uniqueid"
  source: string,
  address, city, state, zipCode: string,
  purchasePrice: number,
  beds: number, baths: number,
  sqft: number | null, yearBuilt: number | null,
  propertyType: string,
  hoaMonthly: number | null,
  daysOnMarket: number | null,
  priceReduced: boolean,
  listingUrl: string,
  fetchedAt: string,     // ISO timestamp
  areaId: string,
  strNightlyRate: number | null,
  strOccupancy: number | null,
  strSource: string | null,
}
```

---

## API Routes

All prefixed `/api`. CORS enabled.

| Method | Path | Description |
|--------|------|-------------|
| GET | `/api/properties` | List properties. Query: `areaId`, `qualifiesOnly`, `sortBy`, `limit`, `offset`, `source` |
| GET | `/api/properties/:id` | Single listing with recalculated proforma |
| GET | `/api/markets` | All search areas |
| POST | `/api/markets` | Add area (body includes `id` field) |
| PUT | `/api/markets/:id` | Update area |
| DELETE | `/api/markets/:id` | Remove area |
| GET | `/api/goals` | Current goals |
| PUT | `/api/goals` | Update goals + re-screen all listings |
| POST | `/api/runs/trigger` | Trigger immediate run (async) |
| GET | `/api/runs` | Run history (last 50) |
| GET | `/api/runs/:id` | Single run with digest |
| GET | `/api/runs/latest/digest` | Most recent digest markdown |
| GET | `/api/sources/status` | Which sources are active |
| GET | `/api/health` | Health check |

---

## Database Schema

```sql
goals         -- JSONB blob of financing + screening goals
markets       -- active search areas with all assumptions
listings      -- upserted properties with proforma JSONB, first_seen/last_seen
str_market_cache -- 24h cache for Rabbu market data
runs          -- run history with markdown digest
```

Migrations run automatically on first Postgres startup via `docker-entrypoint-initdb.d`.

---

## Frontend Pages

| Page | Route | Description |
|------|-------|-------------|
| Dashboard | `/` | Property grid with filter/sort bar, summary stats, Run Now button |
| Pro Forma Builder | `/proforma` `/proforma/:id` | Two-panel: sliders left, hero metrics + P&L right. Pre-populates from listing. |
| Market Config | `/markets` | CRUD table for search areas |
| Goals Editor | `/goals` | Three goal sliders + financing inputs. Live qualifying count updates as sliders move. |
| Run History | `/runs` | Past runs table; click row → markdown digest in modal |

Color coding throughout:
- Green: qualifying / positive cash flow
- Yellow: near-miss (fails 1 goal)
- Red: failing

---

## Docker Commands

```bash
# First time setup
cp .env.example .env
# Edit .env and set POSTGRES_PASSWORD=devpassword (and any API keys)

# Build and start
docker-compose up -d --build

# View logs
docker-compose logs -f backend
docker-compose logs -f frontend

# Trigger a dry run (no DB writes, no email)
docker-compose exec backend node src/scheduler.js --dry-run

# Check backend health
curl http://localhost:3001/api/health

# Check source status
curl http://localhost:3001/api/sources/status

# Trigger a live run via API
curl -X POST http://localhost:3001/api/runs/trigger

# Stop everything
docker-compose down

# Nuke DB and start fresh
docker-compose down -v
```

---

## Adding a New Market

Via API:
```bash
curl -X POST http://localhost:3001/api/markets \
  -H 'Content-Type: application/json' \
  -d '{
    "id": "my-market-id",
    "label": "My Beach Market",
    "location": "City, State",
    "zipCodes": ["12345", "67890"],
    "bedsMin": 3, "bedsMax": 5,
    "priceMin": 400000, "priceMax": 1200000,
    "propertyTypes": ["SingleFamily"],
    "nightlyRate": 400,
    "rentalWeeks": 24,
    "occupancyRate": 68,
    "mgmtPct": 25,
    "propertyTaxRate": 0.55,
    "insurance": 8000,
    "hoaMonthly": 0,
    "maintenance": 5500,
    "utilities": 5000
  }'
```

Or use the Markets page in the UI.

---

## Adding a New Frontend Page

1. Create `frontend/src/pages/MyPage.jsx`
2. Add route in `frontend/src/App.jsx`: `<Route path="/mypage" element={<MyPage />} />`
3. Add nav link in the `<nav>` in `App.jsx`

---

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `POSTGRES_PASSWORD` | Yes | Postgres password |
| `RAPIDAPI_KEY` | No | Enables Zillow + Realtor.com sources |
| `RESEND_API_KEY` | No | Email digest via Resend |
| `DIGEST_FROM` | No | Sender email (must be verified in Resend) |
| `DIGEST_TO` | No | Comma-separated recipients |
| `NOTION_TOKEN` | No | Notion integration token |
| `NOTION_DATABASE_ID` | No | Notion database to write run pages |
| `AIRDNA_API_KEY` | No | AirDNA — activates automatically when set |
| `SCREENER_CRON` | No | Cron expression (default: `0 6 * * *`) |

---

## Common Debugging

**Backend won't start:**
- Check `docker-compose logs backend` — usually a DB connection issue
- Verify `POSTGRES_PASSWORD` matches in `.env`
- Wait for Postgres healthcheck to pass (up to 30s on first boot)

**No listings showing:**
- Check `GET /api/sources/status` — at least Redfin should be active
- Trigger a run: `POST /api/runs/trigger`
- Check backend logs for source errors

**Redfin returns no results:**
- The zip-to-bbox mapping in `sources/redfin.js` may need updating
- Add the zip code to `ZIP_COORDS` with correct lat/lng

**STR data showing as null:**
- Without API keys, STR data falls back to area config defaults
- Enable AirDNA (`AIRDNA_API_KEY`) or check Rabbu connectivity

**Email not sending:**
- Verify `RESEND_API_KEY`, `DIGEST_FROM`, `DIGEST_TO` in `.env`
- `DIGEST_FROM` domain must be verified in Resend dashboard
