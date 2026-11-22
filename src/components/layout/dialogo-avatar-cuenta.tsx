'use client';

import { Check, Loader2, Shuffle } from 'lucide-react';
import { type RefObject, useRef, useState, useTransition } from 'react';
import { toast } from 'sonner';

import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { guardarAvatar } from '@/lib/avatares/actions';
import { AVATARES, type AvatarId } from '@/lib/avatares/catalogo';
import { useAppStoreApi } from '@/store/app-store-provider';
import { type PerfilUsuario } from '@/types';

const IDS = Object.keys(AVATARES) as AvatarId[];
const OPCIONES = [null, ...IDS];

export function DialogoAvatarCuenta({
  perfil,
  abierto,
  onAbiertoCambia,
  botonCuenta,
}: {
  perfil: PerfilUsuario;
  abierto: boolean;
  onAbiertoCambia: (abierto: boolean) => void;
  botonCuenta: RefObject<HTMLButtonElement | null>;
}) {
  const contenido = useRef<HTMLDivElement>(null);
  const [guardando, iniciarGuardado] = useTransition();

  return (
    <Dialog open={abierto} onOpenChange={valor => !guardando && onAbiertoCambia(valor)}>
      <DialogContent
        ref={contenido}
        className="max-h-[calc(100dvh-2rem)] max-w-[min(32rem,calc(100%-2rem))] gap-5 overflow-y-auto p-5 shadow-xl sm:max-w-lg"
        showCloseButton={false}
        onOpenAutoFocus={evento => {
          const seleccionado = contenido.current?.querySelector<HTMLInputElement>('input:checked');
          if (seleccionado) {
            evento.preventDefault();
            seleccionado.focus({ preventScroll: true });
          }
        }}
        onCloseAutoFocus={evento => {
          evento.preventDefault();
          botonCuenta.current?.focus({ preventScroll: true });
        }}
      >
        <DialogHeader className="gap-1">
          <DialogTitle>Cambiar avatar</DialogTitle>
          <DialogDescription>Elige cómo se verá tu cuenta en PsySim.</DialogDescription>
        </DialogHeader>
        <FormularioAvatar
          perfil={perfil}
          guardando={guardando}
          iniciarGuardado={iniciarGuardado}
          onCerrar={() => onAbiertoCambia(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

function FormularioAvatar({
  perfil,
  guardando,
  iniciarGuardado,
  onCerrar,
}: {
  perfil: PerfilUsuario;
  guardando: boolean;
  iniciarGuardado: ReturnType<typeof useTransition>[1];
  onCerrar: () => void;
}) {
  const store = useAppStoreApi();
  const [seleccion, setSeleccion] = useState(perfil.avatarId);
  const [error, setError] = useState<string | null>(null);

  function elegir(id: AvatarId | null) {
    setSeleccion(id);
    setError(null);
  }

  function elegirAlAzar() {
    const candidatos = IDS.filter(id => id !== seleccion);
    const candidato = candidatos[Math.floor(Math.random() * candidatos.length)];
    if (candidato) elegir(candidato);
  }

  function guardar() {
    if (guardando || seleccion === perfil.avatarId) return;
    setError(null);
    iniciarGuardado(async () => {
      try {
        const resultado = await guardarAvatar(seleccion, perfil.id);
        if (!resultado.ok) {
          setError(resultado.error);
          return;
        }

        const { perfil: actual, establecerPerfil } = store.getState().auth;
        if (actual?.id === perfil.id) establecerPerfil({ ...actual, avatarId: resultado.datos });
        toast.success('Avatar actualizado.');
        onCerrar();
      } catch {
        setError('No pudimos guardar el avatar. Inténtalo de nuevo.');
      }
    });
  }

  return (
    <form
      className="grid gap-4"
      onSubmit={evento => {
        evento.preventDefault();
        guardar();
      }}
    >
      <div className="flex min-w-0 items-center gap-4 rounded-xl border border-border bg-muted/65 p-3.5">
        <AvatarCuenta
          avatarId={seleccion}
          nombre={perfil.nombre}
          className="size-16 text-xl ring-[3px] ring-card"
        />
        <div className="min-w-0">
          <p className="text-xs font-medium text-muted-foreground">Vista previa</p>
          <p className="truncate text-base font-semibold" title={perfil.nombre}>
            {perfil.nombre}
          </p>
          <p aria-live="polite" className="text-sm text-muted-foreground">
            {seleccion ? AVATARES[seleccion] : 'Tus iniciales'}
          </p>
        </div>
      </div>

      <fieldset disabled={guardando} className="min-w-0">
        <legend className="mb-1 text-sm font-semibold">Avatares disponibles</legend>
        <div className="grid grid-cols-4 gap-1 min-[480px]:grid-cols-8">
          {OPCIONES.map(id => (
            <label
              key={id ?? 'iniciales'}
              title={id ? AVATARES[id] : 'Usar mis iniciales'}
              className="group/avatar relative flex min-h-12 cursor-pointer items-center justify-center has-disabled:cursor-default"
            >
              <input
                type="radio"
                name="avatar"
                value={id ?? ''}
                checked={seleccion === id}
                onChange={() => elegir(id)}
                className="peer sr-only"
              />
              <span className="sr-only">{id ? AVATARES[id] : 'Usar mis iniciales'}</span>
              <span className="relative flex size-11 items-center justify-center rounded-full border-2 border-transparent transition-colors group-hover/avatar:bg-muted peer-checked:border-salvia-oscuro peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-ring dark:peer-checked:border-salvia-suave">
                <AvatarCuenta avatarId={id} nombre={perfil.nombre} className="size-9 text-xs" />
                {seleccion === id && (
                  <span
                    aria-hidden
                    className="absolute -right-1 -bottom-1 flex size-4 items-center justify-center rounded-full bg-salvia-oscuro text-white ring-2 ring-popover"
                  >
                    <Check className="size-3" strokeWidth={3} />
                  </span>
                )}
              </span>
            </label>
          ))}
        </div>
      </fieldset>

      {error && (
        <p role="alert" className="rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
          {error}
        </p>
      )}

      <DialogFooter className="-mx-5 -mb-5 flex-row flex-wrap items-center justify-between gap-x-3 rounded-b-xl px-5 py-3 sm:justify-between">
        <Button
          type="button"
          variant="ghost"
          className="-ml-2 min-h-11 px-2"
          onClick={elegirAlAzar}
          disabled={guardando}
        >
          <Shuffle aria-hidden />
          Al azar
        </Button>
        <div className="ml-auto flex gap-2">
          <Button
            type="button"
            variant="outline"
            className="min-h-11"
            onClick={onCerrar}
            disabled={guardando}
          >
            Cancelar
          </Button>
          <Button
            type="submit"
            variant="accion"
            className="min-h-11 aria-disabled:opacity-60"
            aria-disabled={guardando || undefined}
            disabled={seleccion === perfil.avatarId}
          >
            {guardando && <Loader2 aria-hidden className="motion-safe:animate-spin" />}
            {guardando ? 'Guardando…' : 'Guardar'}
          </Button>
        </div>
      </DialogFooter>
    </form>
  );
}
