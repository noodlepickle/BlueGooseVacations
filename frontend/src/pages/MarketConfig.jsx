import React, { useState, useEffect } from 'react';

const EMPTY_MARKET = {
  id: '', label: '', location: '', zipCodes: '',
  bedsMin: 3, bedsMax: 5, priceMin: 400000, priceMax: 1300000,
  propertyTypes: 'SingleFamily,Townhouse',
  nightlyRate: 400, rentalWeeks: 24, occupancyRate: 68, mgmtPct: 25,
  propertyTaxRate: 0.55, insurance: 8000, hoaMonthly: 300,
  maintenance: 5500, utilities: 5000,
};

function Field({ label, name, value, type = 'text', onChange }) {
  return (
    <div>
      <label className="block text-xs text-gray-400 mb-1">{label}</label>
      <input
        type={type}
        value={value}
        onChange={e => onChange(name, type === 'number' ? parseFloat(e.target.value) || 0 : e.target.value)}
        className="w-full bg-gray-700 border border-gray-600 rounded px-3 py-1.5 text-sm text-white"
      />
    </div>
  );
}

export default function MarketConfig() {
  const [markets, setMarkets] = useState([]);
  const [editing, setEditing] = useState(null); // null | 'new' | market object
  const [form, setForm] = useState(EMPTY_MARKET);
  const [saving, setSaving] = useState(false);

  useEffect(() => { load(); }, []);

  function load() {
    fetch('/api/markets').then(r => r.json()).then(setMarkets).catch(() => {});
  }

  function openNew() {
    setForm(EMPTY_MARKET);
    setEditing('new');
  }

  function openEdit(m) {
    setForm({
      id: m.id,
      label: m.data.label || '',
      location: m.data.location || '',
      zipCodes: (m.data.zipCodes || []).join(', '),
      bedsMin: m.data.bedsMin || 3,
      bedsMax: m.data.bedsMax || 5,
      priceMin: m.data.priceMin || 400000,
      priceMax: m.data.priceMax || 1300000,
      propertyTypes: (m.data.propertyTypes || []).join(', '),
      nightlyRate: m.data.nightlyRate || 400,
      rentalWeeks: m.data.rentalWeeks || 24,
      occupancyRate: m.data.occupancyRate || 68,
      mgmtPct: m.data.mgmtPct || 25,
      propertyTaxRate: m.data.propertyTaxRate || 0.55,
      insurance: m.data.insurance || 8000,
      hoaMonthly: m.data.hoaMonthly || 0,
      maintenance: m.data.maintenance || 5500,
      utilities: m.data.utilities || 5000,
    });
    setEditing(m);
  }

  function handleField(name, value) {
    setForm(prev => ({ ...prev, [name]: value }));
  }

  async function save() {
    setSaving(true);
    const { id, zipCodes, propertyTypes, ...rest } = form;
    const payload = {
      ...rest,
      zipCodes: zipCodes.split(',').map(z => z.trim()).filter(Boolean),
      propertyTypes: propertyTypes.split(',').map(p => p.trim()).filter(Boolean),
    };

    const isNew = editing === 'new';
    const url = isNew ? '/api/markets' : `/api/markets/${editing.id}`;
    const method = isNew ? 'POST' : 'PUT';

    await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(isNew ? { id, ...payload } : payload),
    });

    setSaving(false);
    setEditing(null);
    load();
  }

  async function deleteMarket(id) {
    if (!confirm(`Delete market "${id}"?`)) return;
    await fetch(`/api/markets/${id}`, { method: 'DELETE' });
    load();
  }

  return (
    <div className="max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-xl font-bold text-white">Search Markets</h1>
        <button onClick={openNew} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium">
          + Add Market
        </button>
      </div>

      <table className="w-full text-sm bg-gray-800 rounded-lg overflow-hidden">
        <thead>
          <tr className="bg-gray-700 text-gray-400 text-xs uppercase">
            <th className="py-2 px-4 text-left">Market</th>
            <th className="py-2 px-4 text-left">Zip Codes</th>
            <th className="py-2 px-4 text-right">Price Range</th>
            <th className="py-2 px-4 text-right">Beds</th>
            <th className="py-2 px-4 text-right">Nightly Rate</th>
            <th className="py-2 px-4 text-right">Rental Wks</th>
            <th className="py-2 px-4 text-right">Occupancy</th>
            <th className="py-2 px-4"></th>
          </tr>
        </thead>
        <tbody>
          {markets.map(m => (
            <tr key={m.id} className="border-t border-gray-700 hover:bg-gray-750">
              <td className="py-2 px-4">
                <div className="font-medium text-white">{m.data.label}</div>
                <div className="text-xs text-gray-400">{m.id}</div>
              </td>
              <td className="py-2 px-4 text-gray-300 text-xs">{(m.data.zipCodes || []).join(', ')}</td>
              <td className="py-2 px-4 text-right text-gray-300 text-xs">
                ${(m.data.priceMin / 1000).toFixed(0)}k–${(m.data.priceMax / 1000).toFixed(0)}k
              </td>
              <td className="py-2 px-4 text-right text-gray-300">{m.data.bedsMin}–{m.data.bedsMax}</td>
              <td className="py-2 px-4 text-right text-gray-300">${m.data.nightlyRate}</td>
              <td className="py-2 px-4 text-right text-gray-300">{m.data.rentalWeeks}</td>
              <td className="py-2 px-4 text-right text-gray-300">{m.data.occupancyRate}%</td>
              <td className="py-2 px-4 text-right">
                <button onClick={() => openEdit(m)} className="text-blue-400 hover:text-blue-300 text-xs mr-3">Edit</button>
                <button onClick={() => deleteMarket(m.id)} className="text-red-400 hover:text-red-300 text-xs">Delete</button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Modal */}
      {editing !== null && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <h2 className="text-lg font-bold text-white mb-4">
              {editing === 'new' ? 'Add Market' : `Edit: ${editing.id}`}
            </h2>
            <div className="grid grid-cols-2 gap-4">
              {editing === 'new' && <Field label="ID (slug)" name="id" value={form.id} onChange={handleField} />}
              <Field label="Label" name="label" value={form.label} onChange={handleField} />
              <Field label="Location (for search)" name="location" value={form.location} onChange={handleField} />
              <Field label="Zip Codes (comma separated)" name="zipCodes" value={form.zipCodes} onChange={handleField} />
              <Field label="Property Types (comma separated)" name="propertyTypes" value={form.propertyTypes} onChange={handleField} />
              <Field label="Min Beds" name="bedsMin" value={form.bedsMin} type="number" onChange={handleField} />
              <Field label="Max Beds" name="bedsMax" value={form.bedsMax} type="number" onChange={handleField} />
              <Field label="Min Price" name="priceMin" value={form.priceMin} type="number" onChange={handleField} />
              <Field label="Max Price" name="priceMax" value={form.priceMax} type="number" onChange={handleField} />
              <Field label="Nightly Rate ($)" name="nightlyRate" value={form.nightlyRate} type="number" onChange={handleField} />
              <Field label="Rental Weeks / Year" name="rentalWeeks" value={form.rentalWeeks} type="number" onChange={handleField} />
              <Field label="Occupancy Rate (%)" name="occupancyRate" value={form.occupancyRate} type="number" onChange={handleField} />
              <Field label="Mgmt Fee (%)" name="mgmtPct" value={form.mgmtPct} type="number" onChange={handleField} />
              <Field label="Property Tax Rate (%)" name="propertyTaxRate" value={form.propertyTaxRate} type="number" onChange={handleField} />
              <Field label="Insurance (annual $)" name="insurance" value={form.insurance} type="number" onChange={handleField} />
              <Field label="HOA Monthly ($)" name="hoaMonthly" value={form.hoaMonthly} type="number" onChange={handleField} />
              <Field label="Maintenance (annual $)" name="maintenance" value={form.maintenance} type="number" onChange={handleField} />
              <Field label="Utilities (annual $)" name="utilities" value={form.utilities} type="number" onChange={handleField} />
            </div>
            <div className="flex gap-3 mt-6">
              <button onClick={save} disabled={saving} className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm rounded font-medium">
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={() => setEditing(null)} className="px-4 py-2 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded">
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
