import { BookOpen, CheckSquare, Clock, KeyRound, Monitor } from 'lucide-react';
import Link from 'next/link';

import { ControlCitado } from '@/components/comun/control-citado';
import { LogoGoogle } from '@/components/comun/logo-google';
import { IndiceManual } from '@/components/manual/indice-manual';

const SECCIONES = [
  ['requisitos', 'Requisitos y cuentas'],
  ['estudiante', 'Guía del estudiante'],
  ['docente', 'Guía del docente'],
  ['administrador', 'Guía del Administrador'],
  ['problemas', 'Problemas frecuentes'],
  ['privacidad', 'Privacidad y soporte'],
] as const;

const CONTROLES = [
  ['Caminar', 'W, A, S, D (o flechas arriba y abajo)'],
  ['Mirar alrededor', 'Ratón (o flechas izquierda y derecha)'],
  ['Liberar el ratón', 'Esc'],
  ['Ocultar o mostrar los controles', 'Botón del ojo o Ctrl + H'],
  [
    'Empezar a conversar',
    'Acércate al paciente y pulsa E, haz clic sobre él o usa «Conversar con…»',
  ],
  ['Llegar sin caminar', 'Ir directo a la conversación'],
  ['Enviar tu intervención', 'Enter (Shift + Enter inserta una línea)'],
  ['Volver a recorrer la sala', 'Volver a explorar'],
] as const;

const PROBLEMAS = [
  [
    '«Esta práctica no está disponible»',
    'El código venció, se anuló, ya se usó o pertenece a otro estudiante. Pídele uno nuevo a tu docente.',
  ],
  [
    '«Tu cuenta no está registrada en PsySim»',
    'Entraste con un correo que tu docente no ha registrado. Verifica que sea tu cuenta @correounivalle.edu.co.',
  ],
  [
    '«No pudimos cargar el consultorio»',
    'Pulsa «Continuar en modo texto». Si quieres recuperar la vista 3D, usa «Reintentar» o «Recargar» cuando aparezcan.',
  ],
  [
    'El paciente no responde',
    'Pulsa Reintentar. Si enviaste varios mensajes seguidos, espera un minuto (hay un límite de diez por minuto).',
  ],
  [
    'La práctica se cerró por inactividad',
    'Pasaron 10 minutos sin actividad. Tu docente revisará lo conversado; para practicar de nuevo necesitas otro código.',
  ],
  [
    'La práctica terminó sola por el tiempo',
    'Se cumplieron el tiempo de la consulta y los 5 minutos de margen para cerrarla. Todo quedó guardado para tu docente.',
  ],
  [
    'No encuentro la retroalimentación',
    'Aparece en Mis prácticas solo después de que tu docente la publique.',
  ],
] as const;

export function ContenidoManual({ enDialogo = false }: { enDialogo?: boolean }) {
  const prefijo = enDialogo ? 'manual-dialogo-' : '';
  return (
    <div className="grid min-w-0 gap-8 lg:grid-cols-[14rem_minmax(0,1fr)] lg:gap-10">
      <nav aria-label="En este manual" className="lg:sticky lg:top-6 lg:self-start">
        <IndiceManual secciones={SECCIONES} enDialogo={enDialogo} />
        {!enDialogo && (
          <div className="mt-6 flex flex-col gap-2 rounded-xl border bg-card p-3.5 text-xs">
            <p className="font-semibold text-foreground">Accesos rápidos</p>
            <Link
              href="/login"
              className="inline-flex min-h-8 items-center text-muted-foreground hover:text-foreground hover:underline"
            >
              Entrar con Google o docente
            </Link>
            <Link
              href="/privacidad"
              className="inline-flex min-h-8 items-center text-muted-foreground hover:text-foreground hover:underline"
            >
              Aviso de privacidad
            </Link>
          </div>
        )}
      </nav>

      <article className="flex min-w-0 flex-col gap-9 leading-relaxed [&_h2]:scroll-mt-6 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_h2]:focus-visible:outline-ring [&_h3]:text-base [&_h3]:font-bold [&_li]:ml-5 [&_li]:list-disc [&_section]:flex [&_section]:flex-col [&_section]:gap-3.5 [&_section>p]:max-w-[88ch] [&_section>ul]:max-w-[88ch] [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
        <div className="flex flex-col gap-3">
          {!enDialogo && (
            <h1 className="text-[2.15rem] leading-tight font-bold tracking-[-0.025em]">
              Manual de uso de PsySim
            </h1>
          )}
          <p className="max-w-[78ch] text-base text-muted-foreground">
            PsySim es una plataforma para practicar la entrevista clínica con un paciente simulado
            por inteligencia artificial dentro de un consultorio 3D. El docente asigna un caso con
            un código de acceso, el estudiante practica desde su computador y el docente revisa la
            conversación y publica una retroalimentación con nota.
          </p>
          {!enDialogo && (
            <p>
              Con la sesión iniciada, abre <ControlCitado>Manual de uso</ControlCitado> desde tu
              panel o desde el consultorio. Pulsa <ControlCitado>Atrás</ControlCitado> para cerrar
              el manual y seguir donde estabas.
            </p>
          )}
          <p className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm text-foreground">
            <BookOpen className="mt-0.5 size-4 shrink-0 text-salvia-oscuro" aria-hidden />
            <span>
              La plataforma no califica de forma automática: toda evaluación y comentario depende
              exclusivamente del docente.
            </span>
          </p>
        </div>

        <section aria-labelledby={prefijo + 'requisitos'}>
          <h2 id={prefijo + 'requisitos'} tabIndex={-1}>
            1. Requisitos y cuentas
          </h2>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <Monitor className="size-4 text-salvia" aria-hidden />
                Para practicar en 3D
              </p>
              <p className="text-muted-foreground">
                Computador con teclado y ratón, y Chrome, Edge o Firefox actualizados. La simulación
                no se abre en celulares ni tabletas.
              </p>
            </div>
            <div className="flex flex-col gap-1.5 rounded-xl border bg-card p-4 text-sm">
              <p className="flex items-center gap-2 font-semibold">
                <KeyRound className="size-4 text-salvia" aria-hidden />
                Acceso sin registro público
              </p>
              <p className="text-muted-foreground">
                El estudiante entra con su cuenta Google (@correounivalle.edu.co) tras ser
                registrado por su docente. El docente entra con correo y contraseña.
              </p>
            </div>
          </div>
          <p className="text-sm text-muted-foreground">
            Desde el celular puedes asignar casos, revisar transcripciones y leer la
            retroalimentación publicada.
          </p>
        </section>

        <section aria-labelledby={prefijo + 'estudiante'}>
          <h2 id={prefijo + 'estudiante'} tabIndex={-1}>
            2. Guía del estudiante
          </h2>

          <h3>2.1 Entrar y usar el código</h3>
          <ul>
            <li>
              Tu docente te envía un mensaje con un código de práctica (como{' '}
              <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">abc-defg-hij</code>
              ) y un enlace directo.
            </li>
            <li>
              Abre el enlace en un computador, o entra y elige{' '}
              <ControlCitado icono={<LogoGoogle />}>Continuar con Google</ControlCitado> con tu
              correo institucional.
            </li>
            <li>
              En <ControlCitado>Mis prácticas</ControlCitado>, escribe el código en{' '}
              <ControlCitado>Código de acceso</ControlCitado> y pulsa{' '}
              <ControlCitado>Usar el código y entrar</ControlCitado>.
            </li>
          </ul>
          <p className="rounded-xl bg-ambar-suave px-4 py-3 text-sm text-ambar">
            El código es personal, sirve una sola vez y tiene fecha de vencimiento. Si abres el
            enlace desde el celular, el código no se gasta: la plataforma te pedirá abrirlo en un
            computador.
          </p>

          <h3>2.2 Prepararte antes de entrar</h3>
          <p>
            Antes de ingresar al consultorio ves las instrucciones del caso: quién es el paciente,
            qué competencia vas a entrenar, las reglas de la práctica y, cuando aplica, un aviso de
            contenido sensible con recursos de apoyo. Marca{' '}
            <ControlCitado icono={<CheckSquare className="size-3.5 text-salvia-oscuro" />}>
              Leí el aviso de privacidad
            </ControlCitado>{' '}
            y pulsa <ControlCitado>Empezar la práctica</ControlCitado>.
          </p>
          <p className="flex items-start gap-2.5 rounded-xl border bg-card px-4 py-3 text-sm text-muted-foreground">
            <Clock className="mt-0.5 size-4 shrink-0 text-salvia" aria-hidden />
            <span>
              La consulta dura 15 minutos por defecto (o lo que defina tu docente). El reloj corre
              desde tu primera intervención, no mientras lees las instrucciones ni mientras caminas
              por la sala.
            </span>
          </p>

          <h3>2.3 Moverte y conversar en el consultorio 3D</h3>
          <p>
            En tu primera práctica verás una pista a la vez junto a los botones. Cada una aparece
            durante 10 segundos. Puedes volver a consultar los atajos con{' '}
            <ControlCitado>Controles</ControlCitado>.
          </p>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase ancho-condensado">
                <tr>
                  <th className="px-4 py-2.5">Acción</th>
                  <th className="px-4 py-2.5">Cómo hacerlo</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {CONTROLES.map(([accion, como]) => (
                  <tr key={accion}>
                    <td className="px-4 py-2.5 font-medium text-foreground">{accion}</td>
                    <td className="px-4 py-2.5 text-muted-foreground">{como}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <p>
            Si el consultorio tarda en cargar o falla, elige{' '}
            <ControlCitado>Continuar en modo texto</ControlCitado>. Puedes conversar con el
            paciente, consultar la hoja de remisión y tomar notas desde ese modo.
          </p>
          <ul>
            <li>
              El panel muestra si el paciente está «Escuchando» o «Pensando…». Mientras piensa no se
              puede enviar otro mensaje.
            </li>
            <li>
              Tienes a la mano la <ControlCitado>Hoja de remisión</ControlCitado>,{' '}
              <ControlCitado>Mis notas</ControlCitado> (privadas), dictado por voz si tu navegador
              lo admite y <ControlCitado>Ensayar otra respuesta</ControlCitado> para reformular una
              intervención (tu docente verá también esos intentos).
            </li>
            <li>
              En <ControlCitado>Ajustes del consultorio</ControlCitado> puedes desactivar el
              ambiente emocional y el sonido.
            </li>
            <li>
              Cuando falten 3 minutos verás el aviso correspondiente y, al cumplirse el tiempo, la
              invitación a cerrar. Cerrar la entrevista te corresponde a ti, como en consulta:
              resume, acuerda el siguiente paso y despídete.
            </li>
          </ul>

          <h3>2.4 Terminar y leer la retroalimentación</h3>
          <p>
            Al cerrar la entrevista, pulsa <ControlCitado>Terminar práctica</ControlCitado> y
            confirma. Cumplido el tiempo tienes 5 minutos más para cerrar; pasado ese margen, o tras
            10 minutos sin actividad, la práctica termina sola y guarda todo lo conversado. Después
            puedes escribir una reflexión personal y, cuando tu docente publique la revisión, verás
            en <ControlCitado>Mis prácticas</ControlCitado> la transcripción comentada frase por
            frase y la nota.
          </p>
        </section>

        <section aria-labelledby={prefijo + 'docente'}>
          <h2 id={prefijo + 'docente'} tabIndex={-1}>
            3. Guía del docente
          </h2>

          <h3>3.1 Registrar estudiantes y asignar prácticas</h3>
          <ul>
            <li>
              En <ControlCitado>Estudiantes</ControlCitado>, pulsa{' '}
              <ControlCitado>Registrar estudiante</ControlCitado> con su código institucional,
              nombre completo y correo institucional. Solo tú ves a los estudiantes que registras.
            </li>
            <li>
              En <ControlCitado>Asignar práctica</ControlCitado>, elige uno de los doce casos del
              catálogo o crea uno propio en <ControlCitado>Casos</ControlCitado>. Si lo deseas, abre{' '}
              <ControlCitado>Ajustar para esta práctica</ControlCitado> para calibrar apertura,
              expresión emocional o duración (10, 15, 20 o 30 minutos).
            </li>
            <li>
              Genera el código de acceso y envíalo al estudiante. Si va a practicar en tu propio
              equipo, usa <ControlCitado>Practicar en este equipo</ControlCitado>.
            </li>
          </ul>

          <h3>3.2 Crear un caso propio</h3>
          <p>
            En <ControlCitado>Casos</ControlCitado>, elige{' '}
            <ControlCitado>Crear caso nuevo</ControlCitado> o parte de un caso existente con{' '}
            <ControlCitado>Crear caso a partir de este</ControlCitado>. Todos los pacientes
            conservan reglas clínicas fijas que no se pueden quitar: no describen métodos de
            autolesión, no emiten diagnósticos ni recomiendan medicamentos.
          </p>

          <h3>3.3 Revisar y publicar retroalimentación</h3>
          <ul>
            <li>
              En <ControlCitado>Inicio</ControlCitado> o <ControlCitado>Revisiones</ControlCitado>{' '}
              abres las prácticas terminadas (no se muestra la conversación en vivo mientras
              practican).
            </li>
            <li>
              Con el ratón, selecciona una frase de una intervención, pulsa{' '}
              <ControlCitado>Comentar selección</ControlCitado> y guarda el comentario. Con teclado,
              abre <ControlCitado>Seleccionar frase para comentar</ControlCitado> debajo de la
              intervención, marca el fragmento con <kbd>Mayús</kbd> + flechas y pulsa{' '}
              <ControlCitado>Comentar frase</ControlCitado>.
            </li>
            <li>
              Completa el comentario general, asigna la nota (0,0 a 5,0) y pulsa{' '}
              <ControlCitado>Publicar</ControlCitado>. Puedes exportar un resumen CSV desde{' '}
              <ControlCitado>Revisiones</ControlCitado> o imprimir la hoja de notas desde la ficha
              del estudiante.
            </li>
          </ul>
        </section>

        <section aria-labelledby={prefijo + 'administrador'}>
          <h2 id={prefijo + 'administrador'} tabIndex={-1}>
            4. Guía del Administrador
          </h2>
          <p>
            Además de todas las funciones docentes, el Administrador gestiona las cuentas desde{' '}
            <ControlCitado>Docentes</ControlCitado>: crea cuentas con contraseña temporal, edita,
            desactiva o elimina accesos y supervisa el estado del proveedor de IA en su panel.
          </p>
        </section>

        <section aria-labelledby={prefijo + 'problemas'}>
          <h2 id={prefijo + 'problemas'} tabIndex={-1}>
            5. Problemas frecuentes
          </h2>
          <div className="overflow-x-auto rounded-xl border bg-card">
            <table className="w-full text-left text-sm">
              <thead className="border-b bg-muted/40 text-xs font-semibold text-muted-foreground uppercase ancho-condensado">
                <tr>
                  <th className="px-4 py-2.5">Situación</th>
                  <th className="px-4 py-2.5">Qué hacer</th>
                </tr>
              </thead>
              <tbody className="divide-y">
                {PROBLEMAS.map(([situacion, solucion]) => (
                  <tr key={situacion}>
                    <td className="px-4 py-3 align-top font-medium text-foreground">{situacion}</td>
                    <td className="px-4 py-3 text-muted-foreground">{solucion}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>

        <section aria-labelledby={prefijo + 'privacidad'}>
          <h2 id={prefijo + 'privacidad'} tabIndex={-1}>
            6. Privacidad y soporte
          </h2>
          <p>
            Las conversaciones se guardan para la revisión docente y se envían al proveedor de IA
            configurado para generar las respuestas del paciente. Evita escribir datos personales
            reales durante las prácticas. Consulta todos los detalles legales en el{' '}
            <Link
              href="/privacidad"
              className="font-medium text-foreground underline decoration-border underline-offset-4 hover:decoration-foreground"
            >
              aviso de privacidad y tratamiento de datos
            </Link>
            .
          </p>
        </section>
      </article>
    </div>
  );
}
