import {
  MessageSquare,
  Gamepad2,
  Bot,
  BarChart3,
  Wrench,
  Zap,
  BrainCircuit,
  LogIn,
} from 'lucide-react';
import Link from 'next/link';
import type { ReactNode } from 'react';

export default function Home() {
  return (
    <div className="flex min-h-screen flex-1 flex-col items-center bg-black font-sans">
      <main className="flex w-full max-w-7xl flex-1 flex-col items-center px-6 py-24 sm:px-16">
        {/* Hero */}
        <section className="mb-20 flex flex-col items-center gap-6 text-center">
          <p className="font-mono text-sm tracking-widest text-zinc-500 uppercase">
            Universidad del Valle
          </p>
          <h1 className="max-w-3xl text-4xl leading-tight font-bold tracking-tight text-white sm:text-5xl md:text-6xl">
            Plataforma Web 3D para la Simulación de Escenarios Psicológicos
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-400">
            Plataforma web 3D interactiva diseñada para la simulación de escenarios de práctica
            clínica orientada a estudiantes de psicología, integrando{' '}
            <strong className="text-zinc-200">pacientes virtuales autónomos</strong> con
            Inteligencia Artificial.
          </p>
          <div className="mt-4 flex flex-col gap-4 sm:flex-row">
            <span className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-sm font-medium text-black">
              <BrainCircuit className="h-5 w-5" /> Práctica Clínica Inmersiva
            </span>
            <span className="flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-zinc-300">
              Brayan Steven Narvaez Valdes
            </span>
          </div>
          <Link
            href="/login"
            className="mt-4 flex h-12 items-center justify-center gap-2 rounded-full bg-indigo-500 px-8 text-sm font-medium text-white transition-colors hover:bg-indigo-400 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-300"
          >
            <LogIn className="h-5 w-5" aria-hidden /> Ingresar como docente
          </Link>
        </section>

        {/* Grid decorativa (estilo Next.js) */}
        <div className="mb-16 w-full border-t border-zinc-800" />

        {/* Características */}
        <section className="mb-20 w-full">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Características Principales
            </h2>
            <p className="mt-2 text-zinc-400">
              Todo lo necesario para una simulación clínica realista
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <FeatureCard
              icon={<MessageSquare className="h-6 w-6" />}
              title="Interacción Conversacional con IA"
              description="Diálogo bidireccional en lenguaje natural. El paciente virtual asume roles clínicos gracias a System Prompts dinámicos construidos a partir de parámetros del docente."
            />
            <FeatureCard
              icon={<Gamepad2 className="h-6 w-6" />}
              title="Entorno 3D Inmersivo"
              description="Escenarios renderizados en React Three Fiber con modelos Low Poly, Instancing, Frustum Culling y compresión Draco para fluidez a 60 FPS en iGPU."
            />
            <FeatureCard
              icon={<Bot className="h-6 w-6" />}
              title="Animación Reactiva de NPCs"
              description="Pacientes virtuales con animaciones esqueletales y sincronización de estados (idle, procesando, hablando) que responden a la carga emocional del diálogo."
            />
            <FeatureCard
              icon={<BarChart3 className="h-6 w-6" />}
              title="Métricas Clínicas Automatizadas"
              description="Registro invisible del desempeño: duración de sesión, total de intervenciones, latencias de respuesta y proximidad espacial frente al paciente."
            />
            <FeatureCard
              icon={<Wrench className="h-6 w-6" />}
              title="Constructor Paramétrico de Casos"
              description="Interfaz para que docentes creen casos a medida, combinando entornos físicos, perfiles de síntomas, género y estados emocionales."
            />
            <FeatureCard
              icon={<Zap className="h-6 w-6" />}
              title="Rendimiento Optimizado"
              description="Accesible desde hardware de gama ofimática sin necesidad de software o equipo VR especializado. Post-procesado con Bloom y Vignette."
            />
          </div>
        </section>

        {/* Stack Tecnológico */}
        <div className="mb-16 w-full border-t border-zinc-800" />
        <section className="mb-20 w-full">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Stack Tecnológico</h2>
            <p className="mt-2 text-zinc-400">Entorno full-stack unificado en TypeScript</p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-4">
            <StackColumn
              title="Frontend & UI"
              items={['Next.js 16 (App Router)', 'React 19', 'Tailwind CSS & shadcn/ui', 'Zustand']}
            />
            <StackColumn
              title="Motor Web 3D"
              items={[
                'Three.js & R3F',
                '@react-three/drei',
                '@react-three/rapier',
                'Post-procesado (Bloom)',
              ]}
            />
            <StackColumn
              title="Backend"
              items={[
                'Next.js Route Handlers (BFF)',
                'Supabase (PostgreSQL)',
                'Supabase Auth & Storage',
                'Zod',
              ]}
            />
            <StackColumn
              title="Inteligencia Artificial"
              items={[
                'Google Gemini',
                'Vercel AI SDK',
                'System Prompts dinámicos',
                'Procesamiento de intención',
              ]}
            />
          </div>
        </section>

        {/* Escenarios */}
        <div className="mb-16 w-full border-t border-zinc-800" />
        <section className="mb-20 w-full">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Catálogo de Escenarios</h2>
            <p className="mt-2 text-zinc-400">
              6 escenarios predeterminados calibrados por nivel de dificultad
            </p>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <ScenarioCard
              code="E-01"
              title="Duelo y Pérdida"
              level="Clínico Básico"
              skill="Empatía y validación"
            />
            <ScenarioCard
              code="E-02"
              title="Ansiedad Generalizada"
              level="Clínico Intermedio"
              skill="Evaluación estructurada"
            />
            <ScenarioCard
              code="E-03"
              title="Episodio Depresivo Leve"
              level="Clínico Intermedio"
              skill="Evaluación de riesgo"
            />
            <ScenarioCard
              code="E-04"
              title="Crisis de Pánico Aguda"
              level="Clínico Avanzado"
              skill="Intervención en crisis"
            />
            <ScenarioCard
              code="E-05"
              title="Conflicto de Pareja"
              level="Cotidiano Básico"
              skill="Escucha activa"
            />
            <ScenarioCard
              code="E-06"
              title="Estrés Académico"
              level="Cotidiano Básico"
              skill="Afrontamiento"
            />
          </div>
        </section>

        {/* Arquitectura */}
        <div className="mb-16 w-full border-t border-zinc-800" />
        <section className="mb-20 w-full">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Arquitectura del Sistema</h2>
            <p className="mt-2 text-zinc-400">
              Basado en el Modelo C4, desacoplando responsabilidades
            </p>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-3">
            <ArchCard
              title="Cliente Web"
              description="Estado global con Zustand, renderizado del canvas 3D y procesamiento de inputs asíncronos sin bloquear el main thread."
            />
            <ArchCard
              title="Contenedor BFF"
              description="Route Handlers (/api/npc/chat y /api/metrics/save) orquestan las peticiones como proxy seguro a la IA."
            />
            <ArchCard
              title="Máquina de Estados NPC"
              description="Transiciones: inactivo → esperando_input → procesando → respondiendo → error_comunicacion."
            />
          </div>
        </section>

        {/* Instalación */}
        <div className="mb-16 w-full border-t border-zinc-800" />
        <section className="mb-20 w-full">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">
              Instalación y Configuración
            </h2>
            <p className="mt-2 text-zinc-400">Prerequisitos: Node.js v18+, Supabase, API Key LLM</p>
          </div>
          <div className="w-full space-y-4">
            <StepCard
              step={1}
              title="Clonar el repositorio"
              code="git clone https://github.com/stevenD18skz/psysim.git"
            />
            <StepCard step={2} title="Instalar dependencias" code="pnpm install" />
            <StepCard
              step={3}
              title="Configurar variables de entorno"
              code={`# Duplicar .env.example a .env.local\nNEXT_PUBLIC_SUPABASE_URL="tu_url"\nNEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY="sb_publishable_..."\nSUPABASE_SECRET_KEY="sb_secret_..."\nAI_API_KEY="api_key_de_gemini"`}
            />
            <StepCard
              step={4}
              title="Desplegar esquema de BD"
              code={`pnpm exec supabase link --project-ref <ref>
pnpm exec supabase db push`}
            />
            <StepCard step={5} title="Correr el entorno de desarrollo" code="pnpm dev" />
          </div>
        </section>

        {/* Pruebas */}
        <div className="mb-16 w-full border-t border-zinc-800" />
        <section className="mb-16 w-full">
          <div className="mb-12 flex flex-col items-center text-center">
            <h2 className="text-2xl font-bold text-white sm:text-3xl">Pruebas y Despliegue</h2>
          </div>
          <div className="grid grid-cols-1 gap-6 sm:grid-cols-2">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-sm font-semibold tracking-wider text-zinc-300 uppercase">
                Testing
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                <strong className="text-zinc-200">Vitest</strong> para lógica unitaria y{' '}
                <strong className="text-zinc-200">Playwright</strong> para tests E2E y flujos
                interactivos de simulación con mocking del WebGL.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="mb-3 text-sm font-semibold tracking-wider text-zinc-300 uppercase">
                Despliegue
              </h3>
              <p className="text-sm leading-relaxed text-zinc-400">
                Optimizado nativamente para <strong className="text-zinc-200">Vercel</strong>{' '}
                utilizando Serverless Functions para IA y Edge Network para activos GLTF.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="w-full border-t border-zinc-800 pt-8 pb-4 text-center">
          <p className="text-sm text-zinc-500">
            Trabajo Profesional — Universidad del Valle (2026)
          </p>
          <p className="mt-1 text-xs text-zinc-600">
            Escuela de Ingeniería de Sistemas y Computación • Programa Académico de Ingeniería de
            Sistemas
          </p>
        </div>
      </main>
    </div>
  );
}

/* ─── Componentes auxiliares ─── */

function FeatureCard({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50">
      <div className="mb-3 text-white">{icon}</div>
      <h3 className="mb-2 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}

function StackColumn({ title, items }: { title: string; items: string[] }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h3 className="mb-4 text-sm font-semibold tracking-wider text-zinc-300 uppercase">{title}</h3>
      <ul className="space-y-2">
        {items.map(item => (
          <li key={item} className="flex items-start gap-2 text-sm text-zinc-400">
            <span className="mt-1 shrink-0 text-zinc-600">•</span>
            {item}
          </li>
        ))}
      </ul>
    </div>
  );
}

function ScenarioCard({
  code,
  title,
  level,
  skill,
}: {
  code: string;
  title: string;
  level: string;
  skill: string;
}) {
  return (
    <div className="group rounded-xl border border-zinc-800 bg-zinc-950 p-5 transition-colors hover:border-zinc-700 hover:bg-zinc-900/50">
      <div className="mb-2 flex items-center gap-3">
        <span className="rounded bg-zinc-900 px-2 py-1 font-mono text-xs text-zinc-500">
          {code}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <div className="flex items-center gap-2 text-xs text-zinc-500">
        <span className="text-zinc-400">{level}</span>
        <span>·</span>
        <span>{skill}</span>
      </div>
    </div>
  );
}

function ArchCard({ title, description }: { title: string; description: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-zinc-700">
      <h3 className="mb-3 text-base font-semibold text-white">{title}</h3>
      <p className="text-sm leading-relaxed text-zinc-400">{description}</p>
    </div>
  );
}

function StepCard({ step, title, code }: { step: number; title: string; code: string }) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="mb-3 flex items-center gap-3">
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-white text-xs font-bold text-black">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <pre className="overflow-x-auto rounded-lg bg-zinc-900 p-3 font-mono text-xs whitespace-pre-wrap text-zinc-400">
        {code}
      </pre>
    </div>
  );
}
