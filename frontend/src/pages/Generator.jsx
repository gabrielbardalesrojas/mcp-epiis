import { useState } from 'react';
import { Sparkles, Zap, FileText, Download, Copy, Check } from 'lucide-react';
import api from '../services/api';

/**
 * Generator - Página de generación de documentos
 */
export default function Generator() {
    const [type, setType] = useState('syllabus');
    const [formData, setFormData] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [copied, setCopied] = useState(false);

    const templates = {
        syllabus: {
            title: 'Sílabo Académico',
            description: 'Genera un sílabo completo con programa de 16 semanas',
            icon: '📚',
            fields: [
                { name: 'course_code', label: 'Código del Curso', placeholder: 'IS401', required: true },
                { name: 'course_name', label: 'Nombre del Curso', placeholder: 'Inteligencia Artificial', required: true },
                { name: 'professor', label: 'Docente', placeholder: 'Dr. Juan Pérez López', required: true },
                { name: 'semester', label: 'Semestre', placeholder: '2024-I', required: true },
                { name: 'credits', label: 'Créditos', placeholder: '4', type: 'number' },
                { name: 'description', label: 'Descripción del Curso', placeholder: 'Breve descripción...', multiline: true },
            ],
        },
        resolution: {
            title: 'Resolución',
            description: 'Genera resoluciones directorales o decanales',
            icon: '📜',
            fields: [
                { name: 'type', label: 'Tipo', placeholder: 'directoral', options: ['directoral', 'decanal', 'rectoral'] },
                { name: 'subject', label: 'Asunto', placeholder: 'Aprobación de proyecto de investigación', required: true },
                { name: 'considerations', label: 'Considerandos', placeholder: 'Antecedentes y fundamentación...', multiline: true },
                { name: 'article1', label: 'Artículo 1', placeholder: 'Contenido del primer artículo...' },
            ],
        },
        report: {
            title: 'Informe',
            description: 'Genera informes académicos o administrativos',
            icon: '📋',
            fields: [
                { name: 'topic', label: 'Tema', placeholder: 'Avance del proyecto de investigación', required: true },
                { name: 'context', label: 'Contexto', placeholder: 'Información de contexto...', multiline: true },
            ],
        },
        letter: {
            title: 'Carta Oficial',
            description: 'Genera cartas formales institucionales',
            icon: '✉️',
            fields: [
                { name: 'recipient', label: 'Destinatario', placeholder: 'Ing. María García', required: true },
                { name: 'subject', label: 'Asunto', placeholder: 'Solicitud de autorización', required: true },
                { name: 'body', label: 'Contenido', placeholder: 'Detalles de la solicitud...', multiline: true },
            ],
        },
        'class-guide': {
            title: 'Guía de Clase',
            description: 'Genera guía de clase con actividades',
            icon: '📖',
            fields: [
                { name: 'topic', label: 'Tema', placeholder: 'Introducción a Machine Learning', required: true },
                { name: 'duration', label: 'Duración (min)', placeholder: '90', type: 'number', required: true },
                { name: 'level', label: 'Nivel', placeholder: 'universitario', options: ['universitario', 'maestría', 'doctorado'] },
            ],
        },
    };

    const currentTemplate = templates[type];

    const handleGenerate = async () => {
        setLoading(true);
        setResult(null);

        try {
            const response = await api.post(`/generate/${type}`, formData);
            setResult(response.data);
        } catch (error) {
            console.error('Error generating:', error);
            setResult({ error: error.response?.data?.error || 'Error al generar' });
        } finally {
            setLoading(false);
        }
    };

    const handleCopy = () => {
        if (result?.content) {
            navigator.clipboard.writeText(result.content);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
        }
    };

    const updateField = (name, value) => {
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    return (
        <div className="content">
            <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Sparkles />
                Generador de Documentos
            </h1>

            {/* Selector de tipo */}
            <div style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', flexWrap: 'wrap' }}>
                {Object.entries(templates).map(([key, tpl]) => (
                    <button
                        key={key}
                        className={`btn ${type === key ? 'btn-primary' : 'btn-secondary'}`}
                        onClick={() => { setType(key); setFormData({}); setResult(null); }}
                    >
                        <span>{tpl.icon}</span>
                        {tpl.title}
                    </button>
                ))}
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: result ? '1fr 1fr' : '1fr', gap: '1.5rem' }}>
                {/* Formulario */}
                <div className="card">
                    <h2 className="card-title">{currentTemplate.title}</h2>
                    <p style={{ color: 'var(--color-text-secondary)', marginBottom: '1.5rem', fontSize: '0.875rem' }}>
                        {currentTemplate.description}
                    </p>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {currentTemplate.fields.map((field) => (
                            <div key={field.name}>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem' }}>
                                    {field.label} {field.required && <span style={{ color: '#ef4444' }}>*</span>}
                                </label>

                                {field.options ? (
                                    <select
                                        value={formData[field.name] || ''}
                                        onChange={(e) => updateField(field.name, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--color-text-primary)',
                                        }}
                                    >
                                        <option value="">Seleccionar...</option>
                                        {field.options.map(opt => (
                                            <option key={opt} value={opt}>{opt}</option>
                                        ))}
                                    </select>
                                ) : field.multiline ? (
                                    <textarea
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => updateField(field.name, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--color-text-primary)',
                                            minHeight: '100px',
                                            resize: 'vertical',
                                        }}
                                    />
                                ) : (
                                    <input
                                        type={field.type || 'text'}
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => updateField(field.name, e.target.value)}
                                        style={{
                                            width: '100%',
                                            padding: '0.75rem',
                                            background: 'var(--color-bg-tertiary)',
                                            border: '1px solid var(--color-border)',
                                            borderRadius: 'var(--radius-md)',
                                            color: 'var(--color-text-primary)',
                                        }}
                                    />
                                )}
                            </div>
                        ))}

                        <button
                            className="btn btn-primary"
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{ marginTop: '1rem' }}
                        >
                            {loading ? (
                                <>
                                    <div className="loading-spinner" style={{ width: '16px', height: '16px' }}></div>
                                    Generando...
                                </>
                            ) : (
                                <>
                                    <Zap size={18} />
                                    Generar con IA
                                </>
                            )}
                        </button>
                    </div>
                </div>

                {/* Resultado */}
                {result && (
                    <div className="card">
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h2 className="card-title" style={{ margin: 0 }}>Resultado</h2>
                            <div style={{ display: 'flex', gap: '0.5rem' }}>
                                <button className="btn btn-secondary" onClick={handleCopy} style={{ padding: '0.5rem' }}>
                                    {copied ? <Check size={16} /> : <Copy size={16} />}
                                </button>
                            </div>
                        </div>

                        {result.error ? (
                            <div style={{ color: '#ef4444', padding: '1rem', background: '#ef444420', borderRadius: 'var(--radius-md)' }}>
                                {result.error}
                            </div>
                        ) : (
                            <>
                                <pre style={{
                                    whiteSpace: 'pre-wrap',
                                    fontSize: '0.875rem',
                                    lineHeight: '1.6',
                                    background: 'var(--color-bg-primary)',
                                    padding: '1rem',
                                    borderRadius: 'var(--radius-md)',
                                    maxHeight: '500px',
                                    overflow: 'auto',
                                }}>
                                    {result.content}
                                </pre>

                                {result.documentPath && (
                                    <div style={{
                                        marginTop: '1rem',
                                        padding: '0.75rem',
                                        background: '#10b98120',
                                        borderRadius: 'var(--radius-md)',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '0.5rem'
                                    }}>
                                        <FileText size={16} style={{ color: '#10b981' }} />
                                        <span style={{ color: '#10b981', fontSize: '0.875rem' }}>
                                            Guardado: {result.documentPath.split(/[/\\]/).pop()}
                                        </span>
                                    </div>
                                )}
                            </>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}
