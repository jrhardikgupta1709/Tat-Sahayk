import { useState, useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Send, Upload, X, MapPin, Loader2, Brain, ImageIcon,
  AlertTriangle, CheckCircle2,
} from 'lucide-react';
import { reportService, mediaService, mlService } from '../services';

const SEVERITIES = ['low', 'medium', 'high', 'critical'];

export default function CreateReport() {
  const navigate = useNavigate();
  const fileRef = useRef(null);

  const [form, setForm] = useState({
    description: '',
    hazard_type: '',
    severity: 'medium',
    latitude: '',
    longitude: '',
  });
  const [images, setImages] = useState([]); // { file, preview, uploading, filename }
  const [mlImage, setMlImage] = useState(null);
  const [mlLoading, setMlLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [locStatus, setLocStatus] = useState('detecting'); // detecting | detected | failed

  const set = (k) => (e) => setForm((p) => ({ ...p, [k]: e.target.value }));

  /* ---- Auto-detect location on mount ---- */
  useEffect(() => {
    if (!navigator.geolocation) {
      setLocStatus('failed');
      setError('Geolocation is not supported by your browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setForm((p) => ({
          ...p,
          latitude: pos.coords.latitude.toFixed(6),
          longitude: pos.coords.longitude.toFixed(6),
        }));
        setLocStatus('detected');
      },
      () => {
        setLocStatus('failed');
        setError('Could not detect your location. Please allow location access.');
      },
      { enableHighAccuracy: true, timeout: 15000 },
    );
  }, []);

  /* ---- Image handling ---- */
  const handleFiles = async (e) => {
    const files = Array.from(e.target.files);
    for (const file of files) {
      const preview = URL.createObjectURL(file);
      const entry = { file, preview, uploading: true, filename: null };
      setImages((prev) => [...prev, entry]);

      try {
        const data = await mediaService.upload(file);
        setImages((prev) =>
          prev.map((img) =>
            img.file === file ? { ...img, uploading: false, filename: data.file_path } : img,
          ),
        );

        // Run ML image analysis on first image
        if (images.length === 0) {
          setMlLoading(true);
          const imgResult = await mlService.analyzeImage(file);
          setMlImage(imgResult);
          setMlLoading(false);
        }
      } catch {
        setImages((prev) => prev.filter((img) => img.file !== file));
      }
    }
    e.target.value = '';
  };

  const removeImage = (idx) => {
    setImages((prev) => {
      URL.revokeObjectURL(prev[idx].preview);
      return prev.filter((_, i) => i !== idx);
    });
  };

  /* ---- Submit ---- */
  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!form.latitude || !form.longitude) {
      setError('Location is required');
      return;
    }

    setSubmitting(true);
    try {
      const payload = {
        ...form,
        latitude: parseFloat(form.latitude),
        longitude: parseFloat(form.longitude),
        image_filenames: images.filter((i) => i.filename).map((i) => i.filename),
      };
      await reportService.create(payload);
      navigate('/reports');
    } catch (err) {
      setError(err.response?.data?.detail || 'Failed to submit report');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">New Hazard Report</h1>
        <p className="text-sm text-gray-500 mt-1">
          Describe the coastal hazard you've observed. Our AI will automatically classify it on submission.
        </p>
      </div>

      {error && (
        <div className="mb-6 rounded-lg bg-red-50 border border-red-200 p-3 text-sm text-red-700">
          {error}
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* ====== Main form ====== */}
        <form onSubmit={handleSubmit} className="lg:col-span-2 space-y-6">
          {/* Description */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Hazard Details</h2>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Description <span className="text-red-400">*</span>
              </label>
              <textarea
                value={form.description}
                onChange={set('description')}
                required
                rows={4}
                className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition resize-none"
                placeholder="Describe what you observed — erosion, flooding, debris, pollution, etc."
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Hazard Type</label>
                <input
                  value={form.hazard_type}
                  onChange={set('hazard_type')}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 placeholder:text-gray-400 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                  placeholder="e.g. Erosion, Oil spill"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1.5">Severity</label>
                <select
                  value={form.severity}
                  onChange={set('severity')}
                  className="w-full rounded-lg border border-gray-300 px-3.5 py-2.5 text-sm text-gray-900 focus:border-brand-500 focus:ring-2 focus:ring-brand-500/20 outline-none transition"
                >
                  {SEVERITIES.map((s) => (
                    <option key={s} value={s}>
                      {s.charAt(0).toUpperCase() + s.slice(1)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Location — read-only, auto-detected */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-3">
            <h2 className="text-sm font-semibold text-gray-900">Location</h2>
            {locStatus === 'detecting' && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Detecting your location…
              </div>
            )}
            {locStatus === 'detected' && (
              <div className="flex items-center gap-2 rounded-lg bg-emerald-50 border border-emerald-200 px-4 py-3">
                <MapPin className="h-4 w-4 text-emerald-600 shrink-0" />
                <p className="text-sm text-emerald-800">
                  <span className="font-medium">Location detected:</span>{' '}
                  {form.latitude}, {form.longitude}
                </p>
              </div>
            )}
            {locStatus === 'failed' && (
              <div className="flex items-center gap-2 rounded-lg bg-amber-50 border border-amber-200 px-4 py-3">
                <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0" />
                <p className="text-sm text-amber-800">
                  Could not detect location. Please enable location access and reload.
                </p>
              </div>
            )}
          </div>

          {/* Images */}
          <div className="rounded-xl border border-gray-200 bg-white p-6 space-y-4">
            <h2 className="text-sm font-semibold text-gray-900">Photos</h2>
            <input
              ref={fileRef}
              type="file"
              accept="image/*"
              multiple
              onChange={handleFiles}
              className="hidden"
            />
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className="flex items-center justify-center w-full rounded-lg border-2 border-dashed border-gray-300 py-8 text-gray-400 hover:border-brand-400 hover:text-brand-500 transition"
            >
              <div className="text-center">
                <Upload className="h-6 w-6 mx-auto mb-2" />
                <p className="text-sm font-medium">Click to upload images</p>
                <p className="text-xs mt-1">PNG, JPG up to 10 MB</p>
              </div>
            </button>

            {images.length > 0 && (
              <div className="grid grid-cols-3 gap-3">
                {images.map((img, i) => (
                  <div key={i} className="relative group rounded-lg overflow-hidden border border-gray-200">
                    <img src={img.preview} alt="" className="h-24 w-full object-cover" />
                    {img.uploading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/70">
                        <Loader2 className="h-5 w-5 animate-spin text-brand-500" />
                      </div>
                    )}
                    <button
                      type="button"
                      onClick={() => removeImage(i)}
                      className="absolute top-1 right-1 rounded-full bg-black/50 p-0.5 text-white opacity-0 group-hover:opacity-100 transition"
                    >
                      <X className="h-3.5 w-3.5" />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting || locStatus !== 'detected'}
            className="w-full flex items-center justify-center gap-2 rounded-xl bg-brand-500 py-3 text-sm font-semibold text-white hover:bg-brand-600 disabled:opacity-50 transition"
          >
            {submitting ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
            {submitting ? 'Submitting…' : 'Submit Report'}
          </button>
        </form>

        {/* ====== ML sidebar ====== */}
        <aside className="space-y-5">
          <div className="rounded-xl border border-gray-200 bg-white p-5">
            <div className="flex items-center gap-2 mb-4">
              <Brain className="h-4 w-4 text-brand-500" />
              <h3 className="text-sm font-semibold text-gray-900">AI Analysis</h3>
            </div>

            {mlLoading && (
              <div className="flex items-center gap-2 text-sm text-gray-500">
                <Loader2 className="h-4 w-4 animate-spin" /> Analyzing…
              </div>
            )}

            {!mlLoading && (
              <p className="text-xs text-gray-400 leading-relaxed">
                AI will automatically analyze your report when you submit it. 
                Hazard type, severity, and credibility will be determined by our ML models.
              </p>
            )}
          </div>

          {mlImage && (
            <div className="rounded-xl border border-gray-200 bg-white p-5">
              <div className="flex items-center gap-2 mb-4">
                <ImageIcon className="h-4 w-4 text-ocean-500" />
                <h3 className="text-sm font-semibold text-gray-900">Image Analysis</h3>
              </div>
              <div className="space-y-3 text-sm">
                {mlImage.classification && (
                  <Row label="Classification" value={mlImage.classification} />
                )}
                {mlImage.confidence != null && (
                  <Row label="Confidence" value={`${(mlImage.confidence * 100).toFixed(0)}%`} />
                )}
                {mlImage.hazard_detected != null && (
                  <Row label="Hazard" value={mlImage.hazard_detected ? 'Yes' : 'No'} />
                )}
              </div>
            </div>
          )}
        </aside>
      </div>
    </div>
  );
}

function Row({ label, value }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-xs text-gray-500">{label}</span>
      <span className="text-xs font-medium text-gray-900 capitalize">{value}</span>
    </div>
  );
}
