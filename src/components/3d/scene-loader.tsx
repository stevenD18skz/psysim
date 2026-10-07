'use client';

import { Suspense } from 'react';
import { MathUtils } from 'three';

import { AmbienteDinamico } from '@/components/3d/ambiente-dinamico';
import { CamaraConversacion } from '@/components/3d/camara-conversacion';
import { ControlesPrimeraPersona } from '@/components/3d/controles-primera-persona';
import { Iluminacion } from '@/components/3d/iluminacion';
import { InteraccionPaciente } from '@/components/3d/interaccion-paciente';
import { LimiteErrorModelo, ModeloGLB } from '@/components/3d/modelo-glb';
import { Mueble } from '@/components/3d/mueble';
import { NPCModel } from '@/components/3d/npc-model';
import { RegistroColisionesProvider } from '@/components/3d/registro-colisiones';
import { Sala } from '@/components/3d/sala';
import { type Escena } from '@/schemas/escena.schema';
import { useAppStore } from '@/store/app-store-provider';

interface SceneLoaderProps {
  escena: Escena;
  onBloqueoCambia?: (bloqueado: boolean) => void;
}

/**
 * HU-09 · T02 — Monta la escena descrita por el JSON del escenario: iluminación, sala (GLB de
 * entorno o sala procedural), mobiliario, paciente virtual y controles del estudiante.
 *
 * Cada GLB tiene su propio `Suspense` y error boundary: la carga se refleja en la pantalla de
 * carga (vía `useProgress`) y un modelo que falla se sustituye por su versión procedural.
 */
export function SceneLoader({ escena, onBloqueoCambia }: SceneLoaderProps) {
  const sala = <Sala sala={escena.sala} />;
  // El estudiante solo camina cuando la simulación comenzó (HU-23), mientras no conversa con el
  // paciente y la sesión sigue abierta.
  const movimientoHabilitado = useAppStore(
    state => state.npc.estado === 'inactivo' && state.sesion.activa?.comenzada === true
  );

  return (
    <RegistroColisionesProvider>
      <Iluminacion iluminacion={escena.iluminacion} />
      <AmbienteDinamico sala={escena.sala} />

      {escena.entorno ? (
        <LimiteErrorModelo ruta={escena.entorno.modelo} fallback={sala}>
          <Suspense fallback={null}>
            <group
              position={escena.entorno.posicion}
              rotation-y={MathUtils.degToRad(escena.entorno.rotacion)}
              scale={escena.entorno.escala}
            >
              <ModeloGLB ruta={escena.entorno.modelo} ajuste={escena.entorno.ajuste} />
            </group>
          </Suspense>
        </LimiteErrorModelo>
      ) : (
        sala
      )}

      {escena.mobiliario.map(mueble => (
        <Mueble key={mueble.id} mueble={mueble} />
      ))}

      <NPCModel npc={escena.npc} />
      <InteraccionPaciente npc={escena.npc} />
      <CamaraConversacion npc={escena.npc} />

      <ControlesPrimeraPersona
        camara={escena.camara}
        navegacion={escena.navegacion}
        habilitado={movimientoHabilitado}
        onBloqueoCambia={onBloqueoCambia}
      />
    </RegistroColisionesProvider>
  );
}
