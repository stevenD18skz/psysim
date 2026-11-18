/**
 * Pobla prácticas, conversaciones, métricas, reflexiones, retroalimentaciones, anotaciones y
 * códigos de acceso de prueba para `estudiante1@psysim.test` … `estudiante4@psysim.test`
 * (dejando a `estudiante5@psysim.test` vacío para probar el estado inicial).
 *
 * Uso: node --env-file-if-exists=.env.local scripts/seed-practicas-prueba.ts
 */
import { createClient } from '@supabase/supabase-js';

import { type Database } from '../src/types/database.types.ts';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const claveSecreta = process.env.SUPABASE_SECRET_KEY;

if (!url || !claveSecreta) {
  console.error('✖ Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY (revisa .env.local).');
  process.exit(1);
}

const supabase = createClient<Database>(url, claveSecreta, {
  auth: { persistSession: false, autoRefreshToken: false },
});

const IDS = {
  s1_e1: '11111111-1111-4111-8111-111111110101',
  s1_e2: '11111111-1111-4111-8111-111111110102',
  s1_e3: '11111111-1111-4111-8111-111111110103',
  s2_e1: '11111111-1111-4111-8111-111111110201',
  s2_e2: '11111111-1111-4111-8111-111111110202',
  s3_e5: '11111111-1111-4111-8111-111111110301',
} as const;

function haceDias(dias: number, duracionSegundos = 0): { inicio: string; fin: string } {
  const finMs = Date.now() - dias * 24 * 60 * 60 * 1000;
  const inicioMs = finMs - duracionSegundos * 1000;
  return {
    inicio: new Date(inicioMs).toISOString(),
    fin: new Date(finMs).toISOString(),
  };
}

function enDias(dias: number): string {
  return new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
}

const { data: escenarios, error: errEsc } = await supabase
  .from('escenario')
  .select('id, codigo, titulo, npc ( prompt_sistema )')
  .in('codigo', ['E-01', 'E-02', 'E-03', 'E-04', 'E-05']);

if (errEsc || !escenarios) {
  console.error('✖ No pudimos leer los escenarios oficiales:', errEsc?.message);
  process.exit(1);
}

const escPorCodigo = new Map(escenarios.map(e => [e.codigo, e]));

const { data: estudiantes, error: errEst } = await supabase
  .from('estudiante')
  .select('id, codigo, nombre, correo, docente_id')
  .like('correo', '%@psysim.test');

if (errEst || !estudiantes) {
  console.error('✖ No pudimos leer los estudiantes de prueba:', errEst?.message);
  process.exit(1);
}

const estPorCorreo = new Map(estudiantes.map(e => [(e.correo ?? '').toLowerCase(), e]));

interface IntercambioSeed {
  estudiante: string;
  npc: string;
  latenciaMs: number;
  anotacion?: { fragmento: string; comentario: string };
}

interface SesionSeed {
  id: string;
  correoEstudiante: string;
  codigoCaso: string;
  diasAtras: number;
  duracionSegundos: number;
  estado: 'finalizada' | 'interrumpida';
  comenzada: boolean;
  intercambios: IntercambioSeed[];
  reflexion?: string;
  retroalimentacion?: {
    nota: number;
    comentarioGeneral: string;
  };
}

const SESIONES: SesionSeed[] = [
  {
    id: IDS.s1_e1,
    correoEstudiante: 'estudiante1@psysim.test',
    codigoCaso: 'E-01',
    diasAtras: 6,
    duracionSegundos: 440,
    estado: 'finalizada',
    comenzada: true,
    intercambios: [
      {
        estudiante:
          'Buenas tardes. Gracias por venir hoy. ¿Cómo prefieres que te llame y qué te motivó a pedir esta consulta?',
        npc: 'Hola… puedes llamarme por mi nombre. La verdad vine porque llevo semanas sintiendo que no alcanzo a cumplir con nada en la universidad y en mi casa.',
        latenciaMs: 1420,
        anotacion: {
          fragmento: '¿Cómo prefieres que te llame y qué te motivó a pedir esta consulta?',
          comentario:
            'Buen encuadre inicial: das lugar al nombre preferido y abres con una pregunta amplia sin anticipar diagnóstico.',
        },
      },
      {
        estudiante:
          'Entiendo que ha sido una carga pesada estas últimas semanas. Cuando dices que sientes que no alcanzas a cumplir, ¿en qué momentos del día se te hace más difícil?',
        npc: 'Sobre todo en las noches, cuando intento estudiar y me doy cuenta de que leo la misma página tres veces sin retener nada. Ahí me empiezo a frustrar mucho.',
        latenciaMs: 1680,
        anotacion: {
          fragmento: 'Entiendo que ha sido una carga pesada estas últimas semanas.',
          comentario:
            'Validación clara antes de explorar el detalle cotidiano; ayuda a que el paciente concrete ejemplos.',
        },
      },
      {
        estudiante:
          'Tiene sentido que te frustres cuando el cansancio no te deja avanzar. ¿Has notado cambios en tu sueño o en tu alimentación durante esas semanas?',
        npc: 'Sí, me cuesta quedarme dormido y me despierto cansado casi todos los días.',
        latenciaMs: 1510,
      },
    ],
    reflexion:
      'Sentí que logré mantener un tono cálido al principio y validar la frustración sin dar consejos apresurados. La próxima vez quiero explorar con más calma los apoyos familiares antes de pasar a preguntar por el sueño.',
    retroalimentacion: {
      nota: 4.6,
      comentarioGeneral:
        'Muy buen manejo del encuadre inicial y de la escucha empática. Tus preguntas abiertas permitieron que el paciente describiera situaciones concretas sin sentirse juzgado. Para la siguiente entrevista, profundiza un poco más en la red de apoyo antes de indagar síntomas fisiológicos.',
    },
  },
  {
    id: IDS.s1_e2,
    correoEstudiante: 'estudiante1@psysim.test',
    codigoCaso: 'E-02',
    diasAtras: 3,
    duracionSegundos: 310,
    estado: 'finalizada',
    comenzada: true,
    intercambios: [
      {
        estudiante:
          'Hola, bienvenido al consultorio. Este es un espacio confidencial para conversar con tranquilidad. ¿Qué ha estado pasando últimamente?',
        npc: 'Gracias. Últimamente me cuesta mucho salir de casa cuando sé que voy a encontrarme con mucha gente; siento que el corazón se me acelera.',
        latenciaMs: 1350,
      },
      {
        estudiante:
          'Gracias por contármelo. ¿Recuerdas cuándo fue la primera vez que sentiste esa aceleración o qué estabas haciendo justo antes?',
        npc: 'Fue hace como dos meses, antes de una exposición en clase. Desde entonces trato de evitar las reuniones.',
        latenciaMs: 1590,
        anotacion: {
          fragmento: '¿Recuerdas cuándo fue la primera vez que sentiste esa aceleración',
          comentario:
            'Excelente transición para ubicar el inicio del malestar y su posible desencadenante situacional.',
        },
      },
    ],
    reflexion:
      'Me ayudó mucho ubicar temporalmente cuándo empezó la evitación. Siento que pude sostener mejor los silencios sin llenar la conversación.',
    retroalimentacion: {
      nota: 4.3,
      comentarioGeneral:
        'Buena exploración temporal del motivo de consulta y respeto por el ritmo del paciente. Recuerda recapitular brevemente lo que escuchaste antes de cerrar la entrevista.',
    },
  },
  {
    id: IDS.s1_e3,
    correoEstudiante: 'estudiante1@psysim.test',
    codigoCaso: 'E-03',
    diasAtras: 1,
    duracionSegundos: 270,
    estado: 'finalizada',
    comenzada: true,
    intercambios: [
      {
        estudiante:
          'Buenos días. Me alegra que hayas podido conectarte hoy. ¿Cómo te has sentido en los últimos días respecto a lo que te trae a consulta?',
        npc: 'Un poco tenso, la verdad. Siento que en mi trabajo nadie valora lo que hago y llego a la casa sin ganas de hablar con nadie.',
        latenciaMs: 1490,
      },
      {
        estudiante:
          'Suena agotador cargar con esa sensación todo el día. ¿Con quién vives actualmente y cómo han manejado esos momentos en casa?',
        npc: 'Vivo con mi pareja, pero últimamente discutimos por cosas pequeñas porque yo respondo a la defensiva.',
        latenciaMs: 1620,
      },
    ],
  },
  {
    id: IDS.s2_e1,
    correoEstudiante: 'estudiante2@psysim.test',
    codigoCaso: 'E-01',
    diasAtras: 4,
    duracionSegundos: 360,
    estado: 'finalizada',
    comenzada: true,
    intercambios: [
      {
        estudiante:
          'Hola, gracias por estar aquí. Cuéntame con tus palabras qué te ha estado preocupando en las últimas semanas.',
        npc: 'Me preocupa no poder concentrarme. Siento que todo el mundo avanza menos yo.',
        latenciaMs: 1380,
      },
      {
        estudiante:
          'Cuando aparece esa idea de que todos avanzan menos tú, ¿qué sueles hacer o pensar en ese momento?',
        npc: 'Me quedo bloqueado mirando la pantalla y termino acostándome tarde sin haber hecho nada.',
        latenciaMs: 1440,
      },
    ],
    reflexion:
      'Creo que la pregunta sobre qué ocurre justo en el momento del bloqueo abrió información muy útil.',
    retroalimentacion: {
      nota: 4.8,
      comentarioGeneral:
        'Excelente precisión clínica al explorar los pensamientos automáticos asociados al bloqueo. Mantén ese equilibrio entre calidez y foco.',
    },
  },
  {
    id: IDS.s2_e2,
    correoEstudiante: 'estudiante2@psysim.test',
    codigoCaso: 'E-02',
    diasAtras: 2,
    duracionSegundos: 0,
    estado: 'interrumpida',
    comenzada: false,
    intercambios: [],
  },
  {
    id: IDS.s3_e5,
    correoEstudiante: 'estudiante3@psysim.test',
    codigoCaso: 'E-05',
    diasAtras: 1,
    duracionSegundos: 300,
    estado: 'finalizada',
    comenzada: true,
    intercambios: [
      {
        estudiante:
          'Bienvenido. Hoy tenemos este espacio para conversar sobre lo que necesites. ¿Por dónde te gustaría empezar?',
        npc: 'No estoy muy seguro, es la primera vez que hablo de esto con alguien. Me cuesta dormir desde que perdí mi empleo.',
        latenciaMs: 1520,
      },
      {
        estudiante:
          'Agradezco la confianza de compartirlo, especialmente siendo la primera vez. ¿Qué ha cambiado en tu rutina desde que ocurrió esa pérdida?',
        npc: 'Casi todo: ya no salgo en las mañanas y paso muchas horas dándole vueltas a qué hice mal.',
        latenciaMs: 1640,
      },
    ],
  },
];

let errores = 0;

for (const item of SESIONES) {
  const est = estPorCorreo.get(item.correoEstudiante.toLowerCase());
  const esc = escPorCodigo.get(item.codigoCaso);
  if (!est || !esc) {
    console.error(`✖ Falta estudiante (${item.correoEstudiante}) o caso (${item.codigoCaso}).`);
    errores++;
    continue;
  }

  const { data: existente } = await supabase
    .from('sesion')
    .select('id')
    .eq('id', item.id)
    .maybeSingle();

  if (existente) {
    console.log(`• [sesion] ${item.id} (${item.correoEstudiante} · ${item.codigoCaso}) ya existía`);
    continue;
  }

  const { inicio, fin } = haceDias(item.diasAtras, item.duracionSegundos);
  const promptSistema =
    esc.npc?.prompt_sistema ?? 'Eres un paciente en entrevista clínica simulada.';

  const { error: errSesion } = await supabase.from('sesion').insert({
    id: item.id,
    usuario_id: est.docente_id,
    estudiante_id: est.id,
    escenario_id: esc.id,
    codigo_estudiante: est.codigo,
    nombre_estudiante: est.nombre,
    prompt_sistema: promptSistema,
    estado: item.estado,
    comenzada: item.comenzada,
    inicio,
    fin,
    ultima_actividad: fin,
  });

  if (errSesion) {
    console.error(`✖ Error creando sesión ${item.id}:`, errSesion.message);
    errores++;
    continue;
  }

  const anotacionesPendientes: {
    mensajeId: string;
    inicio: number;
    fin: number;
    fragmento: string;
    comentario: string;
  }[] = [];

  const inicioMs = new Date(inicio).getTime();
  for (let i = 0; i < item.intercambios.length; i++) {
    const turno = item.intercambios[i];
    if (!turno) continue;
    const tEst = new Date(inicioMs + (i * 2 + 1) * 45_000).toISOString();
    const tNpc = new Date(inicioMs + (i * 2 + 1) * 45_000 + turno.latenciaMs).toISOString();

    const { data: msgEst, error: errMsgEst } = await supabase
      .from('mensaje')
      .insert({
        sesion_id: item.id,
        remitente: 'estudiante',
        contenido: turno.estudiante,
        creado_en: tEst,
      })
      .select('id')
      .single();

    if (errMsgEst || !msgEst) {
      console.error(`✖ Error creando mensaje estudiante en ${item.id}:`, errMsgEst?.message);
      errores++;
      continue;
    }

    if (turno.anotacion) {
      const idx = turno.estudiante.indexOf(turno.anotacion.fragmento);
      if (idx >= 0) {
        anotacionesPendientes.push({
          mensajeId: msgEst.id,
          inicio: idx,
          fin: idx + turno.anotacion.fragmento.length,
          fragmento: turno.anotacion.fragmento,
          comentario: turno.anotacion.comentario,
        });
      }
    }

    const { error: errMsgNpc } = await supabase.from('mensaje').insert({
      sesion_id: item.id,
      remitente: 'npc',
      contenido: turno.npc,
      latencia_ms: turno.latenciaMs,
      creado_en: tNpc,
    });
    if (errMsgNpc) {
      console.error(`✖ Error creando mensaje NPC en ${item.id}:`, errMsgNpc.message);
      errores++;
    }
  }

  if (item.comenzada && item.intercambios.length > 0) {
    const latencias = item.intercambios.map(t => t.latenciaMs);
    const promedio = Math.round(latencias.reduce((a, b) => a + b, 0) / latencias.length);
    const maxima = Math.max(...latencias);
    const { error: errMetrica } = await supabase.from('metrica').insert({
      sesion_id: item.id,
      total_mensajes: item.intercambios.length,
      latencia_promedio_ms: promedio,
      latencia_maxima_ms: maxima,
      duracion_segundos: item.duracionSegundos,
    });
    if (errMetrica) {
      console.error(`✖ Error creando métrica en ${item.id}:`, errMetrica.message);
      errores++;
    }
  }

  if (item.reflexion) {
    const { error: errRef } = await supabase.from('reflexion').insert({
      sesion_id: item.id,
      contenido: item.reflexion,
      creado_en: fin,
      actualizado_en: fin,
    });
    if (errRef) {
      console.error(`✖ Error creando reflexión en ${item.id}:`, errRef.message);
      errores++;
    }
  }

  if (item.retroalimentacion) {
    const publicadaEn = new Date(new Date(fin).getTime() + 3_600_000).toISOString();
    const { error: errRetro } = await supabase.from('retroalimentacion').insert({
      sesion_id: item.id,
      docente_id: est.docente_id,
      nota: item.retroalimentacion.nota,
      comentario_general: item.retroalimentacion.comentarioGeneral,
      publicada_en: publicadaEn,
      actualizado_en: publicadaEn,
    });
    if (errRetro) {
      console.error(`✖ Error creando retroalimentación en ${item.id}:`, errRetro.message);
      errores++;
    } else {
      for (const a of anotacionesPendientes) {
        const { error: errAnot } = await supabase.from('anotacion').insert({
          sesion_id: item.id,
          mensaje_id: a.mensajeId,
          inicio: a.inicio,
          fin: a.fin,
          fragmento: a.fragmento,
          comentario: a.comentario,
        });
        if (errAnot) {
          console.error(`✖ Error creando anotación en ${item.id}:`, errAnot.message);
          errores++;
        }
      }
    }
  }

  console.log(`✔ [sesion] ${item.id} (${item.correoEstudiante} · ${item.codigoCaso}) creada`);
}

// Códigos asignados vigentes (para mostrar la sección de códigos asignados listos). Prefijo «sem»:
// los E2E borran los códigos de su prefijo de 3 letras («est», «res»…) y se llevarían estos.
const ASIGNACIONES = [
  {
    codigo: 'sem-unoo-uno',
    correoEstudiante: 'estudiante1@psysim.test',
    codigoCaso: 'E-04',
  },
  {
    codigo: 'sem-cuat-uno',
    correoEstudiante: 'estudiante4@psysim.test',
    codigoCaso: 'E-02',
  },
] as const;

for (const asig of ASIGNACIONES) {
  const est = estPorCorreo.get(asig.correoEstudiante.toLowerCase());
  const esc = escPorCodigo.get(asig.codigoCaso);
  if (!est || !esc) continue;

  const { data: yaExiste } = await supabase
    .from('asignacion')
    .select('id')
    .eq('codigo', asig.codigo)
    .maybeSingle();

  if (yaExiste) {
    console.log(`• [codigo] ${asig.codigo} (${asig.correoEstudiante}) ya existía`);
    continue;
  }

  const { error: errAsig } = await supabase.from('asignacion').insert({
    docente_id: est.docente_id,
    estudiante_id: est.id,
    escenario_id: esc.id,
    codigo: asig.codigo,
    prompt_sistema: esc.npc?.prompt_sistema ?? 'Eres un paciente en entrevista clínica simulada.',
    expira_en: enDias(7),
  });

  if (errAsig) {
    console.error(`✖ Error creando código ${asig.codigo}:`, errAsig.message);
    errores++;
  } else {
    console.log(`✔ [codigo] ${asig.codigo} (${asig.correoEstudiante} · ${asig.codigoCaso}) creado`);
  }
}

if (errores > 0) process.exitCode = 1;
