import { useEffect, useState, useCallback } from 'react';
import { Navigate } from 'react-router-dom';
import {
  Globe, Plus, MapPin, Users, FileText, Edit2, Trash2,
  UserPlus, UserMinus, X, ChevronDown, ChevronUp, BarChart3,
} from 'lucide-react';
import { zoneService, authService } from '../services';
import { useAuth } from '../hooks/useAuth';
import { cn } from '../lib/utils';

export default function ZoneManagement() {
  const { user } = useAuth();
  const [zones, setZones] = useState([]);
  const [officials, setOfficials] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [editingZone, setEditingZone] = useState(null);
  const [expandedZone, setExpandedZone] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);
  const [error, setError] = useState('');

  const emptyForm = {
    name: '',
    description: '',
    lat_min: '',
    lat_max: '',
    lng_min: '',
    lng_max: '',
  };
  const [form, setForm] = useState(emptyForm);

  /* Guard: only admin */
  if (!user || user.role !== 'admin') {
    return <Navigate to="/dashboard" replace />;
  }

  const load = useCallback(async () => {
    setLoading(true);
    try {
      const [zonesRes, officialsRes] = await Promise.all([
        zoneService.list(),
        authService.officials(),
      ]);
      setZones(zonesRes.data || []);
      setOfficials(officialsRes.data || []);
    } catch {
      /* ignore */
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { load(); }, [load]);

  const resetForm = () => {
    setForm(emptyForm);
    setEditingZone(null);
    setShowForm(false);
    setError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setActionLoading(true);

    const payload = {
      name: form.name,
      description: form.description || undefined,
      lat_min: parseFloat(form.lat_min),
      lat_max: parseFloat(form.lat_max),
      lng_min: parseFloat(form.lng_min),
      lng_max: parseFloat(form.lng_max),
    };

    if (isNaN(payload.lat_min) || isNaN(payload.lat_max) || isNaN(payload.lng_min) || isNaN(payload.lng_max)) {
      setError('All coordinate fields must be valid numbers.');
      setActionLoading(false);
      return;
    }

    try {
      if (editingZone) {
        await zoneService.update(editingZone.id, payload);
      } else {
        await zoneService.create(payload);
      }
      resetForm();
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to save zone.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleEdit = (zone) => {
    setForm({
      name: zone.name,
      description: zone.description || '',
      lat_min: String(zone.lat_min),
      lat_max: String(zone.lat_max),
      lng_min: String(zone.lng_min),
      lng_max: String(zone.lng_max),
    });
    setEditingZone(zone);
    setShowForm(true);
    setError('');
  };

  const handleDelete = async (zoneId) => {
    if (!confirm('Are you sure you want to delete this zone?')) return;
    setActionLoading(true);
    try {
      await zoneService.update(zoneId, { is_active: false });
      await load();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  };

  const handleAssign = async (zoneId, userId) => {
    setActionLoading(true);
    try {
      await zoneService.assign({ zone_id: zoneId, user_id: userId });
      await load();
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to assign official.');
    } finally {
      setActionLoading(false);
    }
  };

  const handleUnassign = async (userId) => {
    setActionLoading(true);
    try {
      await zoneService.unassign(userId);
      await load();
    } catch {
      /* ignore */
    } finally {
      setActionLoading(false);
    }
  };

  const getUnassignedOfficials = () => {
    return officials.filter((o) => !o.zone_id);
  };

  const getZoneOfficials = (zoneId) => {
    return officials.filter((o) => o.zone_id === zoneId);
  };

  if (loading && !zones.length) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-brand-500 border-t-transparent" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Zone Management</h1>
          <p className="text-sm text-gray-500 mt-1">Create geographic zones and assign officials to manage report verification.</p>
        </div>
        <button
          onClick={() => {
            if (showForm && !editingZone) {
              resetForm();
            } else {
              resetForm();
              setShowForm(true);
            }
          }}
          className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-4 py-2.5 text-sm font-medium text-white shadow-sm hover:bg-brand-700 transition"
        >
          {showForm && !editingZone ? <X className="h-4 w-4" /> : <Plus className="h-4 w-4" />}
          {showForm && !editingZone ? 'Cancel' : 'New Zone'}
        </button>
      </div>

      {/* Create / Edit form */}
      {showForm && (
        <form
          onSubmit={handleSubmit}
          className="rounded-xl border border-gray-200 bg-white p-6 space-y-4"
        >
          <h2 className="text-lg font-semibold text-gray-900">
            {editingZone ? 'Edit Zone' : 'Create New Zone'}
          </h2>

          {error && (
            <div className="rounded-lg bg-red-50 border border-red-200 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Zone Name *</label>
              <input
                type="text"
                required
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g., Mumbai Coastal Zone"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Description</label>
              <textarea
                value={form.description}
                onChange={(e) => setForm({ ...form, description: e.target.value })}
                placeholder="Brief description of the zone area..."
                rows={2}
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20 resize-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Latitude Min *</label>
              <input
                type="number"
                step="any"
                required
                value={form.lat_min}
                onChange={(e) => setForm({ ...form, lat_min: e.target.value })}
                placeholder="e.g., 18.89"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Latitude Max *</label>
              <input
                type="number"
                step="any"
                required
                value={form.lat_max}
                onChange={(e) => setForm({ ...form, lat_max: e.target.value })}
                placeholder="e.g., 19.27"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Longitude Min *</label>
              <input
                type="number"
                step="any"
                required
                value={form.lng_min}
                onChange={(e) => setForm({ ...form, lng_min: e.target.value })}
                placeholder="e.g., 72.77"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-600 mb-1.5">Longitude Max *</label>
              <input
                type="number"
                step="any"
                required
                value={form.lng_max}
                onChange={(e) => setForm({ ...form, lng_max: e.target.value })}
                placeholder="e.g., 72.98"
                className="w-full rounded-lg border border-gray-200 px-3 py-2.5 text-sm outline-none focus:border-brand-500 focus:ring-1 focus:ring-brand-500/20"
              />
            </div>
          </div>

          <div className="flex items-center gap-3 pt-2">
            <button
              type="submit"
              disabled={actionLoading}
              className="inline-flex items-center gap-2 rounded-lg bg-brand-600 px-5 py-2.5 text-sm font-medium text-white hover:bg-brand-700 disabled:opacity-50 transition"
            >
              {actionLoading ? (
                <div className="h-4 w-4 animate-spin rounded-full border-2 border-white border-t-transparent" />
              ) : editingZone ? (
                <Edit2 className="h-4 w-4" />
              ) : (
                <Plus className="h-4 w-4" />
              )}
              {editingZone ? 'Update Zone' : 'Create Zone'}
            </button>
            {editingZone && (
              <button
                type="button"
                onClick={resetForm}
                className="rounded-lg border border-gray-200 px-4 py-2.5 text-sm font-medium text-gray-600 hover:bg-gray-50 transition"
              >
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      )}

      {/* Zones list */}
      {zones.length === 0 ? (
        <div className="rounded-xl border-2 border-dashed border-gray-200 bg-gray-50/50 px-6 py-16 text-center">
          <Globe className="h-10 w-10 text-gray-300 mx-auto mb-3" />
          <p className="text-sm font-medium text-gray-500">No zones created yet</p>
          <p className="text-xs text-gray-400 mt-1">Click "New Zone" to define your first geographic zone.</p>
        </div>
      ) : (
        <div className="space-y-4">
          {zones.map((zone) => {
            const zoneOfficials = getZoneOfficials(zone.id);
            const unassigned = getUnassignedOfficials();
            const isExpanded = expandedZone === zone.id;

            return (
              <div
                key={zone.id}
                className="rounded-xl border border-gray-200 bg-white overflow-hidden"
              >
                {/* Zone header */}
                <div className="flex items-center justify-between p-5">
                  <div className="flex items-center gap-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand-50 text-brand-600 shrink-0">
                      <MapPin className="h-5 w-5" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-gray-900">{zone.name}</h3>
                      {zone.description && (
                        <p className="text-xs text-gray-500 mt-0.5">{zone.description}</p>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    {/* Quick stats */}
                    <div className="hidden sm:flex items-center gap-4 mr-4">
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <FileText className="h-3.5 w-3.5" />
                        {zone.report_count ?? 0} reports
                      </span>
                      <span className="inline-flex items-center gap-1.5 text-xs text-gray-500">
                        <Users className="h-3.5 w-3.5" />
                        {zone.assigned_user_count ?? zoneOfficials.length} officials
                      </span>
                    </div>

                    <button
                      onClick={() => handleEdit(zone)}
                      className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                      title="Edit zone"
                    >
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(zone.id)}
                      className="rounded-lg p-2 text-gray-400 hover:text-red-600 hover:bg-red-50 transition"
                      title="Delete zone"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => setExpandedZone(isExpanded ? null : zone.id)}
                      className="rounded-lg p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-50 transition"
                    >
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </button>
                  </div>
                </div>

                {/* Expanded panel */}
                {isExpanded && (
                  <div className="border-t border-gray-100 p-5 space-y-5 bg-gray-50/30">
                    {/* Coordinates */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Bounding Box</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        {[
                          { label: 'Lat Min', val: zone.lat_min },
                          { label: 'Lat Max', val: zone.lat_max },
                          { label: 'Lng Min', val: zone.lng_min },
                          { label: 'Lng Max', val: zone.lng_max },
                        ].map(({ label, val }) => (
                          <div key={label} className="rounded-lg bg-white border border-gray-200 px-3 py-2">
                            <p className="text-[10px] text-gray-400 uppercase tracking-wider">{label}</p>
                            <p className="text-sm font-mono text-gray-700">{val?.toFixed(4) ?? '—'}</p>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Assigned officials */}
                    <div>
                      <p className="text-xs font-medium text-gray-500 mb-2">Assigned Officials</p>
                      {zoneOfficials.length === 0 ? (
                        <p className="text-xs text-gray-400 italic">No officials assigned yet.</p>
                      ) : (
                        <div className="flex flex-wrap gap-2">
                          {zoneOfficials.map((off) => (
                            <div
                              key={off.id}
                              className="inline-flex items-center gap-2 rounded-full bg-white border border-gray-200 px-3 py-1.5"
                            >
                              <div className="h-5 w-5 rounded-full bg-brand-100 flex items-center justify-center">
                                <span className="text-[10px] font-bold text-brand-700">
                                  {(off.full_name || off.email || '?')[0].toUpperCase()}
                                </span>
                              </div>
                              <span className="text-xs text-gray-700">{off.full_name || off.email}</span>
                              <span className="text-[10px] px-1.5 py-0.5 rounded bg-gray-100 text-gray-500">
                                {off.role}
                              </span>
                              <button
                                onClick={() => handleUnassign(off.id)}
                                className="ml-1 text-gray-400 hover:text-red-500 transition"
                                title="Remove from zone"
                              >
                                <UserMinus className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}

                      {/* Assign dropdown */}
                      {unassigned.length > 0 && (
                        <div className="mt-3 flex items-center gap-2">
                          <UserPlus className="h-4 w-4 text-gray-400" />
                          <select
                            defaultValue=""
                            onChange={(e) => {
                              if (e.target.value) handleAssign(zone.id, parseInt(e.target.value));
                              e.target.value = '';
                            }}
                            className="rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs text-gray-700 focus:border-brand-500 outline-none"
                          >
                            <option value="" disabled>Assign an official…</option>
                            {unassigned.map((off) => (
                              <option key={off.id} value={off.id}>
                                {off.full_name || off.email} ({off.role})
                              </option>
                            ))}
                          </select>
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
