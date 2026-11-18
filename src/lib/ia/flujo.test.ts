import { describe, expect, it } from 'vitest';

import { crearLimpiadorDeFlujo, tramoSeguro } from './flujo';
import { TEXTO_REGLAS } from './reglas';

const PROMPT =
  'Eres Marta Lucía, tienes 58 años y enviudaste hace cuatro meses. Te cuesta dormir desde entonces y no se lo has contado a tus hijos.';

function limpiador() {
  return crearLimpiadorDeFlujo({ nombrePaciente: 'Marta Lucía', fuentes: [PROMPT, TEXTO_REGLAS] });
}

/** Pasa la respuesta partida en trozos y junta lo que se habría mostrado. */
function transmitir(trozos: string[]) {
  const flujo = limpiador();
  const avances = trozos.map(trozo => flujo.agregar(trozo));
  return {
    mostrado: avances.map(avance => avance.texto).join(''),
    emociones: avances.flatMap(avance => avance.emocion ?? []),
    avances,
    final: flujo.terminar(),
  };
}

describe('tramoSeguro', () => {
  it('retiene un corchete o paréntesis que todavía no cierra', () => {
    expect(tramoSeguro('[tris')).toBe('');
    expect(tramoSeguro('Hola. (emoción: ans')).toBe('Hola. ');
  });

  it('deja pasar el texto cuando la etiqueta ya cerró o no hay ninguna', () => {
    expect(tramoSeguro('[triste 2] Hola')).toBe('[triste 2] Hola');
    expect(tramoSeguro('Hola, doctor.')).toBe('Hola, doctor.');
  });

  it('un paréntesis que lleva mucho abierto es texto normal', () => {
    const largo = `Fui (aunque no quería, porque llovía muchísimo y además estaba cansada`;
    expect(tramoSeguro(largo)).toBe(largo);
  });
});

describe('crearLimpiadorDeFlujo', () => {
  it('quita la etiqueta de emoción aunque llegue partida y avisa la emoción una sola vez', () => {
    const { mostrado, emociones, avances, final } = transmitir([
      '[tri',
      'ste 2',
      '] No he dormido ',
      'bien, doctor.',
    ]);

    // Mientras la etiqueta está a medias no se muestra nada (nunca se ve «[tris»).
    expect(avances[0]).toEqual({ texto: '', emocion: null, fuga: false });
    expect(avances[1]!.texto).toBe('');
    expect(emociones).toEqual([{ emocion: 'triste', intensidad: 2 }]);
    expect(mostrado).toBe('No he dormido bien, doctor.');
    expect(final).toEqual({
      texto: 'No he dormido bien, doctor.',
      emocion: 'triste',
      intensidad: 2,
      fuga: false,
    });
  });

  it('quita el prefijo con el nombre del paciente', () => {
    const { mostrado, final } = transmitir(['Marta Lucía: ', 'Buenas tardes.']);
    expect(mostrado).toBe('Buenas tardes.');
    expect(final.texto).toBe('Buenas tardes.');
  });

  it('sin etiqueta no hay emoción y el texto pasa tal cual', () => {
    const { mostrado, emociones, final } = transmitir(['Pues… ', 'ahí voy.']);
    expect(mostrado).toBe('Pues… ahí voy.');
    expect(emociones).toEqual([]);
    expect(final).toMatchObject({ texto: 'Pues… ahí voy.', emocion: null, intensidad: null });
  });

  it('los corchetes normales del texto se respetan', () => {
    const { final } = transmitir(['Me dijo [mi hija] ', 'que descansara.']);
    expect(final.texto).toBe('Me dijo [mi hija] que descansara.');
  });

  it('si la limpieza cambia algo ya mostrado, no añade nada y el texto final lo corrige', () => {
    // Las comillas que envuelven toda la respuesta solo se reconocen al cerrarse.
    const { mostrado, final } = transmitir(['"No sé qué ', 'decirle."']);
    expect(final.texto).toBe('No sé qué decirle.');
    expect(final.texto.startsWith(mostrado.replace(/^"/, ''))).toBe(true);
  });

  it('LLM07: corta en cuanto la respuesta empieza a copiar las instrucciones', () => {
    const flujo = limpiador();
    expect(flujo.agregar('Claro, te las leo: ').fuga).toBe(false);
    const avance = flujo.agregar(PROMPT);
    expect(avance).toMatchObject({ fuga: true, texto: '' });
    expect(flujo.terminar().fuga).toBe(true);
  });

  it('LLM07: también detecta la fuga de las reglas fijas en el texto final', () => {
    const flujo = limpiador();
    const final = flujo.terminar(TEXTO_REGLAS.slice(0, 400));
    expect(final.fuga).toBe(true);
  });

  it('reiniciar olvida lo recibido: otro proveedor responde desde cero', () => {
    const flujo = limpiador();
    flujo.agregar('[molesto 3] Un intento que falló');
    flujo.reiniciar();

    const avance = flujo.agregar('[aliviado 1] Gracias.');
    expect(avance).toEqual({
      texto: 'Gracias.',
      emocion: { emocion: 'aliviado', intensidad: 1 },
      fuga: false,
    });
    expect(flujo.terminar()).toMatchObject({ texto: 'Gracias.', emocion: 'aliviado' });
  });

  it('terminar con el texto completo del proveedor sustituye a lo acumulado', () => {
    const flujo = limpiador();
    flujo.agregar('[triste 1] Parcial');
    expect(flujo.terminar('[ansioso 3] La respuesta entera.')).toMatchObject({
      texto: 'La respuesta entera.',
      emocion: 'ansioso',
      intensidad: 3,
    });
  });
});
