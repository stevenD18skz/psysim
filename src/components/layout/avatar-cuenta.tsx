import {
  Aperture,
  CloudSun,
  Compass,
  Feather,
  Flower2,
  Leaf,
  type LucideIcon,
  MoonStar,
  Mountain,
  Orbit,
  Shell,
  Sparkles,
  Sprout,
  Sun,
  Waves,
  Wind,
} from 'lucide-react';

import { type AvatarId } from '@/lib/avatares/catalogo';
import { iniciales } from '@/lib/nombres';
import { cn } from '@/lib/utils';

const ESTILOS: Record<AvatarId, { icono: LucideIcon; fondo: string; tinta: string }> = {
  brote: { icono: Sprout, fondo: '#cad9b7', tinta: '#304a2a' },
  sol: { icono: Sun, fondo: '#efd398', tinta: '#5e3810' },
  marea: { icono: Waves, fondo: '#b5d9d6', tinta: '#234d50' },
  luna: { icono: MoonStar, fondo: '#414963', tinta: '#f1edff' },
  flor: { icono: Flower2, fondo: '#ebc7d1', tinta: '#6b3245' },
  brujula: { icono: Compass, fondo: '#6e5039', tinta: '#ffebc9' },
  montana: { icono: Mountain, fondo: '#cfdae6', tinta: '#324760' },
  horizonte: { icono: CloudSun, fondo: '#f4d4b7', tinta: '#70442d' },
  orbita: { icono: Orbit, fondo: '#d9cdea', tinta: '#4f386a' },
  concha: { icono: Shell, fondo: '#e5d4bd', tinta: '#634532' },
  hoja: { icono: Leaf, fondo: '#3e5a44', tinta: '#edf5e8' },
  destello: { icono: Sparkles, fondo: '#eddbad', tinta: '#604815' },
  prisma: { icono: Aperture, fondo: '#b9c9dd', tinta: '#334f6d' },
  brisa: { icono: Wind, fondo: '#3e6868', tinta: '#e5f4f3' },
  pluma: { icono: Feather, fondo: '#d8d2cd', tinta: '#544043' },
};

/** Adorno de identidad. El control o texto que lo acompaña aporta el nombre accesible. */
export function AvatarCuenta({
  avatarId,
  nombre,
  className,
}: {
  avatarId: AvatarId | null;
  nombre: string;
  className?: string;
}) {
  const estilo = avatarId ? ESTILOS[avatarId] : undefined;
  const Icono = estilo?.icono;

  return (
    <span
      aria-hidden
      className={cn(
        'inline-flex shrink-0 items-center justify-center rounded-full bg-salvia-suave font-semibold tracking-tight text-salvia-oscuro',
        className
      )}
      style={estilo && { backgroundColor: estilo.fondo, color: estilo.tinta }}
    >
      {Icono ? <Icono className="size-[55%]!" /> : iniciales(nombre)}
    </span>
  );
}
