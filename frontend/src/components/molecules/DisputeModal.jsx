import React, { useState, useRef } from 'react';
import { X, AlertTriangle, Send, Video, UploadCloud } from 'lucide-react';
import { disputeService } from '../../services/disputeService';
import Button from '../atoms/Button';
import './DisputeModal.css';

const REASONS = [
  'Buku tidak sesuai deskripsi',
  'Buku tidak diterima',
  'Kondisi buku lebih buruk dari yang tercantum',
  'Buku salah dikirim',
  'Penjual tidak merespons',
  'Lainnya',
];

const ALLOWED_VIDEO_TYPES = ['video/mp4', 'video/webm', 'video/quicktime'];
const MAX_VIDEO_SIZE_MB = 100;

const DisputeModal = ({ order, onClose, onSuccess }) => {
  const [reason, setReason]             = useState('');
  const [description, setDescription]   = useState('');
  const [videoFile, setVideoFile]       = useState(null);
  const [videoPreview, setVideoPreview] = useState(null);
  const [videoError, setVideoError]     = useState('');
  const [loading, setLoading]           = useState(false);
  const [error, setError]               = useState('');
  const fileInputRef = useRef(null);

  const handleVideoChange = (e) => {
    const file = e.target.files[0];
    setVideoError('');
    setVideoFile(null);
    setVideoPreview(null);

    if (!file) return;

    if (!ALLOWED_VIDEO_TYPES.includes(file.type)) {
      setVideoError('Hanya file video yang diizinkan (MP4, WEBM, MOV).');
      e.target.value = '';
      return;
    }
    if (file.size > MAX_VIDEO_SIZE_MB * 1024 * 1024) {
      setVideoError(`Ukuran video terlalu besar. Maksimal ${MAX_VIDEO_SIZE_MB} MB.`);
      e.target.value = '';
      return;
    }

    setVideoFile(file);
    setVideoPreview(URL.createObjectURL(file));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason) { setError('Pilih alasan komplain terlebih dahulu'); return; }
    if (!videoFile) { setError('Video unboxing wajib diunggah.'); return; }
    setError('');
    setLoading(true);
    try {
      const res = await disputeService.reportDispute(order.id, reason, description, videoFile);
      if (res.success) {
        onSuccess(order.id);
      } else {
        setError(res.message || 'Gagal mengajukan komplain');
      }
    } catch (err) {
      setError(err.response?.data?.message || 'Terjadi kesalahan, coba lagi');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="dispute-overlay" onClick={onClose}>
      <div className="dispute-modal" onClick={e => e.stopPropagation()}>
        {/* Header */}
        <div className="dispute-modal-header">
          <div className="dispute-modal-title-row">
            <div className="dispute-modal-icon-wrap">
              <AlertTriangle size={20} color="#F59E0B" />
            </div>
            <div>
              <h3 className="dispute-modal-title">Ajukan Komplain</h3>
              <p className="dispute-modal-subtitle">Pesanan #{order.id}</p>
            </div>
          </div>
          <button className="dispute-modal-close" onClick={onClose} aria-label="Tutup">
            <X size={20} />
          </button>
        </div>

        {/* Info strip */}
        <div className="dispute-modal-info">
          <AlertTriangle size={14} />
          <span>
            Mengajukan komplain akan <strong>membekukan dana escrow</strong> hingga admin menyelesaikan
            tinjauan. Pastikan komplain Anda valid.
          </span>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="dispute-modal-form">
          <div className="dispute-form-group">
            <label className="dispute-label">Alasan Komplain <span>*</span></label>
            <div className="dispute-reason-grid">
              {REASONS.map(r => (
                <button
                  key={r}
                  type="button"
                  className={`dispute-reason-chip ${reason === r ? 'selected' : ''}`}
                  onClick={() => setReason(r)}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>

          <div className="dispute-form-group">
            <label className="dispute-label" htmlFor="dispute-desc">
              Keterangan Tambahan
              <span className="dispute-label-optional">(opsional)</span>
            </label>
            <textarea
              id="dispute-desc"
              className="dispute-textarea"
              rows={4}
              value={description}
              onChange={e => setDescription(e.target.value)}
              placeholder="Jelaskan lebih detail situasi yang terjadi..."
              maxLength={1000}
            />
            <span className="dispute-char-count">{description.length}/1000</span>
          </div>

          {/* ── Unboxing Video Upload ─────────────────────────── */}
          <div className="dispute-form-group">
            <label className="dispute-label" htmlFor="dispute-video">
              <Video size={15} style={{ marginRight: 4 }} />
              Upload Video Unboxing <span>*</span>
            </label>
            <p className="dispute-video-helper">
              Unggah video yang menunjukkan proses membuka paket. Video ini membantu admin
              memverifikasi komplain Anda.
            </p>
            <p className="dispute-video-formats">Format diterima: MP4, WEBM, atau MOV. Maks. {MAX_VIDEO_SIZE_MB} MB.</p>

            <div
              className={`dispute-video-dropzone${videoFile ? ' dispute-video-dropzone--has-file' : ''}`}
              onClick={() => fileInputRef.current?.click()}
            >
              {videoFile ? (
                <>
                  <Video size={20} className="dispute-video-icon-ok" />
                  <span className="dispute-video-filename">{videoFile.name}</span>
                  <span className="dispute-video-filesize">
                    ({(videoFile.size / 1024 / 1024).toFixed(1)} MB)
                  </span>
                  <button
                    type="button"
                    className="dispute-video-change"
                    onClick={e => { e.stopPropagation(); fileInputRef.current?.click(); }}
                  >
                    Ganti Video
                  </button>
                </>
              ) : (
                <>
                  <UploadCloud size={28} className="dispute-video-upload-icon" />
                  <span className="dispute-video-dropzone-text">Klik untuk memilih video</span>
                </>
              )}
            </div>

            <input
              ref={fileInputRef}
              id="dispute-video"
              type="file"
              accept="video/mp4,video/webm,video/quicktime,.mp4,.webm,.mov"
              onChange={handleVideoChange}
              style={{ display: 'none' }}
            />

            {videoError && (
              <div className="dispute-error" style={{ marginTop: '0.5rem' }}>
                <AlertTriangle size={14} />
                <span>{videoError}</span>
              </div>
            )}

            {/* Preview */}
            {videoPreview && (
              <div className="dispute-video-preview">
                <video
                  src={videoPreview}
                  controls
                  className="dispute-video-player"
                  preload="metadata"
                />
              </div>
            )}
          </div>
          {/* ─────────────────────────────────────────────────── */}

          {error && (
            <div className="dispute-error">
              <AlertTriangle size={14} />
              <span>{error}</span>
            </div>
          )}

          <div className="dispute-modal-footer">
            <Button type="button" variant="outline" onClick={onClose} disabled={loading}>
              Batal
            </Button>
            <Button
              type="submit"
              variant="warning"
              isLoading={loading}
              leftIcon={!loading && <Send size={15} />}
            >
              {loading ? 'Mengunggah...' : 'Kirim Komplain'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default DisputeModal;
