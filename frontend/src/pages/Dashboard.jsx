import React, { useState, useEffect } from 'react';
import PropertyCard from '../components/PropertyCard';

const SORT_OPTIONS = [
  { value: 'perFamilyNetCost', label: 'Net Cost' },
  { value: 'capRate', label: 'Cap Rate' },
  { value: 'price', label: 'Price' },
  { value: 'daysOnMarket', label: 'Days on Market' },
];

const SOURCE_OPTIONS = ['zillow', 'realtor', 'redfin'];

export default function Dashboard() {
  const [listings, setListings] = useState([]);
  const [markets, setMarkets] = useState([]);
  const [lastRun, setLastRun] = useState(null);
  const [loading, setLoading] = useState(true);
  const [triggering, setTriggering] = useState(false);

  // Filters
  const [selectedMarkets, setSelectedMarkets] = useState([]);
  const [qualifiesOnly, setQualifiesOnly] = useState(false);
  const [sortBy, setSortBy] = useState('perFamilyNetCost');
  const [sourceFilter, setSourceFilter] = useState('');

  useEffect(() => {
    fetch('/api/markets').then(r => r.json()).then(setMarkets).catch(() => {});
    fetch('/api/runs?limit=1').then(r => r.json()).then(runs => {
      if (runs[0]) setLastRun(new Date(runs[0].run_date).toLocaleDateString());
    }).catch(() => {});
  }, []);

  useEffect(() => {
    setLoading(true);
    const params = new URLSearchParams();
    if (selectedMarkets.length === 1) params.set('areaId', selectedMarkets[0]);
    if (qualifiesOnly) params.set('qualifiesOnly', 'true');
    params.set('sortBy', sortBy);
    params.set('limit', '100');
    if (sourceFilter) params.set('source', sourceFilter);

    fetch(`/api/properties?${params}`)
      .then(r => r.json())
      .then(data => {
        setListings(data.listings || []);
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [selectedMarkets, qualifiesOnly, sortBy, sourceFilter]);

  function toggleMarket(id) {
    setSelectedMarkets(prev =>
      prev.includes(id) ? prev.filter(m => m !== id) : [...prev, id]
    );
  }

  async function triggerRun() {
    setTriggering(true);
    await fetch('/api/runs/trigger', { method: 'POST' });
    setTimeout(() => setTriggering(false), 3000);
  }

  const qualifying = listings.filter(l => l.qualifies).length;

  return (
    <div>
      {/* Summary bar */}
      <div className="flex items-center gap-6 mb-6 bg-gray-800 rounded-lg p-4">
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Properties</div>
          <div className="text-2xl font-bold text-white">{listings.length}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Qualifying</div>
          <div className="text-2xl font-bold text-green-400">{qualifying}</div>
        </div>
        <div>
          <div className="text-xs text-gray-400 uppercase tracking-wide">Markets</div>
          <div className="text-2xl font-bold text-white">{markets.length}</div>
        </div>
        {lastRun && (
          <div>
            <div className="text-xs text-gray-400 uppercase tracking-wide">Last Run</div>
            <div className="text-sm font-medium text-white">{lastRun}</div>
          </div>
        )}
        <div className="ml-auto">
          <button
            onClick={triggerRun}
            disabled={triggering}
            className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded font-medium transition-colors"
          >
            {triggering ? 'Running...' : 'Run Now'}
          </button>
        </div>
      </div>

      {/* Filter bar */}
      <div className="flex flex-wrap gap-3 mb-6">
        {/* Market multi-select */}
        <div className="flex flex-wrap gap-1.5">
          {markets.map(m => (
            <button
              key={m.id}
              onClick={() => toggleMarket(m.id)}
              className={`px-3 py-1.5 text-xs rounded font-medium border transition-colors ${
                selectedMarkets.includes(m.id)
                  ? 'bg-blue-600 border-blue-500 text-white'
                  : 'bg-gray-800 border-gray-600 text-gray-300 hover:border-gray-400'
              }`}
            >
              {m.data?.label || m.id}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-3 ml-auto">
          {/* Qualifies only toggle */}
          <label className="flex items-center gap-2 text-sm text-gray-300 cursor-pointer">
            <input
              type="checkbox"
              checked={qualifiesOnly}
              onChange={e => setQualifiesOnly(e.target.checked)}
              className="accent-blue-500"
            />
            Qualifying only
          </label>

          {/* Sort */}
          <select
            value={sortBy}
            onChange={e => setSortBy(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded px-3 py-1.5"
          >
            {SORT_OPTIONS.map(o => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>

          {/* Source filter */}
          <select
            value={sourceFilter}
            onChange={e => setSourceFilter(e.target.value)}
            className="bg-gray-800 border border-gray-600 text-gray-200 text-sm rounded px-3 py-1.5"
          >
            <option value="">All Sources</option>
            {SOURCE_OPTIONS.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {/* Grid */}
      {loading ? (
        <div className="text-gray-400 text-center py-16">Loading...</div>
      ) : listings.length === 0 ? (
        <div className="text-gray-400 text-center py-16">
          No properties found. Trigger a run to fetch listings.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
          {listings.map(row => (
            <PropertyCard key={row.id} row={row} />
          ))}
        </div>
      )}
    </div>
  );
}
