import { useState, useEffect, useRef } from 'react';
import { BrowserRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import {
    MessageSquare,
    FileText,
    Search,
    Settings,
    Plus,
    Send,
    FileUp,
    Sparkles,
    BookOpen,
    FileCheck,
    Scroll,
    GraduationCap,
    Menu,
    X,
    Zap,
    ChevronDown,
    Folder,
    Library,
    Bell,
    HelpCircle,
    ArrowRight,
    Globe,
    File,
    Mail,
    Info,
    User,
    Paperclip,
    SendHorizontal,
    Copy,
    Check,
    PanelLeftClose,
    PanelLeftOpen,
    RefreshCcw,
    Table,
    Presentation,
    Download,
    LayoutGrid,
    List
} from 'lucide-react';
import api from './services/api';
import AdminPanel from './pages/AdminPanel';

// ============ Componentes ============

function Sidebar({ isOpen, onClose, isCollapsed, onToggle }) {
    const location = useLocation();
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        loadRecentDocuments();
        const interval = setInterval(loadRecentDocuments, 30000);
        return () => clearInterval(interval);
    }, []);

    const loadRecentDocuments = async () => {
        try {
            const response = await api.get('/documents');
            const docs = response.data.documents || [];
            setDocuments(docs);
        } catch (error) {
            console.error('Error loading documents:', error);
        } finally {
            setLoading(false);
        }
    };

    const isActive = (path) => location.pathname === path;

    const [searchQuery, setSearchQuery] = useState('');

    const filteredDocuments = documents.filter(doc =>
        doc.name.toLowerCase().includes(searchQuery.toLowerCase())
    );

    return (
        <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
            <div className="sidebar-header">
                <div className="sidebar-branding">
                    <button
                        className="sidebar-toggle-btn"
                        onClick={onToggle}
                        title={isCollapsed ? "Expandir" : "Contraer"}
                    >
                        {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
                    </button>
                    {!isCollapsed && <span className="sidebar-brand">EPIIS UNAS</span>}
                </div>
                <button className="mobile-close" onClick={onClose}>
                    <X size={20} />
                </button>
            </div>

            {!isCollapsed && (
                <div className="sidebar-search">
                    <div className="search-wrapper" style={{
                        background: 'white',
                        border: '1px solid #e2e8f0',
                        borderRadius: '12px',
                        padding: '8px 12px',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px'
                    }}>
                        <Search size={18} color="#94a3b8" />
                        <input
                            type="text"
                            placeholder="Buscar documentos..."
                            value={searchQuery}
                            onChange={(e) => setSearchQuery(e.target.value)}
                            style={{ border: 'none', outline: 'none', fontSize: '0.9rem', width: '100%' }}
                        />
                    </div>
                </div>
            )}

            <nav className="sidebar-nav">
                <div className="nav-section">
                    <button
                        className="nav-item new-chat-btn"
                        onClick={() => {
                            window.dispatchEvent(new CustomEvent('newChat'));
                            onClose();
                            if (window.location.pathname !== '/') {
                                window.location.href = '/';
                            }
                        }}
                        title="Nuevo Chat"
                    >
                        <Plus size={20} style={{
                            background: 'rgba(255,255,255,0.2)',
                            borderRadius: '50%',
                            marginRight: !isCollapsed ? '12px' : '0'
                        }} />
                        {!isCollapsed && <span>Nuevo Chat</span>}
                    </button>
                </div>

                {!isCollapsed && (
                    <div className="nav-section">
                        <div className="nav-section-header" style={{
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center',
                            padding: '0 12px 12px'
                        }}>
                            <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>HISTORIAL RECIENTE</span>
                            <span style={{ color: '#e2e8f0' }}>...</span>
                        </div>
                        <div className="recent-list">
                            {loading ? (
                                <div className="loading-state">
                                    <div className="loading-spinner-tiny"></div>
                                </div>
                            ) : filteredDocuments.length === 0 ? (
                                <div className="empty-state">No hay documentos</div>
                            ) : (
                                filteredDocuments.slice(0, 10).map((doc, index) => (
                                    <a
                                        key={index}
                                        href={`${api.defaults.baseURL}/documents/view/${encodeURIComponent(doc.path)}`}
                                        target="_blank"
                                        rel="noopener noreferrer"
                                        className="nav-item"
                                        style={{ height: '40px' }}
                                    >
                                        <FileText size={18} color="#1e3a5f" />
                                        <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{doc.name}</span>
                                    </a>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </nav>

            <div className="sidebar-footer">
                <div className="user-profile-badge">
                    <div className="user-avatar-circle">EP</div>
                    {!isCollapsed && (
                        <>
                            <div className="user-info-text">
                                <span className="user-name">Personal EPIIS - UNAS</span>
                                <span className="user-role">Facultad FIIS</span>
                            </div>

                            <button
                                className="config-btn"
                                style={{ background: 'none', border: 'none', color: '#71a0e2ff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                                onClick={() => window.dispatchEvent(new CustomEvent('openSettings'))}
                            >

                                <Settings size={18} />
                            </button>
                        </>
                    )}
                </div>
            </div>
        </aside>
    );
}

function Header({ serverStatus, onMenuClick, onUploadClick, onFolderClick }) {
    return (
        <header className="header">
            <div className="header-left">
                <button className="mobile-menu" onClick={onMenuClick}>
                    <Menu size={20} />
                </button>
                <div className="header-brand">
                    <GraduationCap size={24} className="header-icon" />
                    <span style={{ fontWeight: '600', color: '#334155' }}>SELVA INTELIGENTE</span>
                </div>
            </div>

            <div className="header-actions">
                <div className="header-status">
                    <div className="status-badge">
                        <span className={`status-dot ${serverStatus.ollama ? 'connected' : 'disconnected'}`}></span>
                        <span>IA Activa</span>
                    </div>
                    <div className="status-badge" style={{ borderLeft: 'none', borderRight: 'none', borderRadius: '0' }}>|</div>
                    <div className="status-badge">
                        <span className={`status-dot ${serverStatus.server ? 'connected' : 'disconnected'}`}></span>
                        <span>Servidor</span>
                    </div>
                </div>

                <div className="header-separator"></div>

                <button className="header-btn" onClick={onUploadClick} title="Subir Archivo">
                    <Plus size={20} />
                </button>
                <button className="header-btn" onClick={onFolderClick} title="Biblioteca de Archivos">
                    <Folder size={20} />
                </button>
            </div>
        </header>
    );
}

function ChatPage() {
    const [messages, setMessages] = useState(() => {
        const saved = localStorage.getItem('chat_history');
        return saved ? JSON.parse(saved) : [];
    });
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [attachedFiles, setAttachedFiles] = useState([]);
    const [isUploading, setIsUploading] = useState(false);
    const fileInputRef = useRef(null);
    const messagesEndRef = useRef(null);

    useEffect(() => {
        localStorage.setItem('chat_history', JSON.stringify(messages));
    }, [messages]);

    useEffect(() => {
        const handleNewChat = () => {
            setMessages([]);
            localStorage.removeItem('chat_history');
        };
        window.addEventListener('newChat', handleNewChat);
        return () => window.removeEventListener('newChat', handleNewChat);
    }, []);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    useEffect(() => {
        const handleOpenUploadFromClip = () => {
            fileInputRef.current?.click();
        };
        window.addEventListener('openUpload', handleOpenUploadFromClip);
        return () => window.removeEventListener('openUpload', handleOpenUploadFromClip);
    }, []);

    const handleFileUpload = async (e) => {
        const files = Array.from(e.target.files);
        if (files.length === 0) return;

        setIsUploading(true);
        try {
            for (const file of files) {
                const formData = new FormData();
                formData.append('file', file);
                const response = await api.post('/documents/upload-transient', formData, {
                    headers: {
                        'Content-Type': 'multipart/form-data'
                    }
                });
                if (response.data.success) {
                    setAttachedFiles(prev => [...prev, {
                        name: response.data.fileName,
                        content: response.data.content
                    }]);
                }
            }
        } catch (error) {
            console.error('Error uploading transient file:', error);
            alert('Error al subir archivo temporal');
        } finally {
            setIsUploading(false);
            if (fileInputRef.current) fileInputRef.current.value = '';
        }
    };

    const removeAttachedFile = (index) => {
        setAttachedFiles(prev => prev.filter((_, i) => i !== index));
    };

    const sendMessage = async () => {
        if (!input.trim() && attachedFiles.length === 0) return;
        if (isLoading) return;

        const transientContext = attachedFiles.map(f => `ARCHIVO: ${f.name}\nCONTENIDO: ${f.content}`).join('\n\n---\n\n');

        const userMessage = {
            role: 'user',
            content: input,
            attachments: attachedFiles.map(f => f.name)
        };
        setMessages(prev => [...prev, userMessage]);
        const currentInput = input;
        setInput('');
        const currentAttachments = [...attachedFiles];
        setAttachedFiles([]);
        setIsLoading(true);

        try {
            const response = await api.post('/chat', {
                message: currentInput || 'Analiza los documentos adjuntos',
                context: messages.slice(-6),
                useDocuments: true,
                transientContext: transientContext
            });

            setMessages(prev => [...prev, {
                role: 'assistant',
                content: response.data.response,
                generatedFile: response.data.generatedFile
            }]);
        } catch (error) {
            setMessages(prev => [...prev, {
                role: 'assistant',
                content: error.response?.data?.error || error.response?.data?.message || 'Error al procesar la solicitud. Verifica que Ollama esté ejecutándose.'
            }]);
        } finally {
            setIsLoading(false);
        }
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !e.shiftKey) {
            e.preventDefault();
            sendMessage();
        }
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
        // Auto-resize textarea
        e.target.style.height = 'auto';
        e.target.style.height = Math.min(e.target.scrollHeight, 240) + 'px';
    };

    const suggestionButtons = [
        { icon: BookOpen, label: 'Elaborar Sílabo', prompt: 'Ayúdame a elaborar un sílabo para ' },
        { icon: FileCheck, label: 'Informe de Gestión', prompt: 'Genera un informe de gestión sobre ' },
        { icon: Mail, label: 'Carta Director', prompt: 'Redacta una carta para el director sobre ' },
        { icon: Info, label: 'Malla Curricular', prompt: 'Muéstrame la malla curricular de ' },
    ];

    const [copiedId, setCopiedId] = useState(null);

    const copyToClipboard = (text, index) => {
        navigator.clipboard.writeText(text).then(() => {
            setCopiedId(index);
            setTimeout(() => setCopiedId(null), 2000);
        });
    };

    return (
        <div className={`chat-container ${messages.length === 0 ? 'landing' : ''}`}>
            <div className="chat-messages">
                {messages.length === 0 ? (
                    <div className="chat-welcome">
                        <div className="chat-welcome-icon">
                            <Sparkles size={40} />
                        </div>
                        <h1 className="chat-welcome-title">¿Por dónde empezamos?</h1>
                        <p className="chat-welcome-subtitle">Asistente académico inteligente para la FIIS.</p>
                    </div>
                ) : (
                    <>
                        {messages.map((msg, index) => (
                            <div key={index} className={`message ${msg.role}`}>
                                {msg.role === 'assistant' && (
                                    <div className="message-avatar">
                                        <Sparkles size={16} />
                                    </div>
                                )}
                                <div className="message-content">
                                    <div className="message-text">{msg.content}</div>

                                    {msg.attachments && msg.attachments.length > 0 && (
                                        <div className="message-attachments-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                                            {msg.attachments.map((name, i) => (
                                                <div key={i} style={{
                                                    fontSize: '0.75rem',
                                                    padding: '4px 10px',
                                                    background: 'rgba(255,255,255,0.1)',
                                                    borderRadius: '12px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    border: '1px solid rgba(255,255,255,0.2)'
                                                }}>
                                                    <Paperclip size={12} />
                                                    {name}
                                                </div>
                                            ))}
                                        </div>
                                    )}

                                    {msg.generatedFile && (
                                        <div className="message-attachment" style={{
                                            marginTop: '12px',
                                            padding: '12px',
                                            background: 'rgba(255,255,255,0.05)',
                                            borderRadius: 'var(--radius-md)',
                                            border: '1px solid var(--color-success)',
                                            display: 'flex',
                                            justifyContent: 'space-between',
                                            alignItems: 'center'
                                        }}>
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <File size={18} color="var(--color-success)" />
                                                <div style={{ display: 'flex', flexDirection: 'column' }}>
                                                    <span style={{ fontSize: '0.85rem', fontWeight: '600' }}>{msg.generatedFile.fileName}</span>
                                                    <span style={{ fontSize: '0.7rem', opacity: 0.7 }}>Archivo listo para descargar</span>
                                                </div>
                                            </div>
                                            <button
                                                className="btn btn-secondary"
                                                onClick={() => window.open(`${api.defaults.baseURL}/generate/download/${msg.generatedFile.fileName}`, '_blank')}
                                                style={{ padding: '0.4rem 0.8rem', fontSize: '0.8rem', gap: '4px' }}
                                            >
                                                <Download size={14} /> Descargar
                                            </button>
                                        </div>
                                    )}

                                    {msg.role === 'assistant' && (
                                        <button
                                            className="copy-response-btn"
                                            onClick={() => copyToClipboard(msg.content, index)}
                                            title="Copiar respuesta"
                                            style={{ marginTop: msg.generatedFile ? '8px' : '0' }}
                                        >
                                            {copiedId === index ? <Check size={14} /> : <Copy size={14} />}
                                            {copiedId === index ? <span>Copiado</span> : <span>Copiar</span>}
                                        </button>
                                    )}
                                </div>
                            </div>
                        ))}
                        {isLoading && (
                            <div className="message assistant">
                                <div className="message-avatar">
                                    <Sparkles size={16} />
                                </div>
                                <div className="typing-indicator">
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                    <div className="typing-dot"></div>
                                </div>
                            </div>
                        )}
                        <div ref={messagesEndRef} />
                    </>
                )}
            </div>

            <div className="chat-input-container">
                <div className="chat-input-pill">
                    <input
                        type="file"
                        ref={fileInputRef}
                        style={{ display: 'none' }}
                        multiple
                        onChange={handleFileUpload}
                    />
                    <button
                        className="pill-tool-btn"
                        onClick={() => fileInputRef.current?.click()}
                        title="Adjuntar documento (Temporal)"
                    >
                        <Paperclip size={20} className={isUploading ? 'spinning' : ''} />
                    </button>

                    <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                        {attachedFiles.length > 0 && (
                            <div className="attached-files-preview" style={{
                                display: 'flex',
                                gap: '8px',
                                padding: '8px 4px',
                                borderBottom: '1px solid rgba(0,0,0,0.05)',
                                flexWrap: 'wrap'
                            }}>
                                {attachedFiles.map((file, idx) => (
                                    <div key={idx} style={{
                                        fontSize: '0.75rem',
                                        padding: '4px 8px',
                                        background: 'var(--color-navy)',
                                        color: 'white',
                                        borderRadius: '8px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px'
                                    }}>
                                        <File size={12} />
                                        <span>{file.name}</span>
                                        <X
                                            size={12}
                                            style={{ cursor: 'pointer', opacity: 0.8 }}
                                            onClick={() => removeAttachedFile(idx)}
                                        />
                                    </div>
                                ))}
                            </div>
                        )}
                        <textarea
                            className="chat-input-field"
                            placeholder={attachedFiles.length > 0 ? "Pregunta sobre los archivos adjuntos..." : "Pregunta sobre tesis, manuales o código..."}
                            value={input}
                            onChange={handleInputChange}
                            onKeyDown={handleKeyDown}
                            rows={1}
                        />
                    </div>

                    <div className="pill-actions-right">
                        <div className="sparkle-icon-btn">
                            <Sparkles size={20} />
                        </div>
                        <button
                            className="pill-send-btn"
                            onClick={sendMessage}
                            disabled={isLoading || !input.trim()}
                        >
                            <SendHorizontal size={20} />
                        </button>
                    </div>
                </div>

                <div className="pill-footer-configs" style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    marginTop: '16px',
                    gap: '12px'
                }}>
                    <button
                        className="config-btn"
                        style={{ background: 'none', border: 'none', color: '#71a0e2ff', fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px' }}
                        onClick={() => window.dispatchEvent(new CustomEvent('openSettings'))}
                    >
                        <span>CONFIGURACIÓN</span>
                        <Settings size={14} />
                    </button>


                </div>
            </div>
        </div>
    );
}

// ============ Modales ============

function Modal({ isOpen, onClose, title, children }) {
    if (!isOpen) return null;

    return (
        <div className="modal-backdrop" onClick={onClose}>
            <div className="modal-content" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h3 className="modal-title">{title}</h3>
                    <button className="btn-icon" onClick={onClose}>
                        <X size={20} />
                    </button>
                </div>
                <div className="modal-body">
                    {children}
                </div>
            </div>
        </div>
    );
}

function GeneratorModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Generador de Documentos">
            <GeneratorPage hideHeader={true} />
        </Modal>
    );
}

function UploadModal({ isOpen, onClose, onUploadSuccess }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="Subir Documentos">
            <DocumentsPage hideHeader={true} onUploadSuccess={onUploadSuccess} isUploadOnly={true} />
        </Modal>
    );
}

function FilesModal({ isOpen, onClose }) {
    return (
        <Modal isOpen={isOpen} onClose={onClose} title="📚 Biblioteca">
            <DocumentsPage hideHeader={true} onlyList={true} viewMode="grid" />
        </Modal>
    );
}


function DocumentsPage({ hideHeader, onlyList, onUploadSuccess, viewMode = 'list', isUploadOnly = false }) {
    const [documents, setDocuments] = useState([]);
    const [loading, setLoading] = useState(true);
    const [filter, setFilter] = useState('all');
    const [searchQuery, setSearchQuery] = useState('');
    const [uploading, setUploading] = useState(false);
    const [uploadProgress, setUploadProgress] = useState(0);
    const [uploadFileName, setUploadFileName] = useState('');
    const [toast, setToast] = useState(null);
    const [dragOver, setDragOver] = useState(false);
    const [currentViewMode, setCurrentViewMode] = useState(viewMode);
    const libraryFileRef = useRef(null);

    const filterOptions = [
        { value: 'all', label: 'Todos' },
        { value: 'silabo', label: 'Sílabos' },
        { value: 'resolucion', label: 'Resoluciones' },
        { value: 'informe', label: 'Informes' },
        { value: 'reglamento', label: 'Reglamentos' },
        { value: 'general', label: 'General' },
    ];

    useEffect(() => {
        loadDocuments();
    }, [filter]);

    useEffect(() => {
        if (isUploadOnly && filter === 'all') {
            setFilter('general');
        }
    }, [isUploadOnly, filter]);

    useEffect(() => {
        if (toast) {
            const timer = setTimeout(() => setToast(null), 4000);
            return () => clearTimeout(timer);
        }
    }, [toast]);

    const showToast = (message, type = 'info') => {
        setToast({ message, type });
    };

    const handleSearch = async () => {
        if (!searchQuery.trim()) {
            loadDocuments();
            return;
        }

        setLoading(true);
        try {
            const response = await api.post('/documents/search', {
                query: searchQuery,
                limit: 20,
            });
            setDocuments(response.data.results || []);
        } catch (error) {
            console.error('Error searching:', error);
            showToast('Error en la búsqueda', 'error');
        } finally {
            setLoading(false);
        }
    };

    const loadDocuments = async () => {
        setLoading(true);
        try {
            const params = filter !== 'all' ? `?type=${filter}` : '';
            const response = await api.get(`/documents${params}`);
            setDocuments(response.data.documents || []);
        } catch (error) {
            console.error('Error loading documents:', error);
            showToast('Error al cargar documentos', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleUpload = async (file) => {
        if (!file) return;
        const allowedTypes = ['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.pptx', '.md'];
        const ext = '.' + file.name.split('.').pop().toLowerCase();
        if (!allowedTypes.includes(ext)) {
            showToast(`Tipo de archivo no permitido: ${ext}`, 'error');
            return;
        }
        if (file.size > 50 * 1024 * 1024) {
            showToast('El archivo excede el límite de 50MB', 'error');
            return;
        }

        const formData = new FormData();
        formData.append('file', file);
        formData.append('type', filter !== 'all' ? filter : 'general');

        setUploading(true);
        setUploadProgress(0);
        setUploadFileName(file.name);

        try {
            await api.post('/documents/upload', formData, {
                headers: { 'Content-Type': 'multipart/form-data' },
                onUploadProgress: (progressEvent) => {
                    const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
                    setUploadProgress(percentCompleted);
                }
            });
            showToast(`"${file.name}" subido. Pendiente de aprobación por el administrador.`, 'success');
            loadDocuments();
            if (onUploadSuccess) onUploadSuccess();
        } catch (error) {
            console.error('Error uploading:', error);
            showToast(error.response?.data?.error || 'Error al subir el archivo', 'error');
        } finally {
            setUploading(false);
            setUploadProgress(0);
            setUploadFileName('');
        }
    };

    const handleFileInput = (e) => {
        const file = e.target.files[0];
        if (file) {
            handleUpload(file);
            e.target.value = '';
        }
    };

    const handleDrop = (e) => {
        e.preventDefault();
        setDragOver(false);
        const file = e.dataTransfer.files[0];
        if (file) handleUpload(file);
    };

    const handleDragOver = (e) => { e.preventDefault(); setDragOver(true); };
    const handleDragLeave = (e) => { e.preventDefault(); setDragOver(false); };

    const handleDelete = async (docPath) => {
        if (!confirm('¿Eliminar este documento?')) return;
        try {
            await api.delete(`/documents/${encodeURIComponent(docPath)}`);
            showToast('Documento eliminado', 'success');
            loadDocuments();
        } catch (error) {
            console.error('Error deleting:', error);
            showToast('Error al eliminar documento', 'error');
        }
    };

    const getFileIcon = (name) => {
        const ext = name.split('.').pop().toLowerCase();
        const colors = { pdf: '#ef4444', docx: '#3b82f6', doc: '#3b82f6', xlsx: '#10b981', xls: '#10b981', pptx: '#f59e0b', ppt: '#f59e0b', txt: '#6b7280', md: '#8b5cf6' };
        return colors[ext] || '#6b7280';
    };

    const formatSize = (bytes) => {
        if (!bytes) return '0 Bytes';
        const k = 1024;
        const sizes = ['Bytes', 'KB', 'MB', 'GB'];
        const i = Math.floor(Math.log(bytes) / Math.log(k));
        return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
    };

    return (
        <div className="documents-container" style={{ padding: hideHeader ? 0 : 'var(--spacing-lg)' }}>
            {toast && (
                <div className="toast-container">
                    <div className={`toast ${toast.type}`}>
                        <span>{toast.message}</span>
                    </div>
                </div>
            )}

            {!hideHeader && (
                <div className="page-header" style={{ marginBottom: '1.5rem' }}>
                    <h1 style={{ fontSize: '1.5rem', fontWeight: '600' }}>Documentos</h1>
                </div>
            )}

            {isUploadOnly && (
                <div style={{ marginBottom: '1.5rem' }}>
                    <label style={{ display: 'block', fontSize: '0.85rem', fontWeight: '600', color: 'var(--color-text-secondary)', marginBottom: '0.75rem' }}>
                        📁 Seleccionar Carpeta de Destino:
                    </label>
                    <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
                        {filterOptions.filter(opt => opt.value !== 'all').map(opt => (
                            <button
                                key={opt.value}
                                className={`btn ${filter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                                onClick={() => setFilter(opt.value)}
                                style={{ padding: '0.5rem 1rem', fontSize: '0.85rem', borderRadius: '8px' }}
                            >
                                {opt.label}
                            </button>
                        ))}
                    </div>
                </div>
            )}

            {!onlyList && (
                <div
                    className={`drop-zone ${dragOver ? 'drag-over' : ''}`}
                    onDrop={handleDrop}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onClick={() => !uploading && libraryFileRef.current?.click()}
                    style={{ marginBottom: isUploadOnly ? 0 : '1.5rem' }}
                >
                    <div className="drop-zone-icon">📁</div>
                    <div className="drop-zone-text">
                        Arrastra y suelta archivos aquí o haz clic para seleccionar
                    </div>
                    <input type="file" ref={libraryFileRef} style={{ display: 'none' }} onChange={handleFileInput} />

                    {uploading && (
                        <div className="upload-progress-container" style={{ width: '100%', marginTop: '1rem' }}>
                            <div className="progress-bar-wrapper" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                                <div
                                    className="progress-bar-fill"
                                    style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-accent-primary)', transition: 'width 0.3s ease' }}
                                />
                            </div>
                            <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                                Subiendo {uploadFileName} ({uploadProgress}%)
                            </div>
                        </div>
                    )}
                </div>
            )}

            {/* Controls: Search, Toggle, Filters */}
            {!isUploadOnly && (
                <div className="card" style={{ marginBottom: '1.5rem', padding: '1rem' }}>
                    <div style={{ display: 'flex', gap: '1rem', flexWrap: 'wrap', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', gap: '0.5rem', flex: 1, minWidth: '200px' }}>
                            <div className="search-wrapper" style={{ flex: 1, display: 'flex', alignItems: 'center', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', padding: '0 0.8rem' }}>
                                <Search size={16} color="var(--color-text-muted)" />
                                <input
                                    type="text"
                                    placeholder="Buscar en biblioteca..."
                                    value={searchQuery}
                                    onChange={(e) => setSearchQuery(e.target.value)}
                                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                                    style={{ flex: 1, padding: '0.6rem 0.4rem', background: 'none', border: 'none', color: 'var(--color-text-primary)', fontSize: '0.85rem', outline: 'none' }}
                                />
                            </div>
                            
                            <div className="view-toggle" style={{ display: 'flex', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', padding: '4px', border: '1px solid var(--color-border)' }}>
                                <button 
                                    className={`btn-icon ${currentViewMode === 'list' ? 'active' : ''}`} 
                                    onClick={() => setCurrentViewMode('list')}
                                    style={{ padding: '4px', background: currentViewMode === 'list' ? 'var(--color-accent-primary)' : 'transparent', color: currentViewMode === 'list' ? 'white' : 'inherit' }}
                                    title="Vista de Lista"
                                >
                                    <List size={18} />
                                </button>
                                <button 
                                    className={`btn-icon ${currentViewMode === 'grid' ? 'active' : ''}`} 
                                    onClick={() => setCurrentViewMode('grid')}
                                    style={{ padding: '4px', background: currentViewMode === 'grid' ? 'var(--color-accent-primary)' : 'transparent', color: currentViewMode === 'grid' ? 'white' : 'inherit' }}
                                    title="Vista de Cuadrícula"
                                >
                                    <LayoutGrid size={18} />
                                </button>
                            </div>
                        </div>

                        <div className="filter-scroll" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }}>
                            {filterOptions.map(opt => (
                                <button
                                    key={opt.value}
                                    className={`btn ${filter === opt.value ? 'btn-primary' : 'btn-secondary'}`}
                                    onClick={() => setFilter(opt.value)}
                                    style={{ padding: '0.4rem 0.8rem', fontSize: '0.85rem', whiteSpace: 'nowrap' }}
                                >
                                    {opt.label}
                                </button>
                            ))}
                        </div>
                    </div>
                </div>
            )}

            {/* Content View */}
            {!isUploadOnly && (
                <div className="documents-display">
                    {loading ? (
                        <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>
                            <div className="loading-spinner"></div>
                        </div>
                    ) : documents.length === 0 ? (
                        <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
                            <p style={{ color: 'var(--color-text-muted)' }}>No se encontraron documentos.</p>
                        </div>
                    ) : currentViewMode === 'grid' ? (
                        <div className="library-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
                            {documents.map((doc, index) => {
                                const fileName = doc.name || 'Sin nombre';
                                const viewUrl = `${api.defaults.baseURL}/documents/view/${encodeURIComponent(doc.path)}`;
                                return (
                                    <div key={index} className="library-item" onClick={() => window.open(viewUrl, '_blank')}>
                                        <div className="library-icon" style={{ color: getFileIcon(fileName) }}>
                                            <FileText size={40} />
                                        </div>
                                        <div className="library-name">{fileName}</div>
                                        <div className="library-size">{formatSize(doc.size)}</div>
                                    </div>
                                );
                            })}
                        </div>
                    ) : (
                        <div className="document-list">
                            {documents.map((doc, index) => (
                                <div key={index} className="document-item">
                                    <div className="document-icon" style={{ background: getFileIcon(doc.name) }}>
                                        <FileText size={18} color="white" />
                                    </div>
                                    <div className="document-info">
                                        <div className="document-name" style={{ fontSize: '0.9rem' }}>{doc.name}</div>
                                        <div className="document-meta" style={{ fontSize: '0.75rem' }}>
                                            {doc.type} • {formatSize(doc.size)}
                                        </div>
                                    </div>
                                    <div className="document-actions">
                                        <button className="btn-icon" onClick={() => window.open(`${api.defaults.baseURL}/documents/view/${encodeURIComponent(doc.path)}`, '_blank')}>
                                            <Search size={14} />
                                        </button>
                                        <button className="btn-icon delete" onClick={() => handleDelete(doc.path)}>
                                            <X size={14} />
                                        </button>
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            )}
        </div>
    );
}

function GeneratorPage({ hideHeader }) {
    const [type, setType] = useState('syllabus');
    const [formData, setFormData] = useState({});
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [useReference, setUseReference] = useState(false);
    const [outputFormat, setOutputFormat] = useState('pdf');

    const handleGenerate = async () => {
        setLoading(true);
        setResult(null);
        try {
            let response;
            if (type === 'exam') {
                response = await api.post('/generate/exam', {
                    ...formData,
                    outputFormat,
                    useReferenceDocs: useReference
                });
            } else {
                response = await api.post('/generate', {
                    type,
                    data: formData,
                    outputFormat,
                    useReferenceDocs: useReference,
                    referenceQuery: formData.subject || formData.course_name || formData.topic || ''
                });
            }
            setResult(response.data);
        } catch (error) {
            console.error('Error generating:', error);
            showToast('Error al generar el documento. Verifica los campos y Ollama.', 'error');
        } finally {
            setLoading(false);
        }
    };

    const handleDownload = () => {
        if (!result?.fileName) return;
        window.open(`${api.defaults.baseURL}/generate/download/${result.fileName}`, '_blank');
    };

    const templates = {
        syllabus: {
            title: 'Sílabo',
            icon: BookOpen,
            formats: ['pdf', 'docx'],
            fields: [
                { name: 'course_code', label: 'Código del Curso', placeholder: 'IS401' },
                { name: 'course_name', label: 'Nombre del Curso', placeholder: 'Inteligencia Artificial' },
                { name: 'professor', label: 'Docente', placeholder: 'Dr. Juan Pérez' },
                { name: 'semester', label: 'Semestre', placeholder: '2024-I' },
            ]
        },
        exam: {
            title: 'Examen',
            icon: GraduationCap,
            formats: ['pdf', 'docx'],
            fields: [
                { name: 'course', label: 'Curso', placeholder: 'Seguridad Informatica' },
                { name: 'topic', label: 'Tema o Unidad', placeholder: 'Vulnerabilidades web, inyecciones SQL...' },
                { name: 'examType', label: 'Tipo de Examen', placeholder: 'EXAMEN PARCIAL', type: 'select', options: [
                    { value: '1er EXAMEN PARCIAL', label: '1er Examen Parcial' },
                    { value: '2do EXAMEN PARCIAL', label: '2do Examen Parcial' },
                    { value: '3er EXAMEN PARCIAL', label: '3er Examen Parcial' },
                    { value: 'EXAMEN FINAL', label: 'Examen Final' },
                    { value: 'EXAMEN SUSTITUTORIO', label: 'Examen Sustitutorio' },
                ]},
                { name: 'semester', label: 'Semestre Academico', placeholder: '2024-I' },
                { name: 'questionCount', label: 'Numero de Preguntas', placeholder: '10' },
                { name: 'difficulty', label: 'Nivel de Dificultad', placeholder: 'Intermedio', type: 'select', options: [
                    { value: 'basico', label: 'Basico' },
                    { value: 'intermedio', label: 'Intermedio' },
                    { value: 'avanzado', label: 'Avanzado' },
                ]},
                { name: 'duration', label: 'Duracion (minutos)', placeholder: '20' },
                { name: 'pointsPerQuestion', label: 'Puntos por Pregunta', placeholder: '2' },
                { name: 'questionTypes', label: 'Tipos de Pregunta', placeholder: 'opcion multiple, verdadero/falso, seleccion multiple', type: 'select', options: [
                    { value: 'multiple_choice, true_false', label: 'Opcion Multiple + V/F' },
                    { value: 'multiple_choice', label: 'Solo Opcion Multiple' },
                    { value: 'multiple_choice, true_false, multi_select', label: 'Mixto (Multiple + V/F + Multi-Seleccion)' },
                    { value: 'multiple_choice, true_false, fill_blank', label: 'Mixto (Multiple + V/F + Completar)' },
                    { value: 'multiple_choice, true_false, multi_select, fill_blank, open_ended', label: 'Todos los Tipos' },
                ]},
                { name: 'instructions', label: 'Indicaciones para el Alumno', placeholder: 'Presentar el examen con lapicero. No se permiten celulares...', multiline: true },
            ]
        },
        resolution: {
            title: 'Resolución',
            icon: Scroll,
            formats: ['pdf', 'docx'],
            fields: [
                { name: 'type', label: 'Tipo', placeholder: 'directoral' },
                { name: 'subject', label: 'Asunto', placeholder: 'Aprobación de proyecto' },
                { name: 'considerations', label: 'Considerandos', placeholder: 'Descripción...', multiline: true },
            ]
        },
        excel: {
            title: 'Excel',
            icon: Table,
            formats: ['xlsx'],
            fields: [
                { name: 'subject', label: 'Tema del Reporte', placeholder: 'Listado de notas de IA' },
                { name: 'details', label: 'Detalles Específicos', placeholder: 'Incluir nombres, DNI y promedios...', multiline: true },
            ]
        },
        ppt: {
            title: 'Presentación',
            icon: Presentation,
            formats: ['pptx'],
            fields: [
                { name: 'topic', label: 'Tema de la Presentación', placeholder: 'Introducción a Machine Learning' },
                { name: 'slides_count', label: 'Número de Diapositivas', placeholder: '5' },
                { name: 'focus', label: 'Enfoque Principal', placeholder: 'Teórico y práctico...', multiline: true },
            ]
        },
        letter: {
            title: 'Carta',
            icon: FileCheck,
            formats: ['pdf', 'docx'],
            fields: [
                { name: 'recipient', label: 'Destinatario', placeholder: 'Ing. María García' },
                { name: 'subject', label: 'Asunto', placeholder: 'Solicitud de...' },
                { name: 'body', label: 'Contenido', placeholder: 'Cuerpo de la carta...', multiline: true },
            ]
        }
    };

    const currentTemplate = templates[type] || templates.syllabus;

    return (
        <div className="generator-container" style={{ padding: hideHeader ? 0 : 'var(--spacing-lg)' }}>
            {!hideHeader && (
                <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
                    <Sparkles style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
                    Generador Inteligente de Documentos
                </h1>
            )}

            <div className="generator-content">
                <div className="generator-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
                    {Object.entries(templates).map(([key, val]) => (
                        <button
                            key={key}
                            className={`btn ${type === key ? 'btn-primary' : 'btn-secondary'}`}
                            onClick={() => { setType(key); setFormData({}); setResult(null); setOutputFormat(val.formats[0]); }}
                            style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '0.6rem 1rem', fontSize: '0.9rem', whiteSpace: 'nowrap' }}
                        >
                            <val.icon size={16} />
                            {val.title}
                        </button>
                    ))}
                </div>

                <div className="card" style={{ padding: '1.5rem', marginBottom: '1.5rem' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                        {currentTemplate.fields.map((field) => (
                            <div key={field.name}>
                                <label style={{ display: 'block', marginBottom: '0.25rem', fontSize: '0.875rem', fontWeight: '500' }}>
                                    {field.label}
                                </label>
                                {field.multiline ? (
                                    <textarea
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', minHeight: '100px', resize: 'vertical' }}
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    />
                                ) : field.type === 'select' && field.options ? (
                                    <select
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                                        value={formData[field.name] || field.options[0]?.value || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    >
                                        {field.options.map(opt => (
                                            <option key={opt.value} value={opt.value}>{opt.label}</option>
                                        ))}
                                    </select>
                                ) : (
                                    <input
                                        type="text"
                                        style={{ width: '100%', padding: '0.75rem', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                                        placeholder={field.placeholder}
                                        value={formData[field.name] || ''}
                                        onChange={(e) => setFormData({ ...formData, [field.name]: e.target.value })}
                                    />
                                )}
                            </div>
                        ))}

                        <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <label className="switch" style={{ width: '40px', height: '20px' }}>
                                    <input type="checkbox" checked={useReference} onChange={(e) => setUseReference(e.target.checked)} />
                                    <span className="slider round"></span>
                                </label>
                                <span style={{ fontSize: '0.85rem' }}>Referenciar Biblioteca (RAG)</span>
                            </div>

                            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                <span style={{ fontSize: '0.85rem' }}>Formato:</span>
                                <select
                                    value={outputFormat}
                                    onChange={(e) => setOutputFormat(e.target.value)}
                                    style={{ padding: '0.3rem', background: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)', border: '1px solid var(--color-border)', borderRadius: '4px', fontSize: '0.85rem' }}
                                >
                                    {currentTemplate.formats.map(f => (
                                        <option key={f} value={f}>{f.toUpperCase()}</option>
                                    ))}
                                </select>
                            </div>
                        </div>

                        <button
                            className="btn btn-primary"
                            onClick={handleGenerate}
                            disabled={loading}
                            style={{ height: '45px', fontSize: '1rem' }}
                        >
                            {loading ? (
                                <><div className="loading-spinner" style={{ width: '18px', height: '18px' }}></div> Generando...</>
                            ) : (
                                <><Zap size={18} /> Generar Documento</>
                            )}
                        </button>
                    </div>
                </div>

                {result && (
                    <div className="card" style={{ padding: '1.5rem', border: '1px solid var(--color-success)' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem' }}>
                            <h3 style={{ fontSize: '1.1rem', color: 'var(--color-success)' }}>✓ ¡Generación Exitosa!</h3>
                            <button className="btn btn-secondary" onClick={handleDownload} style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Download size={16} /> Descargar {result.fileName?.split('.').pop().toUpperCase()}
                            </button>
                        </div>
                        {result.content && (
                            <div style={{ padding: '1rem', background: 'var(--color-bg-tertiary)', borderRadius: 'var(--radius-md)', maxHeight: '300px', overflowY: 'auto' }}>
                                <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>
                                    {result.content}
                                </pre>
                            </div>
                        )}
                    </div>
                )}
            </div>
        </div>
    );
}

function SettingsModal({ isOpen, onClose, settings, onSettingsChange, serverStatus, currentUser, onGoogleLogin, onGoogleLogout, whatsappStatus, whatsappQR, onWhatsAppInit, onWhatsAppDisconnect, waLoading, setWaLoading }) {
    const [activeTab, setActiveTab] = useState('ui'); // 'ui', 'ai', 'system', 'whatsapp', 'info'

    const themes = [
        { name: 'Azul Marino', navy: '#1e3a5f', celeste: '#e0f2fe' },
        { name: 'Esmeralda', navy: '#064e3b', celeste: '#d1fae5' },
        { name: 'Púrpura', navy: '#4c1d95', celeste: '#ede9fe' },
        { name: 'Gris Prof.', navy: '#1e293b', celeste: '#f1f5f9' },
    ];

    const handleSettingUpdate = (key, value) => {
        onSettingsChange({ ...settings, [key]: value });
    };

    return (
        <Modal isOpen={isOpen} onClose={onClose} title="⚙️ Centro de Configuración">
            <div className="settings-container">
                {/* Navegación por Pestañas */}
                <div className="settings-tabs">
                    <button
                        className={`settings-tab ${activeTab === 'ui' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ui')}
                    >
                        🎨 Interfaz
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'ai' ? 'active' : ''}`}
                        onClick={() => setActiveTab('ai')}
                    >
                        🤖 IA Avanzada
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'system' ? 'active' : ''}`}
                        onClick={() => setActiveTab('system')}
                    >
                        🖥️ Sistema
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'whatsapp' ? 'active' : ''}`}
                        onClick={() => setActiveTab('whatsapp')}
                    >
                        📱 WhatsApp
                    </button>
                    <button
                        className={`settings-tab ${activeTab === 'info' ? 'active' : ''}`}
                        onClick={() => setActiveTab('info')}
                        style={{ borderLeft: '1px solid var(--color-border)', marginLeft: '4px', paddingLeft: '12px' }}
                    >
                        ℹ️ Información
                    </button>
                </div>

                <div className="settings-content">
                    {/* Sección INTERFAZ */}
                    {activeTab === 'ui' && (
                        <div className="settings-section">
                            <h4 className="section-title">Personalización Visual</h4>
                            <div className="settings-grid">
                                <div className="setting-item">
                                    <label>Color Primario</label>
                                    <div className="color-picker-wrapper">
                                        <input
                                            type="color"
                                            value={settings.themeNavy}
                                            onChange={(e) => handleSettingUpdate('themeNavy', e.target.value)}
                                        />
                                        <span>{settings.themeNavy}</span>
                                    </div>
                                </div>
                                <div className="setting-item">
                                    <label>Color de Acento</label>
                                    <div className="color-picker-wrapper">
                                        <input
                                            type="color"
                                            value={settings.themeCeleste}
                                            onChange={(e) => handleSettingUpdate('themeCeleste', e.target.value)}
                                        />
                                        <span>{settings.themeCeleste}</span>
                                    </div>
                                </div>
                            </div>

                            <div className="theme-presets">
                                <label>Temas Predefinidos</label>
                                <div className="presets-row">
                                    {themes.map((t, i) => (
                                        <button
                                            key={i}
                                            className={`preset-btn ${settings.themeNavy === t.navy ? 'active' : ''}`}
                                            onClick={() => onSettingsChange({ ...settings, themeNavy: t.navy, themeCeleste: t.celeste })}
                                        >
                                            <div className="preset-preview" style={{ background: t.navy }}>
                                                <div className="preset-accent" style={{ background: t.celeste }}></div>
                                            </div>
                                            <span>{t.name}</span>
                                        </button>
                                    ))}
                                </div>
                            </div>

                            <div className="toggle-setting">
                                <div className="toggle-info">
                                    <span className="toggle-title">Modo Oscuro Experimental</span>
                                    <span className="toggle-desc">Ajusta la interfaz para entornos de poca luz.</span>
                                </div>
                                <label className="switch">
                                    <input
                                        type="checkbox"
                                        checked={settings.darkMode}
                                        onChange={(e) => handleSettingUpdate('darkMode', e.target.checked)}
                                    />
                                    <span className="slider round"></span>
                                </label>
                            </div>

                            <div className="settings-divider">Tipografía</div>

                            <div className="setting-item">
                                <label>Tipo de Letra</label>
                                <select
                                    className="settings-select"
                                    value={settings.fontFamily}
                                    onChange={(e) => handleSettingUpdate('fontFamily', e.target.value)}
                                >
                                    <option value="sans">Sans Serif (Moderna)</option>
                                    <option value="serif">Serif (Clásica)</option>
                                    <option value="mono">Monospace (Código)</option>
                                </select>
                            </div>

                            <div className="setting-item">
                                <div className="label-row">
                                    <label>Escala de Texto</label>
                                    <span className="value-badge">{Math.round(settings.fontSizeMultiplier * 100)}%</span>
                                </div>
                                <input
                                    type="range"
                                    min="0.8"
                                    max="1.4"
                                    step="0.05"
                                    className="settings-range"
                                    value={settings.fontSizeMultiplier}
                                    onChange={(e) => handleSettingUpdate('fontSizeMultiplier', parseFloat(e.target.value))}
                                />
                            </div>
                        </div>
                    )}

                    {/* Sección IA */}
                    {activeTab === 'ai' && (
                        <div className="settings-section">
                            <h4 className="section-title">Inteligencia Artificial</h4>
                            <div className="setting-item">
                                <label>
                                    {settings.aiMode === 'cloud' ? 'Modelo de Lenguaje (Cloud)' : 'Modelo de Lenguaje (Local)'}
                                </label>
                                {settings.aiMode === 'cloud' ? (
                                    <>
                                        <select
                                            className="settings-select"
                                            value={['minimax-m2:cloud', 'deepseek-v3.2', 'kimi-k2.5', 'qwen3-coder-next', 'gemini-3-flash-preview'].includes(settings.cloudModel) ? settings.cloudModel : 'custom'}
                                            onChange={(e) => handleSettingUpdate('cloudModel', e.target.value)}
                                        >
                                            <option value="minimax-m2:cloud">MiniMax M2 (Cloud)</option>
                                            <option value="deepseek-v3.2">DeepSeek V3.2</option>
                                            <option value="kimi-k2.5">Kimi K2.5</option>
                                            <option value="qwen3-coder-next">Qwen3 Coder Next</option>
                                            <option value="gemini-3-flash-preview">Gemini 3 Flash Preview</option>
                                            <option value="custom">Otro (Escribir manual)...</option>
                                        </select>

                                        {!['minimax-m2:cloud', 'deepseek-v3.2', 'kimi-k2.5', 'qwen3-coder-next', 'gemini-3-flash-preview'].includes(settings.cloudModel) && (
                                            <input
                                                type="text"
                                                className="settings-input"
                                                style={{
                                                    width: '100%',
                                                    padding: '8px',
                                                    borderRadius: '6px',
                                                    border: '1px solid #ddd',
                                                    marginTop: '8px',
                                                    backgroundColor: 'var(--color-bg-tertiary)',
                                                    color: 'var(--color-text-primary)'
                                                }}
                                                placeholder="Nombre del modelo..."
                                                value={settings.cloudModel === 'custom' ? '' : settings.cloudModel}
                                                onChange={(e) => handleSettingUpdate('cloudModel', e.target.value)}
                                            />
                                        )}
                                    </>
                                ) : (
                                    <select
                                        className="settings-select"
                                        value={settings.aiModel}
                                        onChange={(e) => handleSettingUpdate('aiModel', e.target.value)}
                                    >
                                        <option value="llama3:latest">Meta Llama 3 (8B)</option>
                                        <option value="llama3.1:latest">Meta Llama 3.1 (8B)</option>
                                        <option value="mistral:latest">Mistral (7B)</option>
                                        <option value="codellama:latest">CodeLlama (IA Programación)</option>
                                        <option value="neural-chat:latest">Neural Chat</option>
                                    </select>
                                )}
                                {settings.aiMode === 'cloud' && settings.cloudModel === 'custom' && (
                                    <input
                                        type="text"
                                        className="settings-input"
                                        style={{
                                            width: '100%',
                                            padding: '8px',
                                            borderRadius: '6px',
                                            border: '1px solid #ddd',
                                            marginTop: '8px',
                                            backgroundColor: 'var(--color-bg-tertiary)',
                                            color: 'var(--color-text-primary)'
                                        }}
                                        placeholder="Nombre del modelo..."
                                        onChange={(e) => handleSettingUpdate('cloudModel', e.target.value)}
                                    />
                                )}
                                <p className="input-hint">
                                    {settings.aiMode === 'cloud'
                                        ? 'Selecciona un modelo disponible en la nube.'
                                        : 'El modelo debe estar descargado en Ollama.'}
                                </p>
                            </div>

                            {settings.aiMode === 'cloud' && (
                                <div className="setting-item">
                                    <label>Host / URL del Proveedor</label>
                                        <input
                                            type="text"
                                            className="settings-input"
                                            style={{
                                                width: '100%',
                                                padding: '8px',
                                                borderRadius: '6px',
                                                border: '1px solid #ddd',
                                                marginTop: '4px',
                                                backgroundColor: 'var(--color-bg-tertiary)',
                                                color: 'var(--color-text-primary)'
                                            }}
                                            placeholder="https://api.openai.com/v1"
                                            value={settings.cloudHost || 'https://api.openai.com/v1'}
                                            onChange={(e) => handleSettingUpdate('cloudHost', e.target.value)}
                                        />
                                    <p className="input-hint">URL del servicio de IA en la nube.</p>
                                </div>
                            )}

                            <div className="setting-item">
                                <div className="label-row">
                                    <label>Modo de Operación</label>
                                    <span className={`status-pill ${settings.aiMode === 'cloud' ? 'online' : 'info'}`} style={{ fontSize: '0.75rem' }}>
                                        {settings.aiMode === 'cloud' ? 'NUBE (Mejor Calidad)' : 'LOCAL (Privado/Offline)'}
                                    </span>
                                </div>
                                <div className="toggle-setting" style={{ marginTop: '8px', marginBottom: '0' }}>
                                    <div className="toggle-info">
                                        <span className="toggle-desc" style={{ fontSize: '0.8rem' }}>
                                            {settings.aiMode === 'cloud'
                                                ? 'Usando API de Ollama Cloud. Requiere internet.'
                                                : 'Ejecutando en tu equipo. Funciona sin internet.'}
                                        </span>
                                    </div>
                                    <label className="switch">
                                        <input
                                            type="checkbox"
                                            checked={settings.aiMode === 'cloud'}
                                            onChange={(e) => handleSettingUpdate('aiMode', e.target.checked ? 'cloud' : 'local')}
                                        />
                                        <span className="slider round"></span>
                                    </label>
                                </div>
                            </div>


                            <div className="setting-item">
                                <div className="label-row">
                                    <label>Temperatura (Creatividad)</label>
                                    <span className="value-badge">{settings.temperature}</span>
                                </div>
                                <input
                                    type="range"
                                    min="0"
                                    max="1"
                                    step="0.1"
                                    className="settings-range"
                                    value={settings.temperature}
                                    onChange={(e) => handleSettingUpdate('temperature', parseFloat(e.target.value))}
                                />
                                <div className="range-labels">
                                    <span>Preciso</span>
                                    <span>Equilibrado</span>
                                    <span>Creativo</span>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* Sección SISTEMA */}
                    {activeTab === 'system' && (
                        <div className="settings-section">
                            <h4 className="section-title">Estado del Ecosistema MCP</h4>
                            <div className="system-status-list">
                                <div className="status-item">
                                    <div className="status-info">
                                        <Globe size={18} />
                                        <span>Servidor Backend</span>
                                    </div>
                                    <span className={`status-pill ${serverStatus.server ? 'online' : 'offline'}`}>
                                        {serverStatus.server ? 'EN LÍNEA' : 'OFFLINE'}
                                    </span>
                                </div>
                                <div className="status-item">
                                    <div className="status-info">
                                        <Zap size={18} />
                                        <span>Motor Ollama</span>
                                    </div>
                                    <span className={`status-pill ${serverStatus.ollama ? 'online' : 'offline'}`}>
                                        {serverStatus.ollama ? 'ACTIVO' : 'INACTIVO'}
                                    </span>
                                </div>
                                <div className="status-item">
                                    <div className="status-info">
                                        <MessageSquare size={18} />
                                        <span>API Gateway</span>
                                    </div>
                                    <span className="status-pill info">/api/v1</span>
                                </div>
                            </div>

                            <div className="system-actions">
                                <button className="sync-btn" onClick={() => window.location.reload()}>
                                    <RefreshCcw size={16} />
                                    Re-sincronizar Todo el Sistema
                                </button>
                                <p className="action-hint">Última comprobación: Hace un momento</p>
                            </div>
                        </div>
                    )}

                    {/* Sección WhatsApp */}
                    {activeTab === 'whatsapp' && (
                        <div className="settings-section">
                            <h4 className="section-title">Integración WhatsApp</h4>
                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
                                Conecta tu WhatsApp para chatear con la IA directamente desde tu teléfono.
                                Los mensajes se procesan con IA en la nube para máxima velocidad.
                            </p>

                            {/* Estado: No logueado con Google */}
                            {!currentUser && (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                    <div style={{ marginBottom: '1.5rem' }}>
                                        <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                            <span style={{ fontSize: '1.8rem' }}>G</span>
                                        </div>
                                        <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Inicia sesión con Google</h4>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '300px', margin: '0 auto' }}>
                                            Necesitas una cuenta de Google para vincular tu WhatsApp. El sistema general no requiere login.
                                        </p>
                                    </div>
                                    {/* Google renders its own button here */}
                                    <div
                                        ref={(el) => { if (el) onGoogleLogin(el); }}
                                        style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }}
                                    ></div>
                                </div>
                            )}

                            {/* Estado: Logueado pero WA desconectado/error */}
                            {currentUser &&
                                whatsappStatus !== 'connected' &&
                                whatsappStatus !== 'qr_pending' &&
                                whatsappStatus !== 'initializing' && (
                                    <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '1.5rem', padding: '10px 16px', background: 'rgba(66,133,244,0.08)', borderRadius: '10px', width: 'fit-content', margin: '0 auto 1.5rem' }}>
                                            {currentUser.avatar_url ? (
                                                <img src={currentUser.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
                                            ) : (
                                                <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>
                                                    {currentUser.name?.[0] || '?'}
                                                </div>
                                            )}
                                            <div style={{ textAlign: 'left' }}>
                                                <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{currentUser.name}</div>
                                                <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{currentUser.email}</div>
                                            </div>
                                            <button
                                                onClick={onGoogleLogout}
                                                style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)', fontSize: '0.75rem' }}
                                                title="Cerrar sesión"
                                            >
                                                <X size={14} />
                                            </button>
                                        </div>

                                        <div style={{ marginBottom: '1.5rem' }}>
                                            <div style={{ width: '56px', height: '56px', borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                                <span style={{ fontSize: '1.5rem' }}>📱</span>
                                            </div>
                                            <h4 style={{ marginBottom: '0.5rem' }}>Conecta tu WhatsApp</h4>
                                            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '280px', margin: '0 auto' }}>
                                                Se generará un código QR. Escanéalo con tu teléfono para vincular.
                                            </p>
                                        </div>

                                        <button
                                            className="btn btn-primary"
                                            onClick={async () => {
                                                if (waLoading) return;
                                                setWaLoading(true);
                                                const success = await onWhatsAppInit();
                                                if (!success) setWaLoading(false);
                                            }}
                                            disabled={waLoading || whatsappStatus === 'initializing'}
                                            style={{
                                                padding: '12px 28px', fontSize: '0.95rem', fontWeight: '600',
                                                background: (whatsappStatus === 'error' || whatsappStatus === 'auth_failed')
                                                    ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                                                    : 'linear-gradient(135deg, #25D366, #128C7E)',
                                                border: 'none', borderRadius: '8px', color: '#fff',
                                                cursor: (waLoading || whatsappStatus === 'initializing') ? 'wait' : 'pointer',
                                                transition: 'all 0.2s',
                                                boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                                                opacity: (waLoading || whatsappStatus === 'initializing') ? 0.7 : 1,
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '10px',
                                                margin: '0 auto'
                                            }}
                                        >
                                            {(waLoading || whatsappStatus === 'initializing') ? (
                                                <><div className="loading-spinner-tiny" style={{ borderTopColor: '#fff' }}></div> Procesando...</>
                                            ) : (
                                                (whatsappStatus === 'error' || whatsappStatus === 'auth_failed')
                                                    ? '🔄 Reintentar Conexión'
                                                    : '🔗 Conectar WhatsApp'
                                            )}
                                        </button>

                                        {(whatsappStatus === 'error' || whatsappStatus === 'auth_failed') && (
                                            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '12px', fontWeight: '500' }}>
                                                ⚠️ Hubo un problema al iniciar. Intenta de nuevo.
                                            </p>
                                        )}
                                    </div>
                                )}

                            {/* Estado: Inicializando */}
                            {currentUser && whatsappStatus === 'initializing' && (
                                <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
                                    <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem', borderColor: '#25D366', borderTopColor: 'transparent' }}></div>
                                    <h4 style={{ marginBottom: '0.5rem' }}>Inicializando WhatsApp</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '280px', margin: '0 auto' }}>
                                        Estamos preparando el túnel de conexión. El código QR aparecerá en unos segundos.
                                    </p>
                                    <div style={{ marginTop: '1.5rem', fontSize: '0.8rem', color: '#128C7E', fontWeight: '600', animation: 'pulse 2s infinite' }}>
                                        YA SE ESTÁ PROCESANDO...
                                    </div>
                                </div>
                            )}

                            {/* Estado: Esperando escaneo de QR */}
                            {currentUser && whatsappStatus === 'qr_pending' && (
                                <div style={{ textAlign: 'center', padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', marginBottom: '1rem' }}>
                                        <span className="status-pill info" style={{ fontSize: '0.75rem' }}>ESPERANDO ESCANEO</span>
                                    </div>

                                    {whatsappQR ? (
                                        <div style={{ padding: '16px', background: '#fff', borderRadius: '12px', display: 'inline-block', boxShadow: '0 4px 16px rgba(0,0,0,0.1)', marginBottom: '1rem' }}>
                                            <img src={whatsappQR} alt="QR Code WhatsApp" style={{ width: '250px', height: '250px', display: 'block' }} />
                                        </div>
                                    ) : (
                                        <div style={{ padding: '2rem' }}>
                                            <div className="loading-spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }}></div>
                                            <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Generando QR...</p>
                                        </div>
                                    )}

                                    <div style={{ maxWidth: '280px', margin: '0 auto' }}>
                                        <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                            1. Abre WhatsApp en tu teléfono<br />
                                            2. Toca <strong>Menú ⋮</strong> → <strong>Dispositivos vinculados</strong><br />
                                            3. Toca <strong>Vincular un dispositivo</strong><br />
                                            4. Escanea este código QR
                                        </p>
                                    </div>

                                    <button
                                        onClick={onWhatsAppDisconnect}
                                        style={{ marginTop: '1rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}
                                    >
                                        Cancelar
                                    </button>
                                </div>
                            )}

                            {/* Estado: Conectado */}
                            {currentUser && whatsappStatus === 'connected' && (
                                <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
                                    <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={28} color="#fff" />
                                    </div>
                                    <h4 style={{ color: '#25D366', marginBottom: '0.5rem' }}>✅ WhatsApp Conectado</h4>
                                    <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
                                        Tu WhatsApp está vinculado. Envía mensajes al número conectado para chatear con la IA.
                                    </p>
                                    <div style={{ margin: '1rem 0', padding: '10px 16px', background: 'rgba(37,211,102,0.08)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
                                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366', animation: 'pulse 2s infinite' }}></div>
                                        <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Activo</span>
                                        <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>• Usando IA Cloud</span>
                                    </div>

                                    <div style={{ marginTop: '1.5rem' }}>
                                        <button
                                            className="btn"
                                            onClick={onWhatsAppDisconnect}
                                            style={{
                                                padding: '8px 20px', fontSize: '0.85rem',
                                                background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)',
                                                borderRadius: '8px', color: '#ef4444', cursor: 'pointer',
                                            }}
                                        >
                                            Desconectar WhatsApp
                                        </button>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}

                    {/* Sección INFORMACIÓN */}
                    {activeTab === 'info' && (
                        <div className="settings-section">
                            <h4 className="section-title">📊 Guía de Uso de IA</h4>
                            
                            <div className="info-block">
                                <h5 className="info-subtitle">☁️ Modelos en la Nube (Cloud)</h5>
                                <div className="info-cards-grid">
                                    <div className="info-card">
                                        <strong>MiniMax M2</strong>
                                        <p>Excelente para **Redacción Académica**. Úsalo para generar borradores de resoluciones y documentos formales con tono profesional.</p>
                                    </div>
                                    <div className="info-card">
                                        <strong>DeepSeek V3</strong>
                                        <p>Líder en **Razonamiento Lógico**. Ideal para analizar normativas complejas y detectar inconsistencias en documentos.</p>
                                    </div>
                                    <div className="info-card">
                                        <strong>Kimi K2.5</strong>
                                        <p>Especialista en **Contexto Masivo**. Úsalo para analizar múltiples Sílabos o Planes de Estudio completos de una sola vez.</p>
                                    </div>
                                    <div className="info-card">
                                        <strong>Qwen3 Coder</strong>
                                        <p>Optimizado para **Tareas Técnicas**. Ayuda en la gestión de la base de datos y scripts de automatización del servidor.</p>
                                    </div>
                                    <div className="info-card">
                                        <strong>Gemini Flash</strong>
                                        <p>El más **Eficiente**. Ideal para consultas rápidas sobre el calendario académico o estados de trámites sencillos.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="info-block" style={{ marginTop: '1.5rem' }}>
                                <h5 className="info-subtitle">💻 Modelos Locales (Ollama)</h5>
                                <div className="info-cards-grid">
                                    <div className="info-card local-badge">
                                        <strong>Llama 3 / 3.1</strong>
                                        <p>**Privacidad Total**. Úsalo para procesar datos sensibles de estudiantes o docentes sin que la información salga del servidor.</p>
                                    </div>
                                    <div className="info-card local-badge">
                                        <strong>Mistral</strong>
                                        <p>**Rendimiento Estable**. Ideal para tareas de clasificación de documentos cuando el servidor tiene carga de trabajo alta.</p>
                                    </div>
                                </div>
                            </div>

                            <div className="info-divider">Ecosistema MCP + IA</div>
                            
                            <div className="mcp-info-box">
                                <div className="mcp-point">
                                    <strong>¿Cómo te ayuda el Servidor MCP?</strong>
                                    <p>El MCP (Model Context Protocol) actúa como el bibliotecario de tu institución. No solo "chatea", sino que **busca en la base de datos académica** para dar respuestas basadas en hechos reales (Sílabos, Resoluciones, Fechas).</p>
                                </div>
                                <div className="mcp-grid">
                                    <div className="mcp-feature">
                                        <span className="mcp-icon">📚</span>
                                        <strong>Conocimiento Institucional</strong>
                                        <p>La IA tiene acceso a toda la normativa y documentos aprobados en la biblioteca.</p>
                                    </div>
                                    <div className="mcp-feature">
                                        <span className="mcp-icon">🖋️</span>
                                        <strong>Generación de Documentos</strong>
                                        <p>Crea automáticamente documentos basados en el contexto previo de la institución.</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </Modal>
    );
}


// ============ App Principal ============

function App() {
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [uploadModalOpen, setUploadModalOpen] = useState(false);
    const [filesModalOpen, setFilesModalOpen] = useState(false);
    const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
    const [settingsModalOpen, setSettingsModalOpen] = useState(false);
    const [serverStatus, setServerStatus] = useState({ server: false, ollama: false });

    // Google Auth state
    const [currentUser, setCurrentUser] = useState(() => {
        const saved = localStorage.getItem('epiis_user');
        const token = localStorage.getItem('epiis_token');
        if (saved && token) {
            return JSON.parse(saved);
        }
        return null;
    });

    // WhatsApp state
    const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
    const [whatsappQR, setWhatsappQR] = useState(null);
    const [waLoading, setWaLoading] = useState(false);
    const whatsappPollRef = useRef(null);

    // Configuración persistente
    const [settings, setSettings] = useState(() => {
        const defaults = {
            themeNavy: '#1e3a5f',
            themeCeleste: '#e0f2fe',
            fontSizeMultiplier: 1,
            fontFamily: 'sans',
            aiModel: 'llama3:latest',
            temperature: 0.7,
            aiMode: 'local',
            cloudModel: 'minimax-m2:cloud',
            cloudHost: 'https://ollama.com/',
            darkMode: false
        };

        const saved = localStorage.getItem('epiis_settings');
        if (saved) {
            return { ...defaults, ...JSON.parse(saved) };
        }
        return defaults;
    });

    useEffect(() => {
        localStorage.setItem('epiis_settings', JSON.stringify(settings));
        // Aplicar tema dinámicamente
        const root = document.documentElement;
        root.style.setProperty('--color-navy', settings.themeNavy);
        // Generar un color navy light (un poco más claro) para hover
        const navyLight = adjustColor(settings.themeNavy, 20);
        root.style.setProperty('--color-navy-light', navyLight);
        root.style.setProperty('--color-celeste', settings.themeCeleste);

        // Aplicar Modo Oscuro al Body
        if (settings.darkMode) {
            document.body.classList.add('dark-theme');
        } else {
            document.body.classList.remove('dark-theme');
        }

        // Aplicar Tipografía
        root.style.setProperty('--font-size-base', `${settings.fontSizeMultiplier * 16}px`);

        let fontFamilyValue = 'var(--font-sans)';
        if (settings.fontFamily === 'serif') fontFamilyValue = 'var(--font-serif)';
        if (settings.fontFamily === 'mono') fontFamilyValue = 'var(--font-mono)';
        root.style.setProperty('--font-family-main', fontFamilyValue);

        // El gradiente también se actualiza
        root.style.setProperty('--color-accent-gradient', `linear-gradient(135deg, ${settings.themeNavy} 0%, #3b82f6 100%)`);

        // Sincronizar modo de IA con backend si cambia
        syncAiMode(settings);
    }, [settings]);

    // Función para sincronizar con backend
    const syncAiMode = async (currentSettings) => {
        try {
            await api.post('/settings/ai', {
                mode: currentSettings.aiMode,
                cloudConfig: {
                    host: currentSettings.cloudHost,
                    model: currentSettings.cloudModel
                }
            });
        } catch (error) {
            console.error('Error syncing AI mode:', error);
        }
    };

    // === Google Auth Handlers ===
    const googleBtnRef = useRef(null);
    const googleInitialized = useRef(false);

    const initGoogleAuth = (btnContainer) => {
        if (!btnContainer) return;
        googleBtnRef.current = btnContainer;

        if (!window.google?.accounts?.id) {
            // Script not loaded yet, retry
            const checkInterval = setInterval(() => {
                if (window.google?.accounts?.id) {
                    clearInterval(checkInterval);
                    initGoogleAuth(btnContainer);
                }
            }, 300);
            return;
        }

        window.google.accounts.id.initialize({
            client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
            callback: async (response) => {
                try {
                    const res = await api.post('/auth/google', { credential: response.credential });
                    if (res.data.success) {
                        localStorage.setItem('epiis_token', res.data.token);
                        localStorage.setItem('epiis_user', JSON.stringify(res.data.user));
                        setCurrentUser(res.data.user);
                    }
                } catch (error) {
                    console.error('Google auth error:', error);
                }
            },
        });

        // Clear previous button content
        btnContainer.innerHTML = '';

        window.google.accounts.id.renderButton(
            btnContainer,
            {
                theme: 'outline',
                size: 'large',
                width: 300,
                text: 'signin_with',
                shape: 'rectangular',
                logo_alignment: 'left',
            }
        );

        googleInitialized.current = true;
    };

    const handleGoogleLogout = () => {
        localStorage.removeItem('epiis_token');
        localStorage.removeItem('epiis_user');
        setCurrentUser(null);
        setWhatsappStatus('disconnected');
        setWhatsappQR(null);
        if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
    };

    // === WhatsApp Handlers ===
    const getAuthHeaders = () => {
        const token = localStorage.getItem('epiis_token');
        return token ? { Authorization: `Bearer ${token}` } : {};
    };

    const handleWhatsAppInit = async () => {
        try {
            const res = await api.post('/whatsapp/init', {}, { headers: getAuthHeaders() });
            if (res.data.success) {
                setWhatsappStatus('initializing');
                startWhatsAppPolling();
                return true;
            }
            return false;
        } catch (error) {
            console.error('Error initializing WhatsApp:', error);
            if (error.response?.status === 401) {
                alert('Tu sesión ha expirado. Por favor, inicia sesión con Google nuevamente.');
                handleGoogleLogout();
            } else {
                alert('Error al conectar con WhatsApp: ' + (error.response?.data?.error || 'Error desconocido'));
            }
            setWaLoading(false);
            return false;
        }
    };

    const handleWhatsAppDisconnect = async () => {
        try {
            await api.post('/whatsapp/disconnect', {}, { headers: getAuthHeaders() });
            setWhatsappStatus('disconnected');
            setWhatsappQR(null);
            if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
        } catch (error) {
            console.error('Error disconnecting WhatsApp:', error);
        }
    };

    const startWhatsAppPolling = () => {
        if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);

        const poll = async () => {
            try {
                const [statusRes, qrRes] = await Promise.all([
                    api.get('/whatsapp/status', { headers: getAuthHeaders() }),
                    api.get('/whatsapp/qr', { headers: getAuthHeaders() }),
                ]);

                const newStatus = statusRes.data.status;
                setWhatsappStatus(newStatus);

                if (qrRes.data.qr) {
                    setWhatsappQR(qrRes.data.qr);
                    // Si ya tenemos QR, dejamos de estar en "loading" visual del botón
                    setWaLoading(false);
                }

                // Stop polling once connected
                if (newStatus === 'connected') {
                    setWaLoading(false);
                    if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
                }
            } catch (error) {
                console.error('WhatsApp poll error:', error);
                // Si hay error persistente (ej: 401), el interceptor lo manejará,
                // pero aquí detenemos el poll si es crítico
                if (error.response?.status === 401) {
                    if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
                    setWaLoading(false);
                }
            }
        };

        // First poll immediately
        poll();
        whatsappPollRef.current = setInterval(poll, 6000);
    };

    // Check WhatsApp status on mount if user is logged in
    useEffect(() => {
        if (currentUser) {
            api.get('/whatsapp/status', { headers: getAuthHeaders() })
                .then(res => setWhatsappStatus(res.data.status))
                .catch(() => { });
        }
        return () => {
            if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
        };
    }, [currentUser]);

    // Función auxiliar para aclarar/oscurecer colores (hex)
    function adjustColor(hex, percent) {
        let r = parseInt(hex.slice(1, 3), 16);
        let g = parseInt(hex.slice(3, 5), 16);
        let b = parseInt(hex.slice(5, 7), 16);

        r = Math.min(255, Math.floor(r * (1 + percent / 100)));
        g = Math.min(255, Math.floor(g * (1 + percent / 100)));
        b = Math.min(255, Math.floor(b * (1 + percent / 100)));

        return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
    }

    useEffect(() => {
        checkServerStatus();
        const interval = setInterval(checkServerStatus, 30000);

        const openGeneratorHandler = () => setGeneratorModalOpen(true);
        const openUploadHandler = () => setUploadModalOpen(true);
        const openSettingsHandler = () => setSettingsModalOpen(true);
        const handleAuthError = () => {
            handleGoogleLogout();
            setSettingsModalOpen(true); // Re-abrir para que vea el botón de login
        };

        window.addEventListener('openGenerator', openGeneratorHandler);
        window.addEventListener('openUpload', openUploadHandler);
        window.addEventListener('openSettings', openSettingsHandler);
        window.addEventListener('authError', handleAuthError);

        return () => {
            clearInterval(interval);
            window.removeEventListener('openGenerator', openGeneratorHandler);
            window.removeEventListener('openUpload', openUploadHandler);
            window.removeEventListener('openSettings', openSettingsHandler);
            window.removeEventListener('authError', handleAuthError);
        };
    }, []);

    const checkServerStatus = async () => {
        try {
            const response = await api.get('/health');
            setServerStatus({
                server: response.data.status === 'ok' || response.data.status === 'partial',
                ollama: response.data.services?.ollama?.status === 'connected'
            });
        } catch (error) {
            setServerStatus({ server: false, ollama: false });
        }
    };

    return (
        <Router>
            <Routes>
                <Route path="/admin" element={<AdminPanel />} />
                <Route path="*" element={
                    <div className="app-layout">
                        {sidebarOpen && (
                            <div
                                className="sidebar-overlay visible"
                                onClick={() => setSidebarOpen(false)}
                            />
                        )}
                        <Sidebar
                            isOpen={sidebarOpen}
                            onClose={() => setSidebarOpen(false)}
                            isCollapsed={sidebarCollapsed}
                            onToggle={() => setSidebarCollapsed(!sidebarCollapsed)}
                        />
                        <div className={`main-content ${sidebarCollapsed ? 'sidebar-collapsed' : ''}`}>
                            <Header
                                serverStatus={serverStatus}
                                onMenuClick={() => setSidebarOpen(true)}
                                onUploadClick={() => setUploadModalOpen(true)}
                                onFolderClick={() => setFilesModalOpen(true)}
                            />
                            <Routes>
                                <Route path="/" element={<ChatPage />} />
                            </Routes>

                            <UploadModal
                                isOpen={uploadModalOpen}
                                onClose={() => setUploadModalOpen(false)}
                                onUploadSuccess={() => {
                                    setUploadModalOpen(false);
                                }}
                            />

                            <FilesModal
                                isOpen={filesModalOpen}
                                onClose={() => setFilesModalOpen(false)}
                            />

                            <GeneratorModal
                                isOpen={generatorModalOpen}
                                onClose={() => setGeneratorModalOpen(false)}
                            />

                            <SettingsModal
                                isOpen={settingsModalOpen}
                                onClose={() => setSettingsModalOpen(false)}
                                settings={settings}
                                onSettingsChange={setSettings}
                                serverStatus={serverStatus}
                                currentUser={currentUser}
                                onGoogleLogin={initGoogleAuth}
                                onGoogleLogout={handleGoogleLogout}
                                whatsappStatus={whatsappStatus}
                                whatsappQR={whatsappQR}
                                onWhatsAppInit={handleWhatsAppInit}
                                onWhatsAppDisconnect={handleWhatsAppDisconnect}
                                waLoading={waLoading}
                                setWaLoading={setWaLoading}
                            />
                        </div>
                    </div>
                } />
            </Routes>
        </Router>
    );
}

export default App;
