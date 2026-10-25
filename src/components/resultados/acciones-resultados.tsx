'use client';

import { ClipboardList, Loader2, LogOut, Plus } from 'lucide-react';
import Link from 'next/link';
import { useEffect } from 'react';

import { useCerrarSesion } from '@/components/layout/use-cerrar-sesion';
import { useCerrarSesionCompartida } from '@/components/layout/use-cerrar-sesion-compartida';
import { Button } from '@/components/ui/button';
import { useEquipoCompartido } from '@/hooks/use-equipo-compartido';
import { useAppStore } from '@/store/app-store-provider';

/**
 * HU-21 · T04 — Acciones al pie de los resultados. El estudiante vuelve a Mis prácticas o cierra
 * su sesión (en el computador del docente, en modo presencial, cerrarla es lo principal: el
 * siguiente estudiante no debe ver sus prácticas). El docente empieza una sesión nueva o sale.
 */
export function AccionesResultados({ rol }: { rol: 'docente' | 'estudiante' }) {
  const compartido = useEquipoCompartido();
  const sesionPropia = useCerrarSesion();
  const sesionCompartida = useCerrarSesionCompartida();
  const { salir, cerrando } = compartido ? sesionCompartida : sesionPropia;

  const botonCerrar = (
    <Button
      variant={compartido ? 'accion' : 'outline'}
      size="lg"
      onClick={salir}
      disabled={cerrando}
    >
      {cerrando ? <Loader2 className="animate-spin" aria-hidden /> : <LogOut aria-hidden />}
      {compartido ? 'Cerrar sesión en este equipo' : rol === 'docente' ? 'Cerrar' : 'Cerrar sesión'}
    </Button>
  );

  return (
    <div className="flex flex-col-reverse gap-2 border-t pt-6 sm:flex-row sm:justify-end">
      {botonCerrar}
      {rol === 'docente' ? (
        <Button variant="accion" size="lg" asChild>
          <Link href="/configuracion">
            <Plus aria-hidden />
            Nueva sesión
          </Link>
        </Button>
      ) : (
        <Button variant={compartido ? 'outline' : 'accion'} size="lg" asChild>
          <Link href="/practicas">
            <ClipboardList aria-hidden />
            Ir a Mis prácticas
          </Link>
        </Button>
      )}
    </div>
  );
}

/**
 * La simulación deja su estado en el store (sesión, conversación, métricas) hasta llegar aquí:
 * al montarse la pantalla de resultados, lo borra para que la práctica terminada no se retome.
 */
export function LimpiarSesionActiva({ sesionId }: { sesionId: string }) {
  const limpiar = useAppStore(state => state.sesion.limpiar);
  const activaId = useAppStore(state => state.sesion.activa?.id);

  useEffect(() => {
    if (activaId === sesionId) limpiar();
  }, [activaId, sesionId, limpiar]);

  return null;
}
