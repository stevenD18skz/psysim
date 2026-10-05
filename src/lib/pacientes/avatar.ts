/**
 * Rostro (avatar) de cada paciente. El aspecto del paciente 3D viene incluido en la escena que
 * usa el caso (`configuracion_3d`), así que el avatar se resuelve por escena: un caso propio que
 * use el "Consultorio cálido" muestra el mismo rostro que el escenario E-01.
 *
 * Las imágenes están en `public/pacientes/`: WebP cuadrado (256 a 512 px). Para reemplazar un
 * rostro basta con sustituir el archivo conservando su nombre. Si falta alguno, la interfaz
 * muestra las iniciales del paciente (ver `AvatarPaciente`).
 */
const CARPETA = '/pacientes';

const AVATAR_POR_ESCENA: Record<string, string> = {
  'scenes/e-01.json': 'marta-lucia',
  'scenes/e-02.json': 'andres-felipe',
  'scenes/e-03.json': 'laura-sofia',
  'scenes/e-04.json': 'julian-david',
  'scenes/e-05.json': 'carolina',
  'scenes/e-06.json': 'santiago',
};

/** Ruta pública del avatar del paciente de una escena, o `null` si no hay uno asignado. */
export function avatarDeEscena(configuracion3d: string): string | null {
  const archivo = AVATAR_POR_ESCENA[configuracion3d];
  return archivo ? `${CARPETA}/${archivo}.webp` : null;
}
