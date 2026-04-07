import {
  useState, useEffect, useRef, useCallback, useMemo, memo
} from 'react';
import {
  BrowserRouter as Router, Routes, Route, Link, useLocation
} from 'react-router-dom';
import {
  MessageSquare, FileText, Search, Settings, Plus, Send,
  FileUp, Sparkles, BookOpen, FileCheck, Scroll, GraduationCap,
  Menu, X, Zap, ChevronDown, Folder, Library, Bell, HelpCircle,
  ArrowRight, Globe, File, Mail, Info, User, Paperclip,
  SendHorizontal, Copy, Check, PanelLeftClose, PanelLeftOpen,
  RefreshCcw, Table, Presentation, Download, LayoutGrid, List
} from 'lucide-react';
import api from './services/api';
import AdminPanel from './pages/AdminPanel';

// ─── Constantes ──────────────────────────────────────────────────────────────

const CHAT_HISTORY_KEY = 'chat_history';
const SETTINGS_KEY = 'epiis_settings';
const USER_KEY = 'epiis_user';
const TOKEN_KEY = 'epiis_token';
const SIDEBAR_POLL_MS = 30_000;
const STATUS_POLL_MS = 30_000;
const WA_POLL_MS = 6_000;
const TOAST_DURATION_MS = 4_000;
const MAX_TEXTAREA_H = 240;
const MAX_RECENT_DOCS = 10;
const CHAT_CONTEXT_LEN = 6;
const TEXT_EXPAND_LIMIT = 500;

const DEFAULT_SETTINGS = Object.freeze({
  themeNavy: '#1e3a5f',
  themeCeleste: '#e0f2fe',
  fontSizeMultiplier: 1,
  fontFamily: 'sans',
  aiModel: 'llama3:latest',
  temperature: 0.3,
  aiMode: 'local',
  cloudModel: 'llama-3.3-70b-versatile',
  cloudHost: 'https://ollama.com/',
  cloudApiKey: '',
  groqApiKey: '',
  darkMode: false,
});

const THEME_PRESETS = Object.freeze([
  { name: 'Azul Marino', navy: '#1e3a5f', celeste: '#e0f2fe' },
  { name: 'Esmeralda', navy: '#064e3b', celeste: '#d1fae5' },
  { name: 'Púrpura', navy: '#4c1d95', celeste: '#ede9fe' },
  { name: 'Gris Prof.', navy: '#1e293b', celeste: '#f1f5f9' },
]);

const FILTER_OPTIONS = Object.freeze([
  { value: 'all', label: 'Todos' },
  { value: 'silabo', label: 'Sílabos' },
  { value: 'resolucion', label: 'Resoluciones' },
  { value: 'informe', label: 'Informes' },
  { value: 'reglamento', label: 'Reglamentos' },
  { value: 'general', label: 'General' },
]);

const FILE_EXT_COLORS = Object.freeze({
  pdf: '#ef4444',
  docx: '#3b82f6',
  doc: '#3b82f6',
  xlsx: '#10b981',
  xls: '#10b981',
  pptx: '#f59e0b',
  ppt: '#f59e0b',
  txt: '#6b7280',
  md: '#8b5cf6',
});

const ALLOWED_UPLOAD_EXTS = Object.freeze(['.pdf', '.docx', '.doc', '.txt', '.xlsx', '.pptx', '.md']);
const MAX_UPLOAD_BYTES = 50 * 1024 * 1024; // 50 MB

const GENERATOR_TEMPLATES = {
  syllabus: {
    title: 'Sílabo', icon: BookOpen, formats: ['pdf', 'docx'],
    fields: [
      { name: 'course_code', label: 'Código del Curso', placeholder: 'IS401' },
      { name: 'course_name', label: 'Nombre del Curso', placeholder: 'Inteligencia Artificial' },
      { name: 'professor', label: 'Docente', placeholder: 'Dr. Juan Pérez' },
      { name: 'semester', label: 'Semestre', placeholder: '2024-I' },
    ],
  },
  exam: {
    title: 'Examen', icon: GraduationCap, formats: ['pdf', 'docx'],
    fields: [
      { name: 'course', label: 'Curso', placeholder: 'Seguridad Informatica' },
      { name: 'topic', label: 'Tema o Unidad', placeholder: 'Vulnerabilidades web...' },
      {
        name: 'examType', label: 'Tipo de Examen', placeholder: 'EXAMEN PARCIAL',
        type: 'select', options: [
          { value: '1er EXAMEN PARCIAL', label: '1er Examen Parcial' },
          { value: '2do EXAMEN PARCIAL', label: '2do Examen Parcial' },
          { value: '3er EXAMEN PARCIAL', label: '3er Examen Parcial' },
          { value: 'EXAMEN FINAL', label: 'Examen Final' },
          { value: 'EXAMEN SUSTITUTORIO', label: 'Examen Sustitutorio' },
        ],
      },
      { name: 'semester', label: 'Semestre Académico', placeholder: '2024-I' },
      { name: 'questionCount', label: 'Número de Preguntas', placeholder: '10' },
      {
        name: 'difficulty', label: 'Nivel de Dificultad', placeholder: 'Intermedio',
        type: 'select', options: [
          { value: 'basico', label: 'Básico' },
          { value: 'intermedio', label: 'Intermedio' },
          { value: 'avanzado', label: 'Avanzado' },
        ],
      },
      { name: 'duration', label: 'Duración (minutos)', placeholder: '20' },
      { name: 'pointsPerQuestion', label: 'Puntos por Pregunta', placeholder: '2' },
      {
        name: 'questionTypes', label: 'Tipos de Pregunta', placeholder: 'opción múltiple...',
        type: 'select', options: [
          { value: 'multiple_choice, true_false', label: 'Opción Múltiple + V/F' },
          { value: 'multiple_choice', label: 'Solo Opción Múltiple' },
          { value: 'multiple_choice, true_false, multi_select', label: 'Mixto (Multiple + V/F + Multi)' },
          { value: 'multiple_choice, true_false, fill_blank', label: 'Mixto (Multiple + V/F + Compl.)' },
          { value: 'multiple_choice, true_false, multi_select, fill_blank, open_ended', label: 'Todos los Tipos' },
        ],
      },
      { name: 'instructions', label: 'Indicaciones para el Alumno', placeholder: 'Presentar con lapicero...', multiline: true },
    ],
  },
  resolution: {
    title: 'Resolución', icon: Scroll, formats: ['pdf', 'docx'],
    fields: [
      { name: 'type', label: 'Tipo', placeholder: 'directoral' },
      { name: 'subject', label: 'Asunto', placeholder: 'Aprobación de proyecto' },
      { name: 'considerations', label: 'Considerandos', placeholder: 'Descripción...', multiline: true },
    ],
  },
  excel: {
    title: 'Excel', icon: Table, formats: ['xlsx'],
    fields: [
      { name: 'subject', label: 'Tema del Reporte', placeholder: 'Listado de notas de IA' },
      { name: 'details', label: 'Detalles Específicos', placeholder: 'Incluir nombres, DNI...', multiline: true },
    ],
  },
  ppt: {
    title: 'Presentación', icon: Presentation, formats: ['pptx'],
    fields: [
      { name: 'topic', label: 'Tema', placeholder: 'Introducción a ML' },
      { name: 'slides_count', label: 'Número de Diapositivas', placeholder: '5' },
      { name: 'focus', label: 'Enfoque Principal', placeholder: 'Teórico y práctico...', multiline: true },
    ],
  },
  letter: {
    title: 'Carta', icon: FileCheck, formats: ['pdf', 'docx'],
    fields: [
      { name: 'recipient', label: 'Destinatario', placeholder: 'Ing. María García' },
      { name: 'subject', label: 'Asunto', placeholder: 'Solicitud de...' },
      { name: 'body', label: 'Contenido', placeholder: 'Cuerpo de la carta...', multiline: true },
    ],
  },
};

const CHAT_SUGGESTIONS = Object.freeze([
  { icon: BookOpen, label: 'Elaborar Sílabo', prompt: 'Ayúdame a elaborar un sílabo para ' },
  { icon: FileCheck, label: 'Informe de Gestión', prompt: 'Genera un informe de gestión sobre ' },
  { icon: Mail, label: 'Carta Director', prompt: 'Redacta una carta para el director sobre ' },
  { icon: Info, label: 'Malla Curricular', prompt: 'Muéstrame la malla curricular de ' },
]);

// ─── Helpers ─────────────────────────────────────────────────────────────────

const getFileExtColor = (name = '') =>
  FILE_EXT_COLORS[name.split('.').pop().toLowerCase()] ?? '#6b7280';

const formatBytes = (bytes) => {
  if (!bytes) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / k ** i).toFixed(1))} ${sizes[i]}`;
};

/** Aclarar / oscurecer color hex en `percent` %. */
const adjustColor = (hex, percent) => {
  const clamp = (v) => Math.min(255, Math.floor(v * (1 + percent / 100)));
  const r = clamp(parseInt(hex.slice(1, 3), 16));
  const g = clamp(parseInt(hex.slice(3, 5), 16));
  const b = clamp(parseInt(hex.slice(5, 7), 16));
  return `#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`;
};

const readLocalStorage = (key, fallback) => {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
};

const getAuthHeaders = () => {
  const token = localStorage.getItem(TOKEN_KEY);
  return token ? { Authorization: `Bearer ${token}` } : {};
};

// ─── Hooks personalizados ─────────────────────────────────────────────────────

/** Sincroniza un valor en localStorage cada vez que cambia. */
function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => readLocalStorage(key, initialValue));
  useEffect(() => {
    try { localStorage.setItem(key, JSON.stringify(value)); } catch { /* ignore */ }
  }, [key, value]);
  return [value, setValue];
}

/** Toast de notificación efímero. */
function useToast() {
  const [toast, setToast] = useState(null);
  useEffect(() => {
    if (!toast) return;
    const id = setTimeout(() => setToast(null), TOAST_DURATION_MS);
    return () => clearTimeout(id);
  }, [toast]);
  const showToast = useCallback((message, type = 'info') => setToast({ message, type }), []);
  return [toast, showToast];
}

// ─── ExpandableText ───────────────────────────────────────────────────────────

const ExpandableText = memo(function ExpandableText({ text, limit = TEXT_EXPAND_LIMIT }) {
  const [expanded, setExpanded] = useState(false);
  const shouldCollapse = text && text.length > limit;

  if (!shouldCollapse) return <div className="message-text">{text}</div>;

  return (
    <div className="message-text-container">
      <div className="message-text" style={{ whiteSpace: 'pre-wrap' }}>
        {expanded ? text : `${text.substring(0, limit)}...`}
      </div>
      <button
        className="see-more-btn"
        onClick={() => setExpanded((p) => !p)}
        style={{
          background: 'none', border: 'none', color: 'var(--color-navy)',
          fontSize: '0.75rem', fontWeight: '700', cursor: 'pointer',
          padding: '4px 0', marginTop: '4px',
          display: 'flex', alignItems: 'center', gap: '4px', opacity: 0.8,
        }}
      >
        {expanded
          ? <><span>Ver menos</span><ChevronDown size={14} style={{ transform: 'rotate(180deg)' }} /></>
          : <><span>Ver más</span><ChevronDown size={14} /></>}
      </button>
    </div>
  );
});

// ─── Sidebar ──────────────────────────────────────────────────────────────────

const Sidebar = memo(function Sidebar({ isOpen, onClose, isCollapsed, onToggle }) {
  const location = useLocation();
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  const loadRecentDocuments = useCallback(async () => {
    try {
      const { data } = await api.get('/documents');
      setDocuments(data.documents ?? []);
    } catch (error) {
      console.error('Error loading documents:', error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadRecentDocuments();
    const id = setInterval(loadRecentDocuments, SIDEBAR_POLL_MS);
    return () => clearInterval(id);
  }, [loadRecentDocuments]);

  const filteredDocuments = useMemo(
    () => documents.filter((d) => d.name.toLowerCase().includes(searchQuery.toLowerCase())),
    [documents, searchQuery],
  );

  const handleNewChat = useCallback(() => {
    window.dispatchEvent(new CustomEvent('newChat'));
    onClose();
    if (window.location.pathname !== '/') window.location.href = '/';
  }, [onClose]);

  return (
    <aside className={`sidebar ${isOpen ? 'open' : ''} ${isCollapsed ? 'collapsed' : ''}`}>
      <div className="sidebar-header">
        <div className="sidebar-branding">
          <button
            className="sidebar-toggle-btn"
            onClick={onToggle}
            title={isCollapsed ? 'Expandir' : 'Contraer'}
          >
            {isCollapsed ? <PanelLeftOpen size={20} /> : <PanelLeftClose size={20} />}
          </button>
          {!isCollapsed && <span className="sidebar-brand">EPIIS UNAS</span>}
        </div>
        <button className="mobile-close" onClick={onClose}><X size={20} /></button>
      </div>

      {!isCollapsed && (
        <div className="sidebar-search">
          <div className="search-wrapper" style={{
            background: 'white', border: '1px solid #e2e8f0', borderRadius: '12px',
            padding: '8px 12px', display: 'flex', alignItems: 'center', gap: '8px',
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
          <button className="nav-item new-chat-btn" onClick={handleNewChat} title="Nuevo Chat">
            <Plus size={20} style={{
              background: 'rgba(255,255,255,0.2)', borderRadius: '50%',
              marginRight: !isCollapsed ? '12px' : '0',
            }} />
            {!isCollapsed && <span>Nuevo Chat</span>}
          </button>
        </div>

        {!isCollapsed && (
          <div className="nav-section">
            <div className="nav-section-header" style={{
              display: 'flex', justifyContent: 'space-between', alignItems: 'center',
              padding: '0 12px 12px',
            }}>
              <span style={{ fontSize: '0.75rem', fontWeight: '700', color: '#94a3b8', letterSpacing: '0.05em' }}>
                HISTORIAL RECIENTE
              </span>
              <span style={{ color: '#e2e8f0' }}>...</span>
            </div>
            <div className="recent-list">
              {loading ? (
                <div className="loading-state"><div className="loading-spinner-tiny" /></div>
              ) : filteredDocuments.length === 0 ? (
                <div className="empty-state">No hay documentos</div>
              ) : (
                filteredDocuments.slice(0, MAX_RECENT_DOCS).map((doc, i) => (
                  <a
                    key={i}
                    href={`${api.defaults.baseURL}/documents/view/${encodeURIComponent(doc.path)}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="nav-item"
                    style={{ height: '40px' }}
                  >
                    <FileText size={18} color="#1e3a5f" />
                    <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {doc.name}
                    </span>
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
});

// ─── Header ───────────────────────────────────────────────────────────────────

const Header = memo(function Header({ serverStatus, onMenuClick, onUploadClick, onFolderClick }) {
  return (
    <header className="header">
      <div className="header-left">
        <button className="mobile-menu" onClick={onMenuClick}><Menu size={20} /></button>
        <div className="header-brand">
          <GraduationCap size={24} className="header-icon" />
          <span style={{ fontWeight: '600', color: '#334155' }}>SELVA INTELIGENTE</span>
        </div>
      </div>

      <div className="header-actions">
        <div className="header-status">
          <div className="status-badge">
            <span className={`status-dot ${serverStatus.ollama ? 'connected' : 'disconnected'}`} />
            <span>IA Activa</span>
          </div>
          <div className="status-badge" style={{ borderLeft: 'none', borderRight: 'none', borderRadius: '0' }}>|</div>
          <div className="status-badge">
            <span className={`status-dot ${serverStatus.server ? 'connected' : 'disconnected'}`} />
            <span>Servidor</span>
          </div>
        </div>
        <div className="header-separator" />
        <button className="header-btn" onClick={onUploadClick} title="Subir Archivo"><Plus size={20} /></button>
        <button className="header-btn" onClick={onFolderClick} title="Biblioteca de Archivos"><Folder size={20} /></button>
      </div>
    </header>
  );
});

// ─── ChatPage ─────────────────────────────────────────────────────────────────

function ChatPage() {
  const [messages, setMessages] = useLocalStorage(CHAT_HISTORY_KEY, []);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [attachedFiles, setAttachedFiles] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const [copiedId, setCopiedId] = useState(null);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Limpiar chat
  useEffect(() => {
    const handler = () => {
      setMessages([]);
      localStorage.removeItem(CHAT_HISTORY_KEY);
    };
    window.addEventListener('newChat', handler);
    return () => window.removeEventListener('newChat', handler);
  }, [setMessages]);

  // Scroll al fondo cuando lleguen mensajes
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Activar input de archivo desde evento global (ej: clip en sidebar)
  useEffect(() => {
    const handler = () => fileInputRef.current?.click();
    window.addEventListener('openUpload', handler);
    return () => window.removeEventListener('openUpload', handler);
  }, []);

  const handleFileUpload = useCallback(async (e) => {
    const files = Array.from(e.target.files);
    if (!files.length) return;
    setIsUploading(true);
    try {
      for (const file of files) {
        const form = new FormData();
        form.append('file', file);
        const { data } = await api.post('/documents/upload-transient', form, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        if (data.success) {
          setAttachedFiles((prev) => [...prev, { name: data.fileName, content: data.content }]);
        }
      }
    } catch (err) {
      console.error('Error uploading transient file:', err);
      alert('Error al subir archivo temporal');
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  }, []);

  const removeAttachedFile = useCallback((index) => {
    setAttachedFiles((prev) => prev.filter((_, i) => i !== index));
  }, []);

  const sendMessage = useCallback(async () => {
    if ((!input.trim() && !attachedFiles.length) || isLoading) return;

    const transientContext = attachedFiles
      .map((f) => `ARCHIVO: ${f.name}\nCONTENIDO: ${f.content}`)
      .join('\n\n---\n\n');

    const userMessage = {
      role: 'user',
      content: input,
      attachments: attachedFiles.map((f) => f.name),
    };

    setMessages((prev) => [...prev, userMessage]);
    const currentInput = input;
    const currentAttachments = attachedFiles;
    setInput('');
    setAttachedFiles([]);
    setIsLoading(true);

    try {
      const { data } = await api.post('/chat', {
        message: currentInput || 'Analiza los documentos adjuntos',
        context: messages.slice(-CHAT_CONTEXT_LEN),
        useDocuments: true,
        transientContext,
      });
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: data.response,
        generatedFile: data.generatedFile,
      }]);
    } catch (err) {
      setMessages((prev) => [...prev, {
        role: 'assistant',
        content: err.response?.data?.error
          || err.response?.data?.message
          || 'Error al procesar la solicitud. Verifica que Ollama esté ejecutándose.',
      }]);
    } finally {
      setIsLoading(false);
    }
  }, [input, attachedFiles, isLoading, messages, setMessages]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  const handleInputChange = useCallback((e) => {
    setInput(e.target.value);
    e.target.style.height = 'auto';
    e.target.style.height = `${Math.min(e.target.scrollHeight, MAX_TEXTAREA_H)}px`;
  }, []);

  const copyToClipboard = useCallback((text, index) => {
    navigator.clipboard.writeText(text).then(() => {
      setCopiedId(index);
      setTimeout(() => setCopiedId(null), 2000);
    });
  }, []);

  const isLanding = messages.length === 0;

  return (
    <div className={`chat-container ${isLanding ? 'landing' : ''}`}>
      <div className="chat-messages">
        {isLanding ? (
          <div className="chat-welcome">
            <div className="chat-welcome-icon"><Sparkles size={40} /></div>
            <h1 className="chat-welcome-title">¿Por dónde empezamos?</h1>
            <p className="chat-welcome-subtitle">Asistente académico inteligente para la FIIS.</p>
          </div>
        ) : (
          <>
            {messages.map((msg, index) => (
              <div key={index} className={`message ${msg.role}`}>
                {msg.role === 'assistant' && (
                  <div className="message-avatar"><Sparkles size={16} /></div>
                )}
                <div className="message-content">
                  <ExpandableText text={msg.content} />

                  {!!msg.attachments?.length && (
                    <div className="message-attachments-list" style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                      {msg.attachments.map((name, i) => (
                        <div key={i} style={{
                          fontSize: '0.75rem', padding: '4px 10px',
                          background: 'rgba(255,255,255,0.1)', borderRadius: '12px',
                          display: 'flex', alignItems: 'center', gap: '6px',
                          border: '1px solid rgba(255,255,255,0.2)',
                        }}>
                          <Paperclip size={12} />{name}
                        </div>
                      ))}
                    </div>
                  )}

                  {msg.generatedFile && (
                    <div className="message-attachment" style={{
                      marginTop: '12px', padding: '12px',
                      background: 'rgba(255,255,255,0.05)', borderRadius: 'var(--radius-md)',
                      border: '1px solid var(--color-success)',
                      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
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
                      {copiedId === index ? <><Check size={14} /><span>Copiado</span></> : <><Copy size={14} /><span>Copiar</span></>}
                    </button>
                  )}
                </div>
              </div>
            ))}

            {isLoading && (
              <div className="message assistant">
                <div className="message-avatar"><Sparkles size={16} /></div>
                <div className="typing-indicator">
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                  <div className="typing-dot" />
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </>
        )}
      </div>

      {/* Input */}
      <div className="chat-input-container">
        <div className="chat-input-pill">
          <input type="file" ref={fileInputRef} style={{ display: 'none' }} multiple onChange={handleFileUpload} />

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
                display: 'flex', gap: '8px', padding: '8px 4px',
                borderBottom: '1px solid rgba(0,0,0,0.05)', flexWrap: 'wrap',
              }}>
                {attachedFiles.map((file, idx) => (
                  <div key={idx} style={{
                    fontSize: '0.75rem', padding: '4px 8px',
                    background: 'var(--color-navy)', color: 'white',
                    borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '6px',
                  }}>
                    <File size={12} />
                    <span>{file.name}</span>
                    <X size={12} style={{ cursor: 'pointer', opacity: 0.8 }} onClick={() => removeAttachedFile(idx)} />
                  </div>
                ))}
              </div>
            )}

            <textarea
              className="chat-input-field"
              placeholder={attachedFiles.length > 0
                ? 'Pregunta sobre los archivos adjuntos...'
                : 'Pregunta sobre tesis, manuales o código...'}
              value={input}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              rows={1}
            />
          </div>

          <div className="pill-actions-right">
            <div className="sparkle-icon-btn"><Sparkles size={20} /></div>
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
          display: 'flex', flexDirection: 'column', alignItems: 'center', marginTop: '16px', gap: '12px',
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

// ─── Modal base ───────────────────────────────────────────────────────────────

const Modal = memo(function Modal({ isOpen, onClose, title, children }) {
  if (!isOpen) return null;
  return (
    <div className="modal-backdrop" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h3 className="modal-title">{title}</h3>
          <button className="btn-icon" onClick={onClose}><X size={20} /></button>
        </div>
        <div className="modal-body">{children}</div>
      </div>
    </div>
  );
});

const GeneratorModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Generador de Documentos">
    <GeneratorPage hideHeader />
  </Modal>
);

const UploadModal = ({ isOpen, onClose, onUploadSuccess }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="Subir Documentos">
    <DocumentsPage hideHeader onUploadSuccess={onUploadSuccess} isUploadOnly />
  </Modal>
);

const FilesModal = ({ isOpen, onClose }) => (
  <Modal isOpen={isOpen} onClose={onClose} title="📚 Biblioteca">
    <DocumentsPage hideHeader onlyList viewMode="grid" />
  </Modal>
);

// ─── DocumentsPage ────────────────────────────────────────────────────────────

function DocumentsPage({ hideHeader, onlyList, onUploadSuccess, viewMode = 'list', isUploadOnly = false }) {
  const [documents, setDocuments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState(isUploadOnly ? 'general' : 'all');
  const [searchQuery, setSearchQuery] = useState('');
  const [uploading, setUploading] = useState(false);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [uploadFileName, setUploadFileName] = useState('');
  const [dragOver, setDragOver] = useState(false);
  const [currentViewMode, setCurrentViewMode] = useState(viewMode);
  const [toast, showToast] = useToast();
  const libraryFileRef = useRef(null);

  const loadDocuments = useCallback(async () => {
    setLoading(true);
    try {
      const params = filter !== 'all' ? `?type=${filter}` : '';
      const { data } = await api.get(`/documents${params}`);
      setDocuments(data.documents ?? []);
    } catch {
      showToast('Error al cargar documentos', 'error');
    } finally {
      setLoading(false);
    }
  }, [filter, showToast]);

  useEffect(() => { loadDocuments(); }, [loadDocuments]);

  const handleSearch = useCallback(async () => {
    if (!searchQuery.trim()) { loadDocuments(); return; }
    setLoading(true);
    try {
      const { data } = await api.post('/documents/search', { query: searchQuery, limit: 20 });
      setDocuments(data.results ?? []);
    } catch {
      showToast('Error en la búsqueda', 'error');
    } finally {
      setLoading(false);
    }
  }, [searchQuery, loadDocuments, showToast]);

  const handleUpload = useCallback(async (file) => {
    if (!file) return;
    const ext = `.${file.name.split('.').pop().toLowerCase()}`;
    if (!ALLOWED_UPLOAD_EXTS.includes(ext)) { showToast(`Tipo no permitido: ${ext}`, 'error'); return; }
    if (file.size > MAX_UPLOAD_BYTES) { showToast('El archivo excede el límite de 50 MB', 'error'); return; }

    const form = new FormData();
    form.append('file', file);
    form.append('type', filter !== 'all' ? filter : 'general');

    setUploading(true);
    setUploadProgress(0);
    setUploadFileName(file.name);

    try {
      await api.post('/documents/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
        onUploadProgress: (e) => setUploadProgress(Math.round((e.loaded * 100) / e.total)),
      });
      showToast(`"${file.name}" subido. Pendiente de aprobación.`, 'success');
      loadDocuments();
      onUploadSuccess?.();
    } catch (err) {
      showToast(err.response?.data?.error ?? 'Error al subir el archivo', 'error');
    } finally {
      setUploading(false);
      setUploadProgress(0);
      setUploadFileName('');
    }
  }, [filter, loadDocuments, onUploadSuccess, showToast]);

  const handleFileInput = useCallback((e) => {
    const file = e.target.files[0];
    if (file) { handleUpload(file); e.target.value = ''; }
  }, [handleUpload]);

  const handleDrop = useCallback((e) => { e.preventDefault(); setDragOver(false); handleUpload(e.dataTransfer.files[0]); }, [handleUpload]);
  const handleDragOver = useCallback((e) => { e.preventDefault(); setDragOver(true); }, []);
  const handleDragLeave = useCallback((e) => { e.preventDefault(); setDragOver(false); }, []);

  const handleDelete = useCallback(async (docPath) => {
    if (!confirm('¿Eliminar este documento?')) return;
    try {
      await api.delete(`/documents/${encodeURIComponent(docPath)}`);
      showToast('Documento eliminado', 'success');
      loadDocuments();
    } catch {
      showToast('Error al eliminar documento', 'error');
    }
  }, [loadDocuments, showToast]);

  return (
    <div className="documents-container" style={{ padding: hideHeader ? 0 : 'var(--spacing-lg)' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}><span>{toast.message}</span></div>
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
            {FILTER_OPTIONS.filter((o) => o.value !== 'all').map((opt) => (
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
          <div className="drop-zone-text">Arrastra y suelta archivos aquí o haz clic para seleccionar</div>
          <input type="file" ref={libraryFileRef} style={{ display: 'none' }} onChange={handleFileInput} />

          {uploading && (
            <div className="upload-progress-container" style={{ width: '100%', marginTop: '1rem' }}>
              <div className="progress-bar-wrapper" style={{ height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                <div className="progress-bar-fill" style={{ width: `${uploadProgress}%`, height: '100%', background: 'var(--color-accent-primary)', transition: 'width 0.3s ease' }} />
              </div>
              <div style={{ fontSize: '0.75rem', marginTop: '0.5rem', color: 'var(--color-text-muted)' }}>
                Subiendo {uploadFileName} ({uploadProgress}%)
              </div>
            </div>
          )}
        </div>
      )}

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
                {(['list', 'grid']).map((mode) => (
                  <button
                    key={mode}
                    className={`btn-icon ${currentViewMode === mode ? 'active' : ''}`}
                    onClick={() => setCurrentViewMode(mode)}
                    style={{ padding: '4px', background: currentViewMode === mode ? 'var(--color-accent-primary)' : 'transparent', color: currentViewMode === mode ? 'white' : 'inherit' }}
                    title={mode === 'list' ? 'Vista de Lista' : 'Vista de Cuadrícula'}
                  >
                    {mode === 'list' ? <List size={18} /> : <LayoutGrid size={18} />}
                  </button>
                ))}
              </div>
            </div>

            <div className="filter-scroll" style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', maxWidth: '100%', paddingBottom: '4px' }}>
              {FILTER_OPTIONS.map((opt) => (
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

      {!isUploadOnly && (
        <div className="documents-display">
          {loading ? (
            <div className="loading" style={{ padding: '2rem', textAlign: 'center' }}>
              <div className="loading-spinner" />
            </div>
          ) : documents.length === 0 ? (
            <div className="card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--color-text-muted)' }}>No se encontraron documentos.</p>
            </div>
          ) : currentViewMode === 'grid' ? (
            <div className="library-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(180px, 1fr))', gap: '1.5rem' }}>
              {documents.map((doc, i) => {
                const fileName = doc.name || 'Sin nombre';
                const viewUrl = `${api.defaults.baseURL}/documents/view/${encodeURIComponent(doc.path)}`;
                return (
                  <div key={i} className="library-item" onClick={() => window.open(viewUrl, '_blank')}>
                    <div className="library-icon" style={{ color: getFileExtColor(fileName) }}>
                      <FileText size={40} />
                    </div>
                    <div className="library-name">{fileName}</div>
                    <div className="library-size">{formatBytes(doc.size)}</div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="document-list">
              {documents.map((doc, i) => (
                <div key={i} className="document-item">
                  <div className="document-icon" style={{ background: getFileExtColor(doc.name) }}>
                    <FileText size={18} color="white" />
                  </div>
                  <div className="document-info">
                    <div className="document-name" style={{ fontSize: '0.9rem' }}>{doc.name}</div>
                    <div className="document-meta" style={{ fontSize: '0.75rem' }}>{doc.type} • {formatBytes(doc.size)}</div>
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

// ─── GeneratorPage ────────────────────────────────────────────────────────────

function GeneratorPage({ hideHeader }) {
  const [type, setType] = useState('syllabus');
  const [formData, setFormData] = useState({});
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(false);
  const [useReference, setUseReference] = useState(false);
  const [outputFormat, setOutputFormat] = useState(GENERATOR_TEMPLATES.syllabus.formats[0]);
  const [toast, showToast] = useToast();

  const currentTemplate = GENERATOR_TEMPLATES[type] ?? GENERATOR_TEMPLATES.syllabus;

  const handleTypeChange = useCallback((key) => {
    setType(key);
    setFormData({});
    setResult(null);
    setOutputFormat(GENERATOR_TEMPLATES[key].formats[0]);
  }, []);

  const updateField = useCallback((name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  }, []);

  const handleGenerate = useCallback(async () => {
    setLoading(true);
    setResult(null);
    try {
      let response;
      if (type === 'exam') {
        response = await api.post('/generate/exam', {
          ...formData, outputFormat, useReferenceDocs: useReference,
        });
      } else {
        response = await api.post('/generate', {
          type, data: formData, outputFormat,
          useReferenceDocs: useReference,
          referenceQuery: formData.subject || formData.course_name || formData.topic || '',
        });
      }
      setResult(response.data);
    } catch {
      showToast('Error al generar el documento. Verifica los campos y Ollama.', 'error');
    } finally {
      setLoading(false);
    }
  }, [type, formData, outputFormat, useReference, showToast]);

  const handleDownload = useCallback(() => {
    if (!result?.fileName) return;
    window.open(`${api.defaults.baseURL}/generate/download/${result.fileName}`, '_blank');
  }, [result]);

  return (
    <div className="generator-container" style={{ padding: hideHeader ? 0 : 'var(--spacing-lg)' }}>
      {toast && (
        <div className="toast-container">
          <div className={`toast ${toast.type}`}><span>{toast.message}</span></div>
        </div>
      )}

      {!hideHeader && (
        <h1 style={{ fontSize: '1.5rem', fontWeight: '600', marginBottom: '1.5rem' }}>
          <Sparkles style={{ verticalAlign: 'middle', marginRight: '0.5rem' }} />
          Generador Inteligente de Documentos
        </h1>
      )}

      {/* Tabs de tipo */}
      <div className="generator-tabs" style={{ display: 'flex', gap: '0.5rem', marginBottom: '1.5rem', overflowX: 'auto', paddingBottom: '0.5rem' }}>
        {Object.entries(GENERATOR_TEMPLATES).map(([key, val]) => (
          <button
            key={key}
            className={`btn ${type === key ? 'btn-primary' : 'btn-secondary'}`}
            onClick={() => handleTypeChange(key)}
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
                  value={formData[field.name] ?? ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                />
              ) : field.type === 'select' ? (
                <select
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)', cursor: 'pointer' }}
                  value={formData[field.name] ?? field.options[0]?.value ?? ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                >
                  {field.options.map((opt) => (
                    <option key={opt.value} value={opt.value}>{opt.label}</option>
                  ))}
                </select>
              ) : (
                <input
                  type="text"
                  style={{ width: '100%', padding: '0.75rem', background: 'var(--color-bg-tertiary)', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-md)', color: 'var(--color-text-primary)' }}
                  placeholder={field.placeholder}
                  value={formData[field.name] ?? ''}
                  onChange={(e) => updateField(field.name, e.target.value)}
                />
              )}
            </div>
          ))}

          {/* Opciones de generación */}
          <div style={{ display: 'flex', gap: '2rem', alignItems: 'center', marginTop: '0.5rem', padding: '1rem', background: 'rgba(255,255,255,0.03)', borderRadius: 'var(--radius-md)' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <label className="switch" style={{ width: '40px', height: '20px' }}>
                <input type="checkbox" checked={useReference} onChange={(e) => setUseReference(e.target.checked)} />
                <span className="slider round" />
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
                {currentTemplate.formats.map((f) => (
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
            {loading
              ? <><div className="loading-spinner" style={{ width: '18px', height: '18px' }} /> Generando...</>
              : <><Zap size={18} /> Generar Documento</>}
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
              <pre style={{ whiteSpace: 'pre-wrap', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>{result.content}</pre>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

// ─── SettingsModal ────────────────────────────────────────────────────────────

const CLOUD_MODEL_OPTIONS = [
  { value: 'minimax-m2:cloud', label: 'MiniMax M2 — Redacción Académica' },
  { value: 'deepseek-v3.1:671b-cloud', label: 'DeepSeek V3 — Razonamiento Lógico' },
  { value: 'kimi-k2.5', label: 'Kimi K2.5 — Contexto Masivo' },
  { value: 'qwen3-coder:480b-cloud', label: 'Qwen3 Coder — Tareas Técnicas' },
  { value: 'gemini-3-flash-preview', label: 'Gemini Flash — Eficiencia y Rapidez' },
  { value: 'llama3.3:70b-cloud', label: 'Llama 3.3 (70B) — Propósito General' },
  { value: 'mistral:latest-cloud', label: 'Mistral (Latest)' },
  { value: 'custom', label: 'Otro (Escribir manual)...' },
];
const CLOUD_KNOWN_MODELS = new Set(CLOUD_MODEL_OPTIONS.map((o) => o.value).filter((v) => v !== 'custom'));

function SettingsModal({
  isOpen, onClose, settings, onSettingsChange, serverStatus,
  currentUser, onGoogleLogin, onGoogleLogout,
  whatsappStatus, whatsappQR, onWhatsAppInit, onWhatsAppDisconnect,
  waLoading, setWaLoading,
}) {
  const [activeTab, setActiveTab] = useState('ui');

  const update = useCallback((key, value) => {
    onSettingsChange((prev) => ({ ...prev, [key]: value }));
  }, [onSettingsChange]);

  const tabs = useMemo(() => [
    { id: 'ui', label: '🎨 Interfaz' },
    { id: 'ai', label: '🤖 IA Avanzada' },
    { id: 'system', label: '🖥️ Sistema' },
    { id: 'whatsapp', label: '📱 WhatsApp' },
    { id: 'info', label: 'ℹ️ Información' },
  ], []);

  // Si se monta el tab de WA y el usuario está logueado, el ref de Google ya no es necesario
  const isCloudModelKnown = CLOUD_KNOWN_MODELS.has(settings.cloudModel);

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="⚙️ Centro de Configuración">
      <div className="settings-container">
        <div className="settings-tabs">
          {tabs.map((tab, i) => (
            <button
              key={tab.id}
              className={`settings-tab ${activeTab === tab.id ? 'active' : ''}`}
              onClick={() => setActiveTab(tab.id)}
              style={i === tabs.length - 1 ? { borderLeft: '1px solid var(--color-border)', marginLeft: '4px', paddingLeft: '12px' } : {}}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="settings-content">

          {/* ── UI ── */}
          {activeTab === 'ui' && (
            <div className="settings-section">
              <h4 className="section-title">Personalización Visual</h4>
              <div className="settings-grid">
                {[
                  { key: 'themeNavy', label: 'Color Primario' },
                  { key: 'themeCeleste', label: 'Color de Acento' },
                ].map(({ key, label }) => (
                  <div key={key} className="setting-item">
                    <label>{label}</label>
                    <div className="color-picker-wrapper">
                      <input type="color" value={settings[key]} onChange={(e) => update(key, e.target.value)} />
                      <span>{settings[key]}</span>
                    </div>
                  </div>
                ))}
              </div>

              <div className="theme-presets">
                <label>Temas Predefinidos</label>
                <div className="presets-row">
                  {THEME_PRESETS.map((t) => (
                    <button
                      key={t.navy}
                      className={`preset-btn ${settings.themeNavy === t.navy ? 'active' : ''}`}
                      onClick={() => onSettingsChange((prev) => ({ ...prev, themeNavy: t.navy, themeCeleste: t.celeste }))}
                    >
                      <div className="preset-preview" style={{ background: t.navy }}>
                        <div className="preset-accent" style={{ background: t.celeste }} />
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
                  <input type="checkbox" checked={settings.darkMode} onChange={(e) => update('darkMode', e.target.checked)} />
                  <span className="slider round" />
                </label>
              </div>

              <div className="settings-divider">Tipografía</div>

              <div className="setting-item">
                <label>Tipo de Letra</label>
                <select className="settings-select" value={settings.fontFamily} onChange={(e) => update('fontFamily', e.target.value)}>
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
                  type="range" min="0.8" max="1.4" step="0.05" className="settings-range"
                  value={settings.fontSizeMultiplier}
                  onChange={(e) => update('fontSizeMultiplier', parseFloat(e.target.value))}
                />
              </div>
            </div>
          )}

          {/* ── IA ── */}
          {activeTab === 'ai' && (
            <div className="settings-section">
              <h4 className="section-title">Inteligencia Artificial</h4>

              <div className="setting-item">
                <label>{settings.aiMode === 'cloud' ? 'Modelo de Lenguaje (Cloud)' : 'Modelo de Lenguaje (Local)'}</label>

                {settings.aiMode === 'cloud' ? (
                  <>
                    <select
                      className="settings-select"
                      value={isCloudModelKnown ? settings.cloudModel : 'custom'}
                      onChange={(e) => update('cloudModel', e.target.value)}
                    >
                      {CLOUD_MODEL_OPTIONS.map((opt) => (
                        <option key={opt.value} value={opt.value}>{opt.label}</option>
                      ))}
                    </select>

                    {!isCloudModelKnown && (
                      <input
                        type="text"
                        className="settings-input"
                        style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '8px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                        placeholder="Nombre del modelo..."
                        value={settings.cloudModel === 'custom' ? '' : settings.cloudModel}
                        onChange={(e) => update('cloudModel', e.target.value)}
                      />
                    )}
                  </>
                ) : (
                  <select className="settings-select" value={settings.aiModel} onChange={(e) => update('aiModel', e.target.value)}>
                    <option value="llama3:latest">Meta Llama 3 (8B)</option>
                    <option value="llama3.1:latest">Meta Llama 3.1 (8B)</option>
                    <option value="mistral:latest">Mistral (7B)</option>
                    <option value="codellama:latest">CodeLlama (IA Programación)</option>
                    <option value="neural-chat:latest">Neural Chat</option>
                  </select>
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
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    placeholder="https://api.openai.com/v1"
                    value={settings.cloudHost || ''}
                    onChange={(e) => update('cloudHost', e.target.value)}
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
                    <span className="toggle-desc" style={{ fontSize: '0.8rem' }}>Selecciona el modo de procesamiento preferido.</span>
                  </div>
                  <select className="settings-select" style={{ width: '150px', padding: '4px' }} value={settings.aiMode} onChange={(e) => update('aiMode', e.target.value)}>
                    <option value="local">LOCAL (Offline)</option>
                    <option value="cloud">OLLAMA CLOUD</option>
                    <option value="auto">AUTO (Resiliente)</option>
                  </select>
                </div>
              </div>

              <div className="settings-divider" style={{ margin: '1.5rem 0 1rem', paddingBottom: '0.5rem', borderBottom: '1px solid #eee', color: 'var(--color-navy)', fontSize: '0.85rem', fontWeight: 'bold' }}>
                CREDENCIALES EXTERNAS
              </div>

              {(settings.aiMode === 'cloud' || settings.aiMode === 'auto') && (
                <div className="setting-item">
                  <label>Ollama Cloud API Key</label>
                  <input
                    type="password"
                    className="settings-input"
                    style={{ width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #ddd', marginTop: '4px', backgroundColor: 'var(--color-bg-tertiary)', color: 'var(--color-text-primary)' }}
                    value={settings.cloudApiKey ?? ''}
                    onChange={(e) => update('cloudApiKey', e.target.value)}
                    placeholder="Obtenida en ollama.com/settings/keys"
                  />
                  <p style={{ fontSize: '0.7rem', color: '#94a3b8', marginTop: '4px' }}>
                    Requerido para modelos en la nube de Ollama.
                  </p>
                </div>
              )}

              <div className="setting-item">
                <div className="label-row">
                  <label>Temperatura (Creatividad)</label>
                  <span className="value-badge">{settings.temperature}</span>
                </div>
                <input
                  type="range" min="0" max="1" step="0.1" className="settings-range"
                  value={settings.temperature}
                  onChange={(e) => update('temperature', parseFloat(e.target.value))}
                />
                <div className="range-labels">
                  <span>Preciso</span><span>Equilibrado</span><span>Creativo</span>
                </div>
              </div>
            </div>
          )}

          {/* ── Sistema ── */}
          {activeTab === 'system' && (
            <div className="settings-section">
              <h4 className="section-title">Estado del Ecosistema MCP</h4>
              <div className="system-status-list">
                {[
                  { icon: Globe, label: 'Servidor Backend', ok: serverStatus.server, okLabel: 'EN LÍNEA', koLabel: 'OFFLINE' },
                  { icon: Zap, label: 'Motor Ollama', ok: serverStatus.ollama, okLabel: 'ACTIVO', koLabel: 'INACTIVO' },
                  { icon: MessageSquare, label: 'API Gateway', ok: null, okLabel: '/api/v1', koLabel: '/api/v1' },
                ].map(({ icon: Icon, label, ok, okLabel, koLabel }) => (
                  <div key={label} className="status-item">
                    <div className="status-info"><Icon size={18} /><span>{label}</span></div>
                    <span className={`status-pill ${ok === null ? 'info' : ok ? 'online' : 'offline'}`}>
                      {ok === null ? okLabel : ok ? okLabel : koLabel}
                    </span>
                  </div>
                ))}
              </div>
              <div className="system-actions">
                <button className="sync-btn" onClick={() => window.location.reload()}>
                  <RefreshCcw size={16} /> Re-sincronizar Todo el Sistema
                </button>
                <p className="action-hint">Última comprobación: Hace un momento</p>
              </div>
            </div>
          )}

          {/* ── WhatsApp ── */}
          {activeTab === 'whatsapp' && (
            <WhatsAppTab
              currentUser={currentUser}
              whatsappStatus={whatsappStatus}
              whatsappQR={whatsappQR}
              onGoogleLogin={onGoogleLogin}
              onGoogleLogout={onGoogleLogout}
              onWhatsAppInit={onWhatsAppInit}
              onWhatsAppDisconnect={onWhatsAppDisconnect}
              waLoading={waLoading}
              setWaLoading={setWaLoading}
            />
          )}

          {/* ── Info ── */}
          {activeTab === 'info' && <InfoTab />}
        </div>
      </div>
    </Modal>
  );
}

// ─── WhatsAppTab (extraído para no saturar SettingsModal) ─────────────────────

const WhatsAppTab = memo(function WhatsAppTab({
  currentUser, whatsappStatus, whatsappQR,
  onGoogleLogin, onGoogleLogout,
  onWhatsAppInit, onWhatsAppDisconnect,
  waLoading, setWaLoading,
}) {
  const googleBtnRef = useRef(null);

  return (
    <div className="settings-section">
      <h4 className="section-title">Integración WhatsApp</h4>
      <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', marginBottom: '1rem' }}>
        Conecta tu WhatsApp para chatear con la IA directamente desde tu teléfono.
      </p>

      {/* No logueado */}
      {!currentUser && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div style={{ marginBottom: '1.5rem' }}>
            <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #4285f4, #34a853, #fbbc05, #ea4335)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
              <span style={{ fontSize: '1.8rem' }}>G</span>
            </div>
            <h4 style={{ marginBottom: '0.5rem', color: 'var(--color-text-primary)' }}>Inicia sesión con Google</h4>
            <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '300px', margin: '0 auto' }}>
              Necesitas una cuenta de Google para vincular tu WhatsApp.
            </p>
          </div>
          <div
            ref={(el) => { if (el) onGoogleLogin(el); }}
            style={{ display: 'flex', justifyContent: 'center', minHeight: '44px' }}
          />
        </div>
      )}

      {/* Logueado pero desconectado */}
      {currentUser && !['connected', 'qr_pending', 'initializing'].includes(whatsappStatus) && (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          {/* Badge usuario */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', justifyContent: 'center', marginBottom: '1.5rem', padding: '10px 16px', background: 'rgba(66,133,244,0.08)', borderRadius: '10px', width: 'fit-content', margin: '0 auto 1.5rem' }}>
            {currentUser.avatar_url
              ? <img src={currentUser.avatar_url} alt="" style={{ width: '32px', height: '32px', borderRadius: '50%' }} />
              : <div style={{ width: '32px', height: '32px', borderRadius: '50%', background: 'var(--color-navy)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff', fontSize: '0.9rem', fontWeight: '600' }}>{currentUser.name?.[0] ?? '?'}</div>}
            <div style={{ textAlign: 'left' }}>
              <div style={{ fontWeight: '600', fontSize: '0.85rem' }}>{currentUser.name}</div>
              <div style={{ fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>{currentUser.email}</div>
            </div>
            <button onClick={onGoogleLogout} style={{ marginLeft: '8px', background: 'none', border: 'none', cursor: 'pointer', color: 'var(--color-text-muted)' }} title="Cerrar sesión">
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
              const ok = await onWhatsAppInit();
              if (!ok) setWaLoading(false);
            }}
            disabled={waLoading || whatsappStatus === 'initializing'}
            style={{
              padding: '12px 28px', fontSize: '0.95rem', fontWeight: '600',
              background: ['error', 'auth_failed'].includes(whatsappStatus)
                ? 'linear-gradient(135deg, #ef4444, #dc2626)'
                : 'linear-gradient(135deg, #25D366, #128C7E)',
              border: 'none', borderRadius: '8px', color: '#fff',
              cursor: (waLoading || whatsappStatus === 'initializing') ? 'wait' : 'pointer',
              opacity: (waLoading || whatsappStatus === 'initializing') ? 0.7 : 1,
              display: 'flex', alignItems: 'center', gap: '10px', margin: '0 auto',
            }}
          >
            {(waLoading || whatsappStatus === 'initializing')
              ? <><div className="loading-spinner-tiny" style={{ borderTopColor: '#fff' }} /> Procesando...</>
              : ['error', 'auth_failed'].includes(whatsappStatus) ? '🔄 Reintentar Conexión' : '🔗 Conectar WhatsApp'}
          </button>

          {['error', 'auth_failed'].includes(whatsappStatus) && (
            <p style={{ fontSize: '0.75rem', color: '#ef4444', marginTop: '12px', fontWeight: '500' }}>
              ⚠️ Hubo un problema al iniciar. Intenta de nuevo.
            </p>
          )}
        </div>
      )}

      {/* Inicializando */}
      {currentUser && whatsappStatus === 'initializing' && (
        <div style={{ textAlign: 'center', padding: '2rem 1rem' }}>
          <div className="loading-spinner" style={{ width: '48px', height: '48px', margin: '0 auto 1.5rem', borderColor: '#25D366', borderTopColor: 'transparent' }} />
          <h4 style={{ marginBottom: '0.5rem' }}>Inicializando WhatsApp</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', maxWidth: '280px', margin: '0 auto' }}>
            El código QR aparecerá en unos segundos.
          </p>
        </div>
      )}

      {/* QR pendiente */}
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
              <div className="loading-spinner" style={{ width: '32px', height: '32px', margin: '0 auto' }} />
              <p style={{ marginTop: '1rem', fontSize: '0.85rem', color: 'var(--color-text-muted)' }}>Generando QR...</p>
            </div>
          )}
          <p style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)', maxWidth: '280px', margin: '0 auto 0.5rem' }}>
            1. Abre WhatsApp → Menú ⋮ → Dispositivos vinculados<br />
            2. Toca Vincular un dispositivo y escanea el QR
          </p>
          <button onClick={onWhatsAppDisconnect} style={{ marginTop: '1rem', background: 'none', border: '1px solid var(--color-border)', borderRadius: '6px', padding: '6px 16px', fontSize: '0.8rem', color: 'var(--color-text-muted)', cursor: 'pointer' }}>
            Cancelar
          </button>
        </div>
      )}

      {/* Conectado */}
      {currentUser && whatsappStatus === 'connected' && (
        <div style={{ textAlign: 'center', padding: '1.5rem 1rem' }}>
          <div style={{ width: '64px', height: '64px', borderRadius: '50%', background: 'linear-gradient(135deg, #25D366, #128C7E)', margin: '0 auto 1rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Check size={28} color="#fff" />
          </div>
          <h4 style={{ color: '#25D366', marginBottom: '0.5rem' }}>✅ WhatsApp Conectado</h4>
          <p style={{ fontSize: '0.85rem', color: 'var(--color-text-muted)', marginBottom: '0.5rem' }}>
            Envía mensajes al número conectado para chatear con la IA.
          </p>
          <div style={{ margin: '1rem 0', padding: '10px 16px', background: 'rgba(37,211,102,0.08)', borderRadius: '8px', display: 'inline-flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#25D366', animation: 'pulse 2s infinite' }} />
            <span style={{ fontSize: '0.85rem', fontWeight: '500' }}>Activo</span>
            <span style={{ fontSize: '0.8rem', color: 'var(--color-text-muted)' }}>• Usando IA Cloud</span>
          </div>
          <div style={{ marginTop: '1.5rem' }}>
            <button
              className="btn"
              onClick={onWhatsAppDisconnect}
              style={{ padding: '8px 20px', fontSize: '0.85rem', background: 'rgba(239,68,68,0.08)', border: '1px solid rgba(239,68,68,0.3)', borderRadius: '8px', color: '#ef4444', cursor: 'pointer' }}
            >
              Desconectar WhatsApp
            </button>
          </div>
        </div>
      )}
    </div>
  );
});

// ─── InfoTab ──────────────────────────────────────────────────────────────────

const InfoTab = memo(function InfoTab() {
  return (
    <div className="settings-section">
      <h4 className="section-title">📊 Guía de Uso de IA</h4>

      <div className="info-block">
        <h5 className="info-subtitle">💻 Modelos Locales (Ollama)</h5>
        <div className="info-cards-grid">
          {[
            { title: 'Llama 3.2 (3B)', desc: 'Equilibrio y Rapidez. Modelo por defecto, muy rápido para consultas diarias.' },
            { title: 'Phi-4 (Microsoft)', desc: 'Lógica Superior. Razonamiento matemático y lógico complejo de forma privada.' },
            { title: 'DeepSeek R1 (Distill)', desc: 'Razonamiento Avanzado. Ideal para analizar código y lógica de programación.' },
          ].map(({ title, desc }) => (
            <div key={title} className="info-card local-badge">
              <strong>{title}</strong><p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="info-block" style={{ marginTop: '1.5rem' }}>
        <h5 className="info-subtitle">☁️ Modelos en la Nube (Ollama Cloud)</h5>
        <div className="info-cards-grid">
          {[
            { title: 'MiniMax M2', desc: 'Redacción Académica. Genera borradores de resoluciones con tono profesional.' },
            { title: 'DeepSeek V3', desc: 'Razonamiento Lógico. Analiza normativas y detecta inconsistencias en documentos.' },
            { title: 'Kimi K2.5', desc: 'Contexto Masivo. Analiza múltiples Sílabos o Planes de Estudio de una sola vez.' },
            { title: 'Qwen3 Coder', desc: 'Tareas Técnicas. Gestión de base de datos y scripts de automatización.' },
            { title: 'Gemini Flash', desc: 'Eficiencia. Consultas rápidas sobre calendario académico o estados de trámites.' },
          ].map(({ title, desc }) => (
            <div key={title} className="info-card">
              <strong>{title}</strong><p>{desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div className="info-divider">Ecosistema MCP + IA</div>

      <div className="mcp-info-box">
        <div className="mcp-point">
          <strong>¿Cómo te ayuda el Servidor MCP?</strong>
          <p>El MCP actúa como el bibliotecario institucional: busca en la base de datos académica para dar respuestas basadas en hechos reales.</p>
        </div>
        <div className="mcp-grid">
          {[
            { icon: '📚', title: 'Conocimiento Institucional', desc: 'Acceso a toda la normativa y documentos aprobados en la biblioteca.' },
            { icon: '🖋️', title: 'Generación de Documentos', desc: 'Crea automáticamente documentos basados en el contexto institucional previo.' },
          ].map(({ icon, title, desc }) => (
            <div key={title} className="mcp-feature">
              <span className="mcp-icon">{icon}</span>
              <strong>{title}</strong>
              <p>{desc}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
});

// ─── App ──────────────────────────────────────────────────────────────────────

function App() {
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [uploadModalOpen, setUploadModalOpen] = useState(false);
  const [filesModalOpen, setFilesModalOpen] = useState(false);
  const [generatorModalOpen, setGeneratorModalOpen] = useState(false);
  const [settingsModalOpen, setSettingsModalOpen] = useState(false);
  const [serverStatus, setServerStatus] = useState({ server: false, ollama: false });

  // Auth
  const [currentUser, setCurrentUser] = useState(() => {
    const saved = localStorage.getItem(USER_KEY);
    const token = localStorage.getItem(TOKEN_KEY);
    return saved && token ? JSON.parse(saved) : null;
  });

  // WhatsApp
  const [whatsappStatus, setWhatsappStatus] = useState('disconnected');
  const [whatsappQR, setWhatsappQR] = useState(null);
  const [waLoading, setWaLoading] = useState(false);
  const whatsappPollRef = useRef(null);

  // Configuración
  const [settings, setSettings] = useLocalStorage(SETTINGS_KEY, DEFAULT_SETTINGS);
  const isFirstRender = useRef(true);

  // Aplicar tema / tipografía / dark-mode al DOM cuando cambian settings
  useEffect(() => {
    const root = document.documentElement;
    root.style.setProperty('--color-navy', settings.themeNavy);
    root.style.setProperty('--color-navy-light', adjustColor(settings.themeNavy, 20));
    root.style.setProperty('--color-celeste', settings.themeCeleste);
    root.style.setProperty('--color-accent-gradient', `linear-gradient(135deg, ${settings.themeNavy} 0%, #3b82f6 100%)`);
    root.style.setProperty('--font-size-base', `${settings.fontSizeMultiplier * 16}px`);

    const fontMap = { sans: 'var(--font-sans)', serif: 'var(--font-serif)', mono: 'var(--font-mono)' };
    root.style.setProperty('--font-family-main', fontMap[settings.fontFamily] ?? fontMap.sans);

    document.body.classList.toggle('dark-theme', !!settings.darkMode);

    // Sincronizar modo IA con backend (solo si no es el primer render o si cambian explícitamente)
    if (isFirstRender.current) {
      isFirstRender.current = false;
      return;
    }

    api.post('/settings/ai', {
      mode: settings.aiMode,
      cloudConfig: {
        host: settings.cloudHost,
        model: settings.cloudModel,
        apiKey: settings.cloudApiKey,
        groqApiKey: settings.groqApiKey,
      },
    }).catch((e) => console.error('Error syncing AI mode:', e));
  }, [settings]);

  // ── Status del servidor ──────────────────────────────────────────────────────
  const checkServerStatus = useCallback(async () => {
    try {
      const { data } = await api.get('/health');
      setServerStatus({
        server: ['ok', 'partial'].includes(data.status),
        ollama: data.services?.ollama?.status === 'connected',
      });
    } catch {
      setServerStatus({ server: false, ollama: false });
    }
  }, []);

  useEffect(() => {
    checkServerStatus();
    const id = setInterval(checkServerStatus, STATUS_POLL_MS);

    const handlers = {
      openGenerator: () => setGeneratorModalOpen(true),
      openUpload: () => setUploadModalOpen(true),
      openSettings: () => setSettingsModalOpen(true),
      authError: () => { handleGoogleLogout(); setSettingsModalOpen(true); },
    };
    Object.entries(handlers).forEach(([e, h]) => window.addEventListener(e, h));

    return () => {
      clearInterval(id);
      Object.entries(handlers).forEach(([e, h]) => window.removeEventListener(e, h));
    };
  }, [checkServerStatus]);

  // ── Google Auth ──────────────────────────────────────────────────────────────
  const googleInitialized = useRef(false);

  const initGoogleAuth = useCallback((btnContainer) => {
    if (!btnContainer) return;
    if (!window.google?.accounts?.id) {
      const id = setInterval(() => {
        if (window.google?.accounts?.id) { clearInterval(id); initGoogleAuth(btnContainer); }
      }, 300);
      return;
    }
    window.google.accounts.id.initialize({
      client_id: import.meta.env.VITE_GOOGLE_CLIENT_ID || '',
      callback: async ({ credential }) => {
        try {
          const { data } = await api.post('/auth/google', { credential });
          if (data.success) {
            localStorage.setItem(TOKEN_KEY, data.token);
            localStorage.setItem(USER_KEY, JSON.stringify(data.user));
            setCurrentUser(data.user);
          }
        } catch (err) {
          console.error('Google auth error:', err);
        }
      },
    });
    btnContainer.innerHTML = '';
    window.google.accounts.id.renderButton(btnContainer, {
      theme: 'outline', size: 'large', width: 300, text: 'signin_with',
      shape: 'rectangular', logo_alignment: 'left',
    });
    googleInitialized.current = true;
  }, []);

  const handleGoogleLogout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    localStorage.removeItem(USER_KEY);
    setCurrentUser(null);
    setWhatsappStatus('disconnected');
    setWhatsappQR(null);
    if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
  }, []);

  // ── WhatsApp ─────────────────────────────────────────────────────────────────
  const stopWAPoll = useCallback(() => {
    if (whatsappPollRef.current) clearInterval(whatsappPollRef.current);
  }, []);

  const startWhatsAppPolling = useCallback(() => {
    stopWAPoll();
    const poll = async () => {
      try {
        const [statusRes, qrRes] = await Promise.all([
          api.get('/whatsapp/status', { headers: getAuthHeaders() }),
          api.get('/whatsapp/qr', { headers: getAuthHeaders() }),
        ]);
        const newStatus = statusRes.data.status;
        setWhatsappStatus(newStatus);
        if (qrRes.data.qr) { setWhatsappQR(qrRes.data.qr); setWaLoading(false); }
        if (newStatus === 'connected') { setWaLoading(false); stopWAPoll(); }
      } catch (err) {
        console.error('WhatsApp poll error:', err);
        if (err.response?.status === 401) { stopWAPoll(); setWaLoading(false); }
      }
    };
    poll();
    whatsappPollRef.current = setInterval(poll, WA_POLL_MS);
  }, [stopWAPoll]);

  const handleWhatsAppInit = useCallback(async () => {
    try {
      const { data } = await api.post('/whatsapp/init', {}, { headers: getAuthHeaders() });
      if (data.success) { setWhatsappStatus('initializing'); startWhatsAppPolling(); return true; }
      return false;
    } catch (err) {
      console.error('Error initializing WhatsApp:', err);
      if (err.response?.status === 401) { alert('Sesión expirada. Inicia sesión nuevamente.'); handleGoogleLogout(); }
      else { alert('Error al conectar: ' + (err.response?.data?.error ?? 'Error desconocido')); }
      setWaLoading(false);
      return false;
    }
  }, [startWhatsAppPolling, handleGoogleLogout]);

  const handleWhatsAppDisconnect = useCallback(async () => {
    try {
      await api.post('/whatsapp/disconnect', {}, { headers: getAuthHeaders() });
      setWhatsappStatus('disconnected');
      setWhatsappQR(null);
      stopWAPoll();
    } catch (err) {
      console.error('Error disconnecting WhatsApp:', err);
    }
  }, [stopWAPoll]);

  // Chequear estado WA al montar si el usuario está logueado
  useEffect(() => {
    if (!currentUser) return;
    api.get('/whatsapp/status', { headers: getAuthHeaders() })
      .then(({ data }) => setWhatsappStatus(data.status))
      .catch(() => { });
    return stopWAPoll;
  }, [currentUser, stopWAPoll]);

  const toggleSidebar = useCallback(() => setSidebarCollapsed((p) => !p), []);

  return (
    <Router>
      <Routes>
        <Route path="/admin" element={<AdminPanel />} />
        <Route path="*" element={
          <div className="app-layout">
            {sidebarOpen && (
              <div className="sidebar-overlay visible" onClick={() => setSidebarOpen(false)} />
            )}

            <Sidebar
              isOpen={sidebarOpen}
              onClose={() => setSidebarOpen(false)}
              isCollapsed={sidebarCollapsed}
              onToggle={toggleSidebar}
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
                onUploadSuccess={() => setUploadModalOpen(false)}
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