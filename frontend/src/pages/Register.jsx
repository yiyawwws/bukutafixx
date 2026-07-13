import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, UserPlus, Upload, X } from 'lucide-react';
import FormField from '../components/molecules/FormField';
import Button from '../components/atoms/Button';
import Typography from '../components/atoms/Typography';
import { AuthContext } from '../context/AuthContext';
import { authService } from '../services/authService';
import './Auth.css';

const Register = () => {
  const [formData, setFormData] = useState({
    name: '', email: '', password: '', nim: '', university: '', phone: '', address: ''
  });
  const [ktmImage, setKtmImage] = useState(null);
  const [selfieImage, setSelfieImage] = useState(null);
  const [ktmPreview, setKtmPreview] = useState(null);
  const [selfiePreview, setSelfiePreview] = useState(null);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { fetchUser } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleChange = (e) => setFormData({ ...formData, [e.target.name]: e.target.value });

  const handleFileChange = (e, type) => {
    const file = e.target.files[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (type === 'ktm') { setKtmImage(file); setKtmPreview(url); }
    else { setSelfieImage(file); setSelfiePreview(url); }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    const data = new FormData();
    Object.keys(formData).forEach(key => formData[key] && data.append(key, formData[key]));
    if (ktmImage) data.append('ktm_image', ktmImage);
    if (selfieImage) data.append('selfie_image', selfieImage);
    try {
      const res = await authService.register(data);
      if (res.success) {
        await fetchUser();
        navigate('/');
      } else {
        setError(res.message || 'Registrasi gagal');
      }
    } catch (err) {
      console.error('Registration Error:', err);
      console.log('Error Response:', err.response);
      console.log('Error Message:', err.message);
      
      const errorData = err.response?.data;
      if (errorData && errorData.errors && errorData.errors.length > 0) {
        setError(errorData.errors[0].msg);
      } else {
        setError(errorData?.message || err.message || 'Terjadi kesalahan');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <Typography variant="h3" weight="bold">Buat Akun Baru 🎓</Typography>
        <Typography variant="small" color="muted" className="mt-1">
          Bergabung dengan ribuan mahasiswa di Bukuta
        </Typography>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <div className="auth-form-row">
          <FormField label="Nama Lengkap" name="name" value={formData.name} onChange={handleChange} placeholder="Contoh: Andi" required />
          <FormField label="NIM" name="nim" value={formData.nim} onChange={handleChange} placeholder="Contoh: 123456789" required />
        </div>

        <FormField label="Email" type="email" name="email" value={formData.email} onChange={handleChange} placeholder="Contoh: andi@gmail.com" required />

        <div style={{ position: 'relative' }}>
          <FormField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            name="password"
            value={formData.password}
            onChange={handleChange}
            placeholder="Minimal 6 karakter"
            required
          />
          <button type="button" className="auth-password-toggle" onClick={() => setShowPassword(!showPassword)}>
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        <FormField label="Universitas" name="university" value={formData.university} onChange={handleChange} placeholder="Contoh: Universitas Islam Negeri Alauddin Makassar" required />
        <FormField label="No. Handphone (WhatsApp)" name="phone" value={formData.phone} onChange={handleChange} placeholder="Contoh: 081234567890" />

        {/* File uploads */}
        <div className="auth-upload-section">
          <p className="auth-upload-title">Dokumen Verifikasi Mahasiswa</p>
          <p className="auth-upload-hint">Upload foto KTM/KTP dan selfie dengan KTM untuk verifikasi akun.</p>
          <div className="auth-upload-grid">
            {/* KTM/KTP Upload */}
            <div className="auth-upload-item">
              <label className="auth-upload-label" htmlFor="ktm-upload">
                {ktmPreview ? (
                  <>
                    <img src={ktmPreview} alt="Preview KTM/KTP" className="auth-upload-preview" />
                    <button type="button" className="auth-upload-remove" onClick={() => { setKtmImage(null); setKtmPreview(null); }}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="auth-upload-icon" />
                    <span>Foto KTM/KTP</span>
                    <span className="auth-upload-hint-sm">JPG/PNG maks 5MB</span>
                  </>
                )}
              </label>
              <input id="ktm-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'ktm')} className="auth-upload-input" />
            </div>

            {/* Selfie + KTM Upload */}
            <div className="auth-upload-item">
              <label className="auth-upload-label" htmlFor="selfie-upload">
                {selfiePreview ? (
                  <>
                    <img src={selfiePreview} alt="Preview Selfie" className="auth-upload-preview" />
                    <button type="button" className="auth-upload-remove" onClick={() => { setSelfieImage(null); setSelfiePreview(null); }}>
                      <X size={14} />
                    </button>
                  </>
                ) : (
                  <>
                    <Upload size={24} className="auth-upload-icon" />
                    <span>Selfie + KTM</span>
                    <span className="auth-upload-hint-sm">JPG/PNG maks 5MB</span>
                  </>
                )}
              </label>
              <input id="selfie-upload" type="file" accept="image/*" onChange={(e) => handleFileChange(e, 'selfie')} className="auth-upload-input" />
            </div>
          </div>
        </div>

        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={loading}
          leftIcon={!loading && <UserPlus size={18} />}
        >
          Buat Akun
        </Button>
      </form>

      <p className="auth-switch-text">
        Sudah punya akun?{' '}
        <Link to="/login" className="auth-switch-link">Masuk di sini →</Link>
      </p>
    </div>
  );
};

export default Register;
