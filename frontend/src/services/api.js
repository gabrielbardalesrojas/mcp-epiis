import axios from 'axios';

// Crear instancia de axios con configuración base
const api = axios.create({
    baseURL: '/api',
    timeout: 120000, // 2 minutos para operaciones con LLM
});

// Interceptor para manejar errores
api.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            console.error('Sesión expirada o no autorizada (401)');
            // Disparar evento para que el frontend reaccione si es necesario
            window.dispatchEvent(new CustomEvent('authError', { detail: error.response.data }));
        }
        console.error('API Error:', error.response?.data || error.message);
        return Promise.reject(error);
    }
);

export default api;
