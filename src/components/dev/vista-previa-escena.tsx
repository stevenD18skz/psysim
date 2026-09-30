'use client';

import dynamic from 'next/dynamic';
import { useSearchParams } from 'next/navigation';
import { useMemo, useState } from 'react';

import { ID_BOTON_EXPLORAR } from '@/components/3d/controles-primera-persona';
import { IndicadorFps } from '@/components/3d/monitor-rendimiento';
import { useEscena } from '@/components/3d/use-escena';

const EscenaSimulacion = dynamic(() => import('@/components/simulacion/escena-simulacion'), {
  ssr: false,
});

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
      </div>
    </div>
  );
}
