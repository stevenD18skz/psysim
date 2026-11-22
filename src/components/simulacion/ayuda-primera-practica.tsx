'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';

const CONSEJOS = {
  ocultar: 'Oculta o muestra los controles con el botón del ojo o con Ctrl + H.',
  remision: 'Abre la hoja de remisión para conocer el motivo de consulta.',
  notas: 'Anota tus observaciones aquí. Tus notas son privadas.',
  controles: 'Consulta las teclas para caminar, mirar y conversar.',
} as const;

type Control = keyof typeof CONSEJOS;

const ORDEN_3D: readonly Control[] = ['ocultar', 'remision', 'notas', 'controles'];
const ORDEN_TEXTO: readonly Control[] = ['remision', 'notas'];
const DURACION_PISTA = 10_000;

export function useAyudaPrimeraPractica({
  cuentaId,
  activa,
  modoTexto,
}: {
  cuentaId: string;
  activa: boolean;
  modoTexto: boolean;
}) {
  const clave = `psysim:pistas-primera-practica:v1:${cuentaId}`;
  const [indice, setIndice] = useState(() => {
    try {
      return localStorage.getItem(clave) === '1' ? Infinity : 0;
    } catch {
      return 0;
    }
  });
  const [pausada, setPausada] = useState(false);
  const pistas = modoTexto ? ORDEN_TEXTO : ORDEN_3D;
  const actual = activa ? pistas[indice] : undefined;
  const omitir = () => setIndice(Infinity);

  useEffect(() => {
    if (indice < pistas.length) return;
    try {
      localStorage.setItem(clave, '1');
    } catch {
      // El recorrido también se puede cerrar con el almacenamiento bloqueado.
    }
  }, [clave, indice, pistas.length]);

  useEffect(() => {
    if (!actual || pausada) return;
    const reloj = window.setTimeout(() => setIndice(valor => valor + 1), DURACION_PISTA);
    return () => window.clearTimeout(reloj);
  }, [actual, pausada]);

  return { actual, omitir, setPausada };
}

export function PistaPrimeraPractica({
  control,
  ayuda,
  children,
}: {
  control: Control;
  ayuda: ReturnType<typeof useAyudaPrimeraPractica>;
  children: ReactNode;
}) {
  const { actual, setPausada, omitir } = ayuda;
  const visible = actual === control;
  useEffect(() => {
    if (visible) return () => setPausada(false);
  }, [visible, setPausada]);

  return (
    <Tooltip open={visible}>
      <TooltipTrigger asChild>
        <span className="inline-flex">{children}</span>
      </TooltipTrigger>
      <TooltipContent
        side="bottom"
        align="end"
        collisionPadding={12}
        className="pointer-events-auto max-w-[min(17rem,calc(100vw-1.5rem))] text-sm motion-reduce:animate-none"
        onPointerEnter={() => setPausada(true)}
        onPointerLeave={() => setPausada(false)}
        onEscapeKeyDown={omitir}
      >
        {CONSEJOS[control]}
      </TooltipContent>
    </Tooltip>
  );
}

export function AnuncioPistaPractica({ actual }: { actual: Control | undefined }) {
  return (
    <span className="sr-only" role="status">
      {actual ? CONSEJOS[actual] : ''}
    </span>
  );
}
