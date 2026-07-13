import React, { useState, useContext, useRef } from 'react';
import { AuthContext } from '../context/AuthContext';
import api from '../services/api';
import Typography from '../components/atoms/Typography';
import Input from '../components/atoms/Input';
import Button from '../components/atoms/Button';
import Badge from '../components/atoms/Badge';
import {
  User, Camera, CheckCircle, Clock, Save,
  Lock, Phone, MapPin, Mail, Eye, EyeOff, AlertCircle
} from 'lucide-react';
import './Profile.css';

const Profile = () => {
  const { user, setUser } = useContext(AuthContext);

  /* ── Form state ─────────────────────────────────────────── */
  const [form, setForm] = useState({
    name:            user?.name || '',
    phone:           user?.phone || '',
    address:         user?.address || '',
    nim:             user?.nim || '',
    university:      user?.university || '',
    currentPassword: '',
    newPassword:     '',
    confirmPassword: '',
  });
  
  const [ktmForm, setKtmForm] = useState({
    nim: user?.nim || '',
    university: user?.university || '',
  });
  
  const [ktmFile, setKtmFile] = useState(null);
  const [selfieFile, setSelfieFile] = useState(null);
  const [ktmPreview, setKtmPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [uploadingKtm, setUploadingKtm] = useState(false);
  const [avatarFile, setAvatarFile]   = useState(null);
  const [avatarPreview, setAvatarPreview] = useState(null);
  const [saving, setSaving]           = useState(false);
  const [successMsg, setSuccessMsg]   = useState('');
  const [errorMsg, setErrorMsg]       = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew]         = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const fileInputRef = useRef(null);

  const handleChange = (e) =>
    setForm(prev => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAvatarChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      setErrorMsg('Ukuran foto maksimal 5 MB');
      return;
    }
    setAvatarFile(file);
    setAvatarPreview(URL.createObjectURL(file));
    setErrorMsg('');
  };

  const handleKtmSubmit = async (e) => {
    e.preventDefault();
    if (!ktmForm.nim || !ktmForm.university || !ktmFile || !selfieFile) {
      setErrorMsg('Semua data verifikasi wajib diisi.');
      return;
    }

    try {
      setUploadingKtm(true);
      setErrorMsg('');
      setSuccessMsg('');
      const fd = new FormData();
      fd.append('nim', ktmForm.nim);
      fd.append('university', ktmForm.university);
      fd.append('ktm_image', ktmFile);
      fd.append('selfie_image', selfieFile);

      const res = await api.post('/users/upload-ktm', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg(res.data.message);
        setUser(prev => ({ ...prev, ...res.data.data }));
      } else {
        setErrorMsg(res.data.message || 'Gagal mengunggah dokumen.');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan saat upload.');
    } finally {
      setUploadingKtm(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setSuccessMsg('');

    // Validasi password
    if (form.newPassword && form.newPassword !== form.confirmPassword) {
      setErrorMsg('Konfirmasi password tidak cocok');
      return;
    }

    try {
      setSaving(true);
      const fd = new FormData();
      if (form.name)    fd.append('name', form.name);
      if (form.phone !== undefined) fd.append('phone', form.phone);
      if (form.address !== undefined) fd.append('address', form.address);
      if (form.newPassword) {
        fd.append('currentPassword', form.currentPassword);
        fd.append('newPassword', form.newPassword);
      }
      if (avatarFile) fd.append('avatar', avatarFile);

      const res = await api.put('/users/profile', fd, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (res.data.success) {
        setSuccessMsg('Profil berhasil diperbarui!');
        setUser(prev => ({ ...prev, ...res.data.data }));
        setForm(prev => ({ ...prev, currentPassword: '', newPassword: '', confirmPassword: '' }));
        setAvatarFile(null);
      } else {
        setErrorMsg(res.data.message || 'Gagal menyimpan profil');
      }
    } catch (err) {
      setErrorMsg(err.response?.data?.message || 'Terjadi kesalahan');
    } finally {
      setSaving(false);
    }
  };

  const avatarSrc = avatarPreview
    || user?.avatar
    || `https://ui-avatars.com/api/?name=${encodeURIComponent(user?.name || 'U')}&background=1877F2&color=fff&bold=true&size=200`;

  return (
    <div className="profile-page">
      <div className="profile-header">
        <Typography variant="h3" weight="bold">Profil Saya</Typography>
        <Typography variant="body" color="muted">Kelola informasi akun Anda</Typography>
      </div>

      <form onSubmit={handleSubmit} className="profile-form">
        {/* ── Avatar Section ──────────────────────────────── */}
        <div className="profile-avatar-section">
          <div className="profile-avatar-wrapper">
            <img src={avatarSrc} alt="Avatar" className="profile-avatar-img" />
            <button
              type="button"
              className="profile-avatar-btn"
              onClick={() => fileInputRef.current?.click()}
              title="Ganti foto"
            >
              <Camera size={16} />
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              style={{ display: 'none' }}
              onChange={handleAvatarChange}
            />
          </div>
          <div className="profile-avatar-info">
            <p className="profile-avatar-name">{user?.name}</p>
            <p className="profile-avatar-email">
              <Mail size={13} style={{ marginRight: 4, verticalAlign: 'middle' }} />
              {user?.email}
            </p>
            <div className="profile-avatar-badges">
              <Badge variant={user?.role === 'admin' ? 'primary' : user?.active_role === 'seller' ? 'info' : 'default'}>
                {user?.role === 'admin' ? '⚙️ Admin' : user?.active_role === 'seller' ? '🏪 Penjual' : '🎓 Pembeli'}
              </Badge>
              {user?.role !== 'admin' && (
                <Badge variant={user?.is_verified ? 'success' : 'warning'}>
                  {user?.is_verified
                    ? <><CheckCircle size={11}/> Terverifikasi</>
                    : <><Clock size={11}/> Belum Verifikasi</>}
                </Badge>
              )}
            </div>
            <p className="profile-avatar-hint">JPG, PNG, atau WebP · Maks 5 MB</p>
          </div>
        </div>

        {/* ── Alert ───────────────────────────────────────── */}
        {successMsg && (
          <div className="profile-alert profile-alert-success">
            <CheckCircle size={17} /> {successMsg}
          </div>
        )}
        {errorMsg && (
          <div className="profile-alert profile-alert-error">
            <AlertCircle size={17} /> {errorMsg}
          </div>
        )}

        {/* ── Info Pribadi ─────────────────────────────────── */}
        <div className="profile-section">
          <div className="profile-section-title">
            <User size={17} />
            Informasi Pribadi
          </div>
          <div className="profile-grid">
            <Input
              label="Nama Lengkap"
              id="profile-name"
              name="name"
              value={form.name}
              onChange={handleChange}
              placeholder="Masukkan nama lengkap"
            />
            <div className="input-group">
              <label className="input-label" htmlFor="profile-email">Email</label>
              <div className="profile-email-display">
                <Mail size={15} className="profile-email-icon" />
                <span>{user?.email}</span>
                <span className="profile-email-note">(tidak bisa diubah)</span>
              </div>
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="profile-phone">
                <Phone size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Nomor HP
              </label>
              <input
                id="profile-phone"
                name="phone"
                type="tel"
                value={form.phone}
                onChange={handleChange}
                placeholder="08xxxxxxxxxx"
                className="input-control"
              />
            </div>
            <div className="input-group" style={{ gridColumn: '1 / -1' }}>
              <label className="input-label" htmlFor="profile-address">
                <MapPin size={14} style={{ marginRight: 4, verticalAlign: 'middle' }} />
                Alamat Pengiriman
              </label>
              <textarea
                id="profile-address"
                name="address"
                value={form.address}
                onChange={handleChange}
                placeholder="Jl. Contoh No. 123, Kota, Provinsi"
                className="input-control profile-textarea"
                rows={3}
              />
            </div>
          </div>
        </div>

        {/* ── Ganti Password ───────────────────────────────── */}
        <div className="profile-section">
          <div className="profile-section-title">
            <Lock size={17} />
            Ganti Password
            <span className="profile-section-hint">(kosongkan jika tidak ingin mengubah)</span>
          </div>
          <div className="profile-grid">
            {/* Password lama */}
            <div className="input-group">
              <label className="input-label" htmlFor="profile-cur-pass">Password Saat Ini</label>
              <div className="profile-pass-wrap">
                <input
                  id="profile-cur-pass"
                  name="currentPassword"
                  type={showCurrent ? 'text' : 'password'}
                  value={form.currentPassword}
                  onChange={handleChange}
                  placeholder="Password saat ini"
                  className="input-control"
                />
                <button type="button" className="profile-pass-toggle" onClick={() => setShowCurrent(v => !v)}>
                  {showCurrent ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Password baru */}
            <div className="input-group">
              <label className="input-label" htmlFor="profile-new-pass">Password Baru</label>
              <div className="profile-pass-wrap">
                <input
                  id="profile-new-pass"
                  name="newPassword"
                  type={showNew ? 'text' : 'password'}
                  value={form.newPassword}
                  onChange={handleChange}
                  placeholder="Min. 6 karakter"
                  className="input-control"
                />
                <button type="button" className="profile-pass-toggle" onClick={() => setShowNew(v => !v)}>
                  {showNew ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>

            {/* Konfirmasi */}
            <div className="input-group">
              <label className="input-label" htmlFor="profile-confirm-pass">Konfirmasi Password Baru</label>
              <div className="profile-pass-wrap">
                <input
                  id="profile-confirm-pass"
                  name="confirmPassword"
                  type={showConfirm ? 'text' : 'password'}
                  value={form.confirmPassword}
                  onChange={handleChange}
                  placeholder="Ulangi password baru"
                  className="input-control"
                />
                <button type="button" className="profile-pass-toggle" onClick={() => setShowConfirm(v => !v)}>
                  {showConfirm ? <EyeOff size={16}/> : <Eye size={16}/>}
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ── KTM Info (read-only) ─────────────────────────── */}
        {(user?.ktm_url || user?.selfie_ktm_url) && (
          <div className="profile-section">
            <div className="profile-section-title">
              📋 Dokumen Verifikasi KTM
            </div>
            <div className="profile-ktm-grid">
              {user.ktm_url && (
                <div className="profile-ktm-item">
                  <p className="profile-ktm-label">Foto KTM</p>
                  <a href={user.ktm_url} target="_blank" rel="noopener noreferrer">
                    <img src={user.ktm_url} alt="KTM" className="profile-ktm-img" />
                  </a>
                </div>
              )}
              {user.selfie_ktm_url && (
                <div className="profile-ktm-item">
                  <p className="profile-ktm-label">Selfie dengan KTM</p>
                  <a href={user.selfie_ktm_url} target="_blank" rel="noopener noreferrer">
                    <img src={user.selfie_ktm_url} alt="Selfie KTM" className="profile-ktm-img" />
                  </a>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ── Form Upload KTM (Jika belum diverifikasi dan belum upload) ─────────────────────────── */}
        {!user?.is_verified && !user?.ktm_url && user?.role !== 'admin' && (
          <div className="profile-section">
            <div className="profile-section-title">
              🎓 Verifikasi Sebagai Penjual (Upload KTM)
            </div>
            <Typography variant="small" color="muted" style={{ display: 'block', marginBottom: '1.25rem' }}>
              Untuk dapat menjual buku, Anda harus memverifikasi bahwa Anda adalah seorang mahasiswa. Data Anda akan ditinjau oleh Admin.
            </Typography>
            
            <div className="profile-grid">
              <Input
                label="Nomor Induk Mahasiswa (NIM)"
                id="profile-ktm-nim"
                name="nim"
                value={ktmForm.nim}
                onChange={e => setKtmForm(prev => ({ ...prev, nim: e.target.value }))}
                placeholder="Masukkan NIM Anda"
              />
              <Input
                label="Universitas / Perguruan Tinggi"
                id="profile-ktm-univ"
                name="university"
                value={ktmForm.university}
                onChange={e => setKtmForm(prev => ({ ...prev, university: e.target.value }))}
                placeholder="Contoh: Universitas Hasanuddin"
              />
              
              <div className="input-group">
                <label className="input-label">Upload Foto KTM</label>
                <div style={{ padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface-50)' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const f = e.target.files[0];
                      if(f) {
                        setKtmFile(f);
                        setKtmPreview(URL.createObjectURL(f));
                      }
                    }}
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  />
                  {ktmPreview && <img src={ktmPreview} alt="KTM Preview" style={{ marginTop: '0.75rem', maxWidth: '100px', borderRadius: '4px' }} />}
                </div>
              </div>
              
              <div className="input-group">
                <label className="input-label">Upload Foto Selfie + KTM</label>
                <div style={{ padding: '0.75rem', border: '1px dashed var(--color-border)', borderRadius: '8px', backgroundColor: 'var(--color-surface-50)' }}>
                  <input
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={e => {
                      const f = e.target.files[0];
                      if(f) {
                        setSelfieFile(f);
                        setSelfiePreview(URL.createObjectURL(f));
                      }
                    }}
                    style={{ fontSize: '0.85rem', width: '100%' }}
                  />
                  {selfiePreview && <img src={selfiePreview} alt="Selfie Preview" style={{ marginTop: '0.75rem', maxWidth: '100px', borderRadius: '4px' }} />}
                </div>
              </div>
            </div>
            
            <div style={{ marginTop: '1.25rem', textAlign: 'right' }}>
              <Button
                type="button"
                variant="success"
                isLoading={uploadingKtm}
                onClick={handleKtmSubmit}
              >
                Kirim Verifikasi
              </Button>
            </div>
          </div>
        )}

        {/* ── Submit ───────────────────────────────────────── */}
        <div className="profile-submit">
          <Button
            type="submit"
            variant="primary"
            isLoading={saving}
            leftIcon={<Save size={17}/>}
          >
            {saving ? 'Menyimpan...' : 'Simpan Perubahan'}
          </Button>
        </div>
      </form>
    </div>
  );
};

export default Profile;
