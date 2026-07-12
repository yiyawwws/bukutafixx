import React, { useState, useContext } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import FormField from '../components/molecules/FormField';
import Button from '../components/atoms/Button';
import Typography from '../components/atoms/Typography';
import { AuthContext } from '../context/AuthContext';
import './Auth.css';

const Login = () => {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const { login } = useContext(AuthContext);
  const navigate = useNavigate();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const res = await login({ email, password });
      if (res.success) {
        const user = res.user;
        if (user.role === 'admin') navigate('/admin/dashboard');
        else if (user.active_role === 'seller') navigate('/seller/dashboard');
        else navigate('/buyer/dashboard');
      } else {
        setError(res.message || 'Login gagal');
      }
    } catch (err) {
      const errorData = err.response?.data;
      if (errorData && errorData.errors && errorData.errors.length > 0) {
        setError(errorData.errors[0].msg);
      } else {
        setError(errorData?.message || 'Terjadi kesalahan pada server');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-form">
      <div className="auth-form-header">
        <Typography variant="h3" weight="bold">Selamat Datang Kembali! 👋</Typography>
        <Typography variant="small" color="muted" className="mt-1">
          Masuk ke akun Bukuta kamu
        </Typography>
      </div>

      {error && (
        <div className="auth-alert auth-alert-error">
          <span>⚠️</span>
          <span>{error}</span>
        </div>
      )}

      <form onSubmit={handleSubmit} className="auth-form-fields">
        <FormField
          label="Email"
          type="email"
          placeholder="email@kampus.ac.id"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
          autoComplete="email"
        />

        <div style={{ position: 'relative' }}>
          <FormField
            label="Password"
            type={showPassword ? 'text' : 'password'}
            placeholder="••••••••"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            autoComplete="current-password"
          />
          <button
            type="button"
            className="auth-password-toggle"
            onClick={() => setShowPassword(!showPassword)}
            aria-label={showPassword ? 'Sembunyikan password' : 'Tampilkan password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>


        <Button
          type="submit"
          variant="primary"
          size="lg"
          fullWidth
          isLoading={loading}
          leftIcon={!loading && <LogIn size={18} />}
        >
          Masuk
        </Button>
      </form>

      <div className="auth-divider">
        <span>atau</span>
      </div>

      <p className="auth-switch-text">
        Belum punya akun?{' '}
        <Link to="/register" className="auth-switch-link">Daftar sekarang →</Link>
      </p>
    </div>
  );
};

export default Login;
