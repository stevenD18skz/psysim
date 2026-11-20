'use client';

import {
  InvitacionRecorrido,
  type PasoRecorrido,
  RecorridoGuiado,
} from '@/components/ayuda/recorrido-guiado';

export const ID_RECORRIDO_ASIGNAR = 'asignar-practica';

const PASOS_ASIGNAR_PRACTICA: readonly PasoRecorrido[] = [
  {
    id: 'caso',
    selector: '[data-tour="config-caso"]',
    titulo: 'Elige un caso para la entrevista',
    descripcion:
      'Alterna entre tus casos propios y los predefinidos de PsySim. Solo seleccionas un caso por código; si quieres quitarlo, vuelve a pulsar su tarjeta.',
    consejo: 'Puedes buscar por título, nombre del paciente o competencia clínica.',
    ladoPreferido: 'bottom',
  },
  {
    id: 'paciente',
    selector: '[data-tour="config-paciente"]',
    titulo: 'Ajusta al paciente si lo necesitas',
    descripcion:
      'El caso ya viene listo para usar. Cuando lo eliges, aquí ves su perfil clínico y puedes hacerlo más accesible o más retador solo para esta práctica.',
    consejo: 'Las reglas de seguridad y coherencia clínica siempre se mantienen activas.',
    ladoPreferido: 'bottom',
  },
  {
    id: 'estudiante',
    selector: '[data-tour="config-estudiante"]',
    titulo: 'Selecciona estudiante, duración y plazo',
    descripcion:
      'Busca a un estudiante con cuenta de Google o regístralo aquí mismo. Luego define cuántos minutos durará la consulta y cuántos días servirá el código.',
    consejo: 'Cada código es personal, de un solo uso y funciona desde su propio computador.',
    ladoPreferido: 'top',
  },
  {
    id: 'generar',
    selector: '[data-tour="config-generar"]',
    titulo: 'Genera el código o guarda tu versión',
    descripcion:
      'Al pulsar «Generar código» obtendrás el código y enlace directo listos para enviar. Si hiciste ajustes al paciente, también puedes guardarlos como caso propio.',
    consejo:
      'Después de generar un código, el caso queda elegido para asignárselo enseguida a otro estudiante.',
    ladoPreferido: 'top',
  },
];

/** Invitación inicial y recorrido guiado paso a paso para la pantalla «Asignar práctica». */
export function RecorridoAsignarPractica() {
  return (
    <>
      <InvitacionRecorrido
        id={ID_RECORRIDO_ASIGNAR}
        titulo="¿Primera vez asignando una práctica?"
        descripcion="Recorre los 4 puntos clave para elegir un caso, ajustar al paciente y generar el código de acceso."
      />
      <RecorridoGuiado
        id={ID_RECORRIDO_ASIGNAR}
        nombre="Recorrido guiado para asignar una práctica"
        pasos={PASOS_ASIGNAR_PRACTICA}
      />
    </>
  );
}
