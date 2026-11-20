'use client';

import {
  InvitacionRecorrido,
  type PasoRecorrido,
  RecorridoGuiado,
} from '@/components/ayuda/recorrido-guiado';

export const ID_RECORRIDO_CREAR_CASO = 'crear-caso';

const PASOS_CREAR_CASO: readonly PasoRecorrido[] = [
  {
    id: 'plantilla',
    selector: '[data-tour="caso-plantilla"]',
    titulo: 'Parte de un caso previo o de un ejemplo',
    descripcion:
      'No hace falta empezar en blanco. Puedes elegir cualquier caso predefinido o propio como base y adaptar su dificultad con un clic.',
    consejo:
      'Las plantillas rápidas llenan todos los campos para que solo ajustes lo que necesites.',
    ladoPreferido: 'bottom',
  },
  {
    id: 'identidad',
    selector: '[data-tour="caso-identidad"]',
    titulo: 'Define el caso y su consultorio 3D',
    descripcion:
      'Elige el título, el nivel, la competencia que entrenará el estudiante y el consultorio. Cada consultorio define también la apariencia del paciente.',
    consejo: 'Justo debajo, en «El paciente», completas su nombre, edad y motivo de consulta.',
    ladoPreferido: 'right',
  },
  {
    id: 'actitud',
    selector: '[data-tour="caso-actitud"]',
    titulo: 'Moldea síntomas, actitud y riesgo',
    descripcion:
      'Marca los chips de síntomas y actitud, e indica qué hace que el paciente se abra o se cierre. PsySim transforma tus elecciones en instrucciones clínicas automáticamente.',
    consejo:
      'Las reglas de seguridad clínica se aplican siempre, incluso si editas el texto manual.',
    ladoPreferido: 'right',
  },
  {
    id: 'secretos',
    selector: '[data-tour="caso-secretos"]',
    titulo: 'Define el saludo y lo que guarda',
    descripcion:
      'Escribe la primera frase que dirá el paciente y añade datos reservados que solo revelará si el estudiante pregunta bien o valida sus emociones.',
    consejo:
      'Guardar datos bajo condición evita que el paciente cuente todo en su primera respuesta.',
    ladoPreferido: 'right',
  },
  {
    id: 'preview',
    selector: '[data-tour="caso-preview"]',
    titulo: 'Previsualiza y conversa antes de guardar',
    descripcion:
      'Aquí ves la ficha viva del paciente y un chat de prueba. Cuando completes los campos mínimos, escríbele como estudiante para comprobar su tono.',
    consejo: 'Los mensajes de prueba no se guardan ni consumen códigos de acceso.',
    ladoPreferido: 'left',
  },
];

/** Invitación inicial y recorrido guiado paso a paso para el constructor de casos propios. */
export function RecorridoCrearCaso({ esNuevo }: { esNuevo: boolean }) {
  return (
    <>
      {esNuevo && (
        <InvitacionRecorrido
          id={ID_RECORRIDO_CREAR_CASO}
          titulo="¿Primera vez diseñando un caso clínico?"
          descripcion="Recorre los 5 puntos clave para configurar al paciente, definir qué guarda en reserva y probar cómo conversa antes de guardarlo."
        />
      )}
      <RecorridoGuiado
        id={ID_RECORRIDO_CREAR_CASO}
        nombre="Recorrido guiado para crear un caso"
        pasos={PASOS_CREAR_CASO}
      />
    </>
  );
}
