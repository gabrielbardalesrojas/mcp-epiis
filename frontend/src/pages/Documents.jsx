import { useState, useEffect } from 'react';
import { FileText, FileUp, Search, Trash2, Eye, Download } from 'lucide-react';
import api from '../services/api';

/**
 * Documents - Página de gestión de documentos
 */
export default function Documents() {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');

    useEffect(() => {
        loadDocuments();
    }, [filter]);

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? `?type=${filter}` : '';
            const response = await api.get(`/documents${params}`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (e) => {
        const file = e.target.files[0];
        if (!file) return;

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', filter !== 'all' ? filter : 'general');

        try {
            await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            loadDocuments();
        } catch (error) {
            console.error('Error uploading:', error);
        }
    };

    const handleDelete = async (docPath) => {
        if (!confirm('¿Eliminar este documento?')) return;

        try {
            await api.delete(`/documents/${encodeURIComponent(docPath)}`);
            loadDocuments();
        } catch (error) {
            console.error('Error deleting:', error);
        }
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadDocuments();
            return;
        }

        try {
            const response = await api.post('/documents/search', {
                query: searchQuery,
                limit: 20,
            });
            setDocuments(response.data.results || []);
        } catch (error) {
            console.error('Error searching:', error);
        }
    };

    const filterOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'silabo', label: 'Sílabos' },
        { value: 'resolucion', label: 'Resoluciones' },
        { value: 'informe', label: 'Informes' },
        { value: 'reglamento', label: 'Reglamentos' },
    ];

    const getFileIcon = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        const colors = {
            pdf: '#ef4444',
            docx: '#3b82f6',
            doc: '#3b82f6',
            xlsx: '#10b981',
            xls: '#10b981',
            pptx: '#f59e0b',
            ppt: '#f59e0b',
        };
        return colors[ext] || '#6b7280';
    };

    return (
        <div className="content">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
                <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Documentos</h1>
                <label className="btn btn-primary" style={{ cursor: 'pointer' }}>
                    <FileUp size={18} />
                    Subir Documento
                    <input
                        type="file"
                        onChange={handleUpload}
                        style={{ display: 'none' }}
                        accept=".pdf,.docx,.doc,.txt,.xlsx,.pptx"
                    />
                </label>
            </div>

            {/* Filtros y búsqueda */}
            <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center' }}>
                    {/* Filtro por tipo */}
                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                        {filterOptions.map(opt => (
                            <button
                                key={opt.value}
                                className={`btn ${filter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilter(opt.value)}
                                style={{ padding: '0.5rem 1rem' }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>

                    {/* Búsqueda */}
                    <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            style={{
                                flex: 1,
                                padding: '0.5rem 1rem',
                                background: 'var(--color-bg-tertiary)',
                                border: '1px solid var(--color-border)',
                                borderRadius: 'var(--radius-md)',
                                color: 'var(--color-text-primary)',
                            }}
                        />
                        <button className="btn btn-secondary" onClick={handleSearch}>
                            <Search size={18} />
                        </button>
                    </div>
                </div>
            </div>

            {/* Lista de documentos */}
            {loading ? (
                <div className="loading">
                    <div className="loading-spinner"></div>
                    <span>Cargando documentos...</span>
                </div>
            ) : documents.length === 0 ? (
                <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                    <FileText size={48} style={{ color: 'var(--color-text-muted)', marginBottom: '1rem' }} />
                    <p style={{ color: 'var(--color-text-secondary)' }}>
                        No se encontraron documentos
                    </p>
                </div>
            ) : (
                <div className="document-list">
                    {documents.map((doc, index) => (
                        <div key={index} className="document-item">
                            <div
                                className="document-icon"
                                style={{ background: getFileIcon(doc.name) }}
                            >
                                <FileText size={20} />
                            </div>
                            <div className="document-info" style={{ flex: 1 }}>
                                <div className="document-name">{doc.name}</div>
                                <div className="document-meta">
                                    {doc.type || 'general'} • {(doc.size / 1024).toFixed(1)} KB
                                </div>
                            </div>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem' }}
                                    title="Ver"
                                >
                                    <Eye size={16} />
                                </button>
                                <button
                                    className="btn btn-secondary"
                                    style={{ padding: '0.5rem', color: '#ef4444' }}
                                    onClick={() => handleDelete(doc.path)}
                                    title="Eliminar"
                                >
                                    <Trash2 size={16} />
                                </button>
                            </div>
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}
