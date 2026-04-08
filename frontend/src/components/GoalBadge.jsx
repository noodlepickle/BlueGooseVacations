import React from 'react';

export default function GoalBadge({ qualifies, issues = [] }) {
  if (qualifies) {
    return (
      <span className="text-xs px-2 py-0.5 rounded font-medium bg-green-800 text-green-200">
        QUALIFIES
      </span>
    );
  }
  if (issues.length <= 1) {
    return (
      <span className="text-xs px-2 py-0.5 rounded font-medium bg-yellow-800 text-yellow-200">
        NEAR MISS
      </span>
    );
  }
  return (
    <span className="text-xs px-2 py-0.5 rounded font-medium bg-red-900 text-red-200">
      FAILS {issues.length} GOALS
    </span>
  );
}
