import { useState, useEffect } from 'react';
import StatusBadge from './StatusBadge';

const BORDER = {
  flying: 'border-l-green-500',
  not_flying: 'border-l-red-500',
  partial: 'border-l-amber-500',
};

function formatDate(dateStr) {
  if (!dateStr) return null;
  return new Date(dateStr).toLocaleDateString('en-GB', {
    day: 'numeric', month: 'short', year: 'numeric',
  });
}

function AirlineModal({ airline, onClose }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative bg-slate-900 border border-slate-800 border-l-4 ${BORDER[airline.status] || 'border-l-slate-600'} rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-2xl">
          <div className="flex items-center gap-2">
            {airline.iata_code && (
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded tracking-widest">
                {airline.iata_code}
              </span>
            )}
            <h2 className="text-base font-semibold text-white">{airline.name}</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors ml-3"
          >
            ✕
          </button>
        </div>

        <div className="px-6 py-5 space-y-4">
          <div className="flex items-center gap-2">
            <span className="text-sm text-slate-500 font-semibold uppercase tracking-wider">Status</span>
            <StatusBadge status={airline.status} />
          </div>

          {/* Routes */}
          {(airline.status === 'flying' || airline.status === 'partial') && airline.destinations?.length > 0 && (
            <div>
              <p className="text-sm text-slate-500 mb-2 uppercase tracking-wider font-semibold">Routes</p>
              <div className="flex flex-wrap gap-1.5">
                {airline.destinations.map((dest, i) => (
                  <span key={i} className="text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono">
                    {dest}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Cancellation info */}
          {airline.status === 'not_flying' && (
            <div className="space-y-2">
              {airline.cancellation_reason && (
                <div>
                  <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Reason</p>
                  <p className="text-sm text-slate-300 leading-relaxed">{airline.cancellation_reason}</p>
                </div>
              )}
              <div>
                <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Until</p>
                {airline.cancellation_end_date
                  ? <p className="text-sm text-red-400 font-medium">
                      {formatDate(airline.cancellation_end_date)}
                      {!!airline.end_date_unconfirmed && (
                        <span className="text-slate-500 font-normal ml-1">(unconfirmed)</span>
                      )}
                    </p>
                  : <p className="text-sm text-red-500/60 font-medium">No end date announced</p>
                }
              </div>
            </div>
          )}

          {/* Terminal */}
          {airline.terminal && (
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Terminal</p>
              <p className="text-sm text-slate-300 font-medium">{airline.terminal}</p>
            </div>
          )}

          {/* Notes */}
          {airline.notes && (
            <div>
              <p className="text-sm text-slate-500 uppercase tracking-wider font-semibold mb-1">Notes</p>
              <p className="text-sm text-slate-300 leading-relaxed">{airline.notes}</p>
            </div>
          )}

          {/* Website */}
          {airline.website && (
            <a
              href={airline.website}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center gap-2 text-sm text-blue-400 hover:text-blue-300 transition-colors"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Visit airline website
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

export default function AirlineCard({ airline }) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <div
        onClick={() => setOpen(true)}
        className={`cursor-pointer bg-slate-900 rounded-xl border border-slate-800 border-l-4 ${BORDER[airline.status] || 'border-l-slate-600'} p-4 hover:bg-slate-800/70 transition-colors duration-150`}
      >
        {/* Name row + status badge */}
        <div className="flex items-center justify-between gap-2 mb-3">
          <div className="flex items-center gap-2 min-w-0">
            {airline.iata_code && (
              <span className="text-xs font-mono font-bold text-slate-400 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded tracking-widest flex-shrink-0">
                {airline.iata_code}
              </span>
            )}
            <h3 className="font-semibold text-white text-base leading-tight truncate">
              {airline.name}
            </h3>
          </div>
          <div className="flex-shrink-0">
            <StatusBadge status={airline.status} />
          </div>
        </div>

        {/* Routes — flying or partial */}
        {(airline.status === 'flying' || airline.status === 'partial') && airline.destinations?.length > 0 && (
          <div className="mb-2">
            <p className="text-sm text-slate-500 mb-1.5 uppercase tracking-wider font-semibold">Routes:</p>
            <div className="flex flex-wrap gap-1">
              {airline.destinations.map((dest, i) => (
                <span key={i} className="text-sm bg-blue-500/10 text-blue-400 border border-blue-500/20 px-2 py-0.5 rounded font-mono break-all">
                  {dest}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Cancellation info — not_flying */}
        {airline.status === 'not_flying' && (
          <div className="space-y-1">
            {airline.cancellation_reason && (
              <p className="text-sm text-slate-400 leading-snug">
                <span className="text-slate-500 uppercase tracking-wider text-sm font-semibold mr-1.5">Reason:</span>
                {airline.cancellation_reason}
              </p>
            )}
            {airline.cancellation_end_date ? (
              <p className="text-sm">
                <span className="text-slate-500 uppercase tracking-wider font-semibold mr-1.5">Until:</span>
                <span className="text-red-400 font-medium">{formatDate(airline.cancellation_end_date)}</span>
                {!!airline.end_date_unconfirmed && (
                  <span className="block sm:inline text-slate-500 font-normal sm:ml-1">(unconfirmed)</span>
                )}
              </p>
            ) : (
              <p className="text-sm text-red-500/60 font-medium">No end date announced</p>
            )}
            {airline.terminal && (
              <p className="text-sm text-slate-500">
                <span className="uppercase tracking-wider font-semibold mr-1.5">Terminal:</span>
                <span className="text-slate-300 font-medium">{airline.terminal}</span>
              </p>
            )}
          </div>
        )}

        {/* Terminal — flying or partial */}
        {airline.status !== 'not_flying' && airline.terminal && (
          <p className="text-sm text-slate-500 mt-2">
            <span className="uppercase tracking-wider font-semibold mr-1.5">Terminal:</span>
            <span className="text-slate-300 font-medium">{airline.terminal}</span>
          </p>
        )}

        {/* Notes */}
        {airline.notes && (
          <p className="text-sm text-slate-500 mt-2 leading-relaxed line-clamp-2">{airline.notes}</p>
        )}
      </div>

      {open && <AirlineModal airline={airline} onClose={() => setOpen(false)} />}
    </>
  );
}
