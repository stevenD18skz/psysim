# Observabilidad

Cómo saber qué pasa en PsySim cuando ya está en producción, sin mirar conversaciones ni datos de
personas. Lo que se puede comprobar en el código lo vigila `src/lib/calidad.test.ts`; las alertas
dependen del proyecto de Vercel y las crea quien lo administre (sección 5).

## 1. Qué se mide

| Señal                     | De dónde sale                                                       | Para qué sirve                                             |
| ------------------------- | ------------------------------------------------------------------- | ---------------------------------------------------------- |
| Registros del servidor    | `log.info/warn/error` (`src/lib/log.ts`), una línea JSON            | Seguir una práctica, un fallo de IA o de base de datos     |
| Errores del navegador     | `TelemetriaCliente` → `POST /api/telemetria`                        | Errores que el servidor nunca ve                           |
| Core Web Vitals reales    | `useReportWebVitals` → `/api/telemetria` (LCP, INP, CLS, FCP, TTFB) | Rendimiento de visitas reales, no de laboratorio           |
| Salud de la aplicación    | `GET /api/salud` y `GET /api/salud?profunda=1`                      | Monitor externo; la versión profunda toca la base de datos |
| Identificador de petición | `x-request-id` (lo fija el proxy, viaja en la respuesta)            | Unir el registro de una petición con lo que vio la persona |

Nada de esto lleva correos, nombres, contraseñas, tokens ni el texto de las conversaciones. La
telemetría del navegador quita parámetros y fragmentos de la ruta, oculta direcciones, correos y
códigos de acceso de los mensajes, y no registra la dirección IP.

## 2. Registros estructurados

Una línea JSON por evento: `{"nivel":"error","evento":"npc_chat.ia_fallo","peticion":"…","tipo":"limite"}`.
Vercel agrega la hora. El nombre del evento es `area.evento`, en minúsculas.

| Evento                              | Nivel | Qué significa                                                                         |
| ----------------------------------- | ----- | ------------------------------------------------------------------------------------- |
| `npc_chat.respuesta`                | info  | Respuesta del paciente entregada (con su latencia)                                    |
| `npc_chat.limite_alcanzado`         | info  | Un estudiante superó los mensajes por minuto (429)                                    |
| `npc_chat.tope_de_sesion`           | info  | La práctica llegó al máximo de 150 intervenciones                                     |
| `npc_chat.ia_fallo`                 | error | La IA falló; el campo `tipo` dice cómo (`fuga_de_instrucciones`, `limite`, `tiempo`…) |
| `npc_chat.*_no_leido/_no_guardados` | error | La base de datos falló al leer o guardar                                              |
| `metrics_save.no_guardadas`         | error | No se guardaron las métricas al terminar una práctica                                 |
| `auth.login_fallo`, `auth.google_*` | error | Falló el acceso con correo o con Google                                               |
| `auth.perfil_no_leido`              | error | Entró alguien sin perfil legible: cuenta sin configurar                               |
| `auth.cierre_no_revocado`           | warn  | Se cerró la sesión local, pero Supabase no confirmó                                   |
| `cliente.error`                     | error | Error de JavaScript en un navegador (con ruta y `digest`)                             |
| `cliente.vital`                     | info  | Una métrica web real (`nombre`, `valor`, `valoracion`)                                |

Para seguir un caso: copia el `x-request-id` de la respuesta (pestaña Red del navegador) o el
`digest` que muestra la pantalla de error, y búscalo en los registros de Vercel.

## 3. Comprobación de salud

- `GET /api/salud` → `200 {"estado":"ok","revision":"abc1234"}`. No toca la base de datos: puede
  consultarse cada minuto sin costo.
- `GET /api/salud?profunda=1` → además mide la base de datos (`base_de_datos_ms`); responde `503
{"estado":"degradado"}` si no responde, sin detalles internos.
- Nunca devuelve variables de entorno, versiones de paquetes ni mensajes de error.

## 4. Telemetría del navegador: cómo se protege

`/api/telemetria` es público a propósito (un error puede ocurrir antes de iniciar sesión), así que
se limita: solo el mismo sitio (403 si no), 2 KiB como máximo (413), esquema estricto (400), 40
envíos por minuto y dirección (429, en la memoria de cada instancia) y 8 eventos por visita desde
el navegador. No escribe en la base de datos.

## 5. Alertas para crear en Vercel (pendiente del administrador)

Se crean en **Vercel → Observability → Alerts** (o con consultas guardadas sobre los registros).
Umbrales iniciales para una beta con pocos usuarios; se ajustan con datos reales.

| Alerta                     | Condición                                                         | Qué hacer                                                  |
| -------------------------- | ----------------------------------------------------------------- | ---------------------------------------------------------- |
| Errores del servidor (5xx) | Más de 5 respuestas 5xx en 10 minutos                             | Mirar `npc_chat.*` y `metrics_save.*`; ¿Gemini o Supabase? |
| Picos de 429               | Más de 20 `npc_chat.limite_alcanzado` en 10 minutos               | ¿Una clase entera practicando a la vez o un abuso?         |
| Fuga del prompt            | Cualquier `npc_chat.ia_fallo` con `tipo = fuga_de_instrucciones`  | Revisar la conversación de esa sesión y las reglas de IA   |
| Base de datos caída        | `/api/salud?profunda=1` responde 503 dos veces seguidas           | Estado de Supabase; las prácticas abiertas siguen vivas    |
| Aplicación caída           | `/api/salud` no responde 200 en 2 minutos                         | Última implementación; revertir si hace falta              |
| Errores del navegador      | Más de 10 `cliente.error` con el mismo mensaje en 15 minutos      | Un despliegue nuevo rompió una pantalla                    |
| Rendimiento real           | LCP del percentil 75 mayor de 2,5 s en 24 horas (`cliente.vital`) | Comparar con `docs/auditoria-rendimiento.md`               |

Un monitor externo gratuito (UptimeRobot, Better Stack) sobre `/api/salud` cubre «aplicación
caída» sin depender de Vercel.

## 6. Fuera de alcance (a propósito)

- **Trazas distribuidas / OpenTelemetry y Sentry:** con una sola aplicación y pocos usuarios, el
  registro con identificador de petición alcanza. Si el proyecto crece, el nombre de los eventos ya
  permite migrar sin tocar las rutas.
- **Analítica de comportamiento:** PsySim no rastrea a las personas; solo mide el sistema.
