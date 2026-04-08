export function fmt(n) {
  if (n == null || isNaN(n)) return 'N/A';
  return '$' + Math.round(n).toLocaleString();
}

export function pct(n, decimals = 1) {
  if (n == null || isNaN(n)) return 'N/A';
  return n.toFixed(decimals) + '%';
}

export function costColor(perFamilyNetCost) {
  if (perFamilyNetCost == null) return 'text-gray-400';
  if (perFamilyNetCost >= 0) return 'text-green-400';
  if (Math.abs(perFamilyNetCost) <= 15000) return 'text-yellow-400';
  return 'text-red-400';
}

export function qualifyColor(qualifies, issues) {
  if (qualifies) return 'border-green-500';
  if (issues && issues.length <= 1) return 'border-yellow-500';
  return 'border-red-500';
}

// Run local proforma calculation (mirrors backend logic)
export function calcProforma(inputs) {
  const {
    purchasePrice, downPaymentPct = 25, interestRate = 7.5, loanTermYears = 30,
    nightlyRate, rentalWeeks, occupancyRate, mgmtPct = 25,
    propertyTaxRate, insurance, hoaMonthly = 0, maintenance, utilities,
  } = inputs;

  if (!purchasePrice || !nightlyRate) return null;

  const downPayment = purchasePrice * (downPaymentPct / 100);
  const loanAmt = purchasePrice - downPayment;
  const mr = interestRate / 100 / 12;
  const n = loanTermYears * 12;
  const monthlyMortgage = loanAmt * (mr * Math.pow(1 + mr, n)) / (Math.pow(1 + mr, n) - 1);
  const annualMortgage = monthlyMortgage * 12;
  const closingCosts = purchasePrice * 0.02;
  const totalCashIn = downPayment + closingCosts;

  const rentedNights = rentalWeeks * 7 * (occupancyRate / 100);
  const grossRevenue = rentedNights * nightlyRate;

  const mgmtFee = grossRevenue * (mgmtPct / 100);
  const platformFees = grossRevenue * 0.03;
  const propertyTax = purchasePrice * ((propertyTaxRate || 0) / 100);
  const annualHOA = hoaMonthly * 12;

  const totalOpEx = mgmtFee + platformFees + propertyTax + (insurance || 0) + annualHOA + (maintenance || 0) + (utilities || 0);
  const NOI = grossRevenue - totalOpEx;
  const cashFlow = NOI - annualMortgage;
  const capRate = (NOI / purchasePrice) * 100;
  const cocReturn = (cashFlow / totalCashIn) * 100;

  const perFamilyNetCost = cashFlow / 2;
  const perFamilyCashIn = totalCashIn / 2;
  const personalWeeksPerFamily = (52 - rentalWeeks) / 2;
  const costPerPersonalWeek = personalWeeksPerFamily > 0
    ? Math.abs(Math.min(perFamilyNetCost, 0)) / personalWeeksPerFamily
    : 0;

  return {
    purchasePrice, downPayment, loanAmt, monthlyMortgage, annualMortgage,
    closingCosts, totalCashIn, rentedNights, grossRevenue, mgmtFee, platformFees,
    propertyTax, annualHOA, insurance: insurance || 0, maintenance: maintenance || 0,
    utilities: utilities || 0, totalOpEx, NOI, cashFlow, capRate, cocReturn,
    perFamilyNetCost, perFamilyCashIn, personalWeeksPerFamily, costPerPersonalWeek,
  };
}
