import React from 'react';
import { useNavigate } from 'react-router-dom';
import { fmt, pct, costColor, qualifyColor } from '../utils';
import SourceBadge from './SourceBadge';
import GoalBadge from './GoalBadge';

export default function PropertyCard({ row }) {
  const navigate = useNavigate();
  const { listing_data: ld, proforma: p, qualifies, isNew } = row;
  const issues = p ? [] : [];
  const address = row.address;
  const price = row.purchase_price;
  const netCost = p?.perFamilyNetCost;
  const borderCls = qualifyColor(qualifies, row.issues || []);

  return (
    <div
      className={`bg-gray-800 border-l-4 ${borderCls} rounded-lg p-4 cursor-pointer hover:bg-gray-750 transition-colors`}
      onClick={() => navigate(`/proforma/${row.id}`)}
    >
      {/* Header */}
      <div className="flex items-start justify-between gap-2 mb-2">
        <div>
          <div className="font-medium text-white text-sm leading-tight">{address}</div>
          <div className="text-gray-400 text-xs mt-0.5">{row.area_id}</div>
        </div>
        <div className="flex flex-col items-end gap-1 shrink-0">
          <GoalBadge qualifies={qualifies} issues={row.issues || []} />
          {isNew && (
            <span className="text-xs px-2 py-0.5 rounded bg-blue-800 text-blue-200 font-medium">NEW</span>
          )}
        </div>
      </div>

      {/* Price + details */}
      <div className="flex items-center gap-3 mb-3">
        <span className="text-white font-semibold">{fmt(price)}</span>
        <span className="text-gray-400 text-sm">
          {row.beds}bd / {row.baths}ba
          {row.sqft ? ` · ${row.sqft?.toLocaleString()} sqft` : ''}
        </span>
      </div>

      {/* Badges row */}
      <div className="flex flex-wrap gap-1.5 mb-3">
        <SourceBadge source={row.source} />
        {row.str_source && <SourceBadge source={row.str_source} />}
        {row.days_on_market != null && (
          <span className="text-xs px-2 py-0.5 rounded bg-gray-700 text-gray-300">
            {row.days_on_market}d on market
          </span>
        )}
        {row.price_reduced && (
          <span className="text-xs px-2 py-0.5 rounded bg-yellow-900 text-yellow-200 font-medium">
            PRICE REDUCED
          </span>
        )}
      </div>

      {/* Hero metric */}
      <div className="bg-gray-900 rounded p-3 mb-3">
        <div className="text-xs text-gray-400 uppercase tracking-wide mb-1">Net Annual Cost / Family</div>
        <div className={`text-2xl font-bold ${costColor(netCost)}`}>
          {netCost != null ? fmt(Math.abs(netCost)) : '—'}
          {netCost != null && netCost >= 0 && (
            <span className="text-sm font-normal ml-1 text-green-400"> cash flow</span>
          )}
        </div>
        {p && (
          <div className="text-xs text-gray-400 mt-1">
            {p.personalWeeksPerFamily?.toFixed(1)} personal wks/family ·{' '}
            {fmt(p.costPerPersonalWeek)}/wk
          </div>
        )}
      </div>

      {/* Secondary metrics */}
      {p && (
        <div className="grid grid-cols-2 gap-2 text-xs">
          <div>
            <span className="text-gray-400">Cap Rate</span>
            <span className="text-white ml-1 font-medium">{pct(p.capRate)}</span>
          </div>
          <div>
            <span className="text-gray-400">CoC Return</span>
            <span className="text-white ml-1 font-medium">{pct(p.cocReturn)}</span>
          </div>
        </div>
      )}
    </div>
  );
}
