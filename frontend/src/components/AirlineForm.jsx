import { useState } from 'react';

const EMPTY_FORM = {
  name: '',
  iata_code: '',
  status: 'flying',
  destinations: '',
  cancellation_reason: '',
  cancellation_end_date: '',
  notes: '',
  website: '',
  terminal: '',
  sync_locked: false,
};

export default function AirlineForm({ initial = null, onSubmit, onCancel, loading = false }) {
  const [form, setForm] = useState(() => {
    if (!initial) return EMPTY_FORM;
    return {
      ...initial,
      iata_code: initial.iata_code || '',
      destinations: Array.isArray(initial.destinations) ? initial.destinations.join(', ') : '',
      cancellation_reason: initial.cancellation_reason || '',
      cancellation_end_date: initial.cancellation_end_date || '',
      notes: initial.notes || '',
      website: initial.website || '',
      terminal: initial.terminal || '',
      sync_locked: true, // always lock when admin edits to prevent auto-sync from overwriting
    };
  });

  const set = (field) => (e) => setForm((prev) => ({ ...prev, [field]: e.target.value }));

  const handleSubmit = (e) => {
    e.preventDefault();
    onSubmit({
      ...form,
      iata_code: form.iata_code.trim().toUpperCase() || null,
      destinations: form.destinations
        ? form.destinations.split(',').map((d) => d.trim()).filter(Boolean)
        : [],
      cancellation_reason: form.cancellation_reason.trim() || null,
      cancellation_end_date: form.cancellation_end_date || null,
      notes: form.notes.trim() || null,
      website: form.website.trim() || null,
      terminal: form.terminal.trim() || null,
      sync_locked: form.sync_locked,
    });
  };

  const inputClass =
    'w-full px-3 py-2 bg-slate-800 border border-slate-700 text-white placeholder:text-slate-500 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent text-sm transition-colors';

  const labelClass = 'block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-1.5';

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      {/* Name + IATA */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="sm:col-span-2">
          <label className={labelClass}>
            Airline Name <span className="text-red-400">*</span>
          </label>
          <input
            type="text"
            value={form.name}
            onChange={set('name')}
            required
            placeholder="e.g. El Al"
            className={inputClass}
          />
        </div>
        <div>
          <label className={labelClass}>IATA Code</label>
          <input
            type="text"
            value={form.iata_code}
            onChange={set('iata_code')}
            placeholder="LY"
            maxLength={3}
            className={`${inputClass} uppercase font-mono tracking-widest`}
          />
        </div>
      </div>

      {/* Status */}
      <div>
        <label className={labelClass}>
          Status <span className="text-red-400">*</span>
        </label>
        <div className="grid grid-cols-3 gap-2">
          {[
            { value: 'flying',     label: 'Flying',     active: 'border-green-500 text-green-400 bg-green-500/10' },
            { value: 'not_flying', label: 'Not Flying', active: 'border-red-500 text-red-400 bg-red-500/10' },
            { value: 'partial',    label: 'Limited',    active: 'border-amber-500 text-amber-400 bg-amber-500/10' },
          ].map(({ value, label, active }) => (
            <button
              key={value}
              type="button"
              onClick={() => setForm((prev) => ({ ...prev, status: value }))}
              className={`px-3 py-2 rounded-lg border-2 text-xs font-semibold transition-all ${
                form.status === value ? active : 'border-slate-700 text-slate-500 hover:border-slate-600 hover:text-slate-400'
              }`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      {/* Destinations */}
      {(form.status === 'flying' || form.status === 'partial') && (
        <div>
          <label className={labelClass}>
            Routes
            <span className="text-slate-600 font-normal normal-case ml-1">(comma-separated)</span>
          </label>
          <input
            type="text"
            value={form.destinations}
            onChange={set('destinations')}
            placeholder="TLV-JFK, TLV-LHR, TLV-CDG"
            className={`${inputClass} font-mono`}
          />
        </div>
      )}

      {/* Cancellation info */}
      {form.status === 'not_flying' && (
        <div className="space-y-3 bg-red-500/5 border border-red-500/15 rounded-lg p-4">
          <p className="text-xs font-semibold text-red-400 uppercase tracking-wider">Cancellation Details</p>
          <div>
            <label className={labelClass}>Reason</label>
            <input
              type="text"
              value={form.cancellation_reason}
              onChange={set('cancellation_reason')}
              placeholder="e.g. Security assessment ongoing"
              className={inputClass}
            />
          </div>
          <div>
            <label className={labelClass}>
              End Date
              <span className="text-slate-600 font-normal normal-case ml-1">(leave blank if unknown)</span>
            </label>
            <input
              type="date"
              value={form.cancellation_end_date}
              onChange={set('cancellation_end_date')}
              className={`${inputClass} [color-scheme:dark]`}
            />
          </div>
        </div>
      )}

      {/* Terminal */}
      <div>
        <label className={labelClass}>Terminal</label>
        <input
          type="text"
          value={form.terminal}
          onChange={set('terminal')}
          placeholder="e.g. 3, 1"
          className={inputClass}
        />
      </div>

      {/* Notes */}
      <div>
        <label className={labelClass}>Notes</label>
        <textarea
          value={form.notes}
          onChange={set('notes')}
          rows={3}
          placeholder="Additional notes or context..."
          className={`${inputClass} resize-none`}
        />
      </div>

      {/* Website */}
      <div>
        <label className={labelClass}>Website</label>
        <input
          type="url"
          value={form.website}
          onChange={set('website')}
          placeholder="https://www.airline.com"
          className={inputClass}
        />
      </div>

      {/* Sync lock */}
      <label className="flex items-center justify-between gap-3 bg-slate-800/60 border border-slate-700 rounded-lg px-4 py-3 cursor-pointer hover:bg-slate-800 transition-colors">
        <div>
          <p className="text-sm font-medium text-slate-300">Lock from auto-sync</p>
          <p className="text-xs text-slate-500 mt-0.5">Keep this ON to protect your changes from being overwritten by auto-sync</p>
        </div>
        <div
          onClick={() => setForm((prev) => ({ ...prev, sync_locked: !prev.sync_locked }))}
          className={`relative w-10 h-6 rounded-full transition-colors flex-shrink-0 ${form.sync_locked ? 'bg-amber-500' : 'bg-slate-700'}`}
        >
          <span className={`absolute top-1 w-4 h-4 bg-white rounded-full shadow transition-transform ${form.sync_locked ? 'translate-x-5' : 'translate-x-1'}`} />
        </div>
      </label>

      {/* Buttons */}
      <div className="flex gap-3 pt-1">
        <button
          type="submit"
          disabled={loading}
          className="flex-1 bg-blue-600 hover:bg-blue-500 disabled:opacity-40 text-white px-4 py-2.5 rounded-lg font-semibold text-sm transition-colors"
        >
          {loading ? 'Saving...' : initial ? 'Update Airline' : 'Add Airline'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg text-slate-300 hover:text-white hover:bg-slate-700 font-semibold text-sm transition-colors"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
