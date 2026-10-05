import { type CamposCaso } from '@/schemas/caso.schema';

import { ACTITUDES, NIVELES_RIESGO, SINTOMAS } from './opciones';

/** Une elementos al estilo "a, b y c". */
function enumerar(elementos: string[]): string {
  if (elementos.length <= 1) return elementos.join('');
  return `${elementos.slice(0, -1).join(', ')} y ${elementos[elementos.length - 1]}`;
}

/** Pone el punto final si el docente no lo escribió. */
function conPunto(texto: string): string {
  const limpio = texto.trim();
  return /[.!?…"»]$/.test(limpio) ? limpio : `${limpio}.`;
}

function textoSintomas(campos: CamposCaso): string[] {
  const elegidos = SINTOMAS.filter(s => campos.sintomas.includes(s.id)).map(s => s.texto);
  const extra = campos.sintomasExtra.trim();
  return extra ? [...elegidos, extra.replace(/[.\s]+$/, '')] : elegidos;
}

/**
 * Construye el prompt del paciente con la misma estructura de los casos del catálogo:
 * quién es, situación, estado actual, cómo reacciona, riesgo y frase de apertura.
 * Las reglas comunes NO se incluyen: el servidor las añade siempre (`componerInstrucciones`).
 */
export function componerPrompt(campos: CamposCaso): string {
  const ocupacion = campos.ocupacion.trim();
  // La vista previa del constructor se arma mientras el docente escribe: tolera campos vacíos.
  const nombre = campos.nombre.trim() || 'un paciente';
  const edad = Number.isFinite(campos.edad) && campos.edad > 0 ? ` de ${campos.edad} años` : '';
  const lineas: string[] = [
    `Eres ${nombre}, una persona${edad}${ocupacion ? `, ${ocupacion}` : ''}.`,
  ];
  if (campos.situacion.trim()) lineas.push(`Situación: ${conPunto(campos.situacion)}`);

  const sintomas = textoSintomas(campos);
  if (sintomas.length > 0) {
    lineas.push(`Estado actual: experimentas ${enumerar(sintomas)}.`);
  }

  const actitudes = ACTITUDES.filter(a => campos.actitudes.includes(a.id)).map(a => a.texto);
  if (actitudes.length > 0) {
    lineas.push(`Actitud en la consulta: te muestras ${enumerar(actitudes)}.`);
  }

  const seAbre = campos.seAbreSi.trim();
  if (seAbre) lineas.push(`Te abres y hablas con más confianza cuando ${conPunto(seAbre)}`);
  const seCierra = campos.seCierraSi.trim();
  if (seCierra) lineas.push(`Te cierras y respondes menos cuando ${conPunto(seCierra)}`);

  const riesgo = NIVELES_RIESGO.find(r => r.id === campos.riesgo) ?? NIVELES_RIESGO[0];
  lineas.push(`Riesgo: ${riesgo.instruccion}`);

  const notas = campos.notas.trim();
  if (notas) lineas.push(`Información adicional: ${conPunto(notas)}`);

  const apertura = campos.fraseApertura.trim().replace(/^["“«]|["”»]$/g, '');
  if (apertura) {
    lineas.push(`Frase de apertura (úsala en tu primera respuesta): "${apertura}"`);
  }

  return lineas.join('\n');
}

/** Resumen clínico breve que se muestra en la tarjeta del paciente (`npc.perfil_clinico`). */
export function componerPerfilClinico(campos: CamposCaso): string {
  const partes = campos.situacion.trim() ? [conPunto(campos.situacion)] : [];
  const sintomas = textoSintomas(campos);
  if (sintomas.length > 0) {
    const resumen = enumerar(sintomas);
    partes.push(`${resumen.charAt(0).toUpperCase()}${resumen.slice(1)}.`);
  }
  return partes.join(' ').slice(0, 2000);
}
