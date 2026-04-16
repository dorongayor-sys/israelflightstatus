import { useState, useEffect, useMemo } from 'react';
import Navbar from '../components/Navbar';
import AirlineCard from '../components/AirlineCard';
import api from '../api/client';
import staticData from '../data/airlines-static.json';

const STATUS_ORDER = { flying: 0, partial: 1, not_flying: 2 };
const ISRAELI_ORDER = { 'El Al': 0, 'Israir': 1, 'Arkia': 2, 'Air Haifa': 3 };

function SearchIcon() {
  return (
    <svg className="w-4 h-4 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
    </svg>
  );
}


const STATUS_TOOLTIPS = {
  flying:     'Airline is operating flights to/from Tel Aviv normally.',
  not_flying: 'Airline has fully suspended all flights to/from Tel Aviv.',
  partial:    'Airline is flying but with significant cancellations (over 20% of scheduled flights cancelled).',
};

function InfoIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M12 2a10 10 0 100 20A10 10 0 0012 2z" />
    </svg>
  );
}

function StatCard({ count, label, color, tooltip }) {
  const [show, setShow] = useState(false);
  const colors = {
    green: { num: 'text-green-400', bg: 'bg-green-500/10 border-green-500/20' },
    red:   { num: 'text-red-400',   bg: 'bg-red-500/10 border-red-500/20' },
    amber: { num: 'text-amber-400', bg: 'bg-amber-500/10 border-amber-500/20' },
    slate: { num: 'text-slate-400', bg: 'bg-slate-800 border-slate-700' },
  };
  const c = colors[color] || colors.slate;
  return (
    <div className={`relative rounded-xl border ${c.bg} p-4 text-center`}>
      {tooltip && (
        <button
          className="absolute top-2 right-2 text-slate-600 hover:text-slate-400 transition-colors"
          onMouseEnter={() => setShow(true)}
          onMouseLeave={() => setShow(false)}
          onClick={() => setShow((v) => !v)}
          aria-label={`Info about ${label}`}
        >
          <InfoIcon />
        </button>
      )}
      <div className={`text-3xl font-bold ${c.num} tabular-nums`}>{count}</div>
      <div className="text-xs text-slate-500 mt-1 font-medium uppercase tracking-wider">{label}</div>
      {show && tooltip && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-52 max-w-[calc(100vw-2rem)] bg-slate-800 border border-slate-700 text-slate-300 text-xs rounded-xl px-3 py-2.5 shadow-xl z-10 leading-relaxed text-left pointer-events-none">
          {tooltip}
          <div className="absolute top-full left-1/2 -translate-x-1/2 border-4 border-transparent border-t-slate-700" />
        </div>
      )}
    </div>
  );
}

export default function PublicView() {
  const [airlines, setAirlines] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [lastSync, setLastSync] = useState(staticData.exported_at || null);

  useEffect(() => {
    api.get('/airlines')
      .then(({ data }) => setAirlines(data || []))
      .catch(() => {
        // No backend available (e.g. Netlify static deploy) — use bundled snapshot
        setAirlines(staticData.airlines || []);
        if (staticData.exported_at) setLastSync(staticData.exported_at);
      })
      .finally(() => setLoading(false));

    api.get('/last-sync')
      .then(({ data }) => { if (data.last_sync) setLastSync(data.last_sync); })
      .catch(() => {});
  }, []);

  const filtered = useMemo(() => {
    return airlines
      .filter((a) => {
        const q = search.toLowerCase();
        const matchSearch =
          !q ||
          a.name.toLowerCase().includes(q) ||
          a.iata_code?.toLowerCase().includes(q) ||
          a.destinations?.some((d) => d.toLowerCase().includes(q));
        const matchFilter = filter === 'all' || a.status === filter;
        return matchSearch && matchFilter;
      })
      .sort((a, b) => {
        const israeliDiff = (b.is_israeli ? 1 : 0) - (a.is_israeli ? 1 : 0);
        if (israeliDiff !== 0) return israeliDiff;
        if (a.is_israeli && b.is_israeli) {
          return ISRAELI_ORDER[a.name] - ISRAELI_ORDER[b.name];
        }
        const statusDiff = STATUS_ORDER[a.status] - STATUS_ORDER[b.status];
        if (statusDiff !== 0) return statusDiff;
        const routeDiff = (b.destinations?.length ?? 0) - (a.destinations?.length ?? 0);
        return routeDiff !== 0 ? routeDiff : a.name.localeCompare(b.name);
      });
  }, [airlines, search, filter]);

  const counts = useMemo(() => ({
    flying: airlines.filter((a) => a.status === 'flying').length,
    partial: airlines.filter((a) => a.status === 'partial').length,
    not_flying: airlines.filter((a) => a.status === 'not_flying').length,
  }), [airlines]);

const FILTERS = [
    { value: 'all',        label: 'All',        count: airlines.length },
    { value: 'flying',     label: 'Flying',     count: counts.flying },
    { value: 'not_flying', label: 'Not Flying', count: counts.not_flying },
    { value: 'partial',    label: 'Limited',    count: counts.partial },
  ];

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">

        {/* Hero */}
        <div className="mb-10">
          <h1 className="text-3xl sm:text-5xl font-extrabold text-white tracking-tight mb-3">
            Israel Flights Status
          </h1>
          <p className="text-slate-400 text-base max-w-none">
            Live tracking of airlines flying to and from Tel Aviv Ben Gurion Airport (TLV).
          </p>
          <div className="flex items-center gap-3 mt-3">
            {lastSync && (
              <p className="text-sm text-slate-500 flex items-center gap-1.5">
                <span className="w-1.5 h-1.5 rounded-full bg-green-400 inline-block" />
                Last updated: {new Date(lastSync).toLocaleString('en-GB', {
                  day: 'numeric', month: 'short', year: 'numeric',
                  hour: '2-digit', minute: '2-digit',
                })}
              </p>
            )}
          </div>
          <p className="text-xs text-slate-500 mt-2">
            * Information is based on official airline announcements and may change at short notice. Always verify the status of your flight directly with the airline or on their website before travelling.
          </p>
        </div>

        {/* Stats */}
        {!loading && (
          <div className="grid grid-cols-3 gap-3 mb-8">
            <StatCard count={counts.flying}     label="Flying"      color="green" tooltip={STATUS_TOOLTIPS.flying} />
            <StatCard count={counts.not_flying} label="Not Flying"  color="red"   tooltip={STATUS_TOOLTIPS.not_flying} />
            <StatCard count={counts.partial}    label="Limited"     color="amber" tooltip={STATUS_TOOLTIPS.partial} />
          </div>
        )}

        {/* Controls */}
        <div className="flex flex-col sm:flex-row gap-3 mb-6">

          {/* Search */}
          <div className="relative flex-1">
            <div className="absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none">
              <SearchIcon />
            </div>
            <input
              type="text"
              placeholder="Search airlines, IATA codes, routes…"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-9 pr-4 py-2.5 bg-slate-900 border border-slate-700 rounded-xl text-sm text-white placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition"
            />
          </div>

          {/* Filter pills */}
          <div className="flex gap-1 sm:gap-1.5 flex-nowrap overflow-x-auto pb-0.5">
            {FILTERS.map(({ value, label, count }) => (
              <button
                key={value}
                onClick={() => setFilter(value)}
                className={`px-2 sm:px-3 py-1.5 sm:py-2.5 rounded-xl text-xs font-semibold transition-all whitespace-nowrap flex-shrink-0 ${
                  filter === value
                    ? 'bg-blue-600 text-white shadow-lg shadow-blue-500/20'
                    : 'bg-slate-900 border border-slate-700 text-slate-400 hover:text-white hover:border-slate-600'
                }`}
              >
                {label}
                <span className={`ml-1 sm:ml-1.5 px-1 sm:px-1.5 py-0.5 rounded-full text-xs ${
                  filter === value ? 'bg-blue-500/40 text-blue-200' : 'bg-slate-800 text-slate-500'
                }`}>
                  {count}
                </span>
              </button>
            ))}
          </div>

        </div>

        {/* Content */}
        {loading ? (
          <div className="flex items-center justify-center py-32 text-slate-600">
            <div className="text-center">
              <div className="text-5xl mb-4 animate-pulse">✈️</div>
              <p className="text-sm">Loading flight data…</p>
            </div>
          </div>
        ) : error ? (
          <div className="text-center py-16 text-red-400 bg-red-500/10 rounded-2xl border border-red-500/20">
            <p>{error}</p>
          </div>
        ) : filtered.length === 0 ? (
          <div className="text-center py-20 text-slate-600">
            <p className="text-3xl mb-3">🔍</p>
            <p className="text-sm">No airlines match your search.</p>
            <button
              onClick={() => { setSearch(''); setFilter('all'); }}
              className="mt-3 text-xs text-blue-500 hover:text-blue-400 transition-colors"
            >
              Clear filters
            </button>
          </div>
        ) : (
          <>
            <p className="text-xs text-slate-600 mb-4">
              Showing {filtered.length} of {airlines.length} airlines
            </p>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {filtered.map((airline) => (
                <AirlineCard key={airline.id} airline={airline} />
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
