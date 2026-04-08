import React from 'react';

const COLORS = {
  zillow: 'bg-blue-700 text-blue-100',
  realtor: 'bg-red-700 text-red-100',
  redfin: 'bg-orange-700 text-orange-100',
  insideairbnb: 'bg-purple-700 text-purple-100',
  rabbu: 'bg-teal-700 text-teal-100',
  airdna: 'bg-pink-700 text-pink-100',
};

export default function SourceBadge({ source }) {
  const cls = COLORS[source] || 'bg-gray-600 text-gray-100';
  return (
    <span className={`text-xs px-2 py-0.5 rounded font-medium uppercase tracking-wide ${cls}`}>
      {source}
    </span>
  );
}
