import { useState, useEffect } from 'react';
import api from '../services/api';
import './admin.css';

/* ═══════════════════════════════════════════════════════════════════
   AdminPanel – Panel completo de administración
   Incluye: Login, Dashboard de pendientes, Historial, Perfil, Password
   ═══════════════════════════════════════════════════════════════════ */

// ── Helpers ─────────────────────────────────────────────────────────
const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    const d = new Date(dateStr);
    return d.toLocaleDateString('es-PE', {
        year: 'numeric', month: 'short', day: 'numeric',
        hour: '2-digit', minute: '2-digit'
    });
};

const formatSize = (bytes) => {
    if (!bytes) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const getFileExt = (name) => (name || '').split('.').pop().toLowerCase();

// ── Login Screen ────────────────────────────────────────────────────
function AdminLogin({ onLogin }) {
    const [username, setUsername] = useState('');
    const [password, setPassword] = useState('');
    const [error, setError] = useState('');
    const [loading, setLoading] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setLoading(true);
        try {
            const res = await api.post('/admin/login', { username, password });
            if (res.data.success) {
                localStorage.setItem('admin_token', res.data.token);
                localStorage.setItem('admin_data', JSON.stringify(res.data.admin));
                onLogin(res.data);
            }
        } catch (err) {
            setError(err.response?.data?.error || 'Error al iniciar sesión');
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="admin-app">
            <div className="admin-login-wrapper">
                <div className="admin-login-card">
                    <div className="admin-login-logo">🛡️</div>
                    <h1 className="admin-login-title">Panel Admin</h1>
                    <p className="admin-login-subtitle">EPIIS · Sistema de Gestión Documental</p>

                    {error && <div className="admin-login-error">{error}</div>}

                    <form onSubmit={handleSubmit}>
                        <div className="admin-input-group">
                            <label>Usuario</label>
                            <input
                                className="admin-input"
                                type="text"
                                placeholder="Ingresa tu usuario"
                                value={username}
                                onChange={e => setUsername(e.target.value)}
                                autoFocus
                            />
                        </div>
                        <div className="admin-input-group">
                            <label>Contraseña</label>
                            <input
                                className="admin-input"
                                type="password"
                                placeholder="••••••••"
                                value={password}
                                onChange={e => setPassword(e.target.value)}
                            />
                        </div>
                        <button
                            className="admin-btn-primary"
                            type="submit"
                            disabled={loading || !username || !password}
                        >
                            {loading ? 'Verificando...' : 'Iniciar Sesión'}
                        </button>
                    </form>
                </div>
            </div>
        </div>
    );
}

// ── Dashboard (Pendientes) ──────────────────────────────────────────
function PendingDocuments({ token, onToast }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);

    const headers = { Authorization: `Bearer ${token}` };

    const loadDocs = async () => {
        setLoading(true);
        try {
            const res = await api.get('/admin/pending', { headers });
            setDocs(res.data.documents || []);
        } catch (err) {
            onToast('Error al cargar documentos pendientes', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadDocs(); }, []);

    const handleApprove = async (id, name) => {
        if (!confirm(`¿Aprobar "${name}"? Se moverá a la biblioteca de documentos.`)) return;
        setActionLoading(id);
        try {
            await api.post(`/admin/approve/${id}`, {}, { headers });
            onToast(`✅ "${name}" aprobado correctamente`, 'success');
            loadDocs();
        } catch (err) {
            onToast(err.response?.data?.error || 'Error al aprobar', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handleReject = async (id, name) => {
        if (!confirm(`¿Rechazar "${name}"? El archivo será eliminado permanentemente.`)) return;
        setActionLoading(id);
        try {
            await api.post(`/admin/reject/${id}`, {}, { headers });
            onToast(`🗑️ "${name}" rechazado y eliminado`, 'success');
            loadDocs();
        } catch (err) {
            onToast(err.response?.data?.error || 'Error al rechazar', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePreview = (id) => {
        window.open(`${api.defaults.baseURL}/admin/pending/${id}/preview?token=${token}`, '_blank');
    };

    if (loading) return <div className="admin-loading-center"><div className="admin-spinner" /></div>;

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <span className="admin-card-title">📋 Documentos Pendientes</span>
                <button className="admin-btn-preview" onClick={loadDocs}>↻ Refrescar</button>
            </div>
            {docs.length === 0 ? (
                <div className="admin-empty-state">
                    <div className="admin-empty-icon">✅</div>
                    <h3>Sin documentos pendientes</h3>
                    <p>Todos los documentos han sido revisados.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-docs-table">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Tipo</th>
                                <th>Tamaño</th>
                                <th>Fecha de subida</th>
                                <th>Estado</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map(doc => {
                                const ext = getFileExt(doc.original_name);
                                return (
                                    <tr key={doc.id}>
                                        <td>
                                            <div className="admin-doc-name">
                                                <div className={`admin-doc-icon ${ext}`}>
                                                    {ext.toUpperCase().slice(0, 4)}
                                                </div>
                                                <span>{doc.original_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }}>{doc.type}</td>
                                        <td>{formatSize(doc.size)}</td>
                                        <td>{formatDate(doc.uploaded_at)}</td>
                                        <td><span className="admin-badge pending">Pendiente</span></td>
                                        <td>
                                            <div className="admin-actions">
                                                <button
                                                    className="admin-btn-approve"
                                                    onClick={() => handleApprove(doc.id, doc.original_name)}
                                                    disabled={actionLoading === doc.id}
                                                >
                                                    ✓ Aprobar
                                                </button>
                                                <button
                                                    className="admin-btn-reject"
                                                    onClick={() => handleReject(doc.id, doc.original_name)}
                                                    disabled={actionLoading === doc.id}
                                                >
                                                    ✕ Rechazar
                                                </button>
                                                <button
                                                    className="admin-btn-preview"
                                                    onClick={() => handlePreview(doc.id)}
                                                >
                                                    👁
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Historial ───────────────────────────────────────────────────────
function HistoryDocuments({ token, onToast }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/admin/history', { headers });
                setDocs(res.data.documents || []);
            } catch {
                onToast('Error al cargar historial', 'error');
            } finally {
                setLoading(false);
            }
        })();
    }, []);

    if (loading) return <div className="admin-loading-center"><div className="admin-spinner" /></div>;

    return (
        <div className="admin-card">
            <div className="admin-card-header">
                <span className="admin-card-title">📜 Historial de Revisiones</span>
            </div>
            {docs.length === 0 ? (
                <div className="admin-empty-state">
                    <div className="admin-empty-icon">📭</div>
                    <h3>Sin historial</h3>
                    <p>Aquí aparecerán los documentos aprobados y rechazados.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-docs-table">
                        <thead>
                            <tr>
                                <th>Documento</th>
                                <th>Tipo</th>
                                <th>Estado</th>
                                <th>Revisado por</th>
                                <th>Fecha revisión</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map(doc => {
                                const ext = getFileExt(doc.original_name);
                                return (
                                    <tr key={doc.id}>
                                        <td>
                                            <div className="admin-doc-name">
                                                <div className={`admin-doc-icon ${ext}`}>
                                                    {ext.toUpperCase().slice(0, 4)}
                                                </div>
                                                <span>{doc.original_name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }}>{doc.type}</td>
                                        <td>
                                            <span className={`admin-badge ${doc.status}`}>
                                                {doc.status === 'approved' ? 'Aprobado' : 'Rechazado'}
                                            </span>
                                        </td>
                                        <td>{doc.reviewed_by || '—'}</td>
                                        <td>{formatDate(doc.reviewed_at)}</td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Gestión de Biblioteca (Almacenados) ─────────────────────────────
function LibraryManagement({ token, onToast }) {
    const [docs, setDocs] = useState([]);
    const [loading, setLoading] = useState(true);
    const [actionLoading, setActionLoading] = useState(null);
    const [selectedCategory, setSelectedCategory] = useState('all');

    const headers = { Authorization: `Bearer ${token}` };

    const categories = [
        { id: 'all', label: 'Todos', icon: '📚' },
        { id: 'silabo', label: 'Sílabos', icon: '📖' },
        { id: 'resolucion', label: 'Resoluciones', icon: '📜' },
        { id: 'informe', label: 'Informes', icon: '📄' },
        { id: 'reglamento', label: 'Reglamentos', icon: '⚖️' },
        { id: 'general', label: 'General', icon: '📁' },
    ];

    const loadLibrary = async () => {
        setLoading(true);
        try {
            const res = await api.get(`/admin/library?category=${selectedCategory}`, { headers });
            setDocs(res.data.documents || []);
        } catch (err) {
            onToast('Error al cargar la biblioteca', 'error');
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => { loadLibrary(); }, [selectedCategory]);

    const handleDelete = async (category, filename) => {
        if (!confirm(`¿Eliminar PERMANENTEMENTE "${filename}"? Esta acción no se puede deshacer.`)) return;
        const id = `${category}-${filename}`;
        setActionLoading(id);
        try {
            await api.delete(`/admin/library/${category}/${encodeURIComponent(filename)}`, { headers });
            onToast(`🗑️ "${filename}" eliminado permanentemente`, 'success');
            loadLibrary();
        } catch (err) {
            onToast(err.response?.data?.error || 'Error al eliminar', 'error');
        } finally {
            setActionLoading(null);
        }
    };

    const handlePreview = (category, filename) => {
        // En la biblioteca real, la ruta de preview es diferente si no usamos el endpoint de admin
        // Pero podemos usar un endpoint similar o simplemente abrirlo si es público.
        // Por consistencia con los pendientes, usaremos el endpoint de visualización general si existe
        // o uno nuevo. Por ahora, asumimos que el admin puede verlos.
        window.open(`${api.defaults.baseURL}/documents/view/storage/documents/${category === 'all' ? 'general' : category}/${filename}?token=${token}`, '_blank');
    };

    return (
        <div className="admin-card">
            <div className="admin-card-header" style={{ flexDirection: 'column', alignItems: 'flex-start', gap: '15px' }}>
                <span className="admin-card-title">📚 Gestión de Biblioteca</span>
                <div className="admin-category-tabs">
                    {categories.map(cat => (
                        <button
                            key={cat.id}
                            className={`admin-cat-btn ${selectedCategory === cat.id ? 'active' : ''}`}
                            onClick={() => setSelectedCategory(cat.id)}
                        >
                            <span className="cat-icon">{cat.icon}</span> {cat.label}
                        </button>
                    ))}
                </div>
            </div>

            {loading ? (
                <div className="admin-loading-center"><div className="admin-spinner" /></div>
            ) : docs.length === 0 ? (
                <div className="admin-empty-state">
                    <div className="admin-empty-icon">📂</div>
                    <h3>Carpeta vacía</h3>
                    <p>No se encontraron documentos en esta categoría.</p>
                </div>
            ) : (
                <div style={{ overflowX: 'auto' }}>
                    <table className="admin-docs-table">
                        <thead>
                            <tr>
                                <th>Archivo</th>
                                <th>Categoría</th>
                                <th>Tamaño</th>
                                <th>Fecha Mod.</th>
                                <th>Acciones</th>
                            </tr>
                        </thead>
                        <tbody>
                            {docs.map((doc, idx) => {
                                const ext = getFileExt(doc.name);
                                const actionId = `${doc.category}-${doc.name}`;
                                return (
                                    <tr key={idx}>
                                        <td>
                                            <div className="admin-doc-name">
                                                <div className={`admin-doc-icon ${ext}`}>
                                                    {ext.toUpperCase().slice(0, 4)}
                                                </div>
                                                <span>{doc.name}</span>
                                            </div>
                                        </td>
                                        <td style={{ textTransform: 'capitalize' }}>{doc.category}</td>
                                        <td>{formatSize(doc.size)}</td>
                                        <td>{formatDate(doc.modifiedAt)}</td>
                                        <td>
                                            <div className="admin-actions">
                                                <button
                                                    className="admin-btn-reject"
                                                    onClick={() => handleDelete(doc.category, doc.name)}
                                                    disabled={actionLoading === actionId}
                                                    title="Eliminar permanentemente"
                                                >
                                                    ✕ Borrar
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                );
                            })}
                        </tbody>
                    </table>
                </div>
            )}
        </div>
    );
}

// ── Perfil ──────────────────────────────────────────────────────────
function AdminProfile({ token, adminData, onToast, onAdminUpdate }) {
    const [name, setName] = useState(adminData?.name || '');
    const [email, setEmail] = useState(adminData?.email || '');
    const [saving, setSaving] = useState(false);
    const [stats, setStats] = useState(null);

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/admin/profile', { headers });
                setName(res.data.admin.name);
                setEmail(res.data.admin.email);
                setStats(res.data.stats);
            } catch { /* ignore */ }
        })();
    }, []);

    const handleSave = async (e) => {
        e.preventDefault();
        setSaving(true);
        try {
            await api.put('/admin/profile', { name, email }, { headers });
            onToast('Perfil actualizado correctamente', 'success');
            const updated = { ...adminData, name, email };
            localStorage.setItem('admin_data', JSON.stringify(updated));
            onAdminUpdate(updated);
        } catch (err) {
            onToast(err.response?.data?.error || 'Error al actualizar perfil', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-profile-grid">
            <div className="admin-card">
                <div className="admin-card-header">
                    <span className="admin-card-title">👤 Datos del Administrador</span>
                </div>
                <div className="admin-card-body">
                    <form onSubmit={handleSave}>
                        <div className="admin-form-group">
                            <label>Usuario</label>
                            <input className="admin-input" value={adminData?.username || ''} disabled />
                        </div>
                        <div className="admin-form-group">
                            <label>Nombre completo</label>
                            <input
                                className="admin-input"
                                value={name}
                                onChange={e => setName(e.target.value)}
                                placeholder="Nombre del administrador"
                            />
                        </div>
                        <div className="admin-form-group">
                            <label>Correo electrónico</label>
                            <input
                                className="admin-input"
                                type="email"
                                value={email}
                                onChange={e => setEmail(e.target.value)}
                                placeholder="admin@epiis.unas.edu.pe"
                            />
                        </div>
                        <button className="admin-btn-save" type="submit" disabled={saving}>
                            {saving ? 'Guardando...' : 'Guardar Cambios'}
                        </button>
                    </form>
                </div>
            </div>

            <div className="admin-card">
                <div className="admin-card-header">
                    <span className="admin-card-title">📊 Estadísticas</span>
                </div>
                <div className="admin-card-body">
                    {stats ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            <div className="admin-stat-card" style={{ border: 'none', padding: '16px 0' }}>
                                <div className="admin-stat-icon pending">⏳</div>
                                <div className="admin-stat-info">
                                    <h3>{stats.totalPending}</h3>
                                    <p>Pendientes</p>
                                </div>
                            </div>
                            <div className="admin-stat-card" style={{ border: 'none', padding: '16px 0' }}>
                                <div className="admin-stat-icon approved">✅</div>
                                <div className="admin-stat-info">
                                    <h3>{stats.totalApproved}</h3>
                                    <p>Aprobados</p>
                                </div>
                            </div>
                            <div className="admin-stat-card" style={{ border: 'none', padding: '16px 0' }}>
                                <div className="admin-stat-icon rejected">❌</div>
                                <div className="admin-stat-info">
                                    <h3>{stats.totalRejected}</h3>
                                    <p>Rechazados</p>
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="admin-loading-center"><div className="admin-spinner" /></div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── Cambiar Contraseña ──────────────────────────────────────────────
function ChangePassword({ token, onToast }) {
    const [current, setCurrent] = useState('');
    const [newPass, setNewPass] = useState('');
    const [confirm, setConfirm] = useState('');
    const [saving, setSaving] = useState(false);

    const headers = { Authorization: `Bearer ${token}` };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (newPass !== confirm) {
            onToast('Las contraseñas no coinciden', 'error');
            return;
        }
        if (newPass.length < 4) {
            onToast('La contraseña debe tener al menos 4 caracteres', 'error');
            return;
        }
        setSaving(true);
        try {
            await api.put('/admin/password', {
                currentPassword: current,
                newPassword: newPass
            }, { headers });
            onToast('Contraseña actualizada correctamente', 'success');
            setCurrent('');
            setNewPass('');
            setConfirm('');
        } catch (err) {
            onToast(err.response?.data?.error || 'Error al cambiar contraseña', 'error');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="admin-card" style={{ maxWidth: '480px' }}>
            <div className="admin-card-header">
                <span className="admin-card-title">🔒 Cambiar Contraseña</span>
            </div>
            <div className="admin-card-body">
                <form onSubmit={handleSubmit}>
                    <div className="admin-form-group">
                        <label>Contraseña actual</label>
                        <input
                            className="admin-input"
                            type="password"
                            value={current}
                            onChange={e => setCurrent(e.target.value)}
                            placeholder="••••••••"
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>Nueva contraseña</label>
                        <input
                            className="admin-input"
                            type="password"
                            value={newPass}
                            onChange={e => setNewPass(e.target.value)}
                            placeholder="Mínimo 4 caracteres"
                        />
                    </div>
                    <div className="admin-form-group">
                        <label>Confirmar nueva contraseña</label>
                        <input
                            className="admin-input"
                            type="password"
                            value={confirm}
                            onChange={e => setConfirm(e.target.value)}
                            placeholder="Repite la nueva contraseña"
                        />
                    </div>
                    <button
                        className="admin-btn-save"
                        type="submit"
                        disabled={saving || !current || !newPass || !confirm}
                    >
                        {saving ? 'Cambiando...' : 'Actualizar Contraseña'}
                    </button>
                </form>
            </div>
        </div>
    );
}

// ── Dashboard Principal ─────────────────────────────────────────────
function AdminDashboard({ token, adminData, onLogout, onAdminUpdate }) {
    const [activeTab, setActiveTab] = useState('pending');
    const [toast, setToast] = useState(null);
    const [stats, setStats] = useState({ totalPending: 0, totalApproved: 0, totalRejected: 0 });

    const headers = { Authorization: `Bearer ${token}` };

    useEffect(() => {
        (async () => {
            try {
                const res = await api.get('/admin/profile', { headers });
                setStats(res.data.stats);
            } catch { /* ignore */ }
        })();
    }, [activeTab]);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    const showToast = (message, type = 'info') => setToast({ message, type });

    const tabs = [
        { id: 'pending', label: 'Pendientes', icon: '📋', badge: stats.totalPending },
        { id: 'library', label: 'Biblioteca', icon: '📚' },
        { id: 'history', label: 'Historial', icon: '📜' },
        { id: 'profile', label: 'Mi Perfil', icon: '👤' },
        { id: 'password', label: 'Seguridad', icon: '🔒' },
    ];

    return (
        <div className="admin-app">
            <div className={`admin-layout sidebar-mode`}>
                {/* ── Sidebar ─────────────────────────────── */}
                <aside className="admin-sidebar">
                    <div className="admin-sidebar-header">
                        <div className="admin-sidebar-logo">🛡️</div>
                        <span>Admin EPIIS</span>
                    </div>

                    <nav className="admin-sidebar-nav">
                        {tabs.map(tab => (
                            <button
                                key={tab.id}
                                className={`admin-sidebar-item ${activeTab === tab.id ? 'active' : ''}`}
                                onClick={() => setActiveTab(tab.id)}
                            >
                                <span className="admin-sidebar-icon">{tab.icon}</span>
                                <span className="admin-sidebar-label">{tab.label}</span>
                                {tab.badge > 0 && (
                                    <span className="admin-sidebar-badge">{tab.badge}</span>
                                )}
                            </button>
                        ))}
                    </nav>

                    <div className="admin-sidebar-footer">
                        <div className="admin-user-info">
                            <div className="admin-user-avatar">
                                {(adminData?.name || 'A').charAt(0).toUpperCase()}
                            </div>
                            <div className="admin-user-details">
                                <span className="admin-user-name">{adminData?.name || 'Admin'}</span>
                                <span className="admin-user-role">Administrador</span>
                            </div>
                        </div>
                        <button className="admin-btn-logout-pill" onClick={onLogout} title="Cerrar Sesión">
                            🚪
                        </button>
                    </div>
                </aside>

                {/* ── Main Content Area ────────────────────── */}
                <div className="admin-content-wrapper">
                    <header className="admin-content-header">
                        <h2 className="admin-view-title">
                            {tabs.find(t => t.id === activeTab)?.label}
                        </h2>
                        <div className="admin-header-actions">
                            <span className="admin-date-now">{new Date().toLocaleDateString('es-PE', { weekday: 'long', day: 'numeric', month: 'long' })}</span>
                        </div>
                    </header>

                    <main className="admin-main-view">
                        {/* Stats Summary Cards (only on dashboard/pending) */}
                        {activeTab === 'pending' && (
                            <div className="admin-stats-row">
                                <div className="admin-stat-card">
                                    <div className="admin-stat-icon pending">⏳</div>
                                    <div className="admin-stat-info">
                                        <h3>{stats.totalPending}</h3>
                                        <p>Pendientes</p>
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <div className="admin-stat-icon approved">✅</div>
                                    <div className="admin-stat-info">
                                        <h3>{stats.totalApproved}</h3>
                                        <p>Aprobados</p>
                                    </div>
                                </div>
                                <div className="admin-stat-card">
                                    <div className="admin-stat-icon rejected">❌</div>
                                    <div className="admin-stat-info">
                                        <h3>{stats.totalRejected}</h3>
                                        <p>Rechazados</p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* View Router */}
                        {activeTab === 'pending' && <PendingDocuments token={token} onToast={showToast} />}
                        {activeTab === 'library' && <LibraryManagement token={token} onToast={showToast} />}
                        {activeTab === 'history' && <HistoryDocuments token={token} onToast={showToast} />}
                        {activeTab === 'profile' && (
                            <AdminProfile
                                token={token}
                                adminData={adminData}
                                onToast={showToast}
                                onAdminUpdate={onAdminUpdate}
                            />
                        )}
                        {activeTab === 'password' && <ChangePassword token={token} onToast={showToast} />}
                    </main>
                </div>
            </div>

            {/* Toast Notifications */}
            {toast && (
                <div className={`admin-toast ${toast.type}`}>
                    {toast.message}
                </div>
            )}
        </div>
    );
}

// ── Entry Point ─────────────────────────────────────────────────────
export default function AdminPanel() {
    const [token, setToken] = useState(() => localStorage.getItem('admin_token'));
    const [adminData, setAdminData] = useState(() => {
        try { return JSON.parse(localStorage.getItem('admin_data')); } catch { return null; }
    });

    const handleLogin = (data) => {
        setToken(data.token);
        setAdminData(data.admin);
    };

    const handleLogout = () => {
        localStorage.removeItem('admin_token');
        localStorage.removeItem('admin_data');
        setToken(null);
        setAdminData(null);
    };

    if (!token) {
        return <AdminLogin onLogin={handleLogin} />;
    }

    return (
        <AdminDashboard
            token={token}
            adminData={adminData}
            onLogout={handleLogout}
            onAdminUpdate={setAdminData}
        />
    );
}
