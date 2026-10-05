import { ShieldAlert } from 'lucide-react';
import type { Metadata } from 'next';
import { redirect } from 'next/navigation';

import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { cerrarSesion } from '@/lib/auth/actions';
import { RUTA_LOGIN } from '@/lib/auth/routes';

export const metadata: Metadata = {
  title: 'Acceso denegado',
  robots: { index: false, follow: false },
};

async function volverAlLogin() {
  'use server';
  // Cierra cualquier sesión sin permisos para poder ingresar con otra cuenta.
  await cerrarSesion();
  redirect(RUTA_LOGIN);
}

export default function AccesoDenegadoPage() {
  return (
    <main className="flex flex-1 items-center justify-center bg-muted/40 px-4 py-12">
      <Card className="w-full max-w-md text-center">
        <CardHeader className="items-center">
          <ShieldAlert className="mx-auto mb-2 size-10 text-destructive" aria-hidden />
          <CardTitle>
            <h1 className="text-xl">Acceso denegado</h1>
          </CardTitle>
          <CardDescription>
            PsySim está disponible exclusivamente para docentes. Tu cuenta no tiene las credenciales
            necesarias para acceder a la plataforma.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <p className="text-sm text-muted-foreground">
            Si crees que se trata de un error, contacta al administrador del sistema para que
            habilite tu acceso.
          </p>
          <form action={volverAlLogin}>
            <Button type="submit" variant="outline" className="w-full">
              Volver al inicio de sesión
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
