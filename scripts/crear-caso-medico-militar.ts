/**
 * Crea en «Mis casos» de un docente el caso «El médico que volvió de la guerra»: un médico militar
 * que ya regresó a su servicio y aún carga con el trauma de lo que vivió en combate.
 *
 * Pasa por los mismos esquemas y funciones que el constructor guiado (`casoFormSchema`,
 * `filasDelCaso`), así que el caso queda igual que si se hubiera creado desde la interfaz y se
 * puede reabrir y editar allí. Es idempotente: si el docente ya tiene un caso con ese título, no
 * crea otro.
 *
 * Uso:  node --env-file=.env.local --conditions=react-server --import ./scripts/alias-src.mjs \
 *         scripts/crear-caso-medico-militar.ts [correo-del-docente]
 * (por defecto, docente1@psysim.test). Requiere NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SECRET_KEY.
 */
import { filasDelCaso } from '@/lib/casos/construir';
import { createAdminClient } from '@/lib/supabase/admin';
import { casoFormSchema } from '@/schemas/caso.schema';

const correo = process.argv[2] ?? 'docente1@psysim.test';

const caso = casoFormSchema.parse({
  titulo: 'El médico que volvió de la guerra',
  categoria: 'clinico',
  dificultad: 'avanzado',
  competenciaCentral: 'Alianza terapéutica y abordaje del trauma con un colega de la salud',
  consultorio: 'scenes/e-07.json',
  nombre: 'Mauricio Peña',
  edad: 34,
  ocupacion: 'Médico militar',
  situacion:
    'Médico militar que sirvió dos años en una zona de combate atendiendo heridos y volvió hace ' +
    'seis meses a su trabajo en un hospital. En lo laboral rinde, pero duerme poco, se sobresalta ' +
    'con los ruidos fuertes y evita hablar de lo que vio. Viene por insistencia de su pareja, ' +
    'convencido de que él es quien debería ayudar, no ser ayudado.',
  sintomas: ['insomnio', 'irritabilidad', 'concentracion', 'culpa', 'aislamiento', 'panico'],
  sintomasExtra:
    'Se sobresalta con ruidos fuertes, tiene recuerdos intrusivos de heridos que no pudo salvar ' +
    'y evita las conversaciones sobre la guerra.',
  actitudes: ['reservado', 'desconfiado', 'evasivo'],
  seAbreSi:
    'el estudiante reconoce que es médico y no lo trata como un paciente más; respeta los ' +
    'silencios; le pregunta por el presente antes que por la guerra',
  seCierraSi:
    'le piden detalles de lo ocurrido muy pronto; le dicen que entienden lo que vivió; lo ' +
    'interpretan o lo diagnostican en voz alta',
  riesgo: 'ninguno',
  fraseApertura:
    'Mire, no sé muy bien qué hago aquí. Mi pareja insistió. Yo estoy bien, solo duermo mal.',
  notas:
    'Es médico: habla de sí mismo con lenguaje clínico y tiende a intelectualizar. Antes de hablar ' +
    'de la guerra en primera persona la menciona en tercera («uno ve cosas»). Al principio ' +
    'responde corto y cambia de tema hacia su trabajo.',
  secretos: [
    {
      dato:
        'Un soldado joven murió en sus manos y se culpa por no haberlo salvado; lo sueña casi ' +
        'todas las noches',
      condicion: 'el estudiante le pregunta con calma por las noches y los sueños, sin presionarlo',
    },
    {
      dato: 'Toma sedantes del hospital, sin receta ni control, para poder dormir',
      condicion: 'siente que no lo van a juzgar como colega ni lo van a denunciar',
    },
    {
      dato:
        'Una vez se escondió detrás de una puerta cuando sonó una alarma en el hospital y le ' +
        'da vergüenza',
      condicion: 'el estudiante normaliza esa reacción sin interpretarla',
    },
  ],
  modoTexto: false,
  promptManual: '',
});

const admin = createAdminClient();

const { data: usuarios, error: errorUsuarios } = await admin.auth.admin.listUsers({
  page: 1,
  perPage: 1000,
});
if (errorUsuarios) {
  console.error('No pudimos leer las cuentas.');
  process.exit(1);
}
const docente = usuarios.users.find(u => u.email === correo);
if (!docente) {
  console.error(`No existe una cuenta con el correo ${correo}.`);
  process.exit(1);
}

const { data: existente } = await admin
  .from('escenario')
  .select('id, codigo')
  .eq('docente_id', docente.id)
  .eq('titulo', caso.titulo)
  .eq('activo', true)
  .maybeSingle();
if (existente) {
  console.info(`Ese caso ya existe (${existente.codigo}). No se creó otro.`);
  process.exit(0);
}

const { escenario, npc } = filasDelCaso(caso);

let id: string | null = null;
let codigo = '';
for (let intento = 0; intento < 5 && !id; intento++) {
  codigo = `C-${String(Math.floor(Math.random() * 1e8)).padStart(8, '0')}`;
  const { data, error } = await admin
    .from('escenario')
    .insert({ ...escenario, codigo, docente_id: docente.id })
    .select('id')
    .single();
  if (!error) id = data.id;
  else if (error.code !== '23505') {
    console.error(`No pudimos crear el caso (${error.code}).`);
    process.exit(1);
  }
}
if (!id) {
  console.error('No pudimos generar un código libre para el caso.');
  process.exit(1);
}

const { error: errorNpc } = await admin.from('npc').insert({ ...npc, escenario_id: id });
if (errorNpc) {
  await admin.from('escenario').update({ activo: false }).eq('id', id);
  console.error(`No pudimos crear el paciente (${errorNpc.code}); el caso se archivó.`);
  process.exit(1);
}

console.info(`Caso creado: ${codigo} «${caso.titulo}» para ${correo}.`);
