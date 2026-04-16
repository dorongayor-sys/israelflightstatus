import { useState, useEffect } from 'react';
import Navbar from '../components/Navbar';
import AirlineForm from '../components/AirlineForm';
import StatusBadge from '../components/StatusBadge';
import ChangeLog from '../components/ChangeLog';
import api from '../api/client';
import staticData from '../data/airlines-static.json';

function Modal({ title, onClose, children }) {
  useEffect(() => {
    const handler = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm"
        onClick={onClose}
      />
      <div className="relative bg-slate-900 border border-slate-700 rounded-2xl shadow-2xl w-full max-w-lg max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between px-6 py-4 border-b border-slate-800 sticky top-0 bg-slate-900 rounded-t-2xl">
          <h2 className="text-base font-semibold text-white">{title}</h2>
          <button
            onClick={onClose}
            className="text-slate-500 hover:text-white w-8 h-8 flex items-center justify-center rounded-lg hover:bg-slate-800 transition-colors"
          >
            ✕
          </button>
        </div>
        <div className="px-6 py-5">{children}</div>
      </div>
    </div>
  );
}

function PlusIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
    </svg>
  );
}

export default function Dashboard() {
  const [airlines, setAirlines] = useState([]);
  const [changelog, setChangelog] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [activeTab, setActiveTab] = useState('airlines');
  const [showAddForm, setShowAddForm] = useState(false);
  const [editingAirline, setEditingAirline] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [search, setSearch] = useState('');
  const [syncing, setSyncing] = useState(false);

  const fetchAll = async () => {
    try {
      const [airlinesRes, changelogRes] = await Promise.all([
        api.get('/airlines'),
        api.get('/changelog'),
      ]);
      setAirlines(airlinesRes.data || []);
      setChangelog(changelogRes.data || []);
    } catch (err) {
      console.error('fetchAll error:', err?.response?.status, err?.response?.data, err?.message);
      // Fall back to static data so the dashboard is usable
      setAirlines(staticData.airlines || []);
      setChangelog(staticData.changelog || []);
      setError('Live data unavailable — showing cached snapshot. Changes may not save.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { fetchAll(); }, []);

  const handleAdd = async (data) => {
    setSaving(true);
    setError('');
    try {
      await api.post('/airlines', data);
      await fetchAll();
      setShowAddForm(false);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to add airline.');
    } finally {
      setSaving(false);
    }
  };

  const handleEdit = async (data) => {
    setSaving(true);
    setError('');
    try {
      await api.put(`/airlines/${editingAirline.id}`, data);
      await fetchAll();
      setEditingAirline(null);
    } catch (err) {
      setError(err.response?.data?.error || 'Failed to update airline.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setError('');
    try {
      await api.delete(`/airlines/${deleteTarget.id}`);
      await fetchAll();
      setDeleteTarget(null);
    } catch {
      setError('Failed to delete airline.');
    }
  };

  const filteredAirlines = airlines
    .filter((a) => {
      const q = search.toLowerCase();
      return !q || a.name.toLowerCase().includes(q) || a.iata_code?.toLowerCase().includes(q);
    })
    .sort((a, b) => a.name.localeCompare(b.name));

  const handleSync = async () => {
    setSyncing(true);
    try {
      await api.post('/sync');
      await fetchAll();
    } catch {
      setError('Sync failed. Check the server logs.');
    } finally {
      setSyncing(false);
    }
  };

  const counts = {
    flying: airlines.filter((a) => a.status === 'flying').length,
    partial: airlines.filter((a) => a.status === 'partial').length,
    not_flying: airlines.filter((a) => a.status === 'not_flying').length,
  };

  return (
    <div className="min-h-screen bg-slate-950">
      <Navbar isAdmin />

      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3 mb-6">
          <div>
            <h1 className="text-2xl font-bold text-white">Admin Dashboard</h1>
            <p className="text-slate-500 text-sm mt-0.5">
              {airlines.length} airlines · {counts.flying} flying · {counts.partial} partial · {counts.not_flying} not flying
            </p>
          </div>
          <div className="flex gap-2 flex-shrink-0">
            <button
              onClick={handleSync}
              disabled={syncing}
              className="flex items-center gap-2 bg-slate-700 hover:bg-slate-600 disabled:opacity-50 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors"
            >
              {syncing ? 'Syncing…' : 'Sync Now'}
            </button>
            <button
              onClick={() => { setShowAddForm(true); setEditingAirline(null); }}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-500 text-white px-4 py-2.5 rounded-xl font-medium text-sm transition-colors shadow-lg shadow-blue-500/20"
            >
              <PlusIcon />
              Add Airline
            </button>
          </div>
        </div>

        {/* Error */}
        {error && (
          <div className="mb-4 bg-red-500/10 text-red-400 text-sm px-4 py-3 rounded-xl border border-red-500/20 flex items-center justify-between">
            <span>{error}</span>
            <button onClick={() => setError('')} className="text-red-500 hover:text-red-300 ml-3">✕</button>
          </div>
        )}

        {/* Tabs */}
        <div className="flex gap-1 mb-6 bg-slate-900 border border-slate-800 p-1 rounded-xl w-fit">
          {['airlines', 'changelog'].map((tab) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-5 py-2 rounded-lg text-sm font-medium transition-all capitalize ${
                activeTab === tab
                  ? 'bg-blue-600 text-white shadow-sm'
                  : 'text-slate-500 hover:text-slate-300'
              }`}
            >
              {tab === 'airlines' ? `Airlines (${airlines.length})` : `Change Log (${changelog.length})`}
            </button>
          ))}
        </div>

        {/* Airlines Tab */}
        {activeTab === 'airlines' && (
          <>
            {/* Search */}
            <div className="mb-4">
              <input
                type="text"
                placeholder="Search airlines..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="px-4 py-2 bg-slate-900 border border-slate-700 text-white placeholder:text-slate-500 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 w-full sm:w-64"
              />
            </div>

            {loading ? (
              <div className="text-center py-16 text-slate-500 text-sm">Loading...</div>
            ) : (
              <div className="bg-slate-900 rounded-2xl border border-slate-800 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full min-w-[640px]">
                    <thead className="bg-slate-800/60 border-b border-slate-800">
                      <tr>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Airline</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Status</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden lg:table-cell">Routes / Info</th>
                        <th className="text-left px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider hidden md:table-cell">Updated</th>
                        <th className="text-right px-5 py-3.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800/60">
                      {filteredAirlines.map((airline) => (
                        <tr key={airline.id} className="hover:bg-slate-800/40 transition-colors group">
                          <td className="px-5 py-3.5">
                            <div className="flex items-center gap-2">
                              {airline.iata_code && (
                                <span className="text-xs font-mono font-bold text-slate-500 bg-slate-800 border border-slate-700 px-1.5 py-0.5 rounded tracking-wider">
                                  {airline.iata_code}
                                </span>
                              )}
                              <span className="font-medium text-white text-sm">{airline.name}</span>
                            </div>
                            {airline.notes && (
                              <p className="text-xs text-slate-500 mt-0.5 truncate max-w-[200px]">{airline.notes}</p>
                            )}
                          </td>
                          <td className="px-5 py-3.5">
                            <StatusBadge status={airline.status} size="sm" />
                          </td>
                          <td className="px-5 py-3.5 hidden lg:table-cell">
                            {airline.status === 'not_flying' ? (
                              <div className="text-xs text-slate-500 max-w-[200px]">
                                {airline.cancellation_reason || '—'}
                                {airline.cancellation_end_date && (
                                  <span className="ml-1 text-red-400">
                                    until {new Date(airline.cancellation_end_date).toLocaleDateString('en-GB')}
                                  </span>
                                )}
                              </div>
                            ) : (
                              <div className="flex flex-wrap gap-1">
                                {airline.destinations?.slice(0, 3).map((d, i) => (
                                  <span key={i} className="text-xs bg-blue-500/10 text-blue-400 border border-blue-500/20 px-1.5 py-0.5 rounded font-mono">
                                    {d}
                                  </span>
                                ))}
                                {airline.destinations?.length > 3 && (
                                  <span className="text-xs text-slate-500">+{airline.destinations.length - 3} more</span>
                                )}
                                {!airline.destinations?.length && <span className="text-xs text-slate-500">—</span>}
                              </div>
                            )}
                          </td>
                          <td className="px-5 py-3.5 hidden md:table-cell">
                            <span className="text-xs text-slate-500">
                              {new Date(airline.updated_at).toLocaleDateString('en-GB', {
                                day: 'numeric', month: 'short',
                              })}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 text-right">
                            <div className="flex items-center justify-end gap-1 opacity-100 sm:opacity-0 sm:group-hover:opacity-100 transition-opacity">
                              <button
                                onClick={() => { setEditingAirline(airline); setShowAddForm(false); }}
                                className="text-xs text-blue-400 hover:text-blue-300 px-2.5 py-1.5 rounded-lg hover:bg-blue-500/10 transition-colors font-medium"
                              >
                                Edit
                              </button>
                              <button
                                onClick={() => setDeleteTarget(airline)}
                                className="text-xs text-red-400 hover:text-red-300 px-2.5 py-1.5 rounded-lg hover:bg-red-500/10 transition-colors font-medium"
                              >
                                Delete
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>

                  {filteredAirlines.length === 0 && (
                    <div className="text-center py-16 text-slate-500 text-sm">
                      {search ? 'No airlines match your search.' : 'No airlines yet. Add one to get started.'}
                    </div>
                  )}
                </div>
              </div>
            )}
          </>
        )}

        {/* Changelog Tab */}
        {activeTab === 'changelog' && (
          <div className="bg-slate-900 rounded-2xl border border-slate-800 p-6">
            <ChangeLog entries={changelog} />
          </div>
        )}
      </div>

      {/* Add Modal */}
      {showAddForm && (
        <Modal title="Add Airline" onClose={() => setShowAddForm(false)}>
          <AirlineForm
            onSubmit={handleAdd}
            onCancel={() => setShowAddForm(false)}
            loading={saving}
          />
        </Modal>
      )}

      {/* Edit Modal */}
      {editingAirline && (
        <Modal title={`Edit: ${editingAirline.name}`} onClose={() => setEditingAirline(null)}>
          <AirlineForm
            initial={editingAirline}
            onSubmit={handleEdit}
            onCancel={() => setEditingAirline(null)}
            loading={saving}
          />
        </Modal>
      )}

      {/* Delete Confirm Modal */}
      {deleteTarget && (
        <Modal title="Confirm Delete" onClose={() => setDeleteTarget(null)}>
          <div className="text-center">
            <div className="text-5xl mb-4">⚠️</div>
            <p className="text-slate-300 mb-2">
              Are you sure you want to delete{' '}
              <span className="font-bold text-white">{deleteTarget.name}</span>?
            </p>
            <p className="text-sm text-slate-500 mb-6">This action cannot be undone.</p>
            <div className="flex gap-3">
              <button
                onClick={handleDelete}
                className="flex-1 bg-red-600 hover:bg-red-500 text-white px-4 py-2.5 rounded-xl font-semibold text-sm transition-colors"
              >
                Yes, Delete
              </button>
              <button
                onClick={() => setDeleteTarget(null)}
                className="flex-1 px-4 py-2.5 bg-slate-800 border border-slate-700 rounded-xl text-slate-300 hover:text-white hover:bg-slate-700 font-semibold text-sm transition-colors"
              >
                Cancel
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
}
