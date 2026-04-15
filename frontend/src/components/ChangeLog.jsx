const ACTION_STYLES = {
  created: 'text-green-400 bg-green-500/15 border border-green-500/25',
  updated: 'text-blue-400 bg-blue-500/15 border border-blue-500/25',
  deleted: 'text-red-400 bg-red-500/15 border border-red-500/25',
};

const STATUS_LABELS = {
  flying: 'Flying',
  not_flying: 'Not Flying',
  partial: 'Limited',
};

function formatRelative(dateStr) {
  const date = new Date(dateStr);
  const diff = Date.now() - date.getTime();
  const minutes = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);

  if (minutes < 1) return 'just now';
  if (minutes < 60) return `${minutes}m ago`;
  if (hours < 24) return `${hours}h ago`;
  if (days < 7) return `${days}d ago`;
  return date.toLocaleDateString('en-GB', { day: 'numeric', month: 'short' });
}

export default function ChangeLog({ entries }) {
  if (!entries?.length) {
    return (
      <div className="text-center py-12 text-slate-600">
        <p className="text-3xl mb-2">📋</p>
        <p className="text-sm">No changes recorded yet.</p>
      </div>
    );
  }

  return (
    <div className="space-y-2">
      {entries.map((entry) => (
        <div key={entry.id} className="flex items-start gap-3 p-3 bg-slate-800/50 rounded-lg border border-slate-800">
          <span
            className={`text-xs font-semibold px-2 py-0.5 rounded-full capitalize flex-shrink-0 mt-0.5 ${
              ACTION_STYLES[entry.action] || 'text-slate-400 bg-slate-800'
            }`}
          >
            {entry.action}
          </span>
          <div className="flex-1 min-w-0">
            <p className="text-sm text-slate-200">
              <span className="font-semibold">{entry.airline_name}</span>
              {entry.field_changed === 'status' && (
                <span className="text-slate-400">
                  {' '}— status:{' '}
                  <span className="font-mono text-xs">{STATUS_LABELS[entry.old_value] || entry.old_value}</span>
                  <span className="mx-1 text-slate-600">→</span>
                  <span className="font-mono text-xs font-semibold text-white">{STATUS_LABELS[entry.new_value] || entry.new_value}</span>
                </span>
              )}
              {entry.action === 'created' && (
                <span className="text-slate-500"> — added to tracker</span>
              )}
              {entry.action === 'deleted' && (
                <span className="text-slate-500"> — removed from tracker</span>
              )}
            </p>
            <p className="text-xs text-slate-600 mt-0.5" title={new Date(entry.changed_at).toLocaleString('en-GB')}>
              {formatRelative(entry.changed_at)}
            </p>
          </div>
        </div>
      ))}
    </div>
  );
}
