import React, { useState, useEffect, useCallback } from 'react';
import { useParams } from 'react-router-dom';
import { fmt, pct, costColor, calcProforma } from '../utils';
import ProformaTable from '../components/ProformaTable';

function Slider({ label, name, value, min, max, step = 1, prefix = '', suffix = '', onChange }) {
  return (
    <div className="mb-4">
      <div className="flex justify-between text-sm mb-1">
        <span className="text-gray-300">{label}</span>
        <span className="text-white font-medium">{prefix}{typeof value === 'number' ? value.toLocaleString() : value}{suffix}</span>
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={e => onChange(name, parseFloat(e.target.value))}
        className="w-full accent-blue-500"
      />
      <div className="flex justify-between text-xs text-gray-500 mt-0.5">
        <span>{prefix}{min.toLocaleString()}{suffix}</span>
        <span>{prefix}{max.toLocaleString()}{suffix}</span>
      </div>
    </div>
  );
}

const DEFAULTS = {
  purchasePrice: 750000,
  downPaymentPct: 25,
  interestRate: 7.5,
  loanTermYears: 30,
  nightlyRate: 400,
  rentalWeeks: 24,
  occupancyRate: 68,
  mgmtPct: 25,
  propertyTaxRate: 0.55,
  insurance: 8000,
  hoaMonthly: 300,
  maintenance: 5500,
  utilities: 5000,
};

export default function ProformaBuilder() {
  const { id } = useParams();
  const [inputs, setInputs] = useState(DEFAULTS);
  const [proforma, setProforma] = useState(null);
  const [listing, setListing] = useState(null);

  // Load listing if id provided
  useEffect(() => {
    if (!id) return;
    fetch(`/api/properties/${encodeURIComponent(id)}`)
      .then(r => r.json())
      .then(data => {
        setListing(data);
        // Pre-populate inputs from listing + area
        const p = data.proforma || {};
        setInputs({
          purchasePrice: data.purchase_price || DEFAULTS.purchasePrice,
          downPaymentPct: p.downPaymentPct || DEFAULTS.downPaymentPct,
          interestRate: p.interestRate || DEFAULTS.interestRate,
          loanTermYears: p.loanTermYears || DEFAULTS.loanTermYears,
          nightlyRate: p.nightlyRate || data.str_nightly_rate || DEFAULTS.nightlyRate,
          rentalWeeks: p.rentalWeeks || DEFAULTS.rentalWeeks,
          occupancyRate: p.occupancyRate || data.str_occupancy || DEFAULTS.occupancyRate,
          mgmtPct: p.mgmtPct || DEFAULTS.mgmtPct,
          propertyTaxRate: p.propertyTaxRate || DEFAULTS.propertyTaxRate,
          insurance: p.insurance || DEFAULTS.insurance,
          hoaMonthly: data.hoa_monthly || p.hoaMonthly || DEFAULTS.hoaMonthly,
          maintenance: p.maintenance || DEFAULTS.maintenance,
          utilities: p.utilities || DEFAULTS.utilities,
        });
      })
      .catch(() => {});
  }, [id]);

  // Recalc on input change
  useEffect(() => {
    setProforma(calcProforma(inputs));
  }, [inputs]);

  function handleChange(name, value) {
    setInputs(prev => ({ ...prev, [name]: value }));
  }

  const netCost = proforma?.perFamilyNetCost;

  return (
    <div className="max-w-6xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-2">
        {listing ? listing.address : 'Pro Forma Builder'}
      </h1>
      {listing && (
        <div className="text-gray-400 text-sm mb-6">
          {fmt(listing.purchase_price)} · {listing.beds}bd/{listing.baths}ba ·{' '}
          <a href={listing.listing_url} target="_blank" rel="noopener noreferrer" className="text-blue-400 hover:underline">
            View Listing
          </a>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left: Inputs */}
        <div className="bg-gray-800 rounded-lg p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wide mb-4">Assumptions</h2>

          <div className="text-xs font-medium text-gray-500 uppercase mb-3">Purchase & Financing</div>
          <Slider label="Purchase Price" name="purchasePrice" value={inputs.purchasePrice} min={200000} max={2000000} step={25000} prefix="$" onChange={handleChange} />
          <Slider label="Down Payment" name="downPaymentPct" value={inputs.downPaymentPct} min={10} max={50} step={1} suffix="%" onChange={handleChange} />
          <Slider label="Interest Rate" name="interestRate" value={inputs.interestRate} min={4} max={12} step={0.125} suffix="%" onChange={handleChange} />
          <Slider label="Loan Term" name="loanTermYears" value={inputs.loanTermYears} min={10} max={30} step={5} suffix=" yrs" onChange={handleChange} />

          <div className="text-xs font-medium text-gray-500 uppercase mt-4 mb-3">Rental Income</div>
          <Slider label="Nightly Rate" name="nightlyRate" value={inputs.nightlyRate} min={100} max={1500} step={25} prefix="$" onChange={handleChange} />
          <Slider label="Rental Weeks / Year" name="rentalWeeks" value={inputs.rentalWeeks} min={8} max={48} step={1} suffix=" wks" onChange={handleChange} />
          <Slider label="Occupancy Rate" name="occupancyRate" value={inputs.occupancyRate} min={40} max={95} step={1} suffix="%" onChange={handleChange} />
          <Slider label="Mgmt Fee" name="mgmtPct" value={inputs.mgmtPct} min={0} max={40} step={1} suffix="%" onChange={handleChange} />

          <div className="text-xs font-medium text-gray-500 uppercase mt-4 mb-3">Operating Expenses</div>
          <Slider label="Property Tax Rate" name="propertyTaxRate" value={inputs.propertyTaxRate} min={0.1} max={3} step={0.05} suffix="%" onChange={handleChange} />
          <Slider label="Insurance" name="insurance" value={inputs.insurance} min={2000} max={30000} step={500} prefix="$" onChange={handleChange} />
          <Slider label="HOA (monthly)" name="hoaMonthly" value={inputs.hoaMonthly} min={0} max={2000} step={50} prefix="$" onChange={handleChange} />
          <Slider label="Maintenance" name="maintenance" value={inputs.maintenance} min={1000} max={20000} step={500} prefix="$" onChange={handleChange} />
          <Slider label="Utilities" name="utilities" value={inputs.utilities} min={1000} max={15000} step={500} prefix="$" onChange={handleChange} />
        </div>

        {/* Right: Results */}
        <div className="space-y-4">
          {/* Hero box */}
          <div className="bg-gray-800 rounded-lg p-5">
            <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net Annual Cost to Own</div>
            <div className="grid grid-cols-3 gap-4 mb-4">
              <div>
                <div className="text-xs text-gray-500 mb-1">LLC Total</div>
                <div className={`text-xl font-bold ${costColor(proforma?.cashFlow)}`}>
                  {proforma ? fmt(Math.abs(proforma.cashFlow)) : '—'}
                </div>
                <div className="text-xs text-gray-500">
                  {proforma?.cashFlow >= 0 ? 'cash flow' : 'net cost'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Per Family</div>
                <div className={`text-2xl font-bold ${costColor(netCost)}`}>
                  {proforma ? fmt(Math.abs(netCost)) : '—'}
                </div>
                <div className="text-xs text-gray-500">
                  {netCost >= 0 ? 'cash flow' : 'net cost'}
                </div>
              </div>
              <div>
                <div className="text-xs text-gray-500 mb-1">Cost / Week</div>
                <div className="text-xl font-bold text-white">
                  {proforma ? fmt(proforma.costPerPersonalWeek) : '—'}
                </div>
                <div className="text-xs text-gray-500">
                  {proforma ? `${proforma.personalWeeksPerFamily?.toFixed(1)} wks avail` : ''}
                </div>
              </div>
            </div>

            {/* KPI row */}
            {proforma && (
              <div className="grid grid-cols-4 gap-3 pt-4 border-t border-gray-700 text-center">
                <div>
                  <div className="text-xs text-gray-400">Price</div>
                  <div className="text-sm font-semibold text-white">{fmt(proforma.purchasePrice)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Cash In / Family</div>
                  <div className="text-sm font-semibold text-white">{fmt(proforma.perFamilyCashIn)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">Cap Rate</div>
                  <div className="text-sm font-semibold text-white">{pct(proforma.capRate)}</div>
                </div>
                <div>
                  <div className="text-xs text-gray-400">CoC Return</div>
                  <div className="text-sm font-semibold text-white">{pct(proforma.cocReturn)}</div>
                </div>
              </div>
            )}
          </div>

          {/* P&L Table */}
          {proforma && <ProformaTable p={proforma} />}
        </div>
      </div>
    </div>
  );
}
