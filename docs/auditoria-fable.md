# Auditoría de PsySim por pasadas (Fable)

## Estado

### Correcciones del 17 de noviembre de 2026

- La base compartida tiene registradas `20261116010000`, `20261116020000` y `20261117010000`.
  Supabase Auth exige la contraseña actual y la reautenticación de sesiones antiguas al cambiarla.
  También está habilitado el aviso por correo de contraseña cambiada.
- El modo presencial guarda la ventana de entrega antes de cerrar la sesión del docente. Si falla
  ese registro, el equipo sigue con el docente. Si la cuenta ya tiene Google vinculado, el
  Administrador debe crear otra cuenta para sustituirla por una con otro correo.
- La auditoría original y su plan quedan abajo como registro de los hallazgos del 16 de noviembre.

### Auditoría del 16 de noviembre

| Dato             | Valor                                                                        |
| ---------------- | ---------------------------------------------------------------------------- |
| Pasadas hechas   | 5 de 5                                                                       |
| Pasada siguiente | Ninguna: auditoría cerrada. El resumen y el plan están en «Cierre», al final |
| Fecha            | 16 de noviembre de 2026                                                      |
| Código revisado  | `develop` en `555b2bf` (pasadas 1 a 4) y `8f21831` (pasada 5)                |
| Hallazgos        | Crítica 0 · Alta 0 · Media 5 · Baja 19                                       |

Reglas de la auditoría: solo lectura, sin subagentes, un hallazgo por causa raíz y todo hallazgo
medio o alto comprobado en el código y en la base remota. `CONFIRMADO` = comprobado en el código o
en la base; `PLAUSIBLE` = el código lo permite, pero falta una comprobación que no se pudo hacer sin
escribir.

### Para retomar

- Documentos leídos: `CLAUDE.md`, `README.md`, `docs/estado-del-proyecto.md`,
  `docs/auditoria-seguridad.md` y `docs/orquestador.md`. **Aplazados para ahorrar contexto:**
  `DESIGN.md` y `docs/guia-de-redaccion.md` (pasada 5).
- La base se consultó con la Management API en modo `read_only`. La prueba de RLS suplantando a un
  estudiante necesitó el rol `postgres`: se corrió en una transacción declarada
  `set transaction read only`, solo con `select`.
- **Cabos para las pasadas siguientes** (no son hallazgos todavía):
  - **Pasada 2 (resueltos).** Las reglas fijas se añaden al conversar (`componerInstrucciones`),
    no al asignar: insertar `asignacion.prompt_sistema` por la API no las quita. El tiempo de
    consulta lo hace cumplir `/api/npc/chat` con el reloj de la base. Lo de reformular tras un
    cierre y lo que depende del navegador quedó en P2-06.
  - **Pasada 3 (resueltos).** Desactivar a un docente lo bloquea en Auth pero no anula sus
    códigos (P1-05, confirmado). El Administrador usa la clave secreta a propósito, tras
    `requerirDocente` y con rol `superadmin`. La cuenta de un estudiante sin registros la borra
    `eliminarCuentaSinRegistros`. El perfil clínico no lleva lo que guarda el paciente.
    `probarPaciente` exige docente y cuenta en el límite por minuto. El docente ve los intentos
    reformulados.
  - **Pasada 4 (resueltos).** El esquema de la escena solo admite rutas `.glb` relativas y un
    personaje de una lista cerrada: una escena no puede cargar recursos ajenos.
  - **Pasada 5 (resueltos).** Los cabos de accesibilidad, código sin uso, documentación
    desfasada y pruebas débiles quedaron en P5-01 a P5-07. No se levantó la aplicación ni se
    corrieron los E2E: falta `.env.test.local` en este equipo.
  - **Cierre (hecho).** La sección «Cierre», al final, tiene el resumen ejecutivo, el plan de
    corrección por lotes y el impacto en el documento de grado. Lo siguiente es ejecutar el
    lote 0, que no necesita código.
  - **Cómo se consultó la base (por si hay que repetirlo):** con la Management API de Supabase,
    igual que `scripts/aplicar-migracion.mjs` pero enviando `read_only: true`, y el
    `SUPABASE_ACCESS_TOKEN` de `.env.local`. Los scripts usados estaban en la carpeta temporal de
    la sesión y no se conservan.

---

## Pasada 1: autenticación y base de datos

### Alcance

Revisado:

- `src/proxy.ts`, `src/lib/supabase/*` (4 archivos), `src/lib/auth/*` (sin los tests),
  `src/app/auth/callback/route.ts` y las dos páginas de `src/app/dev/`.
- **Base remota (`afqofsneoblsjjdvktsu`), que es la que manda:** las 18 tablas y la vista, las 30
  políticas RLS, los privilegios de tabla y de columna de `anon`, `authenticated` y `PUBLIC`
  (leídos de `pg_class.relacl` y `pg_attribute.attacl`), el cuerpo de las 33 funciones, los
  triggers, las restricciones, los privilegios por defecto, `pg_cron`, las publicaciones de
  Realtime, los buckets y las políticas de Storage.
- **Configuración de Supabase Auth** del proyecto (registro, proveedores, enlaces de retorno,
  caducidad, ajustes de contraseña) y esquemas que expone la API.
- **Comparación del esquema remoto con las migraciones**, hecha con un script: las 31 migraciones
  están registradas; el cuerpo de las 33 funciones remotas es idéntico a su última definición en
  `supabase/migrations/`; las políticas coinciden (la única diferencia es un nombre que Postgres
  recorta a 63 bytes, «…sus sesiones terminada»). **No hay deriva.**
- `src/lib/seguridad.test.ts`, para saber qué reglas vigila de verdad.

Fuera de esta pasada: las Server Actions de cada dominio (pasada 3), las rutas de `src/app/api`
(pasada 2), el modo presencial (pasada 3) y los tests de `src/lib/auth`. De las migraciones solo se
leyeron enteras `20261031010000` y la cabecera de `20261115020000`; el resto se verificó contra el
estado remoto, que es su resultado.

### Hallazgos

#### P1-01 · Media · La contraseña se puede cambiar sin la actual, saltándose la aplicación

- **Dónde:** `src/lib/auth/actions.ts:159-206` (`cambiarContrasena`) y
  `src/lib/auth/verificar-contrasena.ts`; ajustes de Supabase Auth
  `security_update_password_require_current_password = false` y
  `security_update_password_require_reauthentication = false`; cookies de sesión con
  `httpOnly: false` (valor por defecto de `@supabase/ssr`, que `src/lib/supabase/server.ts:27-31`
  y `src/lib/supabase/proxy.ts:33-40` no cambian).
- **Causa raíz:** los dos controles de la revisión del 7 de noviembre («pide la contraseña actual» y
  «el estudiante no puede crear contraseña») viven solo en la Server Action. El cambio real lo hace
  Supabase Auth, y su API (`PUT /auth/v1/user`) acepta una contraseña nueva de cualquiera que
  presente un token de sesión válido. Es la misma lección de la auditoría del 29 de octubre: lo que
  la base o Auth permiten, se puede hacer sin pasar por la interfaz.
- **Escenario:** una persona encuentra abierta la sesión de un docente (o del Administrador) en un
  computador. Abre las herramientas del navegador, copia el token de la cookie `sb-…-auth-token` y
  envía `{ "password": "…" }` a la API de Auth con la clave publicable, que está en el código del
  sitio. Desde ahí entra cuando quiera con correo y contraseña: lee todas las transcripciones de
  ese docente y puede publicar retroalimentación a su nombre. Nadie se entera: el aviso por correo
  de cambio de contraseña está desactivado (`mailer_notifications_password_changed_enabled` en
  `false`) y las sesiones no caducan (P1-04). Con un estudiante, el mismo camino le crea la «segunda
  puerta» que la acción quería impedir, y `/login` lo deja entrar con ella
  (`src/lib/auth/actions.ts:83-86`).
- **Estado:** `CONFIRMADO` por la configuración leída del proyecto y por el código. No se ejecutó el
  cambio de contraseña, porque sería escribir en el proyecto compartido; el comportamiento descrito
  es el normal de Supabase Auth con esos dos ajustes apagados.
- **Arreglo propuesto:**
  1. En Supabase (Auth → Providers → Email) activar «Require current password when updating» y
     «Secure password change». Antes, leer en la documentación de Supabase cómo se envía la
     contraseña actual en `updateUser` y ajustar `cambiarContrasena`, que hoy la comprueba aparte.
     Probarlo con una cuenta `@psysim.test`, también el primer cambio de una contraseña temporal.
  2. Activar el aviso por correo de «contraseña cambiada».
  3. Opcional, para cerrar la segunda puerta del estudiante: que la DAL rechace una sesión de
     estudiante cuyo método de entrada (`amr` del JWT) sea `password`, salvo `@psysim.test`.
- **Esfuerzo:** S (pasos 1 y 2) · M (paso 3). Sin migración.

#### P1-02 · Baja · Una función nueva nace ejecutable por `authenticated`, y el test solo vigila una

- **Dónde:** privilegios por defecto remotos de `postgres` en `public` para funciones:
  `postgres=X; authenticated=X; service_role=X`.
  `supabase/migrations/20261031010000_cierra_permisos_por_defecto.sql:19-24` quitó `anon` y
  `20261107010000_revision_7_noviembre.sql:150-151` quitó `PUBLIC`, pero nadie quitó
  `authenticated`. `src/lib/seguridad.test.ts:89-96` comprueba el `revoke` de una sola función
  (`guardar_metricas_cierre`) en una sola migración.
- **Causa raíz:** el cierre de una función `security definer` depende de acordarse de escribir
  `revoke … from authenticated`. Dos documentos dicen lo contrario: `docs/estado-del-proyecto.md`
  («toda función nueva que use `authenticated` necesita su `grant` explícito») y `CLAUDE.md` («los
  tests vigilan que toda función `security definer` tiene `revoke execute`»).
- **Escenario:** se añade una función solo para el servidor (como `guardar_intercambio_ia`) con
  `revoke … from public, anon`, que es lo que hacen la mayoría de las migraciones. `pnpm check`
  pasa. Cualquier estudiante puede llamarla con `supabase.rpc(...)` desde la consola y, si la
  función confía en sus parámetros porque «solo la llama el servidor», escribe mensajes del
  paciente o cambia datos de otra práctica.
- **Estado:** `CONFIRMADO` como riesgo latente. **Hoy no hay ninguna función expuesta de más:** las
  33 se revisaron una por una en la base remota (ver «Lo que está bien»).
- **Arreglo propuesto:**
  - Migración «solo añade» (afecta solo a funciones futuras, se puede aplicar ya):

    ```sql
    alter default privileges for role postgres in schema public
      revoke execute on functions from authenticated;
    ```

  - Generalizar el test: por cada función `security definer` de las migraciones, exigir un
    `revoke execute … from public, anon` y, además, o un `grant … to authenticated` explícito o un
    `revoke … from … authenticated`.
  - Corregir las dos frases de `CLAUDE.md` y de `docs/estado-del-proyecto.md`.
- **Esfuerzo:** S.

#### P1-03 · Baja · La secuencia `peticion_ia_id_seq` conserva permisos para `anon`

- **Dónde:** base remota: `anon` y `authenticated` tienen `USAGE`, `SELECT` y `UPDATE` sobre
  `public.peticion_ia_id_seq`. La tabla nació en
  `supabase/migrations/20261019010000_limite_peticiones_ia.sql:14-15` con los privilegios por
  defecto de entonces; `20261031010000` cerró la tabla y los valores por defecto, pero no la
  secuencia ya creada.
- **Causa raíz:** `revoke all on table` no alcanza a la secuencia de una columna `identity`. El test
  «el rol anónimo no recibe permisos» (`src/lib/seguridad.test.ts:53-56`) busca `grant … to anon`
  en el texto de las migraciones y no ve lo que se hereda por defecto.
- **Escenario:** ninguno practicable hoy: la API REST no expone secuencias ni `nextval`/`setval`, y
  GraphQL está desactivado. Es la única excepción real a «nada concedido a `anon`», una afirmación
  que el documento de grado y `CLAUDE.md` hacen sin matices.
- **Estado:** `CONFIRMADO` en la base remota (también con `has_sequence_privilege` como estudiante).
- **Arreglo propuesto:** migración «solo añade» (nadie usa la secuencia fuera de
  `reservar_peticion_ia`, que es `security definer`):
  `revoke all on sequence public.peticion_ia_id_seq from anon, authenticated;`
- **Esfuerzo:** S. Puede ir en la misma migración de P1-02.

#### P1-04 · Baja · La sesión no caduca y su cookie se puede leer desde JavaScript

- **Dónde:** Supabase Auth con `sessions_timebox = 0` y `sessions_inactivity_timeout = 0`; cookie de
  sesión de 400 días con `httpOnly: false` (valores por defecto de `@supabase/ssr`);
  `src/lib/supabase/server.ts:27-31` y `src/lib/supabase/proxy.ts:33-40` escriben las opciones tal
  como llegan. `src/lib/supabase/client.ts` (el cliente del navegador) no se importa en ningún
  archivo.
- **Causa raíz:** se conservan los valores por defecto de la biblioteca, pensados para aplicaciones
  que usan Supabase desde el navegador. PsySim solo lo usa desde el servidor.
- **Escenario:** (a) un estudiante entra con Google en un computador de sala fuera del modo
  presencial y no cierra sesión: su cuenta queda abierta para quien llegue después, sin límite de
  tiempo. (b) Si algún día entrara un XSS, el atacante se lleva el token y lo usa desde su equipo;
  hoy la única barrera es la CSP.
- **Estado:** `CONFIRMADO` (configuración remota y constantes de la biblioteca instalada).
- **Arreglo propuesto:** añadir `httpOnly: true` al escribir las cookies en los dos `setAll` y
  borrar `client.ts` (o dejar escrito por qué ya no puede usarse). Probar el inicio con Google, el
  refresco de sesión y el cierre. La caducidad de sesiones es del plan Pro de Supabase: declararla
  como limitación junto a 2FA y contraseñas filtradas.
- **Esfuerzo:** S.

#### P1-05 · Baja · Un código se puede canjear aunque su docente esté desactivado

- **Dónde:** `canjear_codigo`, `supabase/migrations/20261115020000_tiempo_de_consulta.sql:90-160`.
- **Causa raíz:** la función comprueba que el código sea del estudiante, que no esté usado, anulado
  ni vencido, pero no que la cuenta del docente (`asignacion.docente_id`) siga activa.
- **Escenario:** el Administrador desactiva a un docente que dejó códigos vigentes (hasta 31 días).
  Sus estudiantes los canjean y practican: consumen la IA y crean prácticas que nadie va a revisar.
- **Estado:** `CONFIRMADO` en la pasada 3: la función no lo impide y `cambiarEstadoDocente`
  (`src/lib/admin/actions.ts:202-236`) tampoco anula los códigos pendientes.
- **Arreglo propuesto:** en `canjear_codigo`, responder `anulado` si el docente no está activo
  (`create or replace` con la misma firma: solo añade).
- **Esfuerzo:** S.

### Lo que está bien

Controles comprobados contra la base remota o el código, útiles como evidencia:

- **RLS activado en las 18 tablas de `public`**; la vista `estudiante_resumen` es
  `security_invoker`. Las tablas del orquestador, `peticion_ia` y `ajuste_plataforma` no tienen
  políticas ni privilegios para `authenticated`: solo las toca el servidor.
- **Ningún privilegio de tabla ni de función para `anon` ni para `PUBLIC`** (la única excepción es
  la secuencia de P1-03). Las funciones con `PUBLIC` son de trigger y no se pueden llamar por RPC.
- **Permisos por columna mínimos.** `usuario`: solo `id, nombre, rol`. `sesion`: lectura sin
  `prompt_sistema`, escritura solo de `comenzada` y `estado`. `mensaje`, `metrica` y `reflexion`:
  solo lectura. Ninguna tabla admite `delete` del cliente salvo `anotacion` (el docente borra las
  suyas).
- **Prueba en vivo suplantando a un estudiante real** (transacción de solo lectura): ve 9 de 12
  prácticas y 82 de 90 mensajes (los suyos), 2 de 9 usuarios (él y su docente), 1 de 5 registros
  de estudiante, y 0 asignaciones, casos y pacientes. No puede leer `sesion.prompt_sistema` ni
  `usuario.correo`, ni insertar en `mensaje` o `sesion`, ni ejecutar `guardar_intercambio`,
  `asignar_cuenta_orquestador`, `id_cuenta_por_correo` o `cerrar_sesiones_inactivas`.
  `admin_docentes()` le devuelve 0 filas.
- **Las 15 funciones `security definer` fijan `search_path = ''`**. Las 10 que puede ejecutar
  `authenticated` comprueban el rol con `es_*()` y la propiedad con `auth.uid()`; las de solo
  servidor están cerradas a `authenticated`.
- **`es_docente()`, `es_estudiante()` y `es_superadmin()` leen `rol` y `activo` de la tabla**, no
  el JWT. El hook del token también exige `activo`. Una cuenta desactivada conserva su sesión pero
  no pasa del proxy, de la DAL ni de RLS.
- **Lo que se califica lo escribe la base:** `guardar_metricas_cierre` ignora el total que manda el
  navegador y acota latencias e indicadores; `sesion_registrar_metrica` cuenta las intervenciones;
  los triggers de `sesion` fijan `inicio`, `fin` y no dejan «descomenzar» ni reabrir una práctica;
  `consulta_inicio` lo pone el primer mensaje guardado por el servidor.
- **Códigos de acceso:** atados a la cuenta del estudiante (uno ajeno responde igual que uno
  inexistente), de un solo uso, con vigencia máxima de 31 días por restricción. Adivinar códigos no
  sirve de nada.
- **Límite de la IA:** `reservar_peticion_ia` usa `auth.uid()`, serializa con un bloqueo por
  usuario y acepta docentes. Llamarla a mano solo gasta el cupo propio.
- **Dominio del correo del estudiante** (`@correounivalle.edu.co` o `@psysim.test`) exigido por una
  restricción de la base, no solo por el formulario. `escenario.configuracion_3d` solo admite
  `scenes/<nombre>.json`.
- **Supabase Auth:** registro público desactivado, sin usuarios anónimos, sin enlace manual de
  identidades, cambio de correo con doble confirmación, JWT de 1 hora con rotación de tokens. La
  lista de retornos permitidos solo admite el dominio de producción, los _previews_ del propio
  equipo de Vercel y `localhost:3000`.
- **Proxy y DAL:** el proxy verifica la firma del JWT (`getClaims`) y la DAL valida la sesión con
  `getUser()` y lee el perfil por el id confirmado. `rutaSiguienteSegura` rechaza destinos
  externos. Las páginas de `src/app/dev/` responden 404 en producción.
- **Storage:** el bucket `modelos-3d` es público de solo lectura (sin políticas de escritura),
  limitado a 50 MB y a `model/gltf-binary`. Realtime no publica ninguna tabla.
- **Las correcciones del 29 de octubre y del 7 de noviembre siguen en pie:** `mensaje` sin
  inserción del cliente, `guardar_intercambio` solo para `service_role` y con el tope de 150
  (reformuladas incluidas), el estudiante solo termina una práctica comenzada, el correo de un
  registro con prácticas no cambia, `escenario_codigo_propio_check`.
- **Las migraciones del 11 y del 15 de noviembre solo añaden**: no rompen el código de producción,
  que va por detrás (ver abajo).

### Pendientes de la auditoría anterior que siguen abiertos en esta área

- **A07:** sin segundo factor ni comprobación de contraseñas filtradas (`password_hibp_enabled` en
  `false`, plan Pro). Tampoco hay CAPTCHA ni bloqueo por cuenta: el límite de intentos es el de
  Supabase.
- **«Secure password change»** figuraba como opcional en `docs/estado-del-proyecto.md`: con P1-01
  deja de ser opcional.
- **A06:** no hay modelo de amenazas escrito.

### Impacto en el documento de grado

Confirma (se puede citar como evidencia de esta pasada):

- RLS en todas las tablas, permisos por columna y prompt del paciente fuera del alcance del
  navegador, con la prueba en vivo de lo que ve un estudiante.
- El rol se decide en la base de datos en cada consulta, no en el token.
- El esquema desplegado es exactamente el de las migraciones versionadas (31 de 31, sin deriva).
- Registro público desactivado y acceso solo de cuentas creadas por un docente o por el
  Administrador.

Contradice o exige matizar:

- «Cambiar la contraseña pide la actual»: hoy solo es cierto en la interfaz (P1-01).
- «Nada concedido al rol anónimo»: hay una secuencia con permisos, sin efecto práctico (P1-03).
- «Los tests vigilan el `revoke` de toda función `security definer`»: vigilan una (P1-02). La
  evidencia válida es la revisión del esquema remoto.
- «`main` y `develop` tienen el mismo contenido» (`docs/estado-del-proyecto.md`): `develop` va 42
  commits por delante. Producción no tiene el orquestador ni el tiempo de consulta, aunque la base
  compartida ya tiene sus tres migraciones. Las cifras del capítulo 5 son de un commit anterior a
  ambos.

Limitaciones que deben declararse:

- Sin segundo factor, sin comprobación de contraseñas filtradas y sin caducidad de sesión (plan
  gratuito de Supabase).
- La sesión vive en una cookie que el navegador puede leer; la protección ante un XSS es la CSP.
- Staging y producción comparten la base de datos.

---

## Pasada 2: API, IA y orquestador

### Alcance

Revisado, leyendo el código completo:

- `src/app/api/npc/chat`, `metrics/save`, `telemetria` y `salud`.
- `src/lib/ia/*` (turno, intercambio, paciente, procesar, flujo, filtro de fuga, historial, reglas).
- `src/lib/orquestador/`: `turno`, `practica`, `cliente`, `cierre`, `datos`, `errores`, `sse`,
  `tipos`, `diferido`, `revision` y `cuentas`. De `sincronizar` y `mapeo` solo lo que decide qué
  datos salen y cuándo se actualiza un caso.
- `src/lib/sesiones/consulta.ts`, `tiempo-consulta.ts` y `datos-privados.ts`;
  `src/lib/env/{ia,orquestador,parse}.ts`; `src/lib/log.ts`; `src/schemas/npc-chat.schema.ts`.
- Las funciones de la base que usa el chat (`guardar_intercambio_ia`, `reservar_*`,
  `asignar_cuenta_orquestador`, `reformular_desde`), ya leídas en la pasada 1.

Fuera: `severidad.ts` y el detalle de `mapeo.ts` (tabla de severidades), los tests, y el lado del
navegador de la conversación (`src/lib/conversacion`, salvo cómo marca un reintento). **No se
probó nada contra el orquestador real ni contra Gemini:** todo lo de esta pasada sale de leer el
código. Las preguntas de la sección 14 de `docs/orquestador.md` siguen abiertas.

### Hallazgos

#### P2-01 · Media · Con Gemini, el paciente olvida el principio de la consulta

- **Dónde:** `src/lib/ia/paciente.ts:46` (`MAX_MENSAJES_CONTEXTO = 40`) y `:141`;
  `src/lib/ia/historial.ts:30`.
- **Causa raíz:** a Gemini solo se le envían los últimos 40 mensajes (20 intercambios). El límite
  se puso para acotar costo y latencia cuando no existía el tiempo de consulta.
- **Escenario:** una consulta de 20 o 30 minutos pasa con facilidad de 20 intercambios (la propia
  guía del orquestador calcula 3 mensajes por minuto). Desde el intercambio 21 el modelo ya no ve
  el primero: el motivo de consulta, lo que el paciente ya contó y lo que el estudiante acordó al
  encuadrar. El paciente puede repetirse o contradecirse, contra la regla fija «mantén la
  coherencia con lo que ya dijiste», y el docente lo lee en la transcripción como un fallo del
  caso. Afecta a todas las prácticas de producción (hoy solo usa Gemini) y a toda práctica del
  orquestador que pase al respaldo.
- **Estado:** `CONFIRMADO` en el código. No se midió en una conversación real cuánto se nota.
- **Arreglo propuesto:** subir la ventana hasta cubrir el tope de la práctica (150 intervenciones
  son 300 mensajes cortos: unos 30 000 tokens, lejos del límite del modelo). Si preocupa el costo,
  conservar siempre los primeros intercambios y los más recientes. Añadir una prueba con una
  conversación de 40 intercambios.
- **Esfuerzo:** S.

#### P2-02 · Media · El historial del orquestador y la transcripción pueden separarse sin aviso

- **Dónde:** `src/lib/orquestador/turno.ts:208` (solo se concilia si el navegador marca
  `reintento` o después de un fallo); `src/lib/ia/turno.ts:114-123` (el comentario dice que «el
  siguiente turno lo detecta por el historial»: ese control no existe);
  `src/app/api/npc/chat/route.ts` (nada impide dos turnos a la vez de la misma práctica).
- **Causa raíz:** PsySim y el orquestador guardan cada uno su historial y solo se comparan en el
  camino de reintento. En un turno normal se envía el mensaje sin comprobar que los dos lados
  tienen los mismos intercambios.
- **Escenario:**
  1. El orquestador responde y guarda el turno, pero PsySim no llega a guardarlo (falla
     `guardar_intercambio_ia` o la plataforma corta la función). El estudiante recarga la página
     y escribe otra cosa: ese envío no lleva `reintento`. Desde ahí el paciente recuerda un
     intercambio que no está en la transcripción que revisa el docente.
  2. Dos pestañas de la misma práctica envían a la vez: los dos turnos llegan al orquestador y se
     guardan en PsySim en el orden en que terminan, que puede no ser el de allá.
  3. `fijarGemini` falla después de un rechazo: ese turno lo responde Gemini y el siguiente vuelve
     al orquestador, que no lo tiene.
- **Relacionado (misma familia):** el reintento se reconoce por el texto, no por un identificador
  (`respuestaYaGuardada`, `conciliar`). Si el estudiante repite a propósito su última frase («sí»)
  y ese envío falla, «Reintentar» devuelve la respuesta anterior y la segunda intervención no
  queda registrada.
- **Estado:** `CONFIRMADO` en el código que la comprobación no existe. La frecuencia real no se
  conoce: depende del servicio y de si Vercel deja terminar la función cuando el navegador corta.
- **Arreglo propuesto:** una marca de «turno en curso» por práctica en `sesion_ia`, tomada de
  forma atómica al empezar y soltada al guardar. Con ella: un segundo turno simultáneo recibe 409;
  un turno nuevo que encuentra una marca vieja concilia antes de enviar y, si los historiales no
  coinciden, pasa la práctica a Gemini. Mejor aún si el navegador envía un identificador por
  intervención y la marca lo guarda. Migración «solo añade» (dos columnas en `sesion_ia`); no
  necesita segunda parte.
- **Esfuerzo:** M.

#### P2-03 · Baja · Una respuesta más larga de lo que acepta la base deja la práctica atascada

- **Dónde:** `src/lib/orquestador/turno.ts:237` y `src/lib/ia/procesar.ts:70-72` (el texto se
  acumula y se guarda sin tope); restricción `mensaje_contenido_check` (4000 caracteres);
  `src/lib/ia/intercambio.ts:146-157`; `src/lib/sse.ts` (el lector tampoco limita una línea).
- **Causa raíz:** el largo de la respuesta lo decide el proveedor. Con Gemini lo acota
  `AI_MAX_TOKENS` (300 por defecto, pero admite 2048); con el orquestador, nada de este lado.
- **Escenario:** el orquestador devuelve 4500 caracteres. El guardado falla por la restricción y el
  estudiante ve «No pudimos guardar tu mensaje. Inténtalo de nuevo». Al reintentar, PsySim
  recupera del historial del orquestador la misma respuesta y vuelve a fallar, sin salida. Si
  escribe otra cosa, cae en P2-02.
- **Estado:** `PLAUSIBLE`: depende del tope de salida del orquestador, que no se conoce.
- **Arreglo propuesto:** recortar la respuesta a 4000 caracteres (en el final de una frase) antes
  de guardarla y cortar el flujo si pasa de un tamaño razonable.
- **Esfuerzo:** S.

#### P2-04 · Baja · Editar un caso cambia al paciente de las prácticas que ya están en curso

- **Dónde:** `src/lib/orquestador/sincronizar.ts:116-137` (`asegurarCaso` actualiza el mismo
  perfil y el mismo escenario).
- **Causa raíz:** en PsySim cada práctica lleva su copia del prompt (`sesion.prompt_sistema`); en
  el orquestador todas las prácticas de un caso comparten un escenario, que se sobrescribe cuando
  el docente edita el caso. Es el mismo mecanismo por el que staging y producción «se pisan» los
  casos cuando tienen versiones distintas del mapeo.
- **Escenario:** un estudiante lleva diez minutos con E-03 en el orquestador. El docente corrige
  el prompt de ese caso y otro estudiante empieza su práctica: el escenario compartido se
  actualiza. Si el orquestador lee el contexto en cada turno, el primer paciente cambia de
  instrucciones a mitad de la consulta, y el filtro de fuga de esa práctica sigue comparando con
  el prompt viejo.
- **Estado:** `PLAUSIBLE`: falta saber si el orquestador relee el escenario en cada turno.
- **Arreglo propuesto:** escenarios inmutables: uno por huella de contenido (como ya se hace con
  las variantes), sin `PATCH` sobre uno que pueda tener sesiones abiertas.
- **Esfuerzo:** M.

#### P2-05 · Baja · Al recuperar un turno, «sesión terminada» se anota como crisis

- **Dónde:** `src/lib/orquestador/cierre.ts:52-64` (`decidirCierrePorEstado`), usado en
  `src/lib/orquestador/turno.ts:187-194`.
- **Causa raíz:** en el camino de recuperación solo se conoce el estado de la sesión. `terminated`
  sin bandera de maltrato se convierte en `crisis`. Es la misma clase de inferencia que causó el
  error del 15 de noviembre, en el único punto donde no se dispone de `closing_kind`.
- **Escenario:** la sesión queda `terminated` por algo distinto de una crisis (una limpieza o un
  cierre manual del lado del orquestador, o un motivo nuevo) justo en un turno que se recupera del
  historial. La práctica termina y el docente lee «el paciente entró en crisis».
- **Estado:** `PLAUSIBLE`.
- **Arreglo propuesto:** pedirle a Juan José que `GET /sessions/{id}` devuelva `closing_kind` y
  decidir con él (`decidirCierre`). Mientras no exista, anotar el motivo solo si además el último
  mensaje trae una severidad en el límite superior; si no, tratarlo como cierre desconocido.
- **Esfuerzo:** S.

#### P2-06 · Baja · El final que decide el servidor lo tiene que ejecutar el navegador

- **Dónde:** `guardar_intercambio_ia` anota `sesion_ia.cierre_motivo` pero no cambia
  `sesion.estado`; `anotarFinPorTiempo` solo se llama desde `src/app/api/metrics/save/route.ts:94`;
  `reformular_desde` solo mira `sesion.estado`.
- **Causa raíz:** tras un cierre por crisis o por tiempo, la práctica sigue `en_curso` hasta que
  el navegador llama a `/api/metrics/save`.
- **Escenario:** el paciente cierra por trato inapropiado y el estudiante cierra la pestaña. Diez
  minutos después el barrido la deja `interrumpida`: sin fila de métricas y, si era por tiempo,
  sin `fin_motivo`. Mientras tanto el estudiante puede llamar a `reformular_desde` y marcar como
  descartado el turno que provocó el cierre (el motivo del cierre sí se conserva y no puede
  seguir conversando).
- **Estado:** `CONFIRMADO` en el código y en las funciones de la base.
- **Arreglo propuesto:** que `guardar_intercambio_ia` termine la práctica cuando recibe un cierre,
  y que `/api/npc/chat` la termine y anote `fin_motivo` cuando responde el 409 por tiempo; que
  `reformular_desde` rechace una práctica con `cierre_motivo`. El navegador ya sabe tratar un 409
  al guardar métricas. Migración «solo añade» (`create or replace` con las mismas firmas).
- **Esfuerzo:** M.

#### P2-07 · Baja · `ORQUESTADOR_URL` admite `http`

- **Dónde:** `src/lib/env/orquestador.ts:62`.
- **Escenario:** una URL mal copiada con `http://` hace viajar en claro la contraseña de las
  cuentas del orquestador y las conversaciones de los estudiantes.
- **Estado:** `CONFIRMADO`.
- **Arreglo propuesto:** exigir `https` salvo para `localhost`.
- **Esfuerzo:** S.

### Lo que está bien

- **Orden de las comprobaciones del chat:** sesión y rol de estudiante, Zod, práctica propia leída
  con RLS, en curso y comenzada, paciente de esa práctica. Solo después se usa la clave secreta
  para leer el prompt y el proveedor.
- **Inyección de instrucciones (LLM01):** el contexto sale de los mensajes guardados; el
  `historial` que mande el navegador se valida y se ignora. Lo del estudiante va siempre como
  turno de usuario. Las reglas fijas se añaden en el servidor en cada llamada a Gemini y en el
  contexto del escenario del orquestador. La nota de tiempo va en las instrucciones del sistema.
- **El prompt no sale:** la respuesta del chat solo lleva texto, emoción, tokens y tiempos. El
  filtro de fuga se aplica a los dos proveedores, también fragmento a fragmento. La severidad del
  orquestador no llega al estudiante.
- **Consumo (LLM10):** 1000 caracteres por mensaje, 150 intervenciones por práctica (en la ruta y
  otra vez en la base con la práctica bloqueada), 10 por minuto por usuario, turnero por cuenta
  del orquestador, 300 tokens de salida y plazos escalonados por debajo del `maxDuration`.
- **Sin SSRF:** la única URL externa configurable viene del entorno y se valida; los
  identificadores del orquestador se validan como GUID antes de entrar en una ruta; la URL de
  Gemini es una constante.
- **Semántica del cierre** (tras el error del 15 de noviembre): solo `crisis` e `inappropriate`
  terminan la práctica; `success`, vacío o desconocido la dejan seguir con Gemini;
  `should_close` debe ser `true` literal; la severidad se acota; un `done` con otra forma no se
  pierde. La excepción es P2-05.
- **Respaldo:** Gemini responde solo ante fallos del servicio. Un 429 espera y nunca activa
  Gemini; un 400, 403 o 422 no se esconde. La práctica que pasa a Gemini se queda ahí. El
  interruptor `IA_PROVEEDOR=gemini` funciona sin tocar la base.
- **Reintento sin duplicar:** si el intercambio ya se guardó, se devuelve lo guardado; si quedó
  solo en el orquestador, se recupera de su historial.
- **Qué sale hacia el orquestador:** el prompt con las reglas, los datos del paciente ficticio y
  lo que escribe el estudiante. Ningún identificador del estudiante ni del docente: las sesiones
  son de cuentas de servicio. El código no llama a `/evaluation/*`.
- **Secretos y registros:** `log` solo acepta valores simples y ninguna llamada registra texto de
  la conversación, correos ni tokens; las cuentas se registran como huella; los tokens del
  orquestador viven en memoria; los errores de configuración no citan valores.
- **`/api/metrics/save`:** rol, Zod, RLS y función de la base; el motivo «por tiempo» se decide
  con dos horas de la base. **`/api/telemetria`:** mismo origen, 2 KiB, esquema estricto y tope
  por dirección. **`/api/salud`:** no devuelve secretos.
- **Decisiones de «seguir si falla» que son deliberadas y están registradas:** si no se puede
  contar el límite por minuto o el turnero, la práctica continúa. Es una apuesta por la
  disponibilidad; el tope de 150 de la base sigue en pie.

### Pendientes de la auditoría anterior que siguen abiertos en esta área

- **LLM07** figura como «cubierto y probado». El filtro solo detecta diez palabras seguidas
  copiadas: no ve una paráfrasis, una traducción ni un texto con palabras intercaladas. Debería
  figurar como cubierto en parte (la defensa real es que el prompt solo contiene datos ficticios).
- **LLM09:** sigue sin evaluarse el realismo clínico de los 12 pacientes; P2-01 lo agrava en
  consultas largas.
- **A09:** sin alertas de producción.
- **Orquestador:** nada probado contra el servicio real (sección 14 de `docs/orquestador.md`), los
  E2E de conversación sin correr, y el aviso de privacidad y el consentimiento sin actualizar.
- **«Ante una fuga, el respaldo vuelve a llamar a la IA»** (`docs/estado-del-proyecto.md`): en el
  camino por partes que usa hoy el chat ya no ocurre; una fuga responde 502 sin otra llamada.

### Impacto en el documento de grado

Confirma:

- El contexto de la IA se arma en el servidor y las reglas fijas no dependen del docente.
- El navegador nunca habla con el orquestador ni recibe sus identificadores.
- Los límites de consumo están en la base de datos, no en el navegador.
- PsySim no usa la evaluación automática del orquestador.

Contradice o exige matizar:

- «El paciente mantiene la coherencia»: con Gemini solo recuerda los últimos 20 intercambios
  (P2-01).
- «Fuga del prompt cubierta»: es una red de seguridad contra la copia literal.
- «PsySim es la fuente de verdad de la transcripción»: cierto para lo que ve el docente, pero el
  paciente del orquestador puede recordar algo distinto (P2-02).
- La integración con el orquestador está implementada y probada con un servicio simulado; no hay
  evidencia con el servicio real ni está en producción.

Limitaciones que deben declararse:

- El cierre automático por crisis o trato inapropiado solo existe con el orquestador; con Gemini
  el paciente no termina la consulta.
- Dependencia de un servicio de un tercero: disponibilidad, conversación guardada en su base de
  datos y prompts legibles para los usuarios de ese sistema.
- El límite por minuto y el turnero dejan pasar el turno si no se pueden contar.

---

## Pasada 3: acciones de servidor y panel

### Alcance

Revisado:

- Los nueve archivos `'use server'` (`admin`, `asignaciones`, `auth`, `casos`, `equipo-compartido`,
  `escenarios`, `estudiantes`, `reflexion`, `retroalimentacion`): las 39 funciones exportadas, con
  su verificación de rol, su validación y el cliente de Supabase que usan. Leídos enteros `admin`,
  `estudiantes` (con `cuentas.ts`), `asignaciones`, `equipo-compartido` (con `entrega.ts`) y
  `escenarios`; de `casos` y `retroalimentacion`, las acciones que escriben o llaman a la IA.
- Las 21 páginas y rutas de `src/app/(protected)` (qué `requerir*()` llama cada una), la pantalla
  de entrega del modo presencial, `/unirse/[codigo]` y `/sesiones/exportar`.
- Las consultas que usan la clave secreta: `src/lib/admin/queries.ts`,
  `src/lib/sesiones/datos-privados.ts` y sus llamadores.
- `next.config.ts` (cabeceras), `src/lib/seguridad/csp.ts`, `src/lib/datos-locales.ts` y las claves
  que la aplicación guarda en el navegador.
- La protección CSRF de las Server Actions, comprobada en
  `node_modules/next/dist/docs/01-app/02-guides/data-security.md`.

Fuera: el contenido visual de las pantallas y los archivos del panel con cambios sin commit
(pasada 5), los tests, y los detalles de `retroalimentacion/actions.ts` que solo pasan por RLS (las
políticas se revisaron en la pasada 1). No se levantó la aplicación: el modo presencial se analizó
leyendo el flujo, no recorriéndolo en un navegador.

### Hallazgos

#### P3-01 · Media · Modo presencial: la cuenta de Google que queda abierta se elige en dos clics

- **Dónde:** `src/app/(auth)/entrega/page.tsx:72-91` (cerrar Google es un aviso con un enlace, no
  un paso obligatorio) y `:130-134` (enlace «Volver a entrar como docente»);
  `src/lib/equipo-compartido/actions.ts:31-35` y `:105-108` (`olvidarEntrega` y `cancelarEntrega`
  no verifican a nadie); `src/app/auth/callback/route.ts:74-79` (la única guarda es la cookie
  `psysim-entrega`); `src/lib/auth/actions.ts:142` (`prompt: 'select_account'`).
- **Causa raíz:** al entregar el equipo se cierra la sesión de PsySim, pero no la de Google. Lo
  que impide que el estudiante elija la cuenta del docente en el selector de Google es una cookie
  del mismo navegador que el estudiante tiene en las manos, y la propia pantalla ofrece el enlace
  que la borra.
- **Escenario:** un docente que entra con Google entrega su computador y no hace caso del aviso.
  El estudiante pulsa «¿No eres Ana? Volver a entrar como docente», llega a `/login`, pulsa
  «Continuar con Google» y elige la cuenta del docente, que no pide contraseña. Queda dentro como
  docente: lee las transcripciones de todo el curso y puede publicar notas. Lo mismo ocurre entre
  estudiantes: si el anterior no cerró Google al terminar, el siguiente puede entrar con su
  cuenta y ver sus prácticas y su retroalimentación.
- **Estado:** `CONFIRMADO` en el código. No se recorrió en un navegador.
- **Arreglo propuesto:**
  1. Guardar la entrega en el servidor, en la cuenta del docente (por ejemplo
     `usuario.entrega_hasta`), y que `/auth/callback` rechace durante esa ventana un acceso con
     Google de esa cuenta aunque no exista la cookie: el docente recupera el equipo con correo y
     contraseña. Migración «solo añade» (una columna que solo escribe el servidor).
  2. En los accesos desde `/entrega` y `/entrega/fin`, pedir a Google `prompt=login` para que
     exija la contraseña aunque haya una sesión abierta.
  3. Mostrar el botón de acceso del estudiante solo después de que el docente confirme que cerró
     su sesión de Google.
- **Esfuerzo:** M.

#### P3-02 · Baja · Corregir el correo de un docente no desvincula la cuenta de Google anterior

- **Dónde:** `src/lib/admin/actions.ts:170-180` (`actualizarDocente`).
- **Causa raíz:** el cambio de correo se hace con `updateUserById`, que conserva las identidades
  de Google ya enlazadas a ese usuario. Supabase reconoce un acceso con Google por la identidad,
  no por el correo actual.
- **Escenario:** el Administrador reutiliza la cuenta de un docente que se fue poniéndole el
  correo de quien lo reemplaza. La persona anterior, si alguna vez entró con Google, sigue
  entrando a esa cuenta, ahora con los estudiantes del nuevo docente.
- **Estado:** `PLAUSIBLE`: es el comportamiento documentado de Supabase Auth, no se probó.
- **Arreglo propuesto:** al cambiar el correo, borrar las identidades de Google de esa cuenta con
  la API de administración; o impedir el cambio si la cuenta ya tiene una identidad de Google y
  pedir que se cree una cuenta nueva.
- **Esfuerzo:** S.

#### P3-03 · Baja · La contraseña temporal no obliga a cambiarla

- **Dónde:** `src/app/(protected)/(panel)/layout.tsx:36` y `:73` (solo muestra
  `AvisoContrasenaTemporal`); `src/lib/admin/actions.ts:63` y `:261`.
- **Causa raíz:** `contrasena_temporal` es un aviso, no una condición de acceso.
- **Escenario:** el Administrador crea a un docente y le envía la contraseña temporal por un chat.
  El docente la sigue usando semanas: quien haya visto ese mensaje entra a su cuenta.
- **Estado:** `CONFIRMADO`.
- **Arreglo propuesto:** mientras `contrasenaTemporal` sea cierto, que el panel solo deje abrir el
  cambio de contraseña (en el `layout` y en `requerirDocente`).
- **Esfuerzo:** S.

### Lo que está bien

- **Toda Server Action con datos verifica y valida.** Las 39 funciones exportadas llaman a un
  `requerir*()` y pasan su entrada por `safeParse` antes de tocar datos. Las únicas sin
  verificación son las que no pueden tenerla (`iniciarSesion`, `iniciarSesionConGoogle`,
  `cerrarSesion`) y las dos de la entrega señaladas en P3-01, que solo borran cookies propias.
- **Las 21 páginas y rutas protegidas** llaman a su `requerir*()` además del `layout`. La ruta de
  exportación responde 403 a quien no es docente.
- **Clave secreta:** las acciones del estudiante la usan solo después de leer la práctica con RLS
  (`comenzarSesion`, `anotarFinPorTiempo`, el chat). Las del Administrador, después de
  `requerirSuperadmin` y de comprobar que la cuenta es del equipo docente (`cuentaDelEquipo`).
  `obtenerFichaDocente` queda protegida por `admin_docentes()`, que no devuelve nada a otros roles.
- **Gestión de cuentas:** el Administrador no puede quitarse el rol, desactivarse ni eliminarse.
  Desactivar bloquea en Supabase Auth y en la tabla. Solo se elimina un docente sin historial. El
  rol de una cuenta del equipo no puede pasar a estudiante ni al revés. Dos altas simultáneas del
  mismo estudiante no borran la cuenta recién creada.
- **Códigos de acceso:** se generan con `crypto.getRandomValues`; abrir el enlace `/unirse/<código>`
  no canjea nada (hace falta confirmar con un botón); el canje lo decide la base.
- **Retroalimentación:** el estudiante solo ve la publicada (RLS); la fecha de publicación la fija
  la base y no se puede retirar; el docente ve los intentos reformulados y la severidad del
  paciente, que el estudiante no recibe.
- **Exportación CSV:** neutraliza fórmulas (`=`, `+`, `-`, `@`), escapa comillas, sale con
  `no-store` y con la fecha de Bogotá.
- **Cabeceras:** `X-Frame-Options: DENY`, `nosniff`, HSTS de dos años, COOP, `Referrer-Policy` y
  `Permissions-Policy` en todas las respuestas; CSP con nonce por petición, `strict-dynamic`,
  `frame-ancestors 'none'`, `object-src 'none'` y `form-action` limitado. El único HTML sin escapar
  es el JSON-LD de la portada, con `<` escapado.
- **CSRF:** las Server Actions solo aceptan `POST` y Next compara `Origin` con `Host` (verificado
  en la documentación instalada); las cookies de sesión son `SameSite=Lax`; las rutas que escriben
  exigen JSON y sesión.
- **Modo presencial, lo que sí funciona:** la sesión del docente se cierra antes de entregar; la
  práctica queda en la cuenta del estudiante; los datos de la entrega van en una cookie `httpOnly`;
  `olvidarDatosDeLaCuenta` cubre todas las claves con datos de la cuenta que hoy escribe la
  aplicación (notas, borradores de retroalimentación y de casos, consentimientos y guía vista).
- **La plataforma no evalúa:** las métricas son descriptivas (duración, intervenciones, latencia,
  proximidad); la nota la escribe el docente; no hay rúbricas ni retroalimentación generada; el
  código no consulta la evaluación del orquestador. El perfil clínico que ve el estudiante se
  compone de la situación y los síntomas, no de lo que guarda el paciente.

### Pendientes de la auditoría anterior que siguen abiertos en esta área

- **P1-05 queda confirmado:** `cambiarEstadoDocente` no anula los códigos pendientes del docente.
- **Aviso de privacidad y consentimiento:** `/privacidad` y la casilla de aceptación nombran solo
  a Google Gemini y conservan datos «por confirmar». Bloquea activar el orquestador con
  estudiantes.
- **A07:** sin segundo factor para docentes ni para el Administrador.
- **«Secure password change»** sigue sin activar (P1-01).

### Impacto en el documento de grado

Confirma:

- Defensa en profundidad real: proxy, verificación en cada página y acción, y RLS.
- La decisión de no evaluar automáticamente se cumple en el código.
- El registro público está cerrado: las cuentas las crean el Administrador y los docentes.
- Cabeceras de seguridad y CSP con nonce.

Contradice o exige matizar:

- «En el modo presencial los roles nunca se mezclan»: es cierto para la sesión de PsySim, pero
  depende de que cada persona cierre su sesión de Google (P3-01).
- «El docente cambia la contraseña temporal al entrar»: se le pide, no se le exige (P3-03).

Limitaciones que deben declararse:

- El modo presencial usa el computador del docente: la seguridad de sus otras cuentas abiertas en
  ese navegador queda fuera del alcance de la plataforma.
- El Administrador puede ver los listados y las métricas de los estudiantes de todos los docentes
  (no sus transcripciones) y eliminar su historial; eliminar a un estudiante borra sus prácticas
  sin posibilidad de recuperarlas.

---

## Pasada 4: cliente 3D y scripts

### Alcance

Revisado:

- **Leídos enteros:** `scene-canvas`, `scene-loader`, `use-escena`, `modelo-glb`,
  `monitor-rendimiento`, `paciente-personaje`, `src/lib/npc/cargar-glb.ts` y
  `src/lib/escena/modelos.ts`; el bucle de `controles-primera-persona` y el montaje de `npc-model`.
- **Por búsqueda dirigida en todo `src/components/3d`, `src/lib/npc`, `src/lib/escena` y
  `src/lib/audio`:** cada recurso de three.js creado a mano (geometrías, materiales, texturas) y su
  `dispose()`; cada `addEventListener` y su retirada; el ciclo del `AudioContext`; los ajustes de
  sombras y de calidad.
- `src/schemas/escena.schema.ts` (qué rutas de modelos admite una escena), la CSP en lo que toca
  al 3D y `docs/performance.md` (qué equipo se midió).
- **Scripts:** de todos, las operaciones destructivas, sus filtros, lo que imprimen y contra qué
  base corren. `aplicar-migracion.mjs` se leyó entero en la pasada 1.
- **Base remota:** cuántas cuentas hay por rol y cuántas son de prueba.

Fuera: el detalle de la animación del paciente (`animador-paciente`, `brazos-paciente`, `rostro`,
`repertorio-gestos`, `poses-gestos`: unas 3600 líneas), los muebles procedurales, la vista exterior
y los scripts de generación de imágenes y personajes. **No se ejecutó la escena ni se midió nada:**
no hay cifras nuevas de FPS ni de memoria; las que existen son las de `docs/performance.md`.

### Hallazgos

#### P4-01 · Baja · Las cuentas de prueba, con un Administrador, viven en la base de producción

- **Dónde:** `scripts/seed-docentes.ts:35` (`admin@psysim.test`, rol `superadmin`);
  `scripts/seed-practicas-prueba.ts`; los E2E, que usan esas cuentas. Base remota: las 9 cuentas
  que existen hoy son todas `@psysim.test` y todas tienen contraseña (1 Administrador, 3 docentes
  y 5 estudiantes).
- **Causa raíz:** staging y producción comparten la base y no hay otra para pruebas. Los seeds y
  los E2E escriben en la única que existe, sin ninguna guarda.
- **Escenario:** hoy no hay datos reales, así que el daño posible es nulo. El día de la evaluación
  con usuarios, las transcripciones de estudiantes reales convivirán con un Administrador de
  prueba cuya contraseña está en `.env.test.local` y en la salida de `pnpm db:seed`. Quien la
  obtenga ve los listados de todos y puede borrar historiales. Además, cada corrida de E2E «contra
  producción» crea prácticas y gasta IA en la misma base.
- **Estado:** `CONFIRMADO` (conteo en la base remota).
- **Arreglo propuesto:** antes de la primera sesión con estudiantes reales, crear el Administrador
  real y desactivar o eliminar `admin@psysim.test` y las cuentas de prueba que no hagan falta. A
  mediano plazo, un proyecto de Supabase aparte para E2E y seeds, y que los scripts se nieguen a
  correr contra el proyecto de producción sin una confirmación explícita.
- **Esfuerzo:** S (limpiar las cuentas) · M (proyecto aparte).

#### P4-02 · Baja · La única adaptación al rendimiento es la resolución, y puede oscilar

- **Dónde:** `src/components/3d/scene-canvas.tsx:101-104` (`PerformanceMonitor` con `onDecline` y
  `onIncline`, sin `flipflops` ni `onFallback`); `:81-87` (sombras y antialias siempre activos).
- **Causa raíz:** si el rendimiento cae, se baja el `devicePixelRatio` a 1; si mejora, se vuelve a
  subir a 1,5. Nada lo detiene y no hay un segundo escalón (sombras, partículas, vista exterior).
- **Escenario:** un portátil con pantalla de alta densidad y más de 60 Hz que no sostiene la
  escena a 1,5× pero sí a 1×. La resolución cambia cada pocos segundos y cada cambio produce un
  tirón. En un equipo sin aceleración por hardware la escena corre a unos 13 FPS (la medida por
  software de `docs/performance.md`) sin que el estudiante reciba ningún aviso.
- **Estado:** `PLAUSIBLE`: sale de leer la configuración; no se reprodujo en un equipo.
- **Arreglo propuesto:** `flipflops={3}` con `onFallback` que fije la resolución baja; en ese
  mismo punto, apagar sombras y efectos de ambiente y mostrar un aviso sobrio si aun así el
  promedio queda bajo.
- **Esfuerzo:** S (dejar de oscilar) · M (segundo escalón de calidad).

### Lo que está bien

- **Sin WebGL:** un límite de error propio muestra un aviso con salida a «Mis prácticas» por
  encima de la pantalla de carga; el `fallback` del lienzo cubre el caso sin canvas.
- **Carga tolerante a fallos:** la escena se valida con Zod antes de montarla; cada GLB tiene su
  `Suspense` y su límite de error, y un modelo que falla se reemplaza por su versión procedural
  (también el paciente). Los modelos se precargan mientras se ve la pantalla de carga.
- **Una escena no puede cargar recursos ajenos:** las rutas de modelos solo admiten minúsculas,
  guiones y `.glb`, relativas al bucket o a `public/models`; el personaje sale de una lista
  cerrada; la base solo acepta `scenes/<nombre>.json`. La CSP limita las conexiones al sitio y a
  Supabase; los decodificadores Draco se sirven desde el propio sitio.
- **Recursos de three.js:** todo lo creado a mano (rostro, esqueleto de depuración, partículas,
  textura de la sala, material de la vista exterior) se libera al desmontar. Los modelos se clonan
  con `SkeletonUtils` sobre un original en caché. Los escuchas de teclado, de inactividad y de
  sonido se retiran. El `AudioContext` se suspende con la pestaña oculta y se cierra al terminar.
- **Bucle de movimiento:** `delta` acotado, subpasos para las colisiones y vectores reutilizados:
  no depende de los FPS ni genera basura por fotograma.
- **Modelos ligeros:** los personajes pesan entre 350 y 470 kB.
- **`prefers-reduced-motion`** se consulta al crear el animador del paciente.
- **Scripts:** el seed y las prácticas de prueba solo tocan cuentas `@psysim.test`; la limpieza
  de `test-supabase-connection` borra por prefijo propio; `aplicar-migracion.mjs` corre en una sola
  transacción, es idempotente y no imprime el token; `modelos:subir` usa una caché de un día.
- **Las cachés de modelos no se vacían** (`cargar-glb.ts` y `useGLTF`), pero su tamaño está
  acotado por el catálogo (12 consultorios) y la memoria de la GPU se libera con el lienzo.

### Pendientes de la auditoría anterior que siguen abiertos en esta área

- **Créditos de los modelos 3D visibles en la plataforma** (8 modelos CC0 y CC BY 3.0): la licencia
  CC BY exige atribución y hoy solo está en la documentación.
- **Medición en un equipo distinto al del autor:** `docs/performance.md` mide una sola GPU
  integrada (AMD Radeon, 75 FPS).
- **E2E de escena y de CSP sin correr** en este equipo (falta `.env.test.local`).

### Impacto en el documento de grado

Confirma:

- Degradación controlada: sin WebGL hay aviso; sin un modelo, versión procedural.
- Las escenas se describen con datos validados y no pueden traer contenido de terceros.
- El cliente 3D libera sus recursos y no depende de la tasa de fotogramas para moverse.

Contradice o exige matizar:

- «75 FPS» es la medida de un equipo. No hay evidencia en equipos más modestos ni un modo de
  calidad reducida más allá de la resolución (P4-02).

Limitaciones que deben declararse:

- No existe un entorno de pruebas separado: los E2E, los seeds y la subida de modelos actúan sobre
  la base y el almacenamiento de producción (P4-01).
- Requiere un computador con teclado, ratón y aceleración por hardware.

---

## Pasada 5: UI/UX y accesibilidad (transversal), con la mantenibilidad

### Alcance

Revisado:

- `DESIGN.md` (sistema visual completo) y el índice y la sección de estilo de
  `docs/guia-de-redaccion.md`.
- **Contraste del código con las reglas medibles del sistema de diseño**, por búsqueda en
  `src/components` y `src/app`: foco retirado sin reemplazo, animaciones sin condición de
  movimiento reducido, texto por debajo de 12 px, colores fuera de la paleta.
- **Accesibilidad en el código:** idioma del documento, enlace de salto, encabezados, región de la
  conversación y sus anuncios, estados del HUD, teclas de la escena 3D.
- **Estados de carga y error:** qué rutas tienen `loading.tsx`, `error.tsx` y `not-found.tsx`.
- **Pruebas:** la suite unitaria completa con cobertura, corrida hoy sobre `8f21831`.
- **Producción, solo lo público:** cabeceras y HTML de `https://psysim.vercel.app/login` y
  `/api/salud` (revisión desplegada `90a2a80`).
- **Mantenibilidad:** tamaños de archivo, caminos duplicados hacia la IA, código sin uso y
  documentación desfasada (reuniendo los cabos de las cuatro pasadas).

**Lo que no se pudo hacer, y por qué:** no se levantó la aplicación ni se usó el navegador con
sesión iniciada. En este equipo no existe `.env.test.local`, así que no hay cuentas con las que
entrar, y sin ellas solo se ven las páginas públicas. Por eso **no hay revisión visual** de
jerarquía, de los flujos del docente y del estudiante, del responsive a 390 y 768 px, de los
objetivos táctiles ni de la inmersión del consultorio: lo que sigue sale del código, de las
pruebas existentes y de la página pública de producción. Tampoco se corrieron los E2E ni un lector
de pantalla.

### Hallazgos

#### P5-01 · Media · Las pruebas de extremo a extremo no se han corrido sobre el código actual

- **Dónde:** `e2e/` (18 archivos, entre ellos `accesibilidad.spec.ts`, `ux-reglas.spec.ts`,
  `csp.spec.ts`, `conversacion.spec.ts` y `flujo-completo.spec.ts`); `.env.test.local` no existe
  en este equipo; `docs/estado-del-proyecto.md` da como última corrida la del 3 de noviembre sobre
  `0e0f66f` (115 de 116). La CI solo corre lint, tipos, formato y pruebas unitarias.
- **Causa raíz:** los E2E dependen de credenciales que no están en el equipo de trabajo y de la
  base y la IA reales, así que no corren en cada cambio.
- **Escenario:** desde la última corrida entraron el orquestador, la respuesta por partes, el
  tiempo de consulta y el rediseño del panel (hoy mismo, `8f21831`). La evidencia automática de
  accesibilidad (axe y teclado), de las reglas de UX, de la CSP en la escena 3D y del flujo
  completo es de una versión anterior. Una regresión en cualquiera de esas áreas llegaría a la
  evaluación con usuarios sin que ninguna prueba la vea, y las cifras del capítulo 5 no describen
  lo que se va a sustentar.
- **Estado:** `CONFIRMADO`.
- **Arreglo propuesto:** restaurar `.env.test.local`, correr `pnpm test:e2e --workers=1` sobre
  `develop` y registrar el resultado en `docs/pruebas/`. Repetirlo sobre `main` antes de entregar y
  actualizar las cifras del documento. Si se crea el proyecto de pruebas de P4-01, llevar al menos
  `smoke`, `accesibilidad` y `csp` a la CI.
- **Esfuerzo:** S con las credenciales · M para llevarlo a la CI.

#### P5-02 · Baja · Girar la cámara del consultorio exige ratón

- **Dónde:** `src/components/3d/use-teclado.ts:7-10` (las flechas y WASD solo desplazan);
  `src/components/3d/controles-primera-persona.tsx:153-163` (el giro es del puntero capturado);
  `src/components/simulacion/simulacion-cliente.tsx:130` (la tecla E conversa solo estando cerca).
- **Causa raíz:** el recorrido se pensó para teclado y ratón a la vez.
- **Escenario:** una persona que usa solo teclado puede avanzar y desplazarse de lado, pero no
  girar. Si el paciente no queda en el camino desde la posición inicial, no llega a la distancia
  de conversación y no puede hacer la práctica (WCAG 2.1.1).
- **Estado:** `PLAUSIBLE`: no se recorrieron las 12 escenas solo con teclado.
- **Arreglo propuesto:** un botón «Ir con el paciente» siempre disponible en el HUD (lleva la
  cámara a la posición de conversación) o giro con Q y E. Incluirlo en la pasada con NVDA.
- **Esfuerzo:** S.

#### P5-03 · Baja · Las páginas públicas no tienen «Saltar al contenido»

- **Dónde:** `SaltarContenido` solo se monta en `src/app/(protected)/(panel)/layout.tsx:34` y
  `:56`. En el HTML de `/login` en producción no aparece, y antes del botón de acceso hay doce
  botones de la galería de casos («Ver E-01…» a «Ver E-12…»).
- **Causa raíz:** el enlace vive en el `layout` del panel, no en el raíz.
- **Escenario:** quien navega con teclado o lector de pantalla recorre doce paradas antes de
  llegar a «Continuar con Google» cada vez que entra (WCAG 2.4.1). `DESIGN.md` lo define como
  «primer elemento enfocable».
- **Estado:** `CONFIRMADO` (HTML de producción y código).
- **Arreglo propuesto:** montar el enlace en el `layout` raíz, o en las páginas de `(auth)` y en la
  portada, con su destino `#contenido`.
- **Esfuerzo:** S.

#### P5-04 · Baja · Desviaciones del sistema de diseño que sus pruebas no ven

- **Dónde:**
  - Ámbar de Tailwind en lugar de los tokens `ambar` y `ambar-suave`:
    `src/components/retroalimentacion/texto-anotado.tsx:42-46`,
    `src/components/retroalimentacion/revision-sesion.tsx:356` y `:737-738`,
    `src/components/layout/aviso-contrasena-temporal.tsx:20`,
    `src/components/admin/credenciales-acceso.tsx:50`.
  - Número de anotación a 10 px (`texto-anotado.tsx:43`), por debajo del mínimo de 12 px.
  - Unas veinte animaciones `animate-spin` sin `motion-safe:` y sin una regla global que las
    detenga con «reducir movimiento».
- **Causa raíz:** `src/lib/contraste.test.ts` comprueba los pares de tokens del tema, no los
  colores que se escriben a mano; nada comprueba el movimiento ni el tamaño mínimo.
- **Escenario:** el subrayado del comentario del docente, que es justo lo que el estudiante lee
  en su retroalimentación, usa pares de color que nadie midió. `DESIGN.md` pide condicionar «toda
  animación» al movimiento reducido.
- **Estado:** `CONFIRMADO` por búsqueda. No se midió el contraste de esos pares.
- **Arreglo propuesto:** pasar esos usos a los tokens (o añadir los pares al test), subir el
  número a 12 px y añadir `motion-safe:` a los indicadores de espera, o una regla global. Una
  prueba que rechace clases de color de Tailwind fuera de la hoja de impresión lo mantiene.
- **Esfuerzo:** S.

#### P5-05 · Baja · Dos caminos hacia Gemini con la misma lógica repetida

- **Dónde:** `src/lib/ia/paciente.ts:184-249` (`generarRespuestaPaciente`, sin flujo, que solo usa
  `probarPaciente`) y `:259-350` con `src/lib/ia/procesar.ts` (el camino por partes del chat).
- **Causa raíz:** el camino por partes se añadió al lado del anterior en lugar de reemplazarlo.
  El respaldo entre modelos, la limpieza y el filtro de fuga están escritos dos veces.
- **Escenario:** ya divergen: el camino sin flujo no pasa la nota de escena al filtro de fuga y
  aplica el filtro en otro punto. Un cambio de reglas o de proveedor hay que hacerlo en los dos, y
  el chat de prueba del docente puede comportarse distinto de la práctica real.
- **Estado:** `CONFIRMADO`.
- **Arreglo propuesto:** que `probarPaciente` consuma el camino por partes y junte el resultado;
  borrar `generarRespuestaPaciente`.
- **Esfuerzo:** S.

#### P5-06 · Baja · Archivos al borde del tope de 1100 líneas

- **Dónde:** `src/lib/npc/animador-paciente.ts` (1069 líneas). Cerca en tamaño, aunque lejos del
  tope: `configurador-sesion.tsx` (905), `constructor-caso.tsx` (849), `bandeja-docente.tsx` (831),
  `revision-sesion.tsx` (784). `src/types/database.types.ts` (1080) y
  `src/app/api/npc/chat/route.test.ts` (1038) están exentos de la regla.
- **Escenario:** el próximo gesto del paciente rompe `calidad.test.ts` y obliga a partir el
  archivo con prisa. Los cuatro componentes mezclan datos, estado y presentación en una sola pieza
  difícil de revisar.
- **Estado:** `CONFIRMADO`.
- **Arreglo propuesto:** partir `animador-paciente.ts` por responsabilidad antes de tocarlo (el
  bucle base, los gestos y el habla ya son módulos vecinos). Los componentes, cuando se toquen.
- **Esfuerzo:** M.

#### P5-07 · Baja · Código sin uso y documentación que ya no describe el sistema

- **Código sin uso:** `src/lib/supabase/client.ts` (0 % de cobertura, nadie lo importa);
  `metricasAdmin` y `estudiantes` en `src/lib/orquestador/cliente.ts`;
  `scripts/aplicar-migracion-e07-e12.mjs`; el campo `historial` de `npcChatRequestSchema`, que se
  valida y se ignora.
- **Documentación desfasada:**
  - `README.md`, secciones «Arquitectura» y «Autenticación»: describen el proxy de cuando solo
    existía el rol docente y una estructura de carpetas anterior.
  - `docs/estado-del-proyecto.md`: dice que `main` y `develop` son iguales (van 43 commits
    aparte), que el orquestador está en una rama sin commit y que toda función nueva necesita su
    `grant` (P1-02).
  - `CLAUDE.md`: atribuye a los tests reglas que solo se cumplen por disciplina (P1-02).
  - `src/lib/ia/turno.ts:114-123`: el comentario describe una detección que no existe (P2-02).
- **Escenario:** el README es lo primero que leerá el jurado o quien herede el proyecto, y hoy
  describe otra aplicación.
- **Estado:** `CONFIRMADO`.
- **Arreglo propuesto:** borrar lo que no se usa y reescribir esas secciones a partir de
  `CLAUDE.md`, que sí está al día.
- **Esfuerzo:** S.

### Lo que está bien

- **Las 2009 pruebas unitarias pasan** (128 archivos) sobre `8f21831`, con el rediseño del panel
  incluido. Entre ellas, el contraste de los tokens, la redacción y las reglas de calidad.
- **Cobertura de lo crítico** (líneas): `/api/npc/chat` 97 %, `lib/orquestador` 98 %, `lib/ia`
  95 %, `lib/auth` 92 %, `lib/equipo-compartido` 98 %, `lib/conversacion` 97 %, `store` 99 %. Los
  huecos están en lecturas: `sesiones/exportar/route.ts` y `lib/admin/queries.ts` (0 %),
  `lib/sesiones/queries.ts` (49 %) y `lib/supabase/proxy.ts` (38 %).
- **Acoplamiento al proveedor de IA bien resuelto:** el SDK de Google solo se importa en
  `src/lib/ia/paciente.ts`; el orquestador y Gemini hablan el mismo protocolo (`ParteTurno`) y la
  ruta del chat no distingue quién respondió.
- **Estados de carga y error:** 18 `loading.tsx` (uno por pantalla del panel), `error.tsx` del
  panel y global, `global-error.tsx` y `not-found.tsx`.
- **Lectores de pantalla en la conversación:** el historial es un `role="log"` silenciado a
  propósito y cada respuesta completa se anuncia una sola vez en una región `aria-live`; el estado
  del paciente y el tiempo usan `role="status"`. El documento declara `lang="es"`.
- **Foco:** los únicos `outline` retirados sin reemplazo son contenedores de diálogo y el destino
  del enlace de salto, que no deben mostrarlo.
- **Movimiento reducido:** las transiciones de despliegue están condicionadas en CSS y el animador
  del paciente lo consulta. La excepción son los indicadores de espera (P5-04).
- **Paleta:** fuera de la hoja de impresión, solo unos veinte usos de color se salen de los tokens.
- **Producción responde con las cabeceras esperadas** (comprobado hoy): CSP con nonce y
  `strict-dynamic`, HSTS de dos años, `X-Frame-Options: DENY` y `Permissions-Policy`.

### Pendientes de la auditoría anterior que siguen abiertos en esta área

- **Pasada con lector de pantalla (NVDA)** en la simulación y en la revisión del docente.
- **Lighthouse** y la verificación manual del Anexo I (unos 30 requisitos).
- **Recomendaciones de UX sin aplicar:** R2 (instrucciones del caso más cortas), R4 (filtros en la
  URL) y R6 (prueba con 3 a 5 personas).
- **Créditos visibles** de los modelos 3D con licencia CC BY.
- **Textos fuera de las pantallas** e internacionalización (sección 7 de la guía de redacción).

### Impacto en el documento de grado

Confirma:

- 2009 pruebas unitarias en verde y cobertura por encima del 90 % en las rutas críticas.
- Estados de carga y error en todas las pantallas del panel; conversación anunciada a lectores de
  pantalla; sistema de diseño con tokens verificados por una prueba de contraste.

Contradice o exige matizar:

- Las cifras de E2E del capítulo 5 (115 de 116, del 3 de noviembre) no corresponden al código que
  se va a sustentar; el número de pruebas unitarias tampoco (1402 entonces, 2009 hoy).
- «WCAG 2.2 AA»: la evidencia automática es anterior al rediseño y quedan abiertos el giro de
  cámara con teclado (P5-02), el enlace de salto en las páginas públicas (P5-03) y la pasada con
  lector de pantalla.
- «Todo par de color supera AA»: está probado para los tokens, no para los colores escritos a
  mano (P5-04).

Limitaciones que deben declararse:

- Esta auditoría no incluyó revisión visual ni uso de la aplicación con sesión iniciada: la
  jerarquía, el responsive y la inmersión del consultorio quedan sin evaluar aquí.
- La simulación requiere teclado y ratón.

---

## Cierre

### Resumen ejecutivo

**Veredicto.** PsySim está bien construido para lo que es: en cinco pasadas no apareció ningún
hallazgo crítico ni alto. La base de datos está cerrada de verdad (comprobado suplantando a un
estudiante real), toda acción del servidor verifica el rol y valida su entrada, el prompt del
paciente no sale del servidor y el cliente 3D degrada sin romperse. Las correcciones de las
auditorías del 29 de octubre y del 7 de noviembre siguen en pie y el esquema desplegado es
exactamente el de las migraciones.

Lo que queda no está en el centro del sistema sino en sus bordes:

- **Lo que la aplicación no controla sola:** la configuración de Supabase Auth y la sesión de
  Google del navegador (P1-01, P3-01).
- **La fidelidad del paciente:** qué recuerda el modelo y si coincide con lo que lee el docente
  (P2-01, P2-02).
- **La evidencia:** las pruebas de extremo a extremo y varias afirmaciones de la documentación
  describen una versión anterior (P5-01, P5-07).

**Los cinco riesgos principales** (los cinco hallazgos medios, en el orden en que conviene
atenderlos):

1. **P1-01 · La contraseña se cambia sin la actual por la API de Auth.** Quien encuentre una
   sesión abierta de un docente se queda con la cuenta. Se cierra con dos ajustes de Supabase.
2. **P5-01 · Los E2E no se han corrido sobre el código actual.** No hay evidencia automática de
   accesibilidad, CSP ni flujo completo para lo que se va a sustentar.
3. **P2-01 · Con Gemini el paciente olvida el principio de la consulta.** Afecta hoy a toda
   práctica de producción que pase de 20 intercambios.
4. **P3-01 · En el modo presencial, la cuenta de Google abierta se elige en dos clics.** Solo si
   el docente entra con Google y no cierra esa sesión al entregar el equipo.
5. **P2-02 · El historial del orquestador y la transcripción pueden separarse sin aviso.** Solo
   importa cuando se active el orquestador.

**Qué es seguro desplegar.**

| Qué                                                             | ¿Es seguro? | Condición                                                                                                                                                             |
| --------------------------------------------------------------- | ----------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Dejar `main` (`90a2a80`) en producción                          | Sí          | Los hallazgos P1-01, P2-01 y P3-01 ya existen ahí; ninguno empeora por esperar unos días                                                                              |
| Llevar `develop` a `main` con `IA_PROVEEDOR=gemini`             | Sí          | Sus tres migraciones ya están aplicadas y solo añaden. Antes, correr los E2E (P5-01)                                                                                  |
| Aplicar ya la migración de permisos por defecto (P1-02 y P1-03) | Sí          | Solo afecta a funciones futuras y a una secuencia que nadie usa por la API: funciona con el código viejo y con el nuevo                                               |
| Evaluación con estudiantes reales, a distancia                  | Sí, después | Activar los ajustes de contraseña (P1-01), retirar el Administrador de prueba (P4-01), correr los E2E y completar el consentimiento                                   |
| Modo presencial con docentes que entran con contraseña          | Sí          | —                                                                                                                                                                     |
| Modo presencial con docentes que entran con Google              | Todavía no  | Hasta corregir P3-01, o con la instrucción expresa de cerrar Google antes de entregar el equipo                                                                       |
| Activar el orquestador con estudiantes                          | Todavía no  | Faltan P2-02, P2-03 y P2-07, las comprobaciones contra el servicio real (sección 14 de `docs/orquestador.md`) y actualizar el aviso de privacidad y el consentimiento |

### Plan de corrección

Lotes pequeños, cada uno en su rama desde `develop`, con `pnpm check` en verde antes del commit.
El orden es el sugerido; los lotes no dependen entre sí salvo donde se indica.

**Lote 0 · Sin código (hacerlo primero).**

- En Supabase Auth: activar «Require current password when updating» y «Secure password change»,
  y el aviso por correo de contraseña cambiada (P1-01). Probar el cambio de contraseña con una
  cuenta `@psysim.test`; si la acción falla, pasar al lote 3 antes de dejarlo activo.
- Restaurar `.env.test.local` y correr `pnpm test:e2e --workers=1` sobre `develop`; registrar el
  resultado en `docs/pruebas/` (P5-01).
- Antes de la primera sesión con estudiantes reales: crear el Administrador real y desactivar
  `admin@psysim.test` y las cuentas de prueba que sobren (P4-01).

**Lote 1 · `fix/memoria-del-paciente` (P2-01). Esfuerzo S.**

- Subir la ventana de contexto hasta cubrir el tope de la práctica, con una prueba de 40
  intercambios. Sin migración.
- Verificación: prueba unitaria y una conversación larga desde el laboratorio.

**Lote 2 · `fix/permisos-por-defecto` (P1-02, P1-03, P1-05). Esfuerzo S.**

- Una migración «solo añade» (se puede aplicar antes de desplegar): quitar `authenticated` de los
  privilegios por defecto de funciones; `revoke` de la secuencia `peticion_ia_id_seq`;
  `canjear_codigo` responde `anulado` si el docente no está activo (misma firma).
- Generalizar `seguridad.test.ts` a todas las funciones `security definer` y corregir las frases
  de `CLAUDE.md` y de `docs/estado-del-proyecto.md`.
- Verificación: `pnpm check` y repetir la consulta de privilegios en la base.

**Lote 3 · `fix/sesion-y-contrasena` (P1-01 en código, P1-04, P3-03). Esfuerzo M.**

- `cambiarContrasena` envía la contraseña actual como la pide Supabase; la DAL rechaza una sesión
  de estudiante iniciada con contraseña (salvo `@psysim.test`).
- Cookies de sesión `httpOnly`; borrar `src/lib/supabase/client.ts`.
- Mientras la contraseña sea temporal, el panel solo deja cambiarla.
- Sin migración. Verificación: E2E de autenticación y prueba manual de Google, refresco y cierre.

**Lote 4 · `fix/entrega-con-google` (P3-01, P3-02). Esfuerzo M.**

- Migración «solo añade»: una columna en `usuario` que solo escribe el servidor con la ventana de
  la entrega. `/auth/callback` rechaza durante esa ventana el acceso con Google del docente que
  entregó, exista o no la cookie.
- `prompt=login` en los accesos desde la entrega; el botón del estudiante aparece cuando el
  docente confirma que cerró Google.
- Al corregir el correo de un docente, desvincular su identidad de Google anterior.
- Verificación: recorrer la entrega en un navegador con una sesión de Google abierta.

**Lote 5 · Solo antes de activar el orquestador.** Tres ramas, en este orden:

- `fix/turno-en-curso` (P2-02, P2-03, P2-07). Esfuerzo M. Migración «solo añade» (marca de turno
  en `sesion_ia`); recorte de respuestas largas; `https` obligatorio.
- `fix/cierre-en-el-servidor` (P2-06, P2-05). Esfuerzo M. `create or replace` de
  `guardar_intercambio_ia` y `reformular_desde` con las mismas firmas.
- `fix/escenarios-inmutables` (P2-04). Esfuerzo M. Antes, preguntarle a Juan José si el
  orquestador relee el escenario en cada turno: si no lo hace, este lote sobra.
- Verificación: pruebas con el orquestador simulado y la lista de la sección 14 contra el real.

**Lote 6 · `fix/accesibilidad-publica` (P5-02, P5-03, P5-04). Esfuerzo S.**

- Enlace de salto en el `layout` raíz; «Ir con el paciente» o giro con teclado; ámbar por tokens,
  número de anotación a 12 px y `motion-safe:` en los indicadores de espera.
- Verificación: `e2e/accesibilidad.spec.ts` y la pasada con NVDA pendiente.

**Lote 7 · `fix/calidad-de-la-escena` (P4-02). Esfuerzo S.**

- `flipflops` y `onFallback` en el monitor de rendimiento; en el respaldo, sin sombras ni efectos.
- Verificación: `e2e/rendimiento.spec.ts` y una prueba en un segundo equipo.

**Lote 8 · Mantenimiento, cuando haya tiempo.**

- `refactor/un-camino-a-gemini` (P5-05), `refactor/animador-paciente` (P5-06) y
  `docs/poner-al-dia` (P5-07: README, estado del proyecto, código sin uso).

### Impacto consolidado en el documento de grado

El documento (`docs/doc_grado/latex/capitulos/`) describe el sistema con Gemini como único
proveedor: **no menciona el orquestador ni el tiempo de consulta**. Antes de tocar nada conviene
decidir qué versión se sustenta: la de `main` (que coincide con el documento) o la de `develop`
(que exige ampliar los capítulos 4 y 5).

**Capítulo 1 · Descripción del trabajo.**

- _Resultados del trabajo de grado:_ si la tabla cita cifras de pruebas, actualizarlas (2009
  unitarias hoy frente a 1402).
- _Alcance:_ declarar si el orquestador y el tiempo de consulta entran en el alcance o quedan como
  trabajo posterior a la versión evaluada.
- _Uso de la inteligencia artificial:_ esta auditoría se hizo con un asistente de IA. Corresponde
  declararla en «Herramientas empleadas» y en «Verificación y control de calidad», con la salvedad
  de que sus hallazgos se comprobaron en el código y en la base, no se tomaron por ciertos.

**Capítulo 2 · Marco de referencia.** Sin cambios derivados de la auditoría.

**Capítulo 3 · Selección de la tecnología.** Sin cambios derivados de la auditoría (sigue
pendiente lo que ya estaba: la pantalla de las pruebas T-01 a T-12).

**Capítulo 4 · Diseño e implementación.**

- _Arquitectura y despliegue:_ declarar que staging y producción comparten la base de datos y que
  no hay un entorno de pruebas separado (P4-01).
- _Contrato con la API de IA y tolerancia a fallos:_ el texto habla de un límite de 30 s de la
  función; en `develop` la función admite 60 s y la petición tiene un plazo propio de 55 s. Los 12
  y 25 s de Gemini siguen siendo ciertos.
- _Tolerancia a fallos y límites de uso:_ el documento ya declara que el historial se limita a 40
  mensajes. Falta su consecuencia: en consultas largas el paciente pierde el inicio (P2-01). Si
  se corrige, actualizar la cifra.
- _Reglas fijas del paciente:_ confirmado. La frase sobre el filtro («diez palabras seguidas») es
  exacta; conviene añadir que no detecta paráfrasis ni traducciones.
- _Continuidad y ensayo:_ confirmado para Gemini.
- _Indicadores de la práctica:_ confirmado que la plataforma no evalúa y que los indicadores son
  descriptivos y los calcula la base de datos.
- _Accesibilidad:_ tres frases necesitan matiz. «Toda la aplicación se opera con teclado, incluida
  la simulación»: el botón de conversar aparece solo estando cerca del paciente y la cámara no
  gira con teclado (P5-02). «Cada par de colores se calculó»: es cierto para los tokens, no para
  los colores escritos a mano (P5-04). Y las páginas públicas no tienen enlace de salto (P5-03).
- _Seguridad:_ confirmado con evidencia nueva (RLS en las 18 tablas, permisos por columna, prueba
  en vivo de lo que ve un estudiante, cabeceras activas en producción). Matices: «desactivar una
  cuenta corta su acceso al instante» es cierto para la cuenta, pero sus códigos siguen canjeables
  (P1-05); y hay que añadir como limitaciones la falta de segundo factor, de caducidad de sesión
  y el cambio de contraseña por la API mientras no se activen los ajustes (P1-01).
- _Si se incluye `develop`:_ hacen falta secciones nuevas para el orquestador (proveedor externo,
  respaldo, cierre automático, qué datos salen) y para el tiempo de consulta, con sus tablas en el
  modelo de datos.

**Capítulo 5 · Evaluación.**

- _Entorno y resultados de la ejecución final:_ las cifras son del 3 de noviembre sobre `0e0f66f`.
  Repetir la corrida sobre la versión que se sustenta y actualizar fecha, commit y totales
  (P5-01).
- _Verificación de los requerimientos:_ el límite de mensajes a la IA, la validación en el
  servidor y la separación de roles quedan confirmados. Siguen abiertos los requisitos «pendiente:
  verificación manual».
- _Rendimiento:_ los 75 FPS son de un solo equipo con GPU integrada; declarar que no hay medición
  en equipos más modestos ni un modo de calidad reducida (P4-02).
- _Accesibilidad:_ la evidencia automática es anterior al rediseño del panel; falta la pasada con
  lector de pantalla.
- _Evaluación de experiencia de uso, consideraciones éticas:_ el consentimiento y el aviso de
  privacidad deben nombrar a quien procese la conversación en la versión evaluada. Si alguna
  sesión es presencial con el equipo del docente, aplicar antes la precaución de P3-01.
- _Discusión:_ recoger las limitaciones de abajo.

**Capítulo 6 · Conclusiones.**

- _Limitaciones:_ sin segundo factor ni caducidad de sesión (plan gratuito de Supabase); base
  compartida entre staging y producción; dependencia de servicios de terceros para el paciente;
  memoria limitada del paciente en consultas largas; simulación que requiere teclado, ratón y
  aceleración por hardware; cierre automático por crisis solo con el orquestador.
- _Trabajo futuro:_ entorno de pruebas separado con E2E en la CI; modelo de amenazas escrito;
  validación del orquestador contra el servicio real; modo de calidad reducida; evaluación del
  realismo clínico de los 12 pacientes.

**Anexos.**

- _Anexo I (verificación manual):_ añadir dos comprobaciones: cambiar la contraseña por la API con
  una sesión abierta (debe fallar tras el lote 0) y recorrer la entrega presencial con una sesión
  de Google abierta.
- _Anexo J (consentimiento):_ nombrar al proveedor de IA de la versión evaluada.
- _Anexo H (modelos 3D):_ los créditos de los modelos CC BY deben verse también en la plataforma.
