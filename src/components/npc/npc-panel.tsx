'use client';

import { Download, Pause, Play, RotateCcw, Scan } from 'lucide-react';
import { type ReactNode, useId } from 'react';

import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  type EjeRotacion,
  type InterruptorNpc,
  type NpcControlador,
} from '@/hooks/use-npc-controller';
import { METADATOS_ACCIONES } from '@/lib/npc/acciones';
import { type ModeloNpc, urlModeloNpc } from '@/lib/npc/catalogo';
import { cn } from '@/lib/utils';

const INTERRUPTORES: { clave: InterruptorNpc; etiqueta: string; tecla: string }[] = [
  { clave: 'esqueleto', etiqueta: 'Esqueleto', tecla: 'S' },
  { clave: 'malla', etiqueta: 'Malla', tecla: 'M' },
  { clave: 'pasear', etiqueta: 'Pasear en círculo', tecla: 'P' },
  { clave: 'autogirar', etiqueta: 'Autogirar', tecla: 'G' },
];

function Seccion({
  titulo,
  ayuda,
  children,
}: {
  titulo: string;
  ayuda?: string;
  children: ReactNode;
}) {
  return (
    <section className="flex flex-col gap-3">
      <div className="flex items-baseline justify-between border-b pb-1">
        <h3 className="text-sm font-semibold">{titulo}</h3>
        {ayuda && <span className="text-xs text-muted-foreground">{ayuda}</span>}
      </div>
      {children}
    </section>
  );
}

function Tecla({ children }: { children: ReactNode }) {
  return (
    <kbd className="inline-grid h-[18px] min-w-[18px] place-items-center rounded border border-current px-1 font-sans text-[10px] font-medium opacity-60">
      {children}
    </kbd>
  );
}

function Deslizador({
  etiqueta,
  valor,
  min,
  max,
  paso,
  formato,
  onChange,
}: {
  etiqueta: string;
  valor: number;
  min: number;
  max: number;
  paso: number;
  formato: (v: number) => string;
  onChange: (v: number) => void;
}) {
  const id = useId();
  return (
    <div className="grid grid-cols-[4.5rem_minmax(0,1fr)_3.5rem] items-center gap-3 text-xs text-muted-foreground">
      <label htmlFor={id}>{etiqueta}</label>
      <input
        id={id}
        type="range"
        min={min}
        max={max}
        step={paso}
        value={valor}
        onChange={e => onChange(Number(e.target.value))}
        className="w-full accent-primary"
      />
      <output htmlFor={id} className="text-right text-foreground tabular-nums">
        {formato(valor)}
      </output>
    </div>
  );
}

/** Panel de controles del laboratorio del NPC (acciones, reproducción, vista, pose, archivo). */
export function NpcPanel({ npc, modelo }: { npc: NpcControlador; modelo: ModeloNpc }) {
  const { controlador, estado } = npc;
  const idHueso = useId();

  return (
    <aside className="flex flex-col gap-6 overflow-y-auto border-t bg-background p-6 lg:border-t-0 lg:border-l">
      <header className="flex flex-col gap-1">
        <p className="text-[10px] font-medium tracking-[0.1em] text-primary uppercase">
          NPC · rig de {controlador.huesos.length} huesos · low poly
        </p>
        <h2 className="text-3xl font-semibold tracking-tight">{modelo.nombre}</h2>
        <p className="text-sm text-pretty text-muted-foreground">
          Malla con piel (skinned mesh) sobre un esqueleto real. Pulsa una acción o usa el teclado;
          las transiciones se mezclan solas.
        </p>
      </header>

      <Seccion titulo="Acciones" ayuda={`${controlador.accionesDisponibles.size} clips`}>
        <div className="grid grid-cols-2 gap-2">
          {METADATOS_ACCIONES.map(meta => {
            const activa = estado.accion === meta.id;
            return (
              <Button
                key={meta.id}
                variant={activa ? 'default' : 'outline'}
                className="h-10 justify-between text-sm"
                aria-pressed={activa}
                disabled={!controlador.accionesDisponibles.has(meta.id)}
                onClick={() => controlador.play(meta.id)}
              >
                <span>{meta.etiqueta}</span>
                <Tecla>{meta.tecla}</Tecla>
              </Button>
            );
          })}
        </div>
      </Seccion>

      <Seccion titulo="Reproducción" ayuda="Espacio = pausa">
        <div className="flex gap-2">
          <Button
            variant={estado.pausado ? 'default' : 'outline'}
            className="flex-1"
            aria-pressed={estado.pausado}
            onClick={() => controlador.setPaused(!estado.pausado)}
          >
            {estado.pausado ? <Play aria-hidden /> : <Pause aria-hidden />}
            {estado.pausado ? 'Reanudar' : 'Pausar'}
          </Button>
          <Button variant="outline" className="flex-1" onClick={controlador.repetir}>
            <RotateCcw aria-hidden />
            Repetir
          </Button>
        </div>
        <Deslizador
          etiqueta="Velocidad"
          valor={estado.velocidad}
          min={0.25}
          max={2}
          paso={0.05}
          formato={v => `${v.toFixed(2)}×`}
          onChange={controlador.setSpeed}
        />
        <Deslizador
          etiqueta="Mezcla"
          valor={estado.mezcla}
          min={0}
          max={1}
          paso={0.05}
          formato={v => `${v.toFixed(2)} s`}
          onChange={controlador.setFade}
        />
      </Seccion>

      <Seccion titulo="Vista" ayuda="Arrastra para orbitar">
        <div className="grid grid-cols-2 gap-2">
          {INTERRUPTORES.map(({ clave, etiqueta, tecla }) => {
            const activo = estado.interruptores[clave];
            return (
              <Button
                key={clave}
                variant={activo ? 'default' : 'outline'}
                className="h-10 justify-between text-sm"
                aria-pressed={activo}
                onClick={() => controlador.setToggle(clave, !activo)}
              >
                <span>{etiqueta}</span>
                <Tecla>{tecla}</Tecla>
              </Button>
            );
          })}
        </div>
        <Button variant="outline" onClick={controlador.centrar}>
          <Scan aria-hidden />
          Centrar personaje y cámara
        </Button>
      </Seccion>

      <Seccion titulo="Pose manual" ayuda={estado.modoPose ? 'activa' : 'inactiva'}>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor={idHueso}>Hueso</Label>
          <select
            id={idHueso}
            value={estado.huesoPose}
            onChange={e => controlador.seleccionarHueso(e.target.value)}
            className="h-8 rounded-lg border border-input bg-transparent px-2.5 text-sm focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/50 focus-visible:outline-none"
          >
            {controlador.nombresHuesos.map(nombre => (
              <option key={nombre} value={nombre}>
                {nombre}
              </option>
            ))}
          </select>
        </div>
        {(['x', 'y', 'z'] as const satisfies readonly EjeRotacion[]).map(eje => (
          <Deslizador
            key={eje}
            etiqueta={`Rot. ${eje.toUpperCase()}`}
            valor={estado.rotacion[eje]}
            min={-180}
            max={180}
            paso={1}
            formato={v => `${v}°`}
            onChange={v => controlador.rotarHueso(eje, v)}
          />
        ))}
        <div className="flex gap-2">
          <Button variant="outline" className="flex-1" onClick={controlador.reiniciarHueso}>
            Reiniciar hueso
          </Button>
          <Button variant="outline" className="flex-1" onClick={controlador.reiniciarPose}>
            Reiniciar pose
          </Button>
        </div>
        <p className={cn('text-xs text-pretty text-muted-foreground')}>
          Mover un deslizador detiene la animación y entra en modo pose. Pulsa cualquier acción para
          salir.
        </p>
      </Seccion>

      <Seccion titulo="Archivo">
        <Button variant="outline" asChild>
          <a href={urlModeloNpc(modelo)} download={modelo.archivo}>
            <Download aria-hidden />
            Descargar {modelo.archivo}
          </a>
        </Button>
        <p className="text-xs text-pretty text-muted-foreground">
          GLB con la malla con piel, el esqueleto y las animaciones como clips, listo para Blender,
          Unity o Unreal.
        </p>
      </Seccion>
    </aside>
  );
}
