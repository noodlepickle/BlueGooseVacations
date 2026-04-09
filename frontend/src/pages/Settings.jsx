import React, { useState, useEffect } from 'react';

const GROUPS = [
  {
    label: 'Listing Sources',
    description: 'API keys for property listing data. RAPIDAPI_KEY enables both Zillow and Realtor.com.',
    keys: [
      { key: 'RAPIDAPI_KEY', label: 'RapidAPI Key', secret: true, placeholder: 'Enables Zillow + Realtor.com', hint: 'Get from rapidapi.com — subscribe to zillow-com1 and realtor-com4 hosts' },
    ],
  },
  {
    label: 'STR Data',
    description: 'Short-term rental market data. AirDNA activates automatically when set.',
    keys: [
      { key: 'AIRDNA_API_KEY', label: 'AirDNA API Key', secret: true, placeholder: 'Optional — auto-enables AirDNA source', hint: 'Get from airdna.co developer portal' },
    ],
  },
  {
    label: 'Email Digest',
    description: 'Send a markdown digest after each screener run via Resend.',
    keys: [
      { key: 'RESEND_API_KEY', label: 'Resend API Key', secret: true, placeholder: 're_xxxxxxxxxxxx', hint: 'Get from resend.com' },
      { key: 'DIGEST_FROM', label: 'From Address', secret: false, placeholder: 'screener@yourdomain.com', hint: 'Must be a verified sender domain in Resend' },
      { key: 'DIGEST_TO', label: 'To Address(es)', secret: false, placeholder: 'you@example.com, partner@example.com', hint: 'Comma-separated list of recipients' },
    ],
  },
  {
    label: 'Notion',
    description: 'Write a new page to a Notion database after each run.',
    keys: [
      { key: 'NOTION_TOKEN', label: 'Notion Integration Token', secret: true, placeholder: 'secret_xxxxxxxxxxxx', hint: 'Create an integration at notion.so/my-integrations' },
      { key: 'NOTION_DATABASE_ID', label: 'Database ID', secret: false, placeholder: '32-char database ID from the Notion URL', hint: 'Share the database with your integration' },
    ],
  },
  {
    label: 'Scheduler',
    description: 'When the screener runs automatically.',
    keys: [
      { key: 'SCREENER_CRON', label: 'Cron Expression', secret: false, placeholder: '0 6 * * *', hint: 'Default: 6am daily. Uses standard 5-field cron syntax.' },
    ],
  },
];

function SettingRow({ setting, onSave }) {
  const [editing, setEditing] = useState(false);
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const [cleared, setCleared] = useState(false);

  const meta = GROUPS.flatMap(g => g.keys).find(k => k.key === setting.key);

  async function save() {
    setSaving(true);
    await fetch(`/api/settings/${setting.key}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ value }),
    });
    setSaving(false);
    setEditing(false);
    setValue('');
    onSave();
  }

  async function clear() {
    if (!confirm(`Clear ${setting.key}?`)) return;
    await fetch(`/api/settings/${setting.key}`, { method: 'DELETE' });
    setCleared(true);
    setTimeout(() => setCleared(false), 100);
    onSave();
  }

  function cancel() {
    setEditing(false);
    setValue('');
  }

  return (
    <div className="py-3 border-t border-gray-700 first:border-t-0">
      <div className="flex items-start gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-0.5">
            <span className="font-mono text-sm text-gray-200">{setting.key}</span>
            {setting.set ? (
              <span className="text-xs px-1.5 py-0.5 rounded bg-green-900 text-green-300 font-medium">SET</span>
            ) : (
              <span className="text-xs px-1.5 py-0.5 rounded bg-gray-700 text-gray-400">NOT SET</span>
            )}
            {setting.source === 'env' && (
              <span className="text-xs text-gray-500">(from .env file)</span>
            )}
          </div>
          {meta?.hint && (
            <div className="text-xs text-gray-500 mb-1">{meta.hint}</div>
          )}
          {setting.set && !editing && (
            <div className="font-mono text-xs text-gray-400">{setting.masked}</div>
          )}

          {editing && (
            <div className="mt-2 flex gap-2">
              <input
                autoFocus
                type={meta?.secret ? 'password' : 'text'}
                value={value}
                onChange={e => setValue(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') save(); if (e.key === 'Escape') cancel(); }}
                placeholder={meta?.placeholder || ''}
                className="flex-1 bg-gray-700 border border-gray-500 rounded px-3 py-1.5 text-sm text-white font-mono placeholder-gray-500 focus:outline-none focus:border-blue-500"
              />
              <button
                onClick={save}
                disabled={saving || !value.trim()}
                className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white text-sm rounded font-medium"
              >
                {saving ? 'Saving...' : 'Save'}
              </button>
              <button onClick={cancel} className="px-3 py-1.5 bg-gray-700 hover:bg-gray-600 text-gray-200 text-sm rounded">
                Cancel
              </button>
            </div>
          )}
        </div>

        {!editing && (
          <div className="flex gap-2 shrink-0">
            <button
              onClick={() => setEditing(true)}
              className="text-xs text-blue-400 hover:text-blue-300 px-2 py-1 rounded hover:bg-gray-700"
            >
              {setting.set ? 'Update' : 'Set'}
            </button>
            {setting.set && setting.source === 'db' && (
              <button
                onClick={clear}
                className="text-xs text-red-400 hover:text-red-300 px-2 py-1 rounded hover:bg-gray-700"
              >
                Clear
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}

export default function Settings() {
  const [settings, setSettings] = useState([]);
  const [loading, setLoading] = useState(true);

  function load() {
    fetch('/api/settings')
      .then(r => r.json())
      .then(data => { setSettings(data); setLoading(false); })
      .catch(() => setLoading(false));
  }

  useEffect(() => { load(); }, []);

  function settingsForGroup(keys) {
    return keys.map(k => settings.find(s => s.key === k.key) || { key: k.key, set: false, masked: '', source: 'unset' });
  }

  if (loading) return <div className="text-gray-400 text-center py-16">Loading...</div>;

  return (
    <div className="max-w-2xl mx-auto">
      <h1 className="text-xl font-bold text-white mb-1">Settings</h1>
      <p className="text-gray-400 text-sm mb-6">
        Keys are stored in the database and take effect immediately — no restart required.
        Values from the <code className="text-gray-300">.env</code> file are shown as read-only.
      </p>

      <div className="space-y-5">
        {GROUPS.map(group => {
          const groupSettings = settingsForGroup(group.keys);
          const allSet = groupSettings.every(s => s.set);
          const someSet = groupSettings.some(s => s.set);

          return (
            <div key={group.label} className="bg-gray-800 rounded-lg overflow-hidden">
              <div className="px-5 py-3 bg-gray-750 border-b border-gray-700 flex items-center justify-between">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-white">{group.label}</span>
                    {allSet && someSet && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-green-900 text-green-300">Active</span>
                    )}
                    {!allSet && someSet && (
                      <span className="text-xs px-1.5 py-0.5 rounded bg-yellow-900 text-yellow-300">Partial</span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">{group.description}</p>
                </div>
              </div>
              <div className="px-5">
                {groupSettings.map(s => (
                  <SettingRow key={s.key} setting={s} onSave={load} />
                ))}
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-6 p-4 bg-gray-800 rounded-lg text-xs text-gray-400">
        <span className="text-gray-300 font-medium">Note:</span> Keys stored here override values in the{' '}
        <code className="text-gray-300">.env</code> file. To remove a key entirely, clear it here and also remove it from <code className="text-gray-300">.env</code>.
      </div>
    </div>
  );
}
