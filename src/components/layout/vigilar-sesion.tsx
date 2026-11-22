'use client';

import { type ReactNode, useEffect, useState } from 'react';

import { comprobarActividadSesion } from '@/lib/auth/actividad-sesion';
import { PARAM_SIGUIENTE, RUTA_LOGIN } from '@/lib/auth/routes';
import { CLAVE_CUENTA_ACTIVA } from '@/lib/datos-locales';

const INTERVALO_ACTIVIDAD_MS = 60_000;

export function VigilarSesion({
  cuentaId,
  segundosRestantes,
  children,
}: {
  cuentaId: string;
  segundosRestantes: number;
  children: ReactNode;
}) {
  const [salida, setSalida] = useState<
    { destino: 'recargar' } | { destino: 'acceso'; ruta: string } | null
  >(null);

  // Primero desmonta el panel anterior (incluidos sus avisos de salida y datos en memoria).
  useEffect(() => {
    if (salida?.destino === 'recargar') window.location.reload();
    if (salida?.destino === 'acceso') window.location.replace(salida.ruta);
  }, [salida]);

  useEffect(() => {
    let vigente = true;
    let comprobando = false;
    let interaccionPendiente = false;
    let ultimoRegistro = -Infinity;
    let limite = Date.now() + segundosRestantes * 1000;
    let temporizador: ReturnType<typeof setTimeout>;

    function volverAlAcceso() {
      vigente = false;
      const siguiente = `${window.location.pathname}${window.location.search}`;
      const parametros = new URLSearchParams({ [PARAM_SIGUIENTE]: siguiente });
      setSalida({ destino: 'acceso', ruta: `${RUTA_LOGIN}?${parametros}` });
    }

    function programar() {
      clearTimeout(temporizador);
      temporizador = setTimeout(() => void comprobar(false), Math.max(1000, limite - Date.now()));
    }

    async function comprobar(registrar: boolean) {
      if (!vigente) return;
      if (comprobando) {
        interaccionPendiente ||= registrar;
        return;
      }
      comprobando = true;
      if (registrar) ultimoRegistro = Date.now();

      try {
        const restantes = await comprobarActividadSesion(cuentaId, registrar);
        if (!vigente) return;
        if (restantes === null) {
          volverAlAcceso();
          return;
        }
        limite = Date.now() + restantes * 1000;
        try {
          localStorage.setItem(CLAVE_CUENTA_ACTIVA, cuentaId);
        } catch {
          // Si el navegador bloquea el almacenamiento, se revalida al volver a la pestaña.
        }
        programar();
      } catch {
        if (vigente && Date.now() >= limite) volverAlAcceso();
        else if (vigente) programar();
      } finally {
        comprobando = false;
        if (interaccionPendiente) {
          interaccionPendiente = false;
          if (Date.now() - ultimoRegistro >= INTERVALO_ACTIVIDAD_MS) void comprobar(true);
        }
      }
    }

    function alInteractuar(evento: Event) {
      if (evento.isTrusted && Date.now() - ultimoRegistro >= INTERVALO_ACTIVIDAD_MS) {
        void comprobar(true);
      }
    }

    function alVolver() {
      if (document.visibilityState === 'visible') void comprobar(false);
    }

    function alCambiarCuenta(evento: StorageEvent) {
      if (!vigente) return;
      if (
        (evento.key === CLAVE_CUENTA_ACTIVA && evento.newValue !== cuentaId) ||
        evento.key === null
      ) {
        vigente = false;
        setSalida({ destino: 'recargar' });
      }
    }

    programar();
    void comprobar(false);
    const eventos = ['pointerdown', 'keydown', 'wheel'] as const;
    for (const evento of eventos) window.addEventListener(evento, alInteractuar, { passive: true });
    window.addEventListener('storage', alCambiarCuenta);
    window.addEventListener('pageshow', alVolver);
    document.addEventListener('visibilitychange', alVolver);

    return () => {
      vigente = false;
      clearTimeout(temporizador);
      for (const evento of eventos) window.removeEventListener(evento, alInteractuar);
      window.removeEventListener('storage', alCambiarCuenta);
      window.removeEventListener('pageshow', alVolver);
      document.removeEventListener('visibilitychange', alVolver);
    };
  }, [cuentaId, segundosRestantes]);

  return salida ? null : children;
}
