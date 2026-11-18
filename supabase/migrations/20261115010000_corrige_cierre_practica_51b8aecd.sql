-- =============================================================================
-- Corrección de datos: la práctica 51b8aecd no terminó por una crisis.
--
-- El 2026-11-15 el orquestador cerró su sesión con `closing_kind: "success"` (la paciente se
-- calmó: severidad 2,7 → 2,0, sin banderas de riesgo) y PsySim lo guardó como `crisis` porque
-- trataba como crisis todo cierre que no fuera `inappropriate`. El código ya no lo hace
-- (`src/lib/orquestador/cierre.ts`); aquí se corrige la única práctica afectada, para que el
-- docente deje de ver «Cierre automático: el paciente entró en crisis» y la vista del
-- Administrador no la cuente entre los cierres por crisis.
--
-- Solo toca esa práctica y solo si sigue mal etiquetada: aplicarla dos veces, o en una base que
-- no la tiene, no cambia nada. No depende del código desplegado: se puede aplicar ya.
--
-- La sesión c6842e66-90a5-4ca6-a5a6-df4fc85938ab quedó `terminated` del lado del orquestador
-- (PsySim le envió `closing_kind: "crisis"`); eso no se puede corregir desde PsySim.
-- =============================================================================

update public.sesion_ia
   set cierre_motivo = null,
       cierre_en = null
 where sesion_id = '51b8aecd-6e7d-40a4-a701-fdc681d944a1'
   and cierre_motivo = 'crisis';

-- El evento del cierre conserva lo que de verdad dijo el orquestador.
update public.orquestador_evento
   set detalle = 'success'
 where sesion_id = '51b8aecd-6e7d-40a4-a701-fdc681d944a1'
   and tipo = 'cierre'
   and detalle = 'crisis';
