'use client';

import Image from 'next/image';
import { useState } from 'react';

import { cn } from '@/lib/utils';

interface AvatarPacienteProps {
  /** Ruta pública del rostro (ver `avatarDeEscena`). Sin ruta o si no carga, se muestran iniciales. */
  src: string | null;
  nombre: string;
  /** Tamaño y tipografía de las iniciales, p. ej. `size-12 text-base`. */
  className?: string;
}

function iniciales(nombre: string) {
  const partes = nombre.trim().split(/\s+/);
  return ((partes[0]?.[0] ?? '') + (partes[1]?.[0] ?? '')).toUpperCase();
}

/**
 * Avatar circular del paciente: su rostro y, si la imagen falta o no carga, las iniciales sobre
 * el color de marca. Es decorativo (el nombre siempre está al lado), por eso la imagen no lleva alt.
 */
export function AvatarPaciente({ src, nombre, className }: AvatarPacienteProps) {
  const [fallo, setFallo] = useState(false);
  const mostrarImagen = src !== null && !fallo;

  return (
    <span
      aria-hidden
      className={cn(
        'relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full bg-primary font-semibold text-primary-foreground',
        className
      )}
    >
      {mostrarImagen ? (
        <Image
          src={src}
          alt=""
          fill
          sizes="96px"
          onError={() => setFallo(true)}
          className="object-cover"
        />
      ) : (
        iniciales(nombre)
      )}
    </span>
  );
}
