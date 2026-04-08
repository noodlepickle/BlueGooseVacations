'use strict';

/**
 * Run a full proforma for a listing given area config and financing goals.
 * All monetary values are annual USD unless noted.
 * The hero metric is perFamilyNetCost — what each family writes a check for.
 */
function runProforma(listing, area, goals) {
  const purchasePrice = listing.purchasePrice;
  const downPaymentPct = goals.downPaymentPct ?? 25;
  const interestRate = goals.interestRate ?? 7.5;
  const loanTermYears = goals.loanTermYears ?? 30;

  // Financing
  const downPayment = purchasePrice * (downPaymentPct / 100);
  const loanAmt = purchasePrice - downPayment;
  const mr = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  const monthlyMortgage = loanAmt * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
  const annualMortgage = monthlyMortgage * 12;
  const closingCosts = purchasePrice * 0.02;
  const totalCashIn = downPayment + closingCosts;

  // STR — prefer listing enrichment, fall back to area config
  const nightlyRate = listing.strNightlyRate ?? area.nightlyRate;
  const occupancyRate = listing.strOccupancy ?? area.occupancyRate;
  const rentalWeeks = area.rentalWeeks;
  const mgmtPct = area.mgmtPct;

  // Revenue
  const rentedNights = rentalWeeks * 7 * (occupancyRate / 100);
  const grossRevenue = rentedNights * nightlyRate;

  // Operating expenses
  const mgmtFee = grossRevenue * (mgmtPct / 100);
  const platformFees = grossRevenue * 0.03;
  const propertyTax = purchasePrice * (area.propertyTaxRate / 100);
  const hoaMonthly = listing.hoaMonthly ?? area.hoaMonthly ?? 0;
  const annualHOA = hoaMonthly * 12;
  const insurance = area.insurance;
  const maintenance = area.maintenance;
  const utilities = area.utilities;

  const totalOpEx = mgmtFee + platformFees + propertyTax + insurance + annualHOA + maintenance + utilities;

  // NOI & cash flow
  const NOI = grossRevenue - totalOpEx;
  const cashFlow = NOI - annualMortgage;
  const capRate = (NOI / purchasePrice) * 100;
  const cocReturn = (cashFlow / totalCashIn) * 100;

  // Per-family (50/50 LLC)
  const perFamilyNetCost = cashFlow / 2;
  const perFamilyCashIn = totalCashIn / 2;
  const personalWeeksPerFamily = (52 - rentalWeeks) / 2;
  const costPerPersonalWeek = personalWeeksPerFamily > 0
    ? Math.abs(Math.min(perFamilyNetCost, 0)) / personalWeeksPerFamily
    : 0;

  return {
    // Inputs snapshot
    purchasePrice,
    downPaymentPct,
    interestRate,
    loanTermYears,
    nightlyRate,
    occupancyRate,
    rentalWeeks,
    mgmtPct,
    hoaMonthly,
    strSource: listing.strSource ?? null,

    // Financing
    downPayment,
    loanAmt,
    monthlyMortgage,
    annualMortgage,
    closingCosts,
    totalCashIn,

    // Revenue
    rentedNights,
    grossRevenue,

    // OpEx line items
    mgmtFee,
    platformFees,
    propertyTax,
    annualHOA,
    insurance,
    maintenance,
    utilities,
    totalOpEx,

    // Returns
    NOI,
    cashFlow,
    capRate,
    cocReturn,

    // Hero metrics — per family
    perFamilyNetCost,
    perFamilyCashIn,
    personalWeeksPerFamily,
    costPerPersonalWeek,
  };
}

/**
 * Returns { qualifies: boolean, issues: string[] }
 * A property fails if ANY goal is not met.
 */
function meetsGoals(proforma, goals) {
  const issues = [];

  if (proforma.purchasePrice > goals.maxPurchasePrice) {
    issues.push(`Price $${fmt(proforma.purchasePrice)} exceeds max $${fmt(goals.maxPurchasePrice)}`);
  }

  if (proforma.perFamilyNetCost < 0 && Math.abs(proforma.perFamilyNetCost) > goals.maxNetCostPerFamily) {
    issues.push(`Net annual cost/family $${fmt(Math.abs(proforma.perFamilyNetCost))} exceeds max $${fmt(goals.maxNetCostPerFamily)}`);
  }

  if (proforma.personalWeeksPerFamily < goals.minPersonalWeeksPerFamily) {
    issues.push(`Personal weeks/family ${proforma.personalWeeksPerFamily.toFixed(1)} below min ${goals.minPersonalWeeksPerFamily}`);
  }

  return { qualifies: issues.length === 0, issues };
}

function fmt(n) {
  return Math.round(n).toLocaleString();
}

module.exports = { runProforma, meetsGoals };
