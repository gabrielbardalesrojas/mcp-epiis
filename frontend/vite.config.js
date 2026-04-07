import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import fs from 'fs';
import path from 'path';

export default defineConfig({
    plugins: [react()],
    envDir: '..',
    server: {
        port: 3000,
        host: '0.0.0.0',
        https: {
            key: fs.readFileSync(path.resolve(__dirname, '../certs/server.key')),
            cert: fs.readFileSync(path.resolve(__dirname, '../certs/server.crt')),
        },
        proxy: {
            '/api': {
                target: 'https://localhost:3001',
                changeOrigin: true,
                secure: false, // Permitir certificados autofirmados
                headers: {
                    'ngrok-skip-browser-warning': 'true'
                }
            },
        },
    },
    build: {
        outDir: 'dist',
        sourcemap: true,
    },
});
