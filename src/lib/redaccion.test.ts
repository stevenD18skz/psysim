import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { describe, expect, it } from 'vitest';

/**
 * Redacción de la interfaz — Vigila el glosario y el estilo de docs/guia-de-redaccion.md sobre
 * todo texto que ve una persona: texto de JSX, `toast`, `aria-label`, `placeholder`, `title` y los
 * mensajes de error de las acciones. Si una regla falla, el mensaje dice en qué archivo está el
 * texto y cómo debería decir.
 */
const RAIZ = process.cwd();

function archivos(carpeta: string): string[] {
  return readdirSync(carpeta).flatMap(nombre => {
    const ruta = path.join(carpeta, nombre);
    if (statSync(ruta).isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(nombre) &&
      !/\.(test|d)\.tsx?$/.test(nombre) &&
      nombre !== 'database.types.ts'
      ? [ruta]
      : [];
  });
}

interface Texto {
  archivo: string;
  texto: string;
}

const JSX = />\s*([^<>{}\n][^<>{}]*?[A-Za-zÁ-ú¿¡][^<>{}]*?)\s*</g;
const PROPIEDAD =
  /\b(?:title|aria-label|placeholder|alt|label|description|titulo|descripcion|etiqueta|mensaje|error|texto|detalle)\s*[:=]\s*['"`]([^'"`\n]{3,200})['"`]/g;
const TOAST = /toast\.\w+\(\s*['"`]([^'"`\n]{3,200})['"`]/g;
const ERROR = /(?:error|motivo|mensaje):\s*\n?\s*['`"]([^'`"\n]{6,220})['`"]/g;

function extraer(): Texto[] {
  const textos: Texto[] = [];
  for (const ruta of archivos(path.join(RAIZ, 'src'))) {
    const contenido = readFileSync(ruta, 'utf8');
    const archivo = path.relative(RAIZ, ruta).replaceAll('\\', '/');
    for (const patron of [JSX, PROPIEDAD, TOAST, ERROR]) {
      for (const [, bruto] of contenido.matchAll(patron)) {
        const texto = bruto!.replace(/\s+/g, ' ').trim();
        if (texto.length < 3 || /^[\W\d_]+$/.test(texto)) continue;
        if (/^(use |import|http|\/|@)/.test(texto)) continue;
        if (/[{}=;]|=>|\bconst\b|\bfunction\b/.test(texto)) continue;
        // Restos de código TypeScript que el patrón de JSX confunde con texto (genéricos, llamadas).
        if (/\.\w+\(|\)\s*\)|\bas\s+[A-Z]/.test(texto)) continue;
        textos.push({ archivo, texto });
      }
    }
  }
  return textos;
}

const TEXTOS = extraer();

/** Los textos de ejemplo de pacientes y casos son contenido, no interfaz (llevan «...» a propósito). */
const CONTENIDO_DE_CASOS = /^src\/lib\/(casos|escenarios|landing|npc|ia)\//;
/** Aviso legal y página de presentación: hablan de «usuarios» o de «pacientes virtuales» a propósito. */
const EXCEPCION_LEGAL = /^src\/app\/(privacidad\/)?page\.tsx$|^src\/lib\/sitio\.ts$/;

function infractores(
  regla: RegExp,
  { excepto = null }: { excepto?: RegExp | null } = {}
): string[] {
  return TEXTOS.filter(({ archivo, texto }) => regla.test(texto) && !excepto?.test(archivo)).map(
    ({ archivo, texto }) => `${archivo}: «${texto.slice(0, 90)}»`
  );
}

describe('redacción de la interfaz (docs/guia-de-redaccion.md)', () => {
  it('encuentra los textos de la interfaz', () => {
    expect(TEXTOS.length).toBeGreaterThan(800);
  });

  describe('errores: voz humana, en primera persona del plural', () => {
    it('ningún texto dice «No fue posible…» ni «No se pudo…»: se dice «No pudimos…»', () => {
      expect(infractores(/\bNo (fue posible|se pudo)\b/)).toEqual([]);
    });

    it('ningún mensaje dice «Ocurrió un error», «Ha ocurrido un error» o «Error:»', () => {
      expect(infractores(/^(Ocurri[óo] un error|Ha ocurrido un error|Error:)/i)).toEqual([]);
    });
  });

  describe('glosario: una palabra para cada cosa', () => {
    it('«sesión» solo nombra la cuenta (iniciar, cerrar sesión); el ejercicio es la «práctica»', () => {
      const CUENTA =
        /(cierr\w+|cerr\w+|inici\w+|cierre|inicio|abr\w+|expir\w+|venc\w+|revoc\w+)\b.{0,25}\bsesi[oó]n|\bsesi[oó]n\b.{0,25}\b(cerrada|iniciada|expir\w+|venc\w+|de Google|en PsySim|del docente|en este equipo)|^Sesión cerrada$/i;
      const sueltos = TEXTOS.filter(
        ({ texto }) => /\bsesi[oó]n(es)?\b/i.test(texto) && !CUENTA.test(texto)
      ).map(({ archivo, texto }) => `${archivo}: «${texto.slice(0, 90)}»`);
      expect(sueltos).toEqual([]);
    });

    it('nunca se muestra «escenario»: el caso es «caso» y el entorno 3D, «consultorio»', () => {
      expect(infractores(/\bescenarios?\b/i)).toEqual([]);
    });

    it('nunca se dice «profesor», «alumno» o «tutor»: son «docente» y «estudiante»', () => {
      expect(infractores(/\b(profesor(a|es)?|alumn[oa]s?|tutor(a|es)?)\b/i)).toEqual([]);
    });

    it('«usuario» no aparece en la interfaz (solo en el aviso legal)', () => {
      expect(infractores(/\busuari[oa]s?\b/i, { excepto: EXCEPCION_LEGAL })).toEqual([]);
    });

    it('el personaje es «el paciente» o «paciente simulado», no «paciente virtual»', () => {
      expect(infractores(/\bpacientes? virtual(es)?\b/i, { excepto: EXCEPCION_LEGAL })).toEqual([]);
    });

    it('el verbo de cierre es «terminar», no «finalizar»', () => {
      expect(infractores(/\bfinaliz(ar|a|ó|ada|ado)\b/i, { excepto: CONTENIDO_DE_CASOS })).toEqual(
        []
      );
    });
  });

  describe('estilo', () => {
    it('sin signos de exclamación (la interfaz no grita)', () => {
      expect(infractores(/[!¡]/, { excepto: CONTENIDO_DE_CASOS })).toEqual([]);
    });

    it('los puntos suspensivos son el carácter «…», no tres puntos', () => {
      expect(infractores(/[A-Za-zÁ-ú]\.\.\.(\s|$)/, { excepto: CONTENIDO_DE_CASOS })).toEqual([]);
    });

    it('mayúscula solo en la primera palabra (no «Title Case» en títulos ni botones)', () => {
      expect(
        infractores(/^([A-ZÁÉÍÓÚ][a-záéíóúñ]+ ){2,}[A-ZÁÉÍÓÚ][a-záéíóúñ]+$/, {
          excepto: CONTENIDO_DE_CASOS,
        })
      ).toEqual([]);
    });

    it('se habla de «tú», nunca de «usted»', () => {
      expect(infractores(/\b(usted|ustedes)\b/i)).toEqual([]);
    });

    it('ningún botón dice solo «OK», «Aceptar» o «Submit»', () => {
      expect(infractores(/^(OK|Ok|Aceptar|Submit)$/)).toEqual([]);
    });

    it('sin «por favor» (se pide con el verbo, sin rodeos)', () => {
      expect(infractores(/\bpor favor\b/i)).toEqual([]);
    });
  });

  describe('mensajes de error: dicen qué hacer', () => {
    const CON_SALIDA =
      /(int[ée]ntalo|revisa|vuelve|pide|recarga|prueba|elige|escribe|usa |espera|cierra|abre|corrige|selecciona|actualiza|genera|registra|consulta|contacta|ábrelo|cópialo|selecciona)/i;
    // Títulos de una pantalla de error cuyo cuerpo ya trae el paso siguiente.
    const TITULOS = new Set([
      'No pudimos cargar esta página',
      'No pudimos cargar el consultorio',
      'No pudimos cargar el consultorio.',
    ]);

    it('todo «No pudimos…» con punto final trae el paso siguiente', () => {
      const sinSalida = TEXTOS.filter(
        ({ texto, archivo }) =>
          /^No pudimos\b/.test(texto) &&
          !TITULOS.has(texto) &&
          !CON_SALIDA.test(texto) &&
          // Mensajes técnicos que no llegan a la pantalla (registros, errores internos).
          !/^src\/(lib\/(sesiones|escenarios|estudiantes)\/queries|app\/api)/.test(archivo)
      ).map(({ archivo, texto }) => `${archivo}: «${texto}»`);
      expect(sinSalida).toEqual([]);
    });
  });
});
