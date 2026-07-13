import React, { useState, useEffect } from 'react';
import { adminService } from '../../services/adminService';
import Typography from '../../components/atoms/Typography';
import Badge from '../../components/atoms/Badge';
import Button from '../../components/atoms/Button';
import Spinner from '../../components/atoms/Spinner';
import ConfirmDialog from '../../components/atoms/ConfirmDialog';
import SearchBar from '../../components/molecules/SearchBar';
import { useToast } from '../../context/ToastContext';
import { CheckCircle, XCircle, Trash2, Ban, Eye, X, ImageOff } from 'lucide-react';
import './AdminPages.css';

// ─── Image Preview Modal ─────────────────────────────────
const ImageModal = ({ src, title, onClose }) => {
  if (!src) return null;
  return (
    <div className="img-modal-overlay" onClick={onClose}>
      <div className="img-modal-box" onClick={e => e.stopPropagation()}>
        <div className="img-modal-header">
          <span className="img-modal-title">{title}</span>
          <button className="img-modal-close" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="img-modal-body">
          <img src={src} alt={title} className="img-modal-image" />
        </div>
      </div>
    </div>
  );
};

// ─── Dokumen Cell ─────────────────────────────────────────
const DokumenCell = ({ user, onPreview }) => {
  const hasKtm = !!user.ktm_url;
  const hasSelfie = !!user.selfie_ktm_url;

  if (!hasKtm && !hasSelfie) {
    return (
      <div className="doc-empty">
        <ImageOff size={14} />
        <span>Belum upload</span>
      </div>
    );
  }

  return (
    <div className="doc-buttons">
      {hasKtm ? (
        <button
          className="doc-btn doc-btn--ktm"
          onClick={() => onPreview(user.ktm_url, `KTM — ${user.name}`)}
          title="Lihat KTM"
        >
          <Eye size={13} /> KTM
        </button>
      ) : (
        <span className="doc-missing">KTM kosong</span>
      )}
      {hasSelfie ? (
        <button
          className="doc-btn doc-btn--selfie"
          onClick={() => onPreview(user.selfie_ktm_url, `Selfie — ${user.name}`)}
          title="Lihat Selfie"
        >
          <Eye size={13} /> Selfie
        </button>
      ) : (
        <span className="doc-missing">Selfie kosong</span>
      )}
    </div>
  );
};

// ─── Main Component ────────────────────────────────────────
const AdminUsers = () => {
  const toast = useToast();
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [preview, setPreview] = useState(null);
  const [verifyDialog, setVerifyDialog] = useState(null); // { id, isVerified }
  const [banDialog, setBanDialog] = useState(null); // { id, isBanned }
  const [deleteDialog, setDeleteDialog] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      const res = await adminService.getUsers({ search: searchQuery || undefined, limit: 50 });
      if (res.success) setUsers(res.data);
    } catch (err) {
      setError('Gagal memuat data user');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchUsers();
  }, [searchQuery]);

  const handleVerify = (id, isVerified) => setVerifyDialog({ id, isVerified });

  const executeVerify = async () => {
    setActionLoading(true);
    try {
      await adminService.verifyUserKtm(verifyDialog.id);
      toast.success(verifyDialog.isVerified ? 'Verifikasi KTM dibatalkan.' : 'KTM user berhasil diverifikasi.');
      fetchUsers();
    } catch (err) {
      toast.error('Gagal memverifikasi user');
    } finally { setActionLoading(false); setVerifyDialog(null); }
  };

  const handleBan = (id, isBanned) => setBanDialog({ id, isBanned });

  const executeBan = async () => {
    setActionLoading(true);
    try {
      await adminService.banUser(banDialog.id);
      toast.success(banDialog.isBanned ? 'User berhasil diaktifkan.' : 'User berhasil diblokir.');
      fetchUsers();
    } catch (err) {
      toast.error('Gagal mengupdate status user');
    } finally { setActionLoading(false); setBanDialog(null); }
  };

  const handleDeleteUser = (id) => setDeleteDialog(id);

  const executeDelete = async () => {
    setActionLoading(true);
    try {
      await adminService.deleteUser(deleteDialog);
      toast.success('User berhasil dihapus.');
      fetchUsers();
    } catch (err) {
      toast.error(err.response?.data?.message || 'Gagal menghapus user');
    } finally { setActionLoading(false); setDeleteDialog(null); }
  };

  if (loading) return <Spinner size="lg" className="mt-8" />;
  if (error) return <Typography color="danger">{error}</Typography>;

  return (
    <div className="admin-page-container">
      {preview && (
        <ImageModal
          src={preview.src}
          title={preview.title}
          onClose={() => setPreview(null)}
        />
      )}

      <ConfirmDialog
        open={!!verifyDialog}
        variant={verifyDialog?.isVerified ? "warning" : "success"}
        title={verifyDialog?.isVerified ? "Batal Verifikasi KTM?" : "Verifikasi KTM User?"}
        message={verifyDialog?.isVerified ? "Status verifikasi user ini akan dicabut." : "KTM user ini akan diverifikasi dan mereka mendapatkan akses penuh ke marketplace."}
        confirmLabel={verifyDialog?.isVerified ? "Ya, Cabut Verifikasi" : "Ya, Verifikasi"}
        cancelLabel="Batal"
        isLoading={actionLoading}
        onConfirm={executeVerify}
        onCancel={() => setVerifyDialog(null)}
      />

      <ConfirmDialog
        open={!!banDialog}
        variant={banDialog?.isBanned ? 'success' : 'warning'}
        title={banDialog?.isBanned ? 'Aktifkan User?' : 'Blokir User?'}
        message={banDialog?.isBanned
          ? 'User akan dapat login kembali dan menggunakan semua fitur.'
          : 'User tidak akan bisa login dan semua aktivitasnya akan diblokir.'}
        confirmLabel={banDialog?.isBanned ? 'Ya, Aktifkan' : 'Ya, Blokir'}
        cancelLabel="Batal"
        isLoading={actionLoading}
        onConfirm={executeBan}
        onCancel={() => setBanDialog(null)}
      />

      <ConfirmDialog
        open={!!deleteDialog}
        variant="danger"
        title="Hapus User?"
        message="User akan dihapus secara permanen beserta semua datanya. Tindakan ini tidak dapat dibatalkan."
        confirmLabel="Ya, Hapus"
        cancelLabel="Batal"
        isLoading={actionLoading}
        onConfirm={executeDelete}
        onCancel={() => setDeleteDialog(null)}
      />

      <div className="admin-header">
        <div>
          <Typography variant="h4" weight="bold">Manajemen User</Typography>
          <Typography variant="small" color="muted">Kelola akun, verifikasi KTM, dan blokir pengguna bermasalah.</Typography>
        </div>
        <div style={{ width: '300px' }}>
          <SearchBar className="light" onSearch={(q) => setSearchQuery(q)} placeholder="Cari nama atau email..." />
        </div>
      </div>

      <div className="admin-table-card">
        <div className="admin-table-responsive">
          <table className="admin-table">
            <thead>
              <tr>
                <th>User</th>
                <th>Role</th>
                <th>Dokumen</th>
                <th>Status</th>
                <th>Aksi</th>
              </tr>
            </thead>
            <tbody>
              {users.map(user => (
                <tr key={user.id}>
                  <td>
                    <div className="admin-user-cell">
                      <img
                        src={user.avatar || `https://ui-avatars.com/api/?name=${encodeURIComponent(user.name)}&background=1877F2&color=fff`}
                        alt={user.name}
                        className="admin-user-avatar"
                      />
                      <div className="admin-user-details">
                        <span className="admin-user-name">{user.name}</span>
                        <span className="admin-user-email">{user.email}</span>
                        {user.nim && (
                          <span className="admin-user-nim">NIM: {user.nim} · {user.university}</span>
                        )}
                      </div>
                    </div>
                  </td>
                  <td>
                    <span className="capitalize">{user.role}</span>
                  </td>
                  <td>
                    <DokumenCell
                      user={user}
                      onPreview={(src, title) => setPreview({ src, title })}
                    />
                  </td>
                  <td>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', alignItems: 'flex-start' }}>
                      <Badge variant={user.is_verified ? 'success' : 'warning'}>
                        {user.is_verified ? 'Terverifikasi' : 'Menunggu KTM'}
                      </Badge>
                      {!user.is_active && (
                        <Badge variant="danger">Diblokir</Badge>
                      )}
                    </div>
                  </td>
                  <td>
                    <div className="admin-action-buttons">
                      {user.role !== 'admin' && (
                        <Button 
                          variant={user.is_verified ? "outline" : "success"} 
                          size="sm" 
                          onClick={() => handleVerify(user.id, user.is_verified)} 
                          title={user.is_verified ? "Batal Verifikasi" : "Verifikasi Manual"}
                        >
                          {user.is_verified ? <XCircle size={14} /> : <CheckCircle size={14} />} 
                          {user.is_verified ? "Batal Verif" : "Verifikasi"}
                        </Button>
                      )}
                      {user.role !== 'admin' && (
                        <Button
                          variant={user.is_active ? 'warning' : 'success'}
                          size="sm"
                          onClick={() => handleBan(user.id, !user.is_active)}
                        >
                          {user.is_active ? <Ban size={14} /> : <CheckCircle size={14} />}
                          {user.is_active ? 'Blokir' : 'Aktifkan'}
                        </Button>
                      )}
                      {user.role !== 'admin' && (
                        <Button
                          variant="danger"
                          size="sm"
                          onClick={() => handleDeleteUser(user.id)}
                        >
                          <Trash2 size={14} />
                        </Button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan="5" style={{ textAlign: 'center', padding: '2rem' }}>Tidak ada user.</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};

export default AdminUsers;
