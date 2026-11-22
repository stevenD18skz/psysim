import { Lock, MessageSquareQuote } from 'lucide-react';

import { AvatarPaciente } from '@/components/pacientes/avatar-paciente';
import { ACTITUDES, NIVELES_RIESGO, SINTOMAS } from '@/lib/casos/opciones';
import { avatarDeEscena } from '@/lib/pacientes/avatar';
import { type CamposCaso } from '@/schemas/caso.schema';

/**
 * Vista previa en lenguaje cotidiano del paciente que se está diseñando: lo que el docente
 * decidió, ordenado como una ficha, sin la redacción técnica que recibe la IA. Lo que aún falta
 * se marca en su lugar.
 */
export function FichaPaciente({
  campos,
  consultorio,
}: {
  campos: CamposCaso;
  /** Ruta de la escena 3D seleccionada: actualiza el retrato del paciente en tiempo real. */
  consultorio?: string;
}) {
  const nombre = campos.nombre.trim();
  const edad = Number.isFinite(campos.edad) && campos.edad > 0 ? `${campos.edad} años` : null;
  const sintomas = [
    ...SINTOMAS.filter(s => campos.sintomas.includes(s.id)).map(s => s.texto),
    ...(campos.sintomasExtra.trim() ? [campos.sintomasExtra.trim()] : []),
  ];
  const actitudes = ACTITUDES.filter(a => campos.actitudes.includes(a.id));
  const riesgo = NIVELES_RIESGO.find(r => r.id === campos.riesgo) ?? NIVELES_RIESGO[0];
  const secretos = (campos.secretos ?? []).filter(s => s.dato.trim() && s.condicion.trim());

  return (
    <div className="flex flex-col gap-4 rounded-xl border border-border/60 bg-lino/60 p-4 text-sm">
      <div className="flex items-center gap-3">
        {consultorio && (
          <AvatarPaciente
            src={avatarDeEscena(consultorio)}
            nombre={nombre || 'Paciente'}
            className="size-12 shrink-0 text-sm ring-2 ring-card"
          />
        )}
        <div className="min-w-0">
          <p className="truncate text-lg leading-tight font-bold text-terracota">
            {nombre || <Falta>Nombre del paciente</Falta>}
          </p>
          <p className="text-muted-foreground">
            {[edad, campos.ocupacion.trim() || null].filter(Boolean).join(' · ') || (
              <Falta>Edad y ocupación</Falta>
            )}
          </p>
        </div>
      </div>
      <Bloque titulo="Qué le pasa">
        {campos.situacion.trim() || <Falta>La situación y el motivo de consulta</Falta>}
      </Bloque>
      {sintomas.length > 0 && <Bloque titulo="Cómo se siente">{sintomas.join(', ')}.</Bloque>}
      {actitudes.length > 0 && (
        <Bloque titulo="Cómo conversa">
          <ul className="flex flex-col gap-0.5">
            {actitudes.map(a => (
              <li key={a.id}>
                <span className="font-medium">{a.texto}:</span> {a.conducta}.
              </li>
            ))}
          </ul>
        </Bloque>
      )}
      {(campos.seAbreSi.trim() || campos.seCierraSi.trim()) && (
        <div className="grid gap-3 sm:grid-cols-2">
          {campos.seAbreSi.trim() && (
            <Bloque titulo="Se abre cuando">{campos.seAbreSi.trim()}</Bloque>
          )}
          {campos.seCierraSi.trim() && (
            <Bloque titulo="Se cierra cuando">{campos.seCierraSi.trim()}</Bloque>
          )}
        </div>
      )}
      {secretos.length > 0 && (
        <Bloque titulo="Lo que guarda">
          <ul className="flex flex-col gap-1">
            {secretos.map(s => (
              <li key={s.dato} className="flex gap-2">
                <Lock className="mt-0.5 size-3.5 shrink-0 text-muted-foreground" aria-hidden />
                <span>
                  {s.dato.trim()}{' '}
                  <span className="text-muted-foreground">— si {s.condicion.trim()}</span>
                </span>
              </li>
            ))}
          </ul>
        </Bloque>
      )}
      <Bloque titulo="Riesgo">{riesgo.etiqueta}</Bloque>
      <Bloque titulo="Lo primero que dirá">
        {campos.fraseApertura.trim() ? (
          <figure className="mt-1 flex items-start gap-2.5 rounded-lg bg-terracota-suave/70 px-3 py-2.5 text-foreground">
            <MessageSquareQuote className="mt-0.5 size-4 shrink-0 text-terracota" aria-hidden />
            <blockquote className="leading-relaxed">
              {campos.fraseApertura.trim().replace(/^["“«]|["”»]$/g, '')}
            </blockquote>
          </figure>
        ) : (
          <Falta>La frase de apertura</Falta>
        )}
      </Bloque>
    </div>
  );
}

function Bloque({ titulo, children }: { titulo: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-0.5">
      <p className="text-xs font-semibold tracking-[0.06em] text-muted-foreground uppercase ancho-condensado">
        {titulo}
      </p>
      <div className="leading-relaxed text-pretty">{children}</div>
    </div>
  );
}

function Falta({ children }: { children: string }) {
  return <span className="text-muted-foreground/80 italic">Falta: {children.toLowerCase()}</span>;
}
