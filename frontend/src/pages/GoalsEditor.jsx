import React, { useState, useEffect } from 'react';
import { fmt, calcProforma } from '../utils';

// Local implementation of meetsGoals for live count
function localMeetsGoals(proforma, goals) {
  const issues = [];
  if (proforma.purchasePrice > goals.maxPurchasePrice) issues.push('price');
  if (proforma.perFamilyNetCost < 0 && Math.abs(proforma.perFamilyNetCost) > goals.maxNetCostPerFamily) issues.push('cost');
  if (proforma.personalWeeksPerFamily < goals.minPersonalWeeksPerFamily) issues.push('weeks');
  return issues.length === 0;
}

function GoalSlider({ label, name, value, min, max, step = 1000, prefix = '', suffix = '', onChange }) {
  return (
    <div className="mb-5">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-medium">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        className="w-full accent-blue-500" />
      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

export default function GoalsEditor() {
  const [goals, setGoals] = useState({
    maxPurchasePrice: 1200000,
    maxNetCostPerFamily: 15000,
    minPersonalWeeksPerFamily: 6,
    downPaymentPct: 25,
    interestRate: 7.5,
    loanTermYears: 30,
  });
  const [allListings, setAllListings] = useState([]);
  const [markets, setMarkets] = useState({});
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    fetch('/api/goals').then(r => r.json()).then(d => {
      if (d.data) setGoals(d.data);
    }).catch(() => {});

    fetch('/api/properties?limit=500').then(r => r.json()).then(d => {
      setAllListings(d.listings || []);
    }).catch(() => {});

    fetch('/api/markets').then(r => r.json()).then(ms => {
      const map = {};
      ms.forEach(m => { map[m.id] = { id: m.id, ...m.data }; });
      setMarkets(map);
    }).catch(() => {});
  }, []);

  function handleChange(name, value) {
    setGoals(prev => ({ ...prev, [name]: value }));
  }

  // Live qualifying count using local calc
  const qualifyingCount = allListings.filter(row => {
    const area = markets[row.area_id];
    if (!area || !row.listing_data) return false;
    const listing = { ...row.listing_data, hoaMonthly: row.hoa_monthly, strNightlyRate: row.str_nightly_rate, strOccupancy: row.str_occupancy };
    const p = calcProforma({ ...listing, ...area, ...goals, purchasePrice: listing.purchasePrice || row.purchase_price });
    if (!p) return false;
    return localMeetsGoals(p, goals);
  }).length;

  async function handleSave() {
    setSaving(true);
    await fetch('/api/goals', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(goals),
    });
    setSaving(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 2000);
  }

  return (
    <div className="max-w-xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-2">Investment Goals</h1>

      {/* Live count */}
      <div className="bg-gray-800 rounded-lg p-4 mb-6 text-center">
        <div className="text-3xl font-bold text-green-400">{qualifyingCount}</div>
        <div className="text-sm text-gray-400">of {allListings.length} current listings qualify at these goals</div>
      </div>

      <div className="bg-gray-800 rounded-lg p-6">
        <div className="text-xs font-medium text-gray-500 uppercase mb-4">Screening Goals</div>

        <GoalSlider label="Max Purchase Price" name="maxPurchasePrice" value={goals.maxPurchasePrice}
          min={300000} max={3000000} step={25000} prefix="$" onChange={handleChange} />
        <GoalSlider label="Max Net Annual Cost / Family" name="maxNetCostPerFamily" value={goals.maxNetCostPerFamily}
          min={0} max={50000} step={500} prefix="$" onChange={handleChange} />
        <GoalSlider label="Min Personal Weeks / Family" name="minPersonalWeeksPerFamily" value={goals.minPersonalWeeksPerFamily}
          min={1} max={20} step={1} suffix=" wks" onChange={handleChange} />

        <div className="text-xs font-medium text-gray-500 uppercase mt-6 mb-4">Financing Assumptions</div>

        <GoalSlider label="Down Payment" name="downPaymentPct" value={goals.downPaymentPct}
          min={10} max={50} step={1} suffix="%" onChange={handleChange} />
        <GoalSlider label="Interest Rate" name="interestRate" value={goals.interestRate}
          min={4} max={12} step={0.125} suffix="%" onChange={handleChange} />
        <GoalSlider label="Loan Term" name="loanTermYears" value={goals.loanTermYears}
          min={10} max={30} step={5} suffix=" yrs" onChange={handleChange} />

        <button
          onClick={handleSave}
          disabled={saving}
          className="mt-4 w-full px-4 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white rounded font-medium transition-colors"
        >
          {saved ? 'Saved!' : saving ? 'Saving...' : 'Save & Re-screen All Listings'}
        </button>
      </div>
    </div>
  );
}
