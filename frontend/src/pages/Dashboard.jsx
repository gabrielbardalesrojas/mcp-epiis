import { useState, useEffect } from 'react';
import {
    FileText,
    MessageSquare,
    Sparkles,
    Activity,
    TrendingUp,
    Clock,
    CheckCircle
} from 'lucide-react';
import api from '../services/api';

/**
 * Dashboard - Página principal
 */
export default function Dashboard() {
    const [stats, setStats] = useState(null);
    const [recentDocs, setRecentDocs] = useState([]);
    const [serverStatus, setServerStatus] = useState(null);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadDashboardData();
    }, []);

    const loadDashboardData = async () => {
        try {
            // Cargar estadísticas
            const [healthRes, docsRes, statsRes] = await Promise.all([
                api.get('/health').catch(() => ({ data: { status: 'error' } })),
                api.get('/documents?limit=5').catch(() => ({ data: { documents: [] } })),
                api.get('/documents/stats').catch(() => ({ data: {} })),
            ]);

            setServerStatus(healthRes.data);
            setRecentDocs(docsRes.data.documents || []);
            setStats(statsRes.data);
        } catch (error) {
            console.error('Error loading dashboard:', error);
        } finally {
            setLoading(false);
        }
    };

    if (loading) {
        return (
            <div className="content" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <span>Cargando dashboard...</span>
                </div>
            </div>
        );
    }

    const statCards = [
        {
            title: 'Documentos',
            value: stats?.total || 0,
            icon: FileText,
            color: '#6366f1',
        },
        {
            title: 'Sílabos',
            value: stats?.byType?.silabo || 0,
            icon: FileText,
            color: '#10b981',
        },
        {
            title: 'Resoluciones',
            value: stats?.byType?.resolucion || 0,
            icon: FileText,
            color: '#f59e0b',
        },
        {
            title: 'Almacenamiento',
            value: `${stats?.totalSizeMB || 0} MB`,
            icon: Activity,
            color: '#3b82f6',
        },
    ];

    return (
        <div className="content">
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                Dashboard
            </h1>

            {/* Estado del servidor */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <CheckCircle
                        size={24}
                        style={{ color: serverStatus?.status === 'ok' ? '#10b981' : '#f59e0b' }}
                    />
                    <div>
                        <div style={{ fontWeight: '500' }}>
                            {serverStatus?.status === 'ok' ? 'Sistema Operativo' : 'Sistema Parcial'}
                        </div>
                        <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                            Ollama: {serverStatus?.services?.ollama?.status || 'desconectado'}
                        </div>
                    </div>
                </div>
            </div>

            {/* Tarjetas de estadísticas */}
            <div style={{
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                gap: '1rem',
                marginBottom: '1.5rem'
            }}>
                {statCards.map((stat, index) => (
                    <div key={index} className="card" style={{ padding: '1.25rem' }}>
                        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                            <div>
                                <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                    {stat.title}
                                </div>
                                <div style={{ fontSize: '1.5rem', fontWeight: '600', marginTop: '0.25rem' }}>
                                    {stat.value}
                                </div>
                            </div>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                borderRadius: '12px',
                                background: `${stat.color}20`,
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center'
                            }}>
                                <stat.icon size={24} style={{ color: stat.color }} />
                            </div>
                        </div>
                    </div>
                ))}
            </div>

            {/* Acciones rápidas */}
            <div className="card" style={{ marginBottom: '1.5rem' }}>
                <h2 className="card-title">Acciones Rápidas</h2>
                <div style={{ display: 'flex', gap: '0.75rem', flexWrap: 'wrap' }}>
                    <a href="/" className="btn btn-primary">
                        <MessageSquare size={18} />
                        Chat con IA
                    </a>
                    <a href="/generator" className="btn btn-secondary">
                        <Sparkles size={18} />
                        Generar Documento
                    </a>
                    <a href="/documents" className="btn btn-secondary">
                        <FileText size={18} />
                        Ver Documentos
                    </a>
                </div>
            </div>

            {/* Documentos recientes */}
            <div className="card">
                <h2 className="card-title">Documentos Recientes</h2>
                {recentDocs.length === 0 ? (
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        No hay documentos recientes
                    </p>
                ) : (
                    <div className="document-list">
                        {recentDocs.map((doc, index) => (
                            <div key={index} className="document-item">
                                <div className="document-icon">
                                    <FileText size={20} />
                                </div>
                                <div className="document-info">
                                    <div className="document-name">{doc.name}</div>
                                    <div className="document-meta">
                                        {doc.type} • {(doc.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                                <Clock size={16} style={{ color: 'var(--color-text-muted)' }} />
                            </div>
                        ))}
                    </div>
                )}
            </div>
        </div>
    );
}
