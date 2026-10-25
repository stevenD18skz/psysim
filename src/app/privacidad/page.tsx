import { ArrowLeft } from 'lucide-react';
import type { Metadata } from 'next';
import Link from 'next/link';

import { MarcaPsySim } from '@/components/layout/marca-psysim';
import { PiePagina } from '@/components/layout/pie-pagina';

export const metadata: Metadata = {
  title: 'Aviso de privacidad',
  description:
    'Qué datos trata PsySim, para qué, quién los ve y cómo ejercer tus derechos según la Ley 1581 de 2012.',
  alternates: { canonical: '/privacidad' },
};

/** Dato que el autor debe confirmar con la universidad antes de publicar el aviso definitivo. */
function PorConfirmar({ children }: { children: React.ReactNode }) {
  return (
    <span className="rounded bg-ambar-suave px-1.5 py-0.5 text-[0.9em] text-ambar">
      Por confirmar: {children}
    </span>
  );
}

const SECCIONES = [
  ['responsable', 'Quién es responsable'],
  ['datos', 'Qué datos tratamos'],
  ['finalidad', 'Para qué los usamos'],
  ['quien', 'Quién los ve'],
  ['proveedores', 'Con quién compartimos datos'],
  ['sensibles', 'Sobre los temas sensibles'],
  ['conservacion', 'Cuánto tiempo los conservamos'],
  ['derechos', 'Tus derechos'],
  ['autorizacion', 'Tu autorización'],
  ['cambios', 'Cambios en este aviso'],
] as const;

/**
 * Aviso de privacidad (Ley 1581 de 2012 y Decreto 1377 de 2013): qué datos se tratan, para qué,
 * quién los ve, con qué proveedores y cómo ejercer los derechos. Es un borrador honesto: lo que
 * debe validar la universidad está marcado a la vista.
 */
export default function PrivacidadPage() {
  return (
    <div className="flex min-h-dvh flex-col bg-background">
      <header className="vetas-nogal text-sidebar-foreground">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-4 px-5 py-5 sm:px-8">
          <Link
            href="/"
            className="rounded-lg outline-hidden focus-visible:ring-2 focus-visible:ring-laton"
          >
            <MarcaPsySim className="h-8" />
          </Link>
          <Link
            href="/"
            className="ml-auto flex items-center gap-1.5 rounded-md px-2 py-1 text-sm text-sidebar-foreground/85 hover:text-sidebar-foreground focus-visible:ring-2 focus-visible:ring-laton focus-visible:outline-hidden"
          >
            <ArrowLeft className="size-4" aria-hidden />
            Volver
          </Link>
        </div>
      </header>

      <main className="mx-auto grid w-full max-w-5xl flex-1 gap-10 px-5 py-10 sm:px-8 lg:grid-cols-[13rem_minmax(0,1fr)] lg:py-14">
        <nav aria-labelledby="indice" className="lg:sticky lg:top-8 lg:self-start">
          <p id="indice" className="mb-2 text-sm font-semibold">
            En esta página
          </p>
          <ol className="flex flex-col gap-1 text-sm text-muted-foreground">
            {SECCIONES.map(([id, titulo], i) => (
              <li key={id}>
                <a
                  href={`#${id}`}
                  className="inline-flex min-h-7 items-center hover:text-foreground hover:underline"
                >
                  {i + 1}. {titulo}
                </a>
              </li>
            ))}
          </ol>
        </nav>

        <article className="flex max-w-[68ch] flex-col gap-8 leading-relaxed [&_h2]:scroll-mt-8 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:tracking-[-0.015em] [&_li]:ml-5 [&_li]:list-disc [&_section]:flex [&_section]:flex-col [&_section]:gap-3 [&_ul]:flex [&_ul]:flex-col [&_ul]:gap-1.5">
          <div className="flex flex-col gap-3">
            <h1 className="text-[2.2rem] leading-tight font-bold tracking-[-0.025em]">
              Cómo usamos tus datos
            </h1>
            <p className="text-sm text-muted-foreground">
              Versión 1 · Última actualización: <PorConfirmar>fecha</PorConfirmar>
            </p>
            <p className="rounded-xl bg-ambar-suave px-4 py-3 text-sm text-ambar">
              Este aviso es un borrador del trabajo de grado. Lo marcado «Por confirmar» se validará
              con el director del proyecto y la Universidad del Valle.
            </p>
          </div>

          <section aria-labelledby="resumen" className="rounded-xl border bg-card p-5">
            <h2 id="resumen">En resumen</h2>
            <ul>
              <li>
                PsySim guarda tu nombre, código y correo institucional, tus conversaciones con el
                paciente simulado y la retroalimentación de tu docente.
              </li>
              <li>
                Tu docente lee tus conversaciones cuando terminas. Nadie más del curso las ve.
              </li>
              <li>
                Cada mensaje que escribes se envía a Google (Gemini) para generar la respuesta del
                paciente.
              </li>
              <li>No vendemos tus datos ni los usamos para publicidad.</li>
              <li>
                Puedes conocer, corregir o pedir que se borren tus datos escribiendo a{' '}
                <PorConfirmar>correo de contacto</PorConfirmar>.
              </li>
            </ul>
          </section>

          <section>
            <h2 id="responsable">1. Quién es responsable</h2>
            <p>
              PsySim es un trabajo de grado de la Universidad del Valle, desarrollado por Brayan
              Steven Narváez Valdés. Responsable del tratamiento:{' '}
              <PorConfirmar>el autor, la Universidad del Valle o ambos</PorConfirmar>. Contacto:{' '}
              <PorConfirmar>correo de contacto</PorConfirmar>.
            </p>
          </section>

          <section>
            <h2 id="datos">2. Qué datos tratamos</h2>
            <p>Si eres estudiante:</p>
            <ul>
              <li>
                Los que registra tu docente: nombre completo, código institucional y correo
                @correounivalle.edu.co.
              </li>
              <li>
                Los que comparte Google al iniciar sesión: nombre, correo y, si existe, foto de
                perfil.
              </li>
              <li>
                Tu práctica: los mensajes que escribes, las respuestas del paciente, la fecha y
                hora, la duración, el número de intervenciones, los tiempos de respuesta y la
                emoción que el sistema asigna a cada respuesta del paciente.
              </li>
              <li>
                Tu última actividad en la simulación, para cerrar la práctica tras 10 minutos sin
                uso.
              </li>
              <li>
                Tu reflexión, si decides escribirla al terminar la práctica (es opcional y puedes
                corregirla o borrarla). La lee tu docente al revisar.
              </li>
              <li>
                La retroalimentación de tu docente: comentario general, comentarios sobre tus frases
                y nota.
              </li>
            </ul>
            <p>
              Si eres docente o administrador: nombre, correo, código institucional, rol, estado de
              la cuenta y los casos que creas.
            </p>
            <p>
              En tu navegador (no en nuestros servidores) guardamos tus preferencias: sonido,
              ambiente emocional, si ya viste la guía de controles y la fecha en que aceptaste este
              aviso. También usamos cookies técnicas para mantener tu sesión iniciada.{' '}
              <PorConfirmar>si se usa alguna herramienta de analítica</PorConfirmar>.
            </p>
          </section>

          <section>
            <h2 id="finalidad">3. Para qué los usamos</h2>
            <ul>
              <li>Que practiques la entrevista clínica con el paciente simulado.</li>
              <li>
                Que tu docente revise tu práctica, te deje comentarios y una nota, e imprima tu
                informe de notas.
              </li>
              <li>
                Controlar el acceso: que cada código y cada práctica solo los use su estudiante.
              </li>
              <li>Mantener la plataforma funcionando y segura.</li>
            </ul>
            <p>
              <PorConfirmar>
                si se usarán datos anonimizados en el documento del trabajo de grado o en la prueba
                con usuarios (con consentimiento aparte)
              </PorConfirmar>{' '}
              No usamos tus datos para publicidad ni los vendemos.
            </p>
          </section>

          <section>
            <h2 id="quien">4. Quién los ve</h2>
            <ul>
              <li>
                <strong>Tu docente</strong> (quien te registró y te asignó la práctica): tus datos,
                tus conversaciones cuando terminas, tus métricas, tu reflexión (si la escribiste) y
                la retroalimentación. No ve el chat en vivo.
              </li>
              <li>
                <strong>El administrador de PsySim:</strong> gestiona las cuentas de los docentes y
                ve cifras de actividad. Como responsable técnico, puede acceder a la base de datos
                para mantener la plataforma.
              </li>
              <li>
                <strong>Otros estudiantes:</strong> nunca ven tus datos ni tus conversaciones.
              </li>
            </ul>
          </section>

          <section>
            <h2 id="proveedores">5. Con quién compartimos datos para que el servicio funcione</h2>
            <ul>
              <li>
                <strong>Google (Gemini):</strong> recibe cada mensaje de la conversación y las
                instrucciones del caso para generar la respuesta del paciente.{' '}
                <PorConfirmar>
                  el plan de la API y si Google puede usar estos datos para mejorar sus productos
                </PorConfirmar>
              </li>
              <li>
                <strong>Google (inicio de sesión):</strong> confirma tu identidad cuando eliges
                «Continuar con Google».
              </li>
              <li>
                <strong>Supabase:</strong> aloja la base de datos y gestiona las cuentas.
              </li>
              <li>
                <strong>Vercel:</strong> aloja la aplicación web.
              </li>
            </ul>
            <p>
              Estos proveedores pueden tener servidores fuera de Colombia.{' '}
              <PorConfirmar>
                regiones de los servidores y base legal de la transferencia
              </PorConfirmar>
            </p>
            <p>
              Te recomendamos no escribir en la conversación datos personales reales, ni tuyos ni de
              otras personas.
            </p>
          </section>

          <section>
            <h2 id="sensibles">6. Sobre los temas sensibles</h2>
            <p>
              Los casos tratan temas de salud mental, pero son simulados: lo que dice el paciente no
              es información sobre ti. Lo que escribes es tu intervención como entrevistador. Si
              decides contar experiencias personales, quedarán en la conversación que lee tu
              docente.
            </p>
          </section>

          <section>
            <h2 id="conservacion">7. Cuánto tiempo los conservamos</h2>
            <p>
              Tus datos y tus prácticas se conservan mientras tu docente te tenga registrado. Si tu
              docente te elimina, se borran tus prácticas, conversaciones y retroalimentación, y tu
              cuenta si ningún otro docente te tiene registrado.{' '}
              <PorConfirmar>
                plazo máximo de conservación al terminar el periodo académico
              </PorConfirmar>
            </p>
          </section>

          <section>
            <h2 id="derechos">8. Tus derechos</h2>
            <p>Según la Ley 1581 de 2012 y el Decreto 1377 de 2013, puedes:</p>
            <ul>
              <li>Conocer, actualizar y corregir tus datos.</li>
              <li>Pedir prueba de la autorización que diste.</li>
              <li>Saber cómo se han usado tus datos.</li>
              <li>
                Revocar la autorización o pedir que se borren tus datos, cuando no exista un deber
                legal o académico de conservarlos.
              </li>
              <li>Presentar quejas ante la Superintendencia de Industria y Comercio.</li>
              <li>Acceder gratis a tus datos.</li>
            </ul>
            <p>
              Para ejercerlos, escribe a <PorConfirmar>correo de contacto</PorConfirmar> con tu
              nombre, código y la solicitud. La ley fija un máximo de 10 días hábiles para responder
              consultas y de 15 días hábiles para reclamos.
            </p>
          </section>

          <section>
            <h2 id="autorizacion">9. Tu autorización</h2>
            <p>
              Antes de tu primera práctica te pedimos marcar «Leí el aviso de privacidad y acepto
              que mi conversación se procese con Google Gemini y que la lea mi docente». Esa
              aceptación se guarda en tu navegador. Si no quieres aceptarla, no empieces la práctica
              y habla con tu docente.{' '}
              <PorConfirmar>
                si la universidad exige una autorización registrada o firmada
              </PorConfirmar>
            </p>
          </section>

          <section>
            <h2 id="cambios">10. Cambios en este aviso</h2>
            <p>
              Si cambiamos este aviso, actualizaremos la fecha de arriba y, si el cambio es
              importante, te lo pediremos aceptar de nuevo antes de tu siguiente práctica.
            </p>
          </section>
        </article>
      </main>

      <PiePagina />
    </div>
  );
}
