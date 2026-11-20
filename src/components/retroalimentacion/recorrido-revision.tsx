'use client';

import {
  InvitacionRecorrido,
  type PasoRecorrido,
  RecorridoGuiado,
} from '@/components/ayuda/recorrido-guiado';

export const ID_RECORRIDO_REVISION = 'revision-practica';

const PASOS_REVISION_PRACTICA: readonly PasoRecorrido[] = [
  {
    id: 'conversacion',
    selector: '[data-tour="revision-conversacion"]',
    titulo: 'Subraya y comenta frases puntuales',
    descripcion:
      'Selecciona cualquier fragmento escrito por el estudiante (con ratón o Mayús + flechas) y pulsa «Comentar selección». Luego podrás abrir, editar o quitar cada subrayado ámbar.',
    consejo:
      'Solo se subrayan las intervenciones del estudiante para que cada comentario apunte a su desempeño.',
    ladoPreferido: 'right',
  },
  {
    id: 'severidad',
    selector: '[data-tour="revision-severidad"]',
    titulo: 'Lee la severidad emocional del paciente',
    descripcion:
      'Junto a cada respuesta del paciente aparece qué tan alterado estaba en ese momento, de 0 (en calma) a 5 (desbordado). Es una referencia clínica, nunca una calificación automática.',
    ladoPreferido: 'bottom',
  },
  {
    id: 'formulario',
    selector: '[data-tour="revision-formulario"]',
    titulo: 'Escribe la retroalimentación y asigna la nota',
    descripcion:
      'Redacta tu observación general y asigna la nota de 0,0 a 5,0. Puedes guardar borradores privados; el estudiante solo verá todo cuando pulses «Publicar».',
    consejo: 'Si tienes más prácticas pendientes, publicar puede abrir la siguiente al instante.',
    ladoPreferido: 'left',
  },
  {
    id: 'comentarios',
    selector: '[data-tour="revision-comentarios"]',
    titulo: 'Recorre tus comentarios numerados',
    descripcion:
      'Todas las frases que anotaste se ordenan aquí con su número. Pulsa cualquiera para saltar directo al subrayado correspondiente dentro de la conversación.',
    ladoPreferido: 'left',
  },
  {
    id: 'cola',
    selector: '[data-tour="revision-cola"]',
    titulo: 'Pasa a la siguiente práctica sin salir',
    descripcion:
      'Estas flechas recorren tus prácticas pendientes de la más antigua a la más reciente para revisar de corrido sin volver a la lista.',
    ladoPreferido: 'bottom',
  },
];

/** Invitación inicial y recorrido guiado paso a paso para revisar una práctica terminada. */
export function RecorridoRevisionPractica({ tieneMensajes }: { tieneMensajes: boolean }) {
  return (
    <>
      {tieneMensajes && (
        <InvitacionRecorrido
          id={ID_RECORRIDO_REVISION}
          titulo="¿Primera vez revisando una práctica?"
          descripcion="Conoce en pocos pasos cómo subrayar frases del estudiante, interpretar la severidad y publicar tu retroalimentación."
        />
      )}
      <RecorridoGuiado
        id={ID_RECORRIDO_REVISION}
        nombre="Recorrido guiado para revisar una práctica"
        pasos={PASOS_REVISION_PRACTICA}
      />
    </>
  );
}
