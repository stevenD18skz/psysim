'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';

import { ID_BOTON_EXPLORAR } from '@/components/3d/controles-primera-persona';
import { IndicadorFps } from '@/components/3d/monitor-rendimiento';
import { useEscena } from '@/components/3d/use-escena';
import { VeloEmocional } from '@/components/simulacion/velo-emocional';
import { type EmocionNpc, EMOCIONES_NPC, esEmocionNpc } from '@/lib/conversacion/emociones';
import { ESTADOS_NPC, type EstadoNpc } from '@/lib/conversacion/estados-npc';
import { useAppStore, useAppStoreApi } from '@/store/app-store-provider';

const EscenaSimulacion = dynamic(() => import('@/components/simulacion/escena-simulacion'), {
  ssr: false,
});

/**
 * Fuerza el estado y la emoción del paciente para revisar su lenguaje no verbal sin conversar
 * con la IA (`?estado=procesando&emocion=abrumado` o con los selectores). Salta las reglas de
 * transición del store: es solo para desarrollo.
 */
function ControlPaciente() {
  const store = useAppStoreApi();
  const parametros = useSearchParams();
  const estado = useAppStore(state => state.npc.estado);
  const emocion = useAppStore(
    state => state.conversacion.mensajes.at(-1)?.emocion ?? ('neutral' as EmocionNpc)
  );

  const fijarEstado = (siguiente: EstadoNpc) =>
    store.setState(state => ({ npc: { ...state.npc, estado: siguiente } }));
  const fijarEmocion = (siguiente: EmocionNpc) =>
    store.setState(state => ({
      conversacion: {
        ...state.conversacion,
        // Varias respuestas con la misma emoción: el clima del ambiente llega a su extremo.
        mensajes: Array.from({ length: 4 }, () => ({
          id: crypto.randomUUID(),
          remitente: 'npc' as const,
          contenido: 'Sí, bueno… es que no sé.',
          timestamp: new Date().toISOString(),
          emocion: siguiente,
        })),
      },
    }));

  useEffect(() => {
    const inicial = parametros.get('emocion');
    if (inicial && esEmocionNpc(inicial)) fijarEmocion(inicial);
    const estadoInicial = parametros.get('estado') as EstadoNpc | null;
    if (estadoInicial && ESTADOS_NPC.includes(estadoInicial)) fijarEstado(estadoInicial);
    // Solo al cargar: después mandan los selectores.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const clase = 'rounded bg-black/60 px-2 py-1 font-mono text-xs text-white';
  return (
    <>
      <select
        aria-label="Estado del paciente"
        className={clase}
        value={estado}
        onChange={e => fijarEstado(e.target.value as EstadoNpc)}
      >
        {ESTADOS_NPC.map(id => (
          <option key={id}>{id}</option>
        ))}
      </select>
      <select
        aria-label="Emoción del paciente"
        className={clase}
        value={emocion}
        onChange={e => fijarEmocion(e.target.value as EmocionNpc)}
      >
        {EMOCIONES_NPC.map(id => (
          <option key={id}>{id}</option>
        ))}
      </select>
    </>
  );
}

export function VistaPreviaEscena({ ruta }: { ruta: string }) {
  const { estado } = useEscena(ruta);
  const [bloqueado, setBloqueado] = useState(false);
  const parametros = useSearchParams();

  // `?camara=x,y,z&mirar=x,y,z` permite revisar la escena desde otro punto de vista.
  const escena = useMemo(() => {
    if (estado.estado !== 'lista') return null;
    const vector = (clave: string) => {
      const partes = parametros.get(clave)?.split(',').map(Number);
      return partes?.length === 3 && partes.every(Number.isFinite)
        ? (partes as [number, number, number])
        : undefined;
    };
    return {
      ...estado.escena,
      camara: {
        ...estado.escena.camara,
        posicion: vector('camara') ?? estado.escena.camara.posicion,
        mirarA: vector('mirar') ?? estado.escena.camara.mirarA,
      },
    };
  }, [estado, parametros]);

  return (
    <div className="relative h-dvh w-full bg-background">
      {escena && (
        <EscenaSimulacion escena={escena} onListo={() => {}} onBloqueoCambia={setBloqueado} />
      )}
      {escena && <VeloEmocional />}
      {estado.estado === 'error' && <p className="p-6 text-destructive">{estado.mensaje}</p>}
      <div className="absolute top-3 left-3 z-10 flex items-center gap-2">
        <IndicadorFps />
        {!bloqueado && (
          <button
            id={ID_BOTON_EXPLORAR}
            className="rounded-lg bg-primary px-3 py-1.5 text-sm text-primary-foreground"
          >
            Explorar
          </button>
        )}
        <span className="rounded bg-black/60 px-2 py-1 font-mono text-xs text-white">{ruta}</span>
        <ControlPaciente />
      </div>
    </div>
  );
}
