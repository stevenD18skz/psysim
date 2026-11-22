'use client';

import { CircleHelp, Eye, EyeOff, LogOut, SlidersHorizontal } from 'lucide-react';
import Link from 'next/link';
import { useState } from 'react';

import { SelectorVoz } from '@/components/simulacion/sonido-simulacion';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { fijarAmbienteEmocional, useAmbienteEmocional } from '@/hooks/use-ambiente-emocional';
import { recordarIntervencionPendiente } from '@/lib/conversacion/pendiente-local';
import { plazoAlSalir } from '@/lib/fechas';
import { useAppStoreApi } from '@/store/app-store-provider';

/** Tecla (con Ctrl) que esconde o muestra los controles: H de «hud». La nombran el tooltip y la ayuda. */
export const TECLA_OCULTAR_HUD = 'KeyH';

const CLASE_BOTON_HUD = 'pointer-events-auto bg-card/90 backdrop-blur';

/**
 * Esconde o muestra los controles de la pantalla (datos de la práctica y botones) para ver el
 * consultorio despejado. La conversación no se esconde: es la práctica misma.
 */
export function BotonOcultarHud({
  oculto,
  onAlternar,
}: {
  oculto: boolean;
  onAlternar: () => void;
}) {
  const etiqueta = oculto ? 'Mostrar controles' : 'Ocultar controles';
  const conAtajo = `${etiqueta} (Ctrl + H)`;
  return (
    <Button
      type="button"
      variant="outline"
      size="icon-sm"
      className={CLASE_BOTON_HUD}
      aria-pressed={oculto}
      aria-label={etiqueta}
      aria-keyshortcuts="Control+H"
      title={conAtajo}
      onClick={onAlternar}
    >
      {oculto ? <Eye aria-hidden /> : <EyeOff aria-hidden />}
    </Button>
  );
}

/** Libera el ratón capturado: con Pointer Lock no se puede usar un diálogo ni un menú. */
function liberarRaton() {
  document.exitPointerLock?.();
}

/**
 * Ajustes del consultorio: el «Ambiente emocional» (la luz, el velo y el sonido que cambian con el
 * ánimo del paciente; aclara que no mide al estudiante) y la voz del paciente. Un solo botón en
 * lugar de dos para que la barra de la simulación tenga menos decisiones (Ley de Hick); silenciar
 * el sonido sigue aparte, a un clic.
 */
export function BotonAjustes() {
  const activado = useAmbienteEmocional();
  return (
    <Popover onOpenChange={abierto => abierto && liberarRaton()}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={CLASE_BOTON_HUD}
          aria-label="Ajustes del consultorio"
          title="Ajustes del consultorio"
        >
          <SlidersHorizontal aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="flex w-80 flex-col gap-4 p-3">
        <section aria-labelledby="ajuste-ambiente">
          <label className="flex cursor-pointer items-start justify-between gap-4 px-2 py-1">
            <span className="flex flex-col gap-1">
              <span id="ajuste-ambiente" className="text-sm font-semibold">
                Ambiente emocional
              </span>
              <span className="text-sm text-muted-foreground">
                La luz y el sonido del consultorio cambian con el ánimo del paciente. No mide tu
                desempeño.
              </span>
            </span>
            <input
              type="checkbox"
              role="switch"
              aria-labelledby="ajuste-ambiente"
              checked={activado}
              onChange={evento => fijarAmbienteEmocional(evento.target.checked)}
              className="mt-1 size-5 shrink-0 accent-nogal"
            />
          </label>
          <p className="sr-only" aria-live="polite">
            {activado ? 'Ambiente emocional activado' : 'Ambiente emocional desactivado'}
          </p>
        </section>
        <SelectorVoz />
      </PopoverContent>
    </Popover>
  );
}

/** Recordatorio de los controles, disponible durante toda la práctica. */
export function BotonControles() {
  return (
    <Popover onOpenChange={abierto => abierto && liberarRaton()}>
      <PopoverTrigger asChild>
        <Button
          type="button"
          variant="outline"
          size="icon-sm"
          className={CLASE_BOTON_HUD}
          aria-label="Controles"
          title="Controles"
        >
          <CircleHelp aria-hidden />
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-72">
        <p className="mb-2 text-sm font-semibold">Controles</p>
        <dl className="flex flex-col gap-1.5 text-sm">
          {[
            ['W A S D', 'caminar'],
            ['Ratón o flechas', 'mirar alrededor'],
            ['E (o clic sobre el paciente)', 'conversar'],
            ['Ctrl + H', 'ocultar o mostrar los controles'],
            ['Esc', 'liberar el ratón'],
          ].map(([tecla, accion]) => (
            <div key={tecla} className="flex items-baseline justify-between gap-3">
              <dt className="font-mono text-xs font-medium">{tecla}</dt>
              <dd className="text-muted-foreground">{accion}</dd>
            </div>
          ))}
        </dl>
      </PopoverContent>
    </Popover>
  );
}

/**
 * «Salir» sin terminar: la práctica queda abierta hasta el plazo de inactividad. La confirmación
 * dice la hora concreta y qué pasa si no se vuelve (antes, «Salir al panel» prometía que la sesión
 * seguía en curso sin decir que se cerraría sola).
 */
export function BotonSalir({ compacto = false }: { compacto?: boolean }) {
  const store = useAppStoreApi();
  const [plazo, setPlazo] = useState<string | null>(null);

  return (
    <>
      <Button
        type="button"
        variant="outline"
        size={compacto ? 'icon-sm' : 'sm'}
        className={CLASE_BOTON_HUD}
        aria-label={compacto ? 'Salir de la práctica' : undefined}
        title={compacto ? 'Salir de la práctica' : undefined}
        onClick={() => {
          liberarRaton();
          setPlazo(plazoAlSalir());
        }}
      >
        <LogOut aria-hidden />
        {!compacto && 'Salir'}
      </Button>
      <Dialog open={plazo !== null} onOpenChange={abierto => !abierto && setPlazo(null)}>
        <DialogContent role="alertdialog" className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>¿Salir de la práctica?</DialogTitle>
            <DialogDescription>La práctica queda abierta hasta las {plazo}.</DialogDescription>
          </DialogHeader>
          <ul className="flex flex-col gap-2 text-sm leading-relaxed">
            <li className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-salvia" />
              Si vuelves antes desde Mis prácticas, continúas donde ibas.
            </li>
            <li className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-ambar" />
              Si no vuelves, se cierra sola: tu docente revisará lo que alcanzaste a conversar y el
              código dejará de servir.
            </li>
          </ul>
          <DialogFooter>
            <Button variant="outline" asChild>
              <Link
                href="/practicas"
                onClick={() => {
                  const { activa, cuentaId } = store.getState().sesion;
                  if (activa) recordarIntervencionPendiente(cuentaId, activa.id, null);
                }}
              >
                Salir a Mis prácticas
              </Link>
            </Button>
            <Button variant="accion" onClick={() => setPlazo(null)} autoFocus>
              Seguir practicando
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}
