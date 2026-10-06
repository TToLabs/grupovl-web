/*
 * Datos del carrusel de clientes de Grupo VL.
 *
 * Los 32 logos salen de la web actual grupovl.cl. Los nombres se leyeron mirando cada logo
 * (no por el nombre del archivo, que en algunos casos no coincide con el cliente).
 * Cada cliente debe autorizar que se muestre su nombre antes de publicar.
 *
 *   n = nombre visible   c = categoría   f = archivo en img/clientes/
 */
window.CLIENTES = {
  categorias: [
    { id: 'salud', nombre: 'Salud' },
    { id: 'estado', nombre: 'Estado' },
    { id: 'municipios', nombre: 'Municipios' },
    { id: 'universidades', nombre: 'Universidades' },
    { id: 'empresas', nombre: 'Empresas' }
  ],
  items: [
    { n: 'Hospital San Borja Arriarán', c: 'salud', f: 'cl-arriaran.jpg' },
    { n: 'Hospital El Pino', c: 'salud', f: 'cl-pino.jpg' },
    { n: 'Instituto de Salud Pública', c: 'salud', f: 'cl-saludpublica.jpg' },

    { n: 'SAG', c: 'estado', f: 'cl-sag.jpg' },
    { n: 'Sernatur', c: 'estado', f: 'cl-sernatur.jpg' },
    { n: 'Subsecretaría del Interior', c: 'estado', f: 'cl-subsecretaria.jpg' },
    { n: 'CORFO', c: 'estado', f: 'cl-corfo.jpg' },
    { n: 'SENCE', c: 'estado', f: 'cl-sence.jpg' },
    { n: 'Instituto de Seguridad Laboral', c: 'estado', f: 'cl-laboral.jpg' },
    { n: 'Servicio Nacional del Patrimonio Cultural', c: 'estado', f: 'cl-cultural.jpg' },
    { n: 'Instituto Nacional de Deportes', c: 'estado', f: 'cl-deportes.jpg' },
    { n: 'Museo de la Memoria y los Derechos Humanos', c: 'estado', f: 'cl-museomenoria.jpg' },

    { n: 'Municipalidad de Concepción', c: 'municipios', f: 'cl-concepcion.jpg' },
    { n: 'Municipalidad de Cerro Navia', c: 'municipios', f: 'cl-img02.jpg' },
    { n: 'Municipalidad de Lo Espejo', c: 'municipios', f: 'cl-cm.png' },
    { n: 'Municipalidad de Lampa', c: 'municipios', f: 'cl-03.png' },
    { n: 'Municipalidad de Renca', c: 'municipios', f: 'cl-img03.jpg' },
    { n: 'Municipalidad de Requínoa', c: 'municipios', f: 'cl-imgm.jpg' },
    { n: 'Municipalidad de Machalí', c: 'municipios', f: 'cl-machali.jpg' },
    { n: 'Municipalidad de Independencia', c: 'municipios', f: 'cl-muni.jpg' },
    { n: 'Municipalidad de Nogales', c: 'municipios', f: 'cl-nogales.jpg' },
    { n: 'Municipalidad de Pudahuel', c: 'municipios', f: 'cl-recoleta.png' },

    { n: 'Universidad Diego Portales', c: 'universidades', f: 'cl-udp.jpg' },
    { n: 'Universidad de Valparaíso', c: 'universidades', f: 'cl-univalparaiso.jpg' },
    { n: 'Universidad de Talca', c: 'universidades', f: 'cl-talca.jpg' },
    { n: 'Universidad de los Andes', c: 'universidades', f: 'cl-losandes.jpg' },

    { n: 'Logicalis', c: 'empresas', f: 'cl-logicalis.jpg' },
    { n: 'Sacyr', c: 'empresas', f: 'cl-02.png' },
    { n: 'CHC', c: 'empresas', f: 'cl-06.png' },
    { n: 'EDAM', c: 'empresas', f: 'cl-3.png' },
    { n: 'Alianza Team', c: 'empresas', f: 'cl-alianza.jpg' },
    { n: 'AZA', c: 'empresas', f: 'cl-unnamed.png' }
  ]
};
