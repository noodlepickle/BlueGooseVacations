import React, { useState, useEffect } from 'react';
import { marked } from 'marked';

export default function RunHistory() {
  const [runs, setRuns] = useState([]);
  const [selected, setSelected] = useState(null);
  const [digest, setDigest] = useState('');

  useEffect(() => {
    fetch('/api/runs').then(r => r.json()).then(setRuns).catch(() => {});
  }, []);

  async function openRun(run) {
    const data = await fetch(`/api/runs/${run.id}`).then(r => r.json());
    setDigest(data.digest_md || '_No digest available._');
    setSelected(run);
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-6">Run History</h1>

      {runs.length === 0 ? (
        <div className="text-gray-400 text-center py-16">No runs yet. Trigger a run from the Dashboard.</div>
      ) : (
        <table className="w-full text-sm bg-gray-800 rounded-lg overflow-hidden">
          <thead>
            <tr className="bg-gray-700 text-gray-400 text-xs uppercase">
              <th className="py-2 px-4 text-left">Date</th>
              <th className="py-2 px-4 text-left">Markets</th>
              <th className="py-2 px-4 text-right">Properties</th>
              <th className="py-2 px-4 text-right">Qualifying</th>
              <th className="py-2 px-4"></th>
            </tr>
          </thead>
          <tbody>
            {runs.map(run => (
              <tr key={run.id} className="border-t border-gray-700 hover:bg-gray-750 cursor-pointer" onClick={() => openRun(run)}>
                <td className="py-2.5 px-4 text-white">{new Date(run.run_date).toLocaleString()}</td>
                <td className="py-2.5 px-4 text-gray-300 text-xs">
                  {(run.areas || []).map(a => a.label || a.id).join(', ')}
                </td>
                <td className="py-2.5 px-4 text-right text-white">{run.total_props}</td>
                <td className="py-2.5 px-4 text-right text-green-400 font-medium">{run.qualifying}</td>
                <td className="py-2.5 px-4 text-right text-blue-400 text-xs">View Digest →</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Digest modal */}
      {selected && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4" onClick={() => setSelected(null)}>
          <div className="bg-gray-800 rounded-lg p-6 w-full max-w-3xl max-h-[85vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-bold text-white">
                Digest — {new Date(selected.run_date).toLocaleDateString()}
              </h2>
              <button onClick={() => setSelected(null)} className="text-gray-400 hover:text-white text-lg">✕</button>
            </div>
            <div
              className="prose prose-invert prose-sm max-w-none"
              dangerouslySetInnerHTML={{ __html: marked(digest) }}
            />
          </div>
        </div>
      )}
    </div>
  );
}
