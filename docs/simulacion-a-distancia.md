# Simulación a distancia: códigos de acceso y retroalimentación

El docente prepara la simulación y el estudiante la hace desde su propio equipo, con su cuenta.
Al terminar, el docente revisa el chat, comenta frases concretas y publica una retroalimentación
con nota. El estudiante ve sus prácticas y la retroalimentación publicada.

## Flujo

1. **Registro** (`/estudiantes` → «Registrar estudiante»). El docente ingresa el código, el nombre
   y el correo `@correounivalle.edu.co` del estudiante. El servidor le crea la cuenta (usuario de
   Auth confirmado y sin contraseña, perfil `usuario` con rol `estudiante`). Si otro docente ya lo
   registró, se reutiliza la misma cuenta.
2. **Asignación** (`/configuracion`). El docente elige el caso, ajusta el comportamiento del
   paciente, elige al estudiante y la vigencia del código (1, 3, 7 o 30 días; 7 por defecto).
   Obtiene un código de un solo uso al estilo de Meet (`abc-defg-hij`), un enlace directo
   (`/unirse/abc-defg-hij`) y un mensaje listo para copiar. Desde la ficha del estudiante puede
   anular los códigos que aún no se han usado.
3. **Práctica** (`/practicas`). El estudiante entra con «Continuar con Google», escribe el código
   (o abre el enlace) y llega a la simulación. Si cierra el navegador, la retoma desde «Mis
   prácticas» mientras siga en curso. Termina con «Finalizar sesión» en el HUD.
4. **Seguimiento del docente** (`/estudiantes/[id]`, `/sesiones/[id]`). Mientras el estudiante
   practica, el docente solo ve «Simulación en progreso» (la página se actualiza sola). Si el
   estudiante nunca termina, el docente puede «Dar por interrumpida» la sesión.
5. **Retroalimentación** (`/sesiones/[id]`). El docente selecciona una frase de una intervención
   del estudiante, pulsa «Comentar selección» y escribe el comentario. Escribe la retroalimentación
   general y la nota (0,0 a 5,0). Se guarda como borrador hasta que pulsa «Publicar». Después de
   publicar puede seguir corrigiendo: el estudiante ve la versión actualizada.
6. **Relectura** (`/practicas/[id]`). Antes de la publicación, el estudiante ve su conversación y la
   etiqueta «Pendiente de retroalimentación». Después ve la nota, la retroalimentación general y sus
   frases subrayadas, cada una con su comentario.

## Modo presencial: practicar en el computador del docente

Para practicar en clase, el docente puede entregar su computador en lugar de enviar el código. Los
roles nunca se mezclan: la práctica queda en la cuenta del estudiante, que después lee ahí la
retroalimentación.

1. **Entrega.** En el diálogo del código recién generado, o en un código sin usar de la ficha del
   estudiante, el docente pulsa «Practicar en este equipo» y confirma. `entregarEquipo`
   (`src/lib/equipo-compartido/actions.ts`) comprueba con RLS que el código sea suyo y siga
   vigente, guarda para quién es el equipo en la cookie `psysim-entrega` (solo servidor) y marca el
   equipo como compartido con `psysim-equipo-compartido` (legible en el navegador). Las dos duran
   4 horas. Después cierra la sesión del docente y lleva a `/entrega`. El botón solo aparece en un
   computador.
2. **`/entrega`.** Saluda al estudiante por su nombre y le recuerda el caso. «Continuar con Google»
   vuelve directo a `/unirse/<código>`. «¿No eres …? Volver a entrar como docente» cancela la
   entrega.
3. **Práctica.** Es igual que a distancia. Mientras el equipo esté marcado como compartido, la barra
   del estudiante muestra «Equipo compartido · Cerrar sesión» y el cierre de la práctica ofrece
   «Cerrar sesión en este equipo» como acción principal.
4. **`/entrega/fin`.** Al cerrar la sesión se borran las marcas y se pide cerrar también la sesión
   de Google (`https://accounts.google.com/Logout`).

El último paso es necesario porque cerrar la sesión de PsySim no cierra la de Google. Si queda
abierta, el siguiente estudiante vería esa cuenta en el selector de Google y podría entrar con ella
sin contraseña. Por la misma razón, la pantalla de entrega pide al docente cerrar su sesión de
Google si la tiene vinculada.

Además, mientras haya una entrega en curso, `/auth/callback` solo acepta cuentas de estudiante: si
alguien elige en Google la cuenta del docente, la sesión se cierra y vuelve a `/entrega` con un
aviso. El docente recupera su equipo entrando con su contraseña, que borra las marcas, o con
«Volver a entrar como docente».

## Base de datos

Migraciones `20261007010000_rol_estudiante`, `20261007020000_codigos_acceso_retroalimentacion` y
`20261007030000_anotacion_fragmento_default`.

| Objeto                             | Para qué                                                                                                                                                                 |
| ---------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `rol_usuario` + `estudiante`       | Rol de las cuentas de estudiante. `es_estudiante()` lee el claim del JWT.                                                                                                |
| `estudiante.correo` / `usuario_id` | Correo con el que entra y enlace a su cuenta. Lo asigna un trigger a partir del correo: el cliente no puede elegir la cuenta.                                            |
| `asignacion`                       | Código de acceso: docente, estudiante, caso, copia del prompt, vencimiento, anulación y la sesión creada al canjearlo.                                                   |
| `canjear_codigo(p_codigo)`         | `security definer`. Verifica que el código sea del estudiante, que siga vigente y no esté anulado; crea la sesión (o devuelve la misma si sigue en curso).               |
| `retroalimentacion`                | Una por sesión: comentario general, nota y `publicada_en` (lo fecha un trigger; no se despublica).                                                                       |
| `anotacion`                        | Frase subrayada: mensaje, posiciones `[inicio, fin)` en puntos de código, fragmento (lo calcula un trigger) y comentario. Sin solapes y solo en mensajes del estudiante. |
| `estudiante_resumen`               | Vista con las sesiones en curso, las pendientes de retroalimentación, la nota promedio y los códigos sin usar.                                                           |

### Seguridad (RLS)

- La sesión la crea solo `canjear_codigo`. El estudiante la comienza y la finaliza; el docente solo
  puede darla por interrumpida.
- Solo el estudiante escribe en el chat (`/api/npc/chat` responde 403 al docente).
- El estudiante no lee `escenario`, `npc`, `asignacion` ni la columna `sesion.prompt_sistema`: así
  no ve cómo debe actuar el paciente. El servidor lee el caso y el prompt con la clave secreta
  después de comprobar con RLS que la sesión es suya (`src/lib/sesiones/datos-privados.ts`).
- El estudiante solo ve la retroalimentación y las anotaciones publicadas.

## Configuración pendiente: acceso con Google

El código está listo, pero el proveedor de Google debe activarse en Supabase:

1. En Google Cloud Console, crea un cliente OAuth de tipo «Aplicación web». En «URI de
   redireccionamiento autorizados» agrega `https://afqofsneoblsjjdvktsu.supabase.co/auth/v1/callback`.
   Si la universidad lo permite, configura la pantalla de consentimiento como «Interna» para el
   dominio `correounivalle.edu.co`.
2. En Supabase → Authentication → Sign In / Providers → Google, actívalo con el Client ID y el
   Client Secret.
3. Deja **desactivado** «Allow new users to sign up». Las cuentas las crea el docente al registrar
   al estudiante; Supabase enlaza la identidad de Google a esa cuenta por el correo. Un correo no
   registrado vuelve con `signup_disabled` y ve «Acceso denegado».
4. En URL Configuration, las URL de retorno ya incluyen `http://localhost:3000/**` y
   `https://psysim.vercel.app/**`, que cubren `/auth/callback`.

## Cuentas de prueba

`pnpm db:seed` crea `estudiante1@psysim.test` y `estudiante2@psysim.test` con contraseña (los
estudiantes reales entran con Google, que no se puede automatizar). `psysim.test` es un dominio
reservado: ninguna cuenta de Google puede tenerlo, y la base de datos lo acepta solo para pruebas.
Los E2E leen `E2E_ESTUDIANTE_*` y `E2E_ESTUDIANTE2_*`.
