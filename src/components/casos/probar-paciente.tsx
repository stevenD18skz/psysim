'use client';

import { Loader2, MessageCircle, RotateCcw, Send } from 'lucide-react';
import { useEffect, useRef, useState, useTransition } from 'react';

import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { probarPaciente } from '@/lib/casos/actions';
import { cn } from '@/lib/utils';
import { type MensajeHistorial } from '@/schemas/npc-chat.schema';

interface ProbarPacienteProps {
  /** Prompt que se está redactando (sin las reglas fijas, que añade el servidor). */
  prompt: string;
  nombre: string;
  /** El prompt aún no es válido (muy corto o vacío): la prueba se bloquea. */
  promptValido: boolean;
}

/**
 * Chat de prueba dentro del constructor: el docente escribe como si fuera el estudiante y ve
 * cómo responde el paciente con el prompt actual. No se guarda nada.
 */
export function ProbarPaciente({ prompt, nombre, promptValido }: ProbarPacienteProps) {
  const [mensajes, setMensajes] = useState<MensajeHistorial[]>([]);
  const [texto, setTexto] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [enviando, startTransition] = useTransition();
  const lista = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Siempre al último mensaje (el desplazamiento suave lo da la clase `scroll-smooth`).
    if (lista.current) lista.current.scrollTop = lista.current.scrollHeight;
  }, [mensajes, enviando]);

  const enviar = () => {
    const mensaje = texto.trim();
    if (!mensaje || enviando || !promptValido) return;

    const historial = mensajes;
    setMensajes([...historial, { rol: 'user', contenido: mensaje }]);
    setTexto('');
    setError(null);

    startTransition(async () => {
      const resultado = await probarPaciente({ prompt, nombre, mensaje, historial });
      if (!resultado.ok) {
        setError(resultado.error);
        return;
      }
      setMensajes(actuales => [
        ...actuales,
        { rol: 'assistant', contenido: resultado.datos.respuesta },
      ]);
    });
  };

  return (
    <section aria-label="Probar al paciente" className="flex flex-col gap-3 rounded-xl border p-3">
      <div className="flex items-center gap-2">
        <MessageCircle className="size-4 text-primary" aria-hidden />
        <h3 className="text-sm font-semibold">Probar al paciente</h3>
        {mensajes.length > 0 && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="ml-auto"
            onClick={() => {
              setMensajes([]);
              setError(null);
            }}
          >
            <RotateCcw aria-hidden />
            Reiniciar
          </Button>
        )}
      </div>

      <div
        ref={lista}
        role="log"
        aria-live="polite"
        className="flex max-h-64 min-h-24 flex-col gap-2 overflow-y-auto scroll-smooth rounded-lg bg-muted/40 p-2"
      >
        {mensajes.length === 0 && (
          <p className="m-auto px-4 text-center text-xs text-muted-foreground">
            Escribe como lo haría el estudiante para ver cómo responde {nombre || 'el paciente'} con
            este texto. Los mensajes de prueba no se guardan.
          </p>
        )}
        {mensajes.map((m, i) => (
          <p
            key={i}
            className={cn(
              'max-w-[85%] rounded-xl px-3 py-1.5 text-sm',
              m.rol === 'user'
                ? 'self-end bg-primary text-primary-foreground'
                : 'self-start border bg-card'
            )}
          >
            {m.contenido}
          </p>
        ))}
        {enviando && (
          <p className="flex items-center gap-1.5 self-start text-xs text-muted-foreground">
            <Loader2 className="size-3 animate-spin" aria-hidden />
            {nombre || 'El paciente'} está pensando…
          </p>
        )}
      </div>

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}

      <div className="flex gap-2">
        <label htmlFor="mensaje-prueba" className="sr-only">
          Mensaje de prueba
        </label>
        <Input
          id="mensaje-prueba"
          value={texto}
          onChange={e => setTexto(e.target.value)}
          onKeyDown={e => {
            // Enter envía el mensaje sin enviar el formulario del caso.
            if (e.key === 'Enter') {
              e.preventDefault();
              enviar();
            }
          }}
          placeholder={promptValido ? 'Escribe un mensaje…' : 'Completa el caso para probarlo'}
          maxLength={1000}
          disabled={!promptValido || enviando}
        />
        <Button
          type="button"
          size="icon-lg"
          onClick={enviar}
          disabled={!promptValido || enviando || texto.trim() === ''}
          aria-label="Enviar mensaje de prueba"
        >
          <Send aria-hidden />
        </Button>
      </div>
    </section>
  );
}
