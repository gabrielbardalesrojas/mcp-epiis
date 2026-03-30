import { useState } from 'react';
import { FileSearch, Upload, Zap, CheckCircle, XCircle } from 'lucide-react';
import api from '../services/api';

/**
 * Analysis - Página de análisis de documentos
 */
export default function Analysis() {
    const [file, setFile] = useState(null);
    const [analysisType, setAnalysisType] = useState('summary');
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [documentPath, setDocumentPath] = useState('');

    const analysisTypes = [
        { id: 'summary', label: 'Resumen', description: 'Genera un resumen ejecutivo' },
        { id: 'key_points', label: 'Puntos Clave', description: 'Extrae los puntos más importantes' },
        { id: 'compliance', label: 'Cumplimiento', description: 'Verifica cumplimiento normativo' },
        { id: 'full', label: 'Análisis Completo', description: 'Análisis detallado integral' },
    ];

    const handleFileChange = async (e) => {
        const selectedFile = e.target.files[0];
        if (!selectedFile) return;

        setFile(selectedFile);

        // Subir archivo
        const formData = new FormData();
        formData.append('file', selectedFile);
        formData.append('type', 'general');

        try {
            const response = await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setDocumentPath(response.data.document.path);
        } catch (error) {
            console.error('Error uploading:', error);
        }
    };

    const handleAnalyze = async () => {
        if (!documentPath) return;

        setLoading(true);
        setResult(null);

        try {
            const response = await api.post('/analysis/document', {
                documentPath,
                analysisType,
            });
            setResult(response.data);
        } catch (error) {
            console.error('Error analyzing:', error);
            setResult({ error: error.response?.data?.error || 'Error al analizar' });
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="content">
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <FileSearch />
                Análisis de Documentos
            </h1>

            <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
                {/* Panel de configuración */}
                <div className="card">
                    <h2 className="card-title">Configuración</h2>

                    {/* Subir documento */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            1. Seleccionar Documento
                        </label>
                        <label
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '0.5rem',
                                padding: '2rem',
                                background: 'var(--color-bg-tertiary)',
                                border: '2px dashed var(--color-border)',
                                borderRadius: 'var(--radius-lg)',
                                cursor: 'pointer',
                                transition: 'all 0.2s',
                            }}
                        >
                            {file ? (
                                <div style={{ textAlign: 'center' }}>
                                    <CheckCircle size={32} style={{ color: '#10b981', marginBottom: '0.5rem' }} />
                                    <div style={{ fontWeight: '500' }}>{file.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        {(file.size / 1024).toFixed(1)} KB
                                    </div>
                                </div>
                            ) : (
                                <div style={{ textAlign: 'center' }}>
                                    <Upload size={32} style={{ color: 'var(--color-text-muted)', marginBottom: '0.5rem' }} />
                                    <div>Arrastra o haz clic para subir</div>
                                    <div style={{ fontSize: '0.875rem', color: 'var(--color-text-secondary)' }}>
                                        PDF, DOCX, TXT soportados
                                    </div>
                                </div>
                            )}
                            <input
                                type="file"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                                accept=".pdf,.docx,.doc,.txt"
                            />
                        </label>
                    </div>

                    {/* Tipo de análisis */}
                    <div style={{ marginBottom: '1.5rem' }}>
                        <label style={{ display: 'block', marginBottom: '0.5rem', fontWeight: '500' }}>
                            2. Tipo de Análisis
                        </label>
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                            {analysisTypes.map((type) => (
                                <label
                                    key={type.id}
                                    style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.75rem',
                                        padding: '0.75rem',
                                        background: analysisType === type.id ? 'var(--color-accent-primary)20' : 'var(--color-bg-tertiary)',
                                        border: `1px solid ${analysisType === type.id ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                                        borderRadius: 'var(--radius-md)',
                                        cursor: 'pointer',
                                    }}
                                >
                                    <input
                                        type="radio"
                                        name="analysisType"
                                        value={type.id}
                                        checked={analysisType === type.id}
                                        onChange={(e) => setAnalysisType(e.target.value)}
                                        style={{ display: 'none' }}
                                    />
                                    <div style={{
                                        width: '20px',
                                        height: '20px',
                                        borderRadius: '50%',
                                        border: `2px solid ${analysisType === type.id ? 'var(--color-accent-primary)' : 'var(--color-border)'}`,
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                    }}>
                                        {analysisType === type.id && (
                                            <div style={{
                                                width: '10px',
                                                height: '10px',
                                                borderRadius: '50%',
                                                background: 'var(--color-accent-primary)',
                                            }} />
                                        )}
                                    </div>
                                    <div>
                                        <div style={{ fontWeight: '500' }}>{type.label}</div>
                                        <div style={{ fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
                                            {type.description}
                                        </div>
                                    </div>
                                </label>
                            ))}
                        </div>
                    </div>

                    {/* Botón analizar */}
                    <button
                        className="btn btn-primary"
                        onClick={handleAnalyze}
                        disabled={!documentPath || loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? (
                            <>
                                <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                                Analizando...
                            </>
                        ) : (
                            <>
                                <Zap size={18} />
                                Analizar Documento
                            </>
                        )}
                    </button>
                </div>

                {/* Resultado */}
                {result && (
                    <div className="card">
                        <h2 className="card-title">
                            {result.error ? (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <XCircle style={{ color: '#ef4444' }} />
                                    Error
                                </span>
                            ) : (
                                <span style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                    <CheckCircle style={{ color: '#10b981' }} />
                                    Resultado del Análisis
                                </span>
                            )}
                        </h2>

                        {result.error ? (
                            <div style={{
                                color: '#ef4444',
                                padding: '1rem',
                                background: '#ef444420',
                                borderRadius: 'var(--radius-md)'
                            }}>
                                {result.error}
                            </div>
                        ) : (
                            <div style={{
                                whiteSpace: 'pre-wrap',
                                fontSize: '0.875rem',
                                lineHeight: '1.7',
                                background: 'var(--color-bg-primary)',
                                padding: '1rem',
                                borderRadius: 'var(--radius-md)',
                                maxHeight: '600px',
                                overflow: 'auto',
                            }}>
                                {result.analysis}
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
