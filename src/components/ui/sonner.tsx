'use client';

import {
  CheckIcon,
  CircleXIcon,
  InfoIcon,
  Loader2Icon,
  TriangleAlertIcon,
  XIcon,
} from 'lucide-react';
import { Toaster as Sonner, type ToasterProps } from 'sonner';

// La aplicación usa un único tema claro, así que no depende de `next-themes`.
const Toaster = ({ ...props }: ToasterProps) => {
  return (
    <Sonner
      theme="light"
      className="avisos-psysim"
      containerAriaLabel="Avisos de PsySim"
      icons={{
        success: <CheckIcon className="size-4.5" aria-hidden />,
        info: <InfoIcon className="size-4.5" aria-hidden />,
        warning: <TriangleAlertIcon className="size-4.5" aria-hidden />,
        error: <CircleXIcon className="size-4.5" aria-hidden />,
        loading: <Loader2Icon className="size-4.5 motion-safe:animate-spin" aria-hidden />,
        close: <XIcon className="size-4" aria-hidden />,
      }}
      toastOptions={{
        closeButtonAriaLabel: 'Cerrar aviso',
        classNames: {
          toast: 'aviso-psysim',
        },
      }}
      {...props}
    />
  );
};

export { Toaster };
