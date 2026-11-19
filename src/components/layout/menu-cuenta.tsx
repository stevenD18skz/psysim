'use client';

import {
  ClipboardList,
  FileText,
  FlaskConical,
  Globe,
  KeyRound,
  Loader2,
  LogOut,
  type LucideIcon,
  Palette,
  ShieldCheck,
} from 'lucide-react';
import { type Route } from 'next';
import Link from 'next/link';
import { type RefObject, useRef, useState } from 'react';

import { AvatarCuenta } from '@/components/layout/avatar-cuenta';
import { DialogoAvatarCuenta } from '@/components/layout/dialogo-avatar-cuenta';
import {
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
} from '@/components/ui/dropdown-menu';
import { ETIQUETA_ROL } from '@/lib/auth/routes';
import { cn } from '@/lib/utils';
import { type PerfilUsuario } from '@/types';

interface MenuCuentaProps {
  perfil: PerfilUsuario;
  botonCuenta: RefObject<HTMLButtonElement | null>;
  side?: 'top' | 'right' | 'bottom' | 'left';
  align?: 'start' | 'center' | 'end';
  sideOffset?: number;
  cerrando: boolean;
  onSalir: () => void;
  onCambiarContrasena?: () => void;
  onNavegar?: () => void;
}

const CLASE_ELEMENTO =
  'min-h-11 cursor-pointer gap-3 rounded-xl px-2.5 py-2 text-sm font-medium focus:bg-accent focus:text-accent-foreground';

/** Caja del ícono dentro de cada opción del menú para alinear ópticamente filas y enlaces. */
function IconoOpcion({ icono: Icono }: { icono: LucideIcon }) {
  return (
    <span
      aria-hidden
      className="flex size-8 shrink-0 items-center justify-center rounded-lg border border-border/70 bg-muted/65 text-muted-foreground transition-colors group-focus/dropdown-menu-item:border-salvia/30 group-focus/dropdown-menu-item:bg-card group-focus/dropdown-menu-item:text-accent-foreground"
    >
      <Icono className="size-4" />
    </span>
  );
}

/**
 * Contenido unificado del menú de cuenta para estudiante, docente y Administrador: cabecera con
 * veta de nogal e insignia de rol, ficha de identidad con avatar superpuesto y código institucional,
 * accesos según el rol y cierre de sesión destacado al pie.
 */
export function MenuCuenta({
  perfil,
  botonCuenta,
  side = 'bottom',
  align = 'end',
  sideOffset = 8,
  cerrando,
  onSalir,
  onCambiarContrasena,
  onNavegar,
}: MenuCuentaProps) {
  const esAdmin = perfil.rol === 'superadmin';
  const esEstudiante = perfil.rol === 'estudiante';
  const etiquetaRol = ETIQUETA_ROL[perfil.rol];
  const abrirAvatarAlCerrar = useRef(false);
  const [editandoAvatar, setEditandoAvatar] = useState(false);

  const menu = (
    <DropdownMenuContent
      side={side}
      align={align}
      sideOffset={sideOffset}
      collisionPadding={8}
      onCloseAutoFocus={evento => {
        if (abrirAvatarAlCerrar.current) {
          evento.preventDefault();
          abrirAvatarAlCerrar.current = false;
          setEditandoAvatar(true);
        }
      }}
      className="w-80 max-w-[calc(100vw-1rem)] rounded-2xl border border-border bg-popover p-0 text-popover-foreground shadow-[0_24px_48px_-18px_rgb(58_36_24/0.35)] ring-0"
    >
      <DropdownMenuLabel className="p-0 font-normal">
        <div className="flex h-13 items-start justify-end border-b border-laton/25 vetas-nogal px-3.5 pt-2.5">
          <span
            className={cn(
              'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[0.75rem] font-semibold',
              esAdmin
                ? 'border-laton/40 bg-[#26170f]/85 text-laton-texto'
                : 'border-lino/20 bg-[#26170f]/80 text-sidebar-foreground'
            )}
          >
            {esAdmin && <ShieldCheck className="size-3.5 shrink-0" aria-hidden />}
            {etiquetaRol}
          </span>
        </div>

        <div className="px-4 pb-3.5">
          <div className="-mt-7 mb-2.5 flex items-end justify-between gap-2">
            <AvatarCuenta
              avatarId={perfil.avatarId}
              nombre={perfil.nombre}
              className="size-13 border border-salvia/25 text-base font-bold shadow-[0_6px_16px_-6px_rgb(58_36_24/0.25)] ring-[3px] ring-popover"
            />
            {perfil.contrasenaTemporal && (
              <span className="inline-flex items-center gap-1 rounded-full bg-ambar-suave px-2.5 py-0.5 text-[0.75rem] font-semibold text-ambar">
                <KeyRound className="size-3 shrink-0" aria-hidden />
                Clave temporal
              </span>
            )}
          </div>

          <div className="flex flex-col gap-0.5">
            <p className="text-[1.0625rem] leading-snug font-bold tracking-[-0.015em] text-pretty text-foreground ancho-semiexpandido">
              {perfil.nombre}
            </p>
            <p className="truncate text-sm text-muted-foreground" title={perfil.correo}>
              {perfil.correo}
            </p>
          </div>

          <div className="mt-3 flex items-center justify-between gap-3 rounded-xl border border-border/80 bg-muted/45 px-3 py-2">
            <span className="min-w-0 truncate text-xs font-medium text-muted-foreground">
              Código institucional
            </span>
            <span className="shrink-0 font-mono text-xs font-medium tracking-wide text-foreground tabular-nums">
              {perfil.codigoInstitucional}
            </span>
          </div>
        </div>
      </DropdownMenuLabel>

      <DropdownMenuSeparator className="my-0 bg-border/80" />

      <div className="flex flex-col gap-0.5 p-1.5">
        <DropdownMenuItem
          className={CLASE_ELEMENTO}
          aria-haspopup="dialog"
          onSelect={() => {
            abrirAvatarAlCerrar.current = true;
          }}
        >
          <IconoOpcion icono={Palette} />
          <span className="min-w-0 flex-1 truncate">Cambiar avatar</span>
        </DropdownMenuItem>

        {esEstudiante && (
          <EnlaceMenuCuenta
            href="/practicas"
            etiqueta="Mis prácticas"
            icono={ClipboardList}
            onNavegar={onNavegar}
          />
        )}

        {/* El estudiante entra con Google: no tiene contraseña que cambiar. */}
        {esEstudiante === false && onCambiarContrasena && (
          <DropdownMenuItem className={CLASE_ELEMENTO} onSelect={onCambiarContrasena}>
            <IconoOpcion icono={KeyRound} />
            <span className="min-w-0 flex-1 truncate">Cambiar contraseña</span>
          </DropdownMenuItem>
        )}

        {esAdmin && (
          <EnlaceMenuCuenta
            href="/laboratorio"
            etiqueta="Herramientas de desarrollo"
            icono={FlaskConical}
            detalle="Pruebas"
            onNavegar={onNavegar}
          />
        )}

        <EnlaceMenuCuenta
          href="/"
          etiqueta="Ir a la página pública"
          icono={Globe}
          onNavegar={onNavegar}
        />

        <EnlaceMenuCuenta
          href="/privacidad"
          etiqueta="Aviso de privacidad"
          icono={FileText}
          onNavegar={onNavegar}
        />
      </div>

      <DropdownMenuSeparator className="my-0 bg-border/80" />

      <div className="p-1.5">
        <DropdownMenuItem
          variant="destructive"
          disabled={cerrando}
          className="min-h-11 cursor-pointer gap-3 rounded-xl px-2.5 py-2 text-sm font-medium focus:bg-destructive/10 focus:text-destructive"
          onSelect={evento => {
            evento.preventDefault();
            onSalir();
          }}
        >
          <span
            aria-hidden
            className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-destructive/10 text-destructive transition-colors group-focus/dropdown-menu-item:bg-destructive/15"
          >
            {cerrando ? <Loader2 className="size-4 animate-spin" /> : <LogOut className="size-4" />}
          </span>
          <span>Cerrar sesión</span>
        </DropdownMenuItem>
      </div>
    </DropdownMenuContent>
  );

  return (
    <>
      {menu}
      <DialogoAvatarCuenta
        perfil={perfil}
        abierto={editandoAvatar}
        onAbiertoCambia={setEditandoAvatar}
        botonCuenta={botonCuenta}
      />
    </>
  );
}

function EnlaceMenuCuenta({
  href,
  etiqueta,
  icono,
  detalle,
  onNavegar,
}: {
  href: Route;
  etiqueta: string;
  icono: LucideIcon;
  detalle?: string;
  onNavegar?: () => void;
}) {
  return (
    <DropdownMenuItem asChild className={CLASE_ELEMENTO}>
      <Link href={href} onClick={onNavegar}>
        <IconoOpcion icono={icono} />
        <span className="min-w-0 flex-1 truncate">{etiqueta}</span>
        {detalle && (
          <span className="shrink-0 rounded-full bg-muted px-2 py-0.5 text-[0.75rem] font-medium text-muted-foreground transition-colors group-focus/dropdown-menu-item:bg-card group-focus/dropdown-menu-item:text-accent-foreground">
            {detalle}
          </span>
        )}
      </Link>
    </DropdownMenuItem>
  );
}
