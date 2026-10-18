import { codigoVisibleCaso } from '@/lib/escenarios/etiquetas';
import { cn } from '@/lib/utils';

/**
 * Código visible de un caso. Los predefinidos (E-01…) van en mono porque son códigos; «Propio» es
 * una palabra y va en la tipografía del texto.
 */
export function CodigoCaso({ codigo, className }: { codigo: string; className?: string }) {
  const visible = codigoVisibleCaso(codigo);
  return <span className={cn(className, visible === 'Propio' && 'font-sans')}>{visible}</span>;
}
