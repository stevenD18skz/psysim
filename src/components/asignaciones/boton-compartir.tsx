'use client';

import { ChevronDown, Copy, Mail, MessageCircle, Share2 } from 'lucide-react';
import { useSyncExternalStore } from 'react';
import { toast } from 'sonner';

import { Button } from '@/components/ui/button';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';

const sinSuscripcion = () => () => {};

/** `true` si el navegador abre el menú nativo de compartir (móviles, Edge/Chrome en Windows…). */
function usePuedeCompartirNativo() {
  return useSyncExternalStore(
    sinSuscripcion,
    () => typeof navigator.share === 'function',
    () => false
  );
}

/**
 * Comparte un mensaje por WhatsApp, Gmail o la app de correo. Donde el navegador lo
 * permite, ofrece además el menú nativo del sistema con el resto de aplicaciones.
 */
export function BotonCompartir({
  asunto,
  mensaje,
  correo,
  etiqueta = 'Compartir código',
  size = 'default',
  variant = 'outline',
  textoCopiable,
  className,
}: {
  asunto: string;
  mensaje: string;
  /** Destinatario del correo, si se conoce. */
  correo?: string | null;
  etiqueta?: string;
  size?: 'default' | 'sm';
  variant?: 'outline' | 'default';
  /** Si se pasa, añade «Copiar mensaje completo» dentro del menú de compartir. */
  textoCopiable?: string;
  className?: string;
}) {
  const nativo = usePuedeCompartirNativo();
  const texto = encodeURIComponent(mensaje);
  const para = encodeURIComponent(correo ?? '');
  const tema = encodeURIComponent(asunto);

  const opciones = [
    {
      nombre: 'WhatsApp',
      icono: <MessageCircle className="text-[#25D366]" aria-hidden />,
      href: `https://wa.me/?text=${texto}`,
    },
    {
      nombre: 'Gmail',
      icono: <Mail className="text-[#EA4335]" aria-hidden />,
      href: `https://mail.google.com/mail/?view=cm&fs=1&to=${para}&su=${tema}&body=${texto}`,
    },
    {
      nombre: 'App de correo',
      icono: <Mail aria-hidden />,
      href: `mailto:${para}?subject=${tema}&body=${texto}`,
    },
  ];

  const compartirNativo = async () => {
    try {
      await navigator.share({ title: asunto, text: mensaje });
    } catch {
      // El usuario cerró el menú del sistema: no es un error.
    }
  };

  const copiarMensaje = async () => {
    if (!textoCopiable) return;
    try {
      await navigator.clipboard.writeText(textoCopiable);
      toast.success('Mensaje copiado.');
    } catch {
      toast.error('No pudimos copiar el mensaje. Selecciona el enlace y cópialo a mano.');
    }
  };

  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button type="button" variant={variant} size={size} className={className}>
          <Share2 aria-hidden />
          {etiqueta}
          <ChevronDown className="opacity-60" aria-hidden />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-56">
        <DropdownMenuLabel>Enviar por</DropdownMenuLabel>
        {textoCopiable && (
          <>
            <DropdownMenuItem onSelect={() => void copiarMensaje()}>
              <Copy aria-hidden />
              Copiar mensaje completo
            </DropdownMenuItem>
            <DropdownMenuSeparator />
          </>
        )}
        {opciones.map(opcion => (
          <DropdownMenuItem key={opcion.nombre} asChild>
            <a
              href={opcion.href}
              target={opcion.href.startsWith('mailto:') ? undefined : '_blank'}
              rel="noopener noreferrer"
            >
              {opcion.icono}
              {opcion.nombre}
            </a>
          </DropdownMenuItem>
        ))}
        {nativo && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onSelect={compartirNativo}>
              <Share2 aria-hidden />
              Más opciones…
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
