/**
 * URLs Institucionales - Fuentes de Información FIIS-UNAS
 * Estas URLs son escaneadas automáticamente para proporcionar contexto al asistente
 */

export const institutionalUrls = {
    // URL base
    baseUrl: 'https://www.sistemasunas.edu.pe',

    // Categorías de URLs
    categories: {
        facultad: [
            'https://www.sistemasunas.edu.pe/',
            'https://www.sistemasunas.edu.pe/nuestra-facultad',
            'https://www.sistemasunas.edu.pe/nuestra-facultad/decanatura',
            'https://www.sistemasunas.edu.pe/nuestra-facultad/autoridades',
            'https://www.sistemasunas.edu.pe/nuestra-facultad/mision-vision',
            'https://www.sistemasunas.edu.pe/nuestra-facultad/valores',
            'https://www.sistemasunas.edu.pe/nuestra-facultad/organigrama',
        ],
        departamentos: [
            'https://www.sistemasunas.edu.pe/departamentos-academicos',
            'https://www.sistemasunas.edu.pe/dace/plana-docentes',
            'https://www.sistemasunas.edu.pe/dacis/plana-docentes',
        ],
        escuelas: [
            'https://www.sistemasunas.edu.pe/escuelas-profesionales',
            'https://www.sistemasunas.edu.pe/escuela-profesional-de-ingenieria-en-informatica-y-sistemas',
            'https://www.sistemasunas.edu.pe/escuela-profesional-de-ingenieria-en-ciberseguridad',
        ],
        posgrado: [
            'https://www.sistemasunas.edu.pe/unidad_de_posgrado/direccion',
        ],
        investigacion: [
            'https://www.sistemasunas.edu.pe/unidad-de-investigacion',
        ],
        academias: [
            'https://www.sistemasunas.edu.pe/academias',
        ],
        comisiones: [
            'https://www.sistemasunas.edu.pe/comisiones',
            'https://www.sistemasunas.edu.pe/comisiones/comision-practicas-pre-profesionales',
            'https://www.sistemasunas.edu.pe/comisiones/comision-grados-y-titulos',
        ],
        noticias: [
            'https://www.gob.pe/institucion/unas/noticias',
            'https://www.unas.edu.pe/',
        ],
    },

    // Obtener todas las URLs
    getAllUrls() {
        const allUrls = [];
        for (const category of Object.values(this.categories)) {
            allUrls.push(...category);
        }
        return allUrls;
    },

    // Obtener URLs por categoría
    getByCategory(category) {
        return this.categories[category] || [];
    },

    // Total de URLs
    get totalUrls() {
        return this.getAllUrls().length;
    },
};

// Lista plana de todas las URLs para fácil acceso
export const allInstitutionalUrls = [
    'https://www.sistemasunas.edu.pe/',
    'https://www.sistemasunas.edu.pe/nuestra-facultad',
    'https://www.sistemasunas.edu.pe/nuestra-facultad/decanatura',
    'https://www.sistemasunas.edu.pe/nuestra-facultad/autoridades',
    'https://www.sistemasunas.edu.pe/nuestra-facultad/mision-vision',
    'https://www.sistemasunas.edu.pe/nuestra-facultad/valores',
    'https://www.sistemasunas.edu.pe/nuestra-facultad/organigrama',
    'https://www.sistemasunas.edu.pe/departamentos-academicos',
    'https://www.sistemasunas.edu.pe/dace/plana-docentes',
    'https://www.sistemasunas.edu.pe/dacis/plana-docentes',
    'https://www.sistemasunas.edu.pe/escuelas-profesionales',
    'https://www.sistemasunas.edu.pe/escuela-profesional-de-ingenieria-en-informatica-y-sistemas',
    'https://www.sistemasunas.edu.pe/escuela-profesional-de-ingenieria-en-ciberseguridad',
    'https://www.sistemasunas.edu.pe/unidad_de_posgrado/direccion',
    'https://www.sistemasunas.edu.pe/unidad-de-investigacion',
    'https://www.sistemasunas.edu.pe/academias',
    'https://www.sistemasunas.edu.pe/comisiones',
    'https://www.sistemasunas.edu.pe/comisiones/comision-practicas-pre-profesionales',
    'https://www.sistemasunas.edu.pe/comisiones/comision-grados-y-titulos',
    'https://www.gob.pe/institucion/unas/noticias',
];

export default institutionalUrls;
