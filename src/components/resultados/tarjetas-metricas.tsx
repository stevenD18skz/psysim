import { formatearDuracion } from '@/lib/conversacion/resumen';
import { formatearDistancia, formatearLatencia } from '@/lib/sesiones/resultados';
import { type MetricasSesion } from '@/types';

interface Tarjeta {
  id: string;
  titulo: string;
  valor: string;
  ayuda: string;
}

function tarjetasDe(metricas: MetricasSesion): Tarjeta[] {
  const tarjetas: Tarjeta[] = [
    {
      id: 'intervenciones',
      titulo: 'Total de intervenciones',
      valor: String(metricas.totalMensajes),
      ayuda: 'Veces que le hablaste al paciente',
    },
    {
      id: 'latencia-promedio',
      titulo: 'Latencia promedio',
      valor: formatearLatencia(metricas.latenciaPromedioMs),
      ayuda:
        metricas.latenciaPromedioMs === null
          ? 'El paciente aún no respondió'
          : 'Lo que tardó en responderte, en promedio',
    },
    {
      id: 'latencia-maxima',
      titulo: 'Latencia máxima',
      valor: formatearLatencia(metricas.latenciaMaximaMs),
      ayuda:
        metricas.latenciaMaximaMs === null
          ? 'El paciente aún no respondió'
          : 'La respuesta que más tardó',
    },
    {
      id: 'duracion',
      titulo: 'Duración de la sesión',
      valor:
        metricas.duracionSegundos === null ? '—' : formatearDuracion(metricas.duracionSegundos),
      ayuda:
        metricas.duracionSegundos === null
          ? 'La práctica no llegó a empezar'
          : 'Desde que empezaste hasta que terminaste',
    },
  ];
  if (metricas.proximidadPromedioM !== null) {
    tarjetas.push({
      id: 'cercania',
      titulo: 'Cercanía al paciente',
      valor: formatearDistancia(metricas.proximidadPromedioM),
      ayuda: 'Distancia media a la que estuviste',
    });
  }
  return tarjetas;
}

/**
 * HU-21 · T02 — Indicadores de la práctica. Cada tarjeta es una región con su título como nombre
 * accesible, para que un lector de pantalla las recorra como bloques.
 */
export function TarjetasMetricas({
  metricas,
  para,
}: {
  metricas: MetricasSesion;
  para: 'docente' | 'estudiante';
}) {
  const tarjetas = tarjetasDe(metricas);
  return (
    <section aria-labelledby="indicadores-titulo" className="flex flex-col gap-3">
      <div className="flex flex-col gap-1">
        <h2 id="indicadores-titulo" className="text-xl font-bold tracking-[-0.015em]">
          Indicadores de la práctica
        </h2>
        <p className="max-w-2xl text-sm text-muted-foreground">
          {para === 'estudiante'
            ? 'Son datos de la sesión, no una calificación: tu docente evalúa la conversación.'
            : 'Son datos de la sesión, no una calificación: la evaluación la hace la retroalimentación.'}
          {metricas.origen === 'reconstruidas' &&
            ' La práctica se cerró sin enviar las métricas desde el navegador: se calcularon con la conversación guardada.'}
        </p>
      </div>
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-[repeat(auto-fit,minmax(11rem,1fr))]">
        {tarjetas.map(({ id, titulo, valor, ayuda }) => (
          <section
            key={id}
            aria-labelledby={`tarjeta-${id}`}
            className="flex flex-col gap-1 rounded-xl border bg-card p-4"
          >
            <h3 id={`tarjeta-${id}`} className="text-sm text-muted-foreground ancho-condensado">
              {titulo}
            </h3>
            <p className="text-3xl font-semibold ancho-semiexpandido tabular-nums">{valor}</p>
            <p className="text-xs text-muted-foreground">{ayuda}</p>
          </section>
        ))}
      </div>
    </section>
  );
}
