# PsySim - Simulador de Entrevistas Psicológicas

Sistema de simulación inmersiva para entrenamiento de entrevistas psicológicas mediante interacción conversacional con NPCs (Personajes No Jugadores) en entornos 3D.

---

## 📋 Stack Tecnológico

### Frontend

| Capa       | Tecnología        | Versión     |
| ---------- | ----------------- | ----------- |
| Framework  | Next.js           | 16.2.10     |
| UI Library | React             | 19.2.4      |
| Motor 3D   | React Three Fiber | _Pendiente_ |
| Estilos    | Tailwind CSS      | 4.x         |
| Iconos     | Lucide React      | 1.24.0      |

### Backend

| Capa          | Tecnología          |
| ------------- | ------------------- |
| API Routes    | Next.js API Routes  |
| Validación    | Zod 3               |
| Autenticación | Supabase Auth       |
| Base de Datos | Supabase PostgreSQL |
| Storage       | Supabase Storage    |
| Tiempo Real   | Supabase Realtime   |

### DevOps & Calidad

| Aspecto   | Herramientas                            |
| --------- | --------------------------------------- |
| Linting   | ESLint + eslint-config-next             |
| Formato   | Prettier                                |
| Git Hooks | Husky + lint-staged                     |
| Testing   | _Vitest + Playwright (pendiente)_       |
| Monitoreo | _Sentry + Vercel Analytics (pendiente)_ |

---

## 🌿 Estrategia de Ramas (Git Workflow)

Este proyecto sigue el modelo **Git Flow** simplificado:

### Ramas Principales

| Rama      | Propósito                                                 | Protección            |
| --------- | --------------------------------------------------------- | --------------------- |
| `main`    | Código en producción                                      | ⛔ Solo PRs aprobados |
| `develop` | Integración continua, código estable para próximo release | ⛔ Solo PRs aprobados |

### Ramas de Trabajo

| Prefijo      | Propósito                           | Ejemplo                 |
| ------------ | ----------------------------------- | ----------------------- |
| `feature/*`  | Nuevas funcionalidades              | `feature/login-page`    |
| `fix/*`      | Corrección de bugs                  | `fix/auth-redirect`     |
| `hotfix/*`   | Correcciones urgentes en producción | `hotfix/critical-bug`   |
| `docs/*`     | Documentación                       | `docs/api-examples`     |
| `refactor/*` | Refactorización de código           | `refactor/auth-service` |

### Convenciones de Commits

Seguimos el formato **Conventional Commits**:

```
<tipo>(<alcance>): <descripción>

[cuerpo opcional]

[pie opcional]
```

**Tipos comunes:**

- `feat`: Nueva funcionalidad
- `fix`: Corrección de bug
- `docs`: Cambios en documentación
- `style`: Cambios de formato (espacios, comas, etc.)
- `refactor`: Refactorización de código
- `test`: Añadir o modificar tests
- `chore`: Tareas de mantenimiento

**Ejemplos:**

```bash
feat(auth): implementar login con Supabase
fix(api): corregir error en validación de sesión
docs(readme): actualizar instrucciones de instalación
```

### Flujo de Trabajo Recomendado

1. **Crear rama de feature:**

   ```bash
   git checkout develop
   git pull origin develop
   git checkout -b feature/nueva-funcionalidad
   ```

2. **Desarrollar y commitear:**

   ```bash
   git add .
   git commit -m "feat: descripción de la funcionalidad"
   ```

3. **Subir cambios:**

   ```bash
   git push origin feature/nueva-funcionalidad
   ```

4. **Crear Pull Request:**
   - Desde `feature/nueva-funcionalidad` hacia `develop`
   - Asignar reviewers
   - Asegurar que pasen los checks de CI

5. **Merge:**
   - Usar "Squash and merge" para features
   - Usar "Merge commit" para releases

---

## 🗂️ Estructura de Carpetas

```
psysim/
├── app/                          ← Rutas y layouts de Next.js (App Router)
│   ├── (auth)/
│   │   └── login/                ← P1: Pantalla de acceso del docente
│   ├── (protected)/              ← Grupo de rutas verificadas por middleware
│   │   ├── inicio/               ← Pantalla de inicio post-login
│   │   ├── configuracion/        ← P2: Configuración del escenario
│   │   ├── simulacion/           ← P5: Simulación activa (canvas 3D)
│   │   ├── resultados/           ← P7: Resumen de métricas
│   │   └── perfil/               ← Perfil del docente
│   ├── api/
│   │   ├── npc/chat/             ← Route Handler: Comunicación con API de IA
│   │   └── metrics/save/         ← Route Handler: Persistencia de métricas
│   └── layout.tsx                ← Layout raíz con fuentes y providers
│
├── components/
│   ├── 3d/                       ← Componentes exclusivos del entorno 3D
│   │   ├── SceneCanvas.tsx       ← Wrapper del Canvas de R3F
│   │   ├── SceneLoader.tsx       ← Cargador de modelos GLB del escenario
│   │   └── NPCModel.tsx          ← Modelo y animaciones del NPC
│   ├── ui/                       ← Componentes de interfaz 2D
│   │   ├── SimulationHUD.tsx     ← Barra de estado durante la simulación
│   │   ├── ConversationPanel.tsx ← Historial y campo de texto
│   │   └── MainNav.tsx           ← Barra de navegación principal
│   └── forms/                    ← Formularios reutilizables
│
├── lib/                          ← Utilidades y clientes de servicios
│   ├── supabase/
│   │   ├── client.ts             ← Cliente Supabase para el navegador
│   │   ├── server.ts             ← Cliente Supabase para Route Handlers
│   │   └── middleware.ts         ← Middleware de sesión
│   ├── prompt-builder.ts         ← Función de ensamblado del prompt del NPC
│   ├── metrics.ts                ← Función de cálculo de indicadores agregados
│   └── session.ts                ← Lógica de cierre de sesión de simulación
│
├── store/
│   └── index.ts                  ← Store Zustand con slices (auth, conversación, NPC, etc.)
│
├── schemas/                      ← Esquemas Zod compartidos
│   ├── npc-chat.schema.ts
│   └── metrics.schema.ts
│
├── types/                        ← Tipos TypeScript globales
│   └── index.ts
│
├── public/
│   ├── models/
│   │   ├── environments/         ← Modelos GLB de los entornos 3D
│   │   └── npcs/                 ← Modelos GLB de los NPC base
│   └── scenes/                   ← Archivos JSON de configuración por escenario
│
├── docs/
│   └── performance.md            ← Registro de mediciones de FPS
│
├── middleware.ts                 ← Verificación de sesión y rol en rutas protegidas
├── .env.example                  ← Plantilla de variables de entorno
├── .env.local                    ← Variables de entorno locales (no commitear)
├── .gitignore                    ← Archivos ignorados por Git
├── .prettierrc                   ← Configuración de Prettier
├── .prettierignore               ← Archivos ignorados por Prettier
├── .eslintrc.json                ← Configuración de ESLint
├── .lintstagedrc.json            ← Configuración de lint-staged
├── .husky/                       ← Git hooks
│   └── pre-commit                ← Hook pre-commit
├── next.config.ts                ← Configuración de Next.js
├── tsconfig.json                 ← Configuración de TypeScript
├── tailwind.config.ts            ← Configuración de Tailwind CSS
├── package.json                  ← Dependencias y scripts
└── README.md                     ← Este archivo
```

---

## 🚀 Scripts Disponibles

| Script                 | Descripción                                      |
| ---------------------- | ------------------------------------------------ |
| `npm run dev`          | Inicia el servidor de desarrollo con Turbopack   |
| `npm run build`        | Compila la aplicación para producción            |
| `npm run start`        | Inicia el servidor de producción                 |
| `npm run lint`         | Ejecuta ESLint para verificar código             |
| `npm run lint:fix`     | Ejecuta ESLint y corrige errores automáticamente |
| `npm run format`       | Formatea todo el código con Prettier             |
| `npm run format:check` | Verifica el formato sin modificar archivos       |

---

## 📝 Configuración de Variables de Entorno

1. Copia el archivo de ejemplo:

   ```bash
   cp .env.example .env.local
   ```

2. Completa las variables en `.env.local`:
   - `NEXT_PUBLIC_SUPABASE_URL`: URL de tu proyecto Supabase
   - `NEXT_PUBLIC_SUPABASE_ANON_KEY`: Clave anónima de Supabase
   - `SUPABASE_SERVICE_ROLE_KEY`: Clave de servicio de Supabase

---

## 🔒 Seguridad

- **Nunca** comitees el archivo `.env.local`
- La clave `SUPABASE_SERVICE_ROLE_KEY` solo debe usarse en el servidor
- Todas las rutas protegidas están verificadas por el middleware
- Encabezados de seguridad configurados en `next.config.ts`

---

## 👥 Contribución

1. Crea un fork del repositorio
2. Crea una rama feature: `git checkout -b feature/nueva-funcionalidad`
3. Commitea tus cambios siguiendo las convenciones
4. Push a la rama: `git push origin feature/nueva-funcionalidad`
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y confidencial. Todos los derechos reservados.

---

## 📞 Contacto

Para soporte técnico o consultas, contacta al equipo de desarrollo.

---

**Nota**: Este proyecto está en desarrollo activo. Algunas funcionalidades pueden no estar completamente implementadas.
