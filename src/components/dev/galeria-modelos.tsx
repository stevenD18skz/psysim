'use client';

import dynamic from 'next/dynamic';

export interface ModeloGaleria {
  nombre: string;
  url: string;
}

const Lienzo = dynamic(() => import('./lienzo-galeria'), { ssr: false });

export function GaleriaModelos({ modelos }: { modelos: ModeloGaleria[] }) {
  return (
    <div className="relative h-dvh w-full bg-[#efe6da]">
      <p className="absolute top-3 left-3 z-10 rounded-lg bg-card/90 px-3 py-2 text-sm shadow">
        {modelos.length} modelos · normalizados a 1 m · la flecha roja marca +Z (frente) · usa
        <code className="mx-1">?carpeta=npcs</code>para filtrar
      </p>
      <Lienzo modelos={modelos} />
    </div>
  );
}
