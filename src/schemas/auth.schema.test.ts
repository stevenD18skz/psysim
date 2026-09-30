import { describe, expect, it } from 'vitest';

import { loginSchema } from './auth.schema';

function erroresDe(valores: unknown) {
  const resultado = loginSchema.safeParse(valores);
  return resultado.success ? {} : resultado.error.flatten().fieldErrors;
}

describe('loginSchema', () => {
  it('acepta credenciales válidas y normaliza el correo', () => {
    const resultado = loginSchema.parse({
      correo: '  Docente@CorreoUnivalle.edu.co ',
      contrasena: 'secreta123',
    });
    expect(resultado.correo).toBe('docente@correounivalle.edu.co');
  });

  it('exige el correo', () => {
    expect(erroresDe({ correo: '', contrasena: 'secreta123' }).correo?.[0]).toBe(
      'Ingresa tu correo institucional.'
    );
  });

  it('valida el formato del correo', () => {
    expect(erroresDe({ correo: 'no-es-correo', contrasena: 'secreta123' }).correo?.[0]).toBe(
      'Ingresa un correo electrónico válido.'
    );
  });

  it('exige una longitud mínima de contraseña', () => {
    expect(erroresDe({ correo: 'a@b.co', contrasena: 'corta' }).contrasena?.[0]).toBe(
      'La contraseña debe tener al menos 8 caracteres.'
    );
  });

  it('limita la longitud máxima de contraseña', () => {
    expect(erroresDe({ correo: 'a@b.co', contrasena: 'x'.repeat(73) }).contrasena).toBeDefined();
  });
});
