import { MessageSquare, Gamepad2, Bot, BarChart3, Wrench, Zap, BrainCircuit } from "lucide-react";
import type { ReactNode } from "react";

export default function Home() {
  return (
    <div className="flex flex-col flex-1 items-center bg-black font-sans min-h-screen">
      <main className="flex flex-1 w-full max-w-7xl flex-col items-center py-24 px-6 sm:px-16">
        {/* Hero */}
        <section className="flex flex-col items-center text-center mb-20 gap-6">
          <p className="text-sm font-mono tracking-widest uppercase text-zinc-500">
            Universidad del Valle
          </p>
          <h1 className="text-4xl sm:text-5xl md:text-6xl font-bold leading-tight tracking-tight text-white max-w-3xl">
            Plataforma Web 3D para la Simulación de Escenarios Psicológicos
          </h1>
          <p className="max-w-2xl text-lg leading-8 text-zinc-400">
            Plataforma web 3D interactiva diseñada para la simulación de
            escenarios de práctica clínica orientada a estudiantes de
            psicología, integrando{" "}
            <strong className="text-zinc-200">
              pacientes virtuales autónomos
            </strong>{" "}
            con Inteligencia Artificial.
          </p>
          <div className="flex flex-col sm:flex-row gap-4 mt-4">
            <span className="flex h-12 items-center justify-center gap-2 rounded-full bg-white px-6 text-black text-sm font-medium">
              <BrainCircuit className="w-5 h-5" /> Práctica Clínica Inmersiva
            </span>
            <span className="flex h-12 items-center justify-center rounded-full border border-white/15 px-6 text-sm font-medium text-zinc-300">
              Brayan Steven Narvaez Valdes
            </span>
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-lg bg-zinc-900 border border-zinc-800 px-5 py-3 font-mono text-sm text-zinc-400">
            <span className="text-zinc-600 select-none">▲ ~</span>
            <span>npm run dev</span>
          </div>
        </section>

        {/* Grid decorativa (estilo Next.js) */}
        <div className="w-full border-t border-zinc-800 mb-16" />

        {/* Características */}
        <section className="w-full mb-20">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Características Principales
            </h2>
            <p className="text-zinc-400 mt-2">
              Todo lo necesario para una simulación clínica realista
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
            <FeatureCard
              icon={<MessageSquare className="w-6 h-6" />}
              title="Interacción Conversacional con IA"
              description="Diálogo bidireccional en lenguaje natural. El paciente virtual asume roles clínicos gracias a System Prompts dinámicos construidos a partir de parámetros del docente."
            />
            <FeatureCard
              icon={<Gamepad2 className="w-6 h-6" />}
              title="Entorno 3D Inmersivo"
              description="Escenarios renderizados en React Three Fiber con modelos Low Poly, Instancing, Frustum Culling y compresión Draco para fluidez a 60 FPS en iGPU."
            />
            <FeatureCard
              icon={<Bot className="w-6 h-6" />}
              title="Animación Reactiva de NPCs"
              description="Pacientes virtuales con animaciones esqueletales y sincronización de estados (idle, procesando, hablando) que responden a la carga emocional del diálogo."
            />
            <FeatureCard
              icon={<BarChart3 className="w-6 h-6" />}
              title="Métricas Clínicas Automatizadas"
              description="Registro invisible del desempeño: duración de sesión, total de intervenciones, latencias de respuesta y proximidad espacial frente al paciente."
            />
            <FeatureCard
              icon={<Wrench className="w-6 h-6" />}
              title="Constructor Paramétrico de Casos"
              description="Interfaz para que docentes creen casos a medida, combinando entornos físicos, perfiles de síntomas, género y estados emocionales."
            />
            <FeatureCard
              icon={<Zap className="w-6 h-6" />}
              title="Rendimiento Optimizado"
              description="Accesible desde hardware de gama ofimática sin necesidad de software o equipo VR especializado. Post-procesado con Bloom y Vignette."
            />
          </div>
        </section>

        {/* Stack Tecnológico */}
        <div className="w-full border-t border-zinc-800 mb-16" />
        <section className="w-full mb-20">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Stack Tecnológico
            </h2>
            <p className="text-zinc-400 mt-2">
              Entorno full-stack unificado en TypeScript
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
            <StackColumn
              title="Frontend & UI"
              items={[
                "Next.js 15 (App Router)",
                "React 18",
                "Tailwind CSS & shadcn/ui",
                "Zustand",
              ]}
            />
            <StackColumn
              title="Motor Web 3D"
              items={[
                "Three.js & R3F",
                "@react-three/drei",
                "@react-three/rapier",
                "Post-procesado (Bloom)",
              ]}
            />
            <StackColumn
              title="Backend"
              items={[
                "Next.js API Routes (BFF)",
                "Supabase (PostgreSQL)",
                "Supabase Auth & Storage",
                "Zod",
              ]}
            />
            <StackColumn
              title="Inteligencia Artificial"
              items={[
                "Gemini 1.5 Pro",
                "GPT-4o",
                "System Prompts dinámicos",
                "Procesamiento de intención",
              ]}
            />
          </div>
        </section>

        {/* Escenarios */}
        <div className="w-full border-t border-zinc-800 mb-16" />
        <section className="w-full mb-20">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Catálogo de Escenarios
            </h2>
            <p className="text-zinc-400 mt-2">
              6 escenarios predeterminados calibrados por nivel de dificultad
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
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
        <div className="w-full border-t border-zinc-800 mb-16" />
        <section className="w-full mb-20">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Arquitectura del Sistema
            </h2>
            <p className="text-zinc-400 mt-2">
              Basado en el Modelo C4, desacoplando responsabilidades
            </p>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-6">
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
        <div className="w-full border-t border-zinc-800 mb-16" />
        <section className="w-full mb-20">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Instalación y Configuración
            </h2>
            <p className="text-zinc-400 mt-2">
              Prerequisitos: Node.js v18+, Supabase, API Key LLM
            </p>
          </div>
          <div className="w-full space-y-4">
            <StepCard
              step={1}
              title="Clonar el repositorio"
              code="git clone https://github.com/tu-usuario/simulador-psicologia-3d.git"
            />
            <StepCard
              step={2}
              title="Instalar dependencias"
              code="npm install"
            />
            <StepCard
              step={3}
              title="Configurar variables de entorno"
              code={`# Duplicar .env.example a .env.local\nNEXT_PUBLIC_SUPABASE_URL="tu_url"\nNEXT_PUBLIC_SUPABASE_ANON_KEY="tu_key"\nSUPABASE_SERVICE_KEY="tu_service_key"\nAI_API_BASE_URL="endpoint_llm"\nAI_API_KEY="api_key_privada"`}
            />
            <StepCard
              step={4}
              title="Desplegar esquema de BD"
              code="# Ejecutar /docs/database/schema.sql en Supabase SQL Editor"
            />
            <StepCard
              step={5}
              title="Correr el entorno de desarrollo"
              code="npm run dev"
            />
          </div>
        </section>

        {/* Pruebas */}
        <div className="w-full border-t border-zinc-800 mb-16" />
        <section className="w-full mb-16">
          <div className="flex flex-col items-center text-center mb-12">
            <h2 className="text-2xl sm:text-3xl font-bold text-white">
              Pruebas y Despliegue
            </h2>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6">
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Testing
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                <strong className="text-zinc-200">Vitest</strong> para lógica
                unitaria y <strong className="text-zinc-200">Playwright</strong>{" "}
                para tests E2E y flujos interactivos de simulación con mocking
                del WebGL.
              </p>
            </div>
            <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
              <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-3">
                Despliegue
              </h3>
              <p className="text-sm text-zinc-400 leading-relaxed">
                Optimizado nativamente para{" "}
                <strong className="text-zinc-200">Vercel</strong> utilizando
                Serverless Functions para IA y Edge Network para activos GLTF.
              </p>
            </div>
          </div>
        </section>

        {/* Footer */}
        <div className="w-full border-t border-zinc-800 pt-8 pb-4 text-center">
          <p className="text-sm text-zinc-500">
            Trabajo Profesional — Universidad del Valle (2026)
          </p>
          <p className="text-xs text-zinc-600 mt-1">
            Escuela de Ingeniería de Sistemas y Computación • Programa
            Académico de Ingeniería de Sistemas
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
      <div className="text-white mb-3">{icon}</div>
      <h3 className="text-base font-semibold text-white mb-2">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StackColumn({
  title,
  items,
}: {
  title: string;
  items: string[];
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6">
      <h3 className="text-sm font-semibold text-zinc-300 uppercase tracking-wider mb-4">
        {title}
      </h3>
      <ul className="space-y-2">
        {items.map((item) => (
          <li
            key={item}
            className="text-sm text-zinc-400 flex items-start gap-2"
          >
            <span className="text-zinc-600 mt-1 shrink-0">•</span>
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
      <div className="flex items-center gap-3 mb-2">
        <span className="text-xs font-mono text-zinc-500 bg-zinc-900 px-2 py-1 rounded">
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

function ArchCard({
  title,
  description,
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-6 transition-colors hover:border-zinc-700">
      <h3 className="text-base font-semibold text-white mb-3">{title}</h3>
      <p className="text-sm text-zinc-400 leading-relaxed">{description}</p>
    </div>
  );
}

function StepCard({
  step,
  title,
  code,
}: {
  step: number;
  title: string;
  code: string;
}) {
  return (
    <div className="rounded-xl border border-zinc-800 bg-zinc-950 p-5">
      <div className="flex items-center gap-3 mb-3">
        <span className="flex items-center justify-center w-7 h-7 rounded-full bg-white text-black text-xs font-bold shrink-0">
          {step}
        </span>
        <h3 className="text-sm font-semibold text-white">{title}</h3>
      </div>
      <pre className="text-xs text-zinc-400 bg-zinc-900 rounded-lg p-3 overflow-x-auto font-mono whitespace-pre-wrap">
        {code}
      </pre>
    </div>
  );
}
