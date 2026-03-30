/**
 * Recurso MCP: Reglamentos
 * Proporciona acceso a reglamentos institucionales
 */

export const regulationsResource = {
    uri: 'epiis://regulations',
    name: 'Reglamentos Institucionales',
    description: 'Reglamentos y normativas de la FIIS-UNSM',
    mimeType: 'application/json',

    // Reglamentos disponibles
    regulations: [
        {
            id: 'reg-academico',
            name: 'Reglamento Académico',
            description: 'Normas académicas generales de la UNSM',
            path: 'reglamentos/reglamento-academico.pdf',
        },
        {
            id: 'reg-grados',
            name: 'Reglamento de Grados y Títulos',
            description: 'Requisitos para obtención de grados y títulos',
            path: 'reglamentos/reglamento-grados-titulos.pdf',
        },
        {
            id: 'reg-matricula',
            name: 'Reglamento de Matrícula',
            description: 'Proceso y normas de matrícula',
            path: 'reglamentos/reglamento-matricula.pdf',
        },
        {
            id: 'reg-practicas',
            name: 'Reglamento de Prácticas Pre-Profesionales',
            description: 'Normas para prácticas pre-profesionales',
            path: 'reglamentos/reglamento-practicas.pdf',
        },
    ],

    /**
     * Listar reglamentos
     */
    async list() {
        return {
            uri: this.uri,
            name: this.name,
            regulations: this.regulations,
            count: this.regulations.length,
        };
    },

    /**
     * Obtener reglamento por ID
     * @param {string} id - ID del reglamento
     * @param {object} services - Servicios inyectados
     */
    async get(id, services) {
        const regulation = this.regulations.find(r => r.id === id);

        if (!regulation) {
            throw new Error(`Reglamento no encontrado: ${id}`);
        }

        // Intentar obtener contenido si existe
        try {
            const { documentService } = services;
            const content = await documentService.extractContent(regulation.path);
            return { ...regulation, content };
        } catch {
            return regulation;
        }
    },

    /**
     * Buscar en reglamentos
     * @param {string} query - Consulta
     */
    search(query) {
        const lowerQuery = query.toLowerCase();
        return this.regulations.filter(r =>
            r.name.toLowerCase().includes(lowerQuery) ||
            r.description.toLowerCase().includes(lowerQuery)
        );
    },
};

export default regulationsResource;
