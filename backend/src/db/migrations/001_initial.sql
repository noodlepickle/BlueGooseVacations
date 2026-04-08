CREATE TABLE IF NOT EXISTS goals (
  id SERIAL PRIMARY KEY,
  data JSONB NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS markets (
  id TEXT PRIMARY KEY,
  data JSONB NOT NULL,
  active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS listings (
  id TEXT PRIMARY KEY,
  area_id TEXT REFERENCES markets(id),
  source TEXT,
  address TEXT,
  purchase_price NUMERIC,
  beds INT,
  baths NUMERIC,
  sqft INT,
  listing_url TEXT,
  hoa_monthly NUMERIC,
  days_on_market INT,
  price_reduced BOOLEAN DEFAULT FALSE,
  str_nightly_rate NUMERIC,
  str_occupancy NUMERIC,
  str_source TEXT,
  qualifies BOOLEAN,
  proforma JSONB,
  listing_data JSONB,
  first_seen TIMESTAMPTZ DEFAULT NOW(),
  last_seen TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS str_market_cache (
  market_key TEXT PRIMARY KEY,
  source TEXT,
  data JSONB,
  cached_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS runs (
  id SERIAL PRIMARY KEY,
  run_date TIMESTAMPTZ DEFAULT NOW(),
  total_props INT,
  qualifying INT,
  areas JSONB,
  digest_md TEXT
);

INSERT INTO goals (data) VALUES ('{
  "maxPurchasePrice": 1200000,
  "maxNetCostPerFamily": 15000,
  "minPersonalWeeksPerFamily": 6,
  "downPaymentPct": 25,
  "interestRate": 7.5,
  "loanTermYears": 30
}') ON CONFLICT DO NOTHING;

INSERT INTO markets (id, data) VALUES
('30a-fl', '{"label":"30A / Destin, FL","location":"30A, FL","zipCodes":["32459","32461","32550"],"bedsMin":3,"bedsMax":5,"priceMin":400000,"priceMax":1300000,"propertyTypes":["SingleFamily","Townhouse"],"nightlyRate":450,"rentalWeeks":26,"occupancyRate":72,"mgmtPct":25,"propertyTaxRate":0.65,"insurance":8000,"hoaMonthly":400,"maintenance":6000,"utilities":5500}'),
('gulf-shores-al', '{"label":"Gulf Shores / Orange Beach, AL","location":"Gulf Shores, AL","zipCodes":["36542","36561"],"bedsMin":3,"bedsMax":5,"priceMin":350000,"priceMax":1000000,"propertyTypes":["SingleFamily","Townhouse","Condo"],"nightlyRate":325,"rentalWeeks":24,"occupancyRate":68,"mgmtPct":25,"propertyTaxRate":0.42,"insurance":7000,"hoaMonthly":350,"maintenance":5500,"utilities":5000}'),
('obx-nc', '{"label":"Outer Banks, NC","location":"Outer Banks, NC","zipCodes":["27959","27948","27949","27982","27981"],"bedsMin":4,"bedsMax":6,"priceMin":500000,"priceMax":1300000,"propertyTypes":["SingleFamily"],"nightlyRate":475,"rentalWeeks":22,"occupancyRate":65,"mgmtPct":25,"propertyTaxRate":0.48,"insurance":10000,"hoaMonthly":0,"maintenance":6500,"utilities":5500}'),
('hilton-head-sc', '{"label":"Hilton Head, SC","location":"Hilton Head Island, SC","zipCodes":["29928","29926"],"bedsMin":3,"bedsMax":5,"priceMin":500000,"priceMax":1300000,"propertyTypes":["SingleFamily","Condo","Townhouse"],"nightlyRate":400,"rentalWeeks":24,"occupancyRate":68,"mgmtPct":25,"propertyTaxRate":0.57,"insurance":7500,"hoaMonthly":500,"maintenance":5500,"utilities":5000}')
ON CONFLICT (id) DO NOTHING;
