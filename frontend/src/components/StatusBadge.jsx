const STATUS_CONFIG = {
  flying: {
    label: 'Flying',
    className: 'bg-green-500/15 text-green-400 border border-green-500/25',
    dot: 'bg-green-400',
    pulse: true,
  },
  not_flying: {
    label: 'Not Flying',
    className: 'bg-red-500/15 text-red-400 border border-red-500/25',
    dot: 'bg-red-400',
    pulse: false,
  },
  partial: {
    label: 'Limited',
    className: 'bg-amber-500/15 text-amber-400 border border-amber-500/25',
    dot: 'bg-amber-400',
    pulse: false,
  },
};

export default function StatusBadge({ status, size = 'md' }) {
  const config = STATUS_CONFIG[status] || STATUS_CONFIG.partial;
  const sizeClass = size === 'sm' ? 'text-xs px-2 py-0.5' : 'text-sm px-3 py-1';

  return (
    <span className={`inline-flex items-center gap-1.5 rounded-full font-medium whitespace-nowrap ${config.className} ${sizeClass}`}>
      <span className="relative flex h-1.5 w-1.5 flex-shrink-0">
        {config.pulse && (
          <span className={`absolute inline-flex h-full w-full rounded-full ${config.dot} opacity-60 animate-ping`} />
        )}
        <span className={`relative inline-flex rounded-full h-1.5 w-1.5 ${config.dot}`} />
      </span>
      {config.label}
    </span>
  );
}
