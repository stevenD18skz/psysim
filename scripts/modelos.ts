/**
 * Pipeline de modelos 3D (HU-09 · T03).
 *
 *   pnpm modelos:inspeccionar   → informe de cada GLB: tamaño, dimensiones, animaciones.
 *   pnpm modelos:subir          → optimiza (dedup, prune, Draco) y sube al bucket `modelos-3d`.
 *
 * Fuente: public/models/<carpeta>/<Nombre Original>.glb (los archivos que aporta el equipo).
 * Destino en Storage: <carpeta>/<nombre-en-kebab-case>.glb, que es la ruta que se escribe
 * en los JSON de escena (campo `modelo`).
 */
import { readdirSync, readFileSync, statSync } from 'node:fs';
import path from 'node:path';

import { type Document, NodeIO } from '@gltf-transform/core';
import { ALL_EXTENSIONS } from '@gltf-transform/extensions';
import { dedup, draco, prune, weld } from '@gltf-transform/functions';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import draco3d from 'draco3dgltf';

const RAIZ = path.resolve('public/models');
const BUCKET = 'modelos-3d';

/** "Couch _ Wide.glb" → "couch-wide.glb" (la ruta que acepta el esquema de escena). */
export function nombreKebab(archivo: string): string {
  const base = archivo
    .replace(/\.glb$/i, '')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
  return `${base}.glb`;
}

/** Carpetas que la aplicación sirve directamente desde `public` (no van al bucket). */
const CARPETAS_LOCALES = new Set(['personajes']);

function listarModelos(): { carpeta: string; archivo: string; ruta: string }[] {
  return readdirSync(RAIZ, { withFileTypes: true })
    .filter(entrada => entrada.isDirectory() && !CARPETAS_LOCALES.has(entrada.name))
    .flatMap(carpeta =>
      readdirSync(path.join(RAIZ, carpeta.name))
        .filter(archivo => archivo.toLowerCase().endsWith('.glb'))
        .map(archivo => ({
          carpeta: carpeta.name,
          archivo,
          ruta: path.join(RAIZ, carpeta.name, archivo),
        }))
    );
}

async function crearIO(): Promise<NodeIO> {
  return new NodeIO().registerExtensions(ALL_EXTENSIONS).registerDependencies({
    'draco3d.decoder': await draco3d.createDecoderModule(),
    'draco3d.encoder': await draco3d.createEncoderModule(),
  });
}

function describir(documento: Document) {
  const raiz = documento.getRoot();
  const escena = raiz.getDefaultScene() ?? raiz.listScenes()[0];
  const min = [Infinity, Infinity, Infinity];
  const max = [-Infinity, -Infinity, -Infinity];

  // Caja aproximada: extremos de cada primitiva transformados por la matriz del nodo.
  escena?.traverse(nodo => {
    const malla = nodo.getMesh();
    if (!malla) return;
    const matriz = nodo.getWorldMatrix();
    for (const primitiva of malla.listPrimitives()) {
      const posicion = primitiva.getAttribute('POSITION');
      if (!posicion) continue;
      const pmin = posicion.getMinNormalized([]);
      const pmax = posicion.getMaxNormalized([]);
      for (const x of [pmin[0]!, pmax[0]!])
        for (const y of [pmin[1]!, pmax[1]!])
          for (const z of [pmin[2]!, pmax[2]!]) {
            const p = [
              matriz[0]! * x + matriz[4]! * y + matriz[8]! * z + matriz[12]!,
              matriz[1]! * x + matriz[5]! * y + matriz[9]! * z + matriz[13]!,
              matriz[2]! * x + matriz[6]! * y + matriz[10]! * z + matriz[14]!,
            ];
            p.forEach((v, i) => {
              min[i] = Math.min(min[i]!, v);
              max[i] = Math.max(max[i]!, v);
            });
          }
    }
  });

  const triangulos = raiz
    .listMeshes()
    .flatMap(m => m.listPrimitives())
    .reduce(
      (total, p) =>
        total + (p.getIndices()?.getCount() ?? p.getAttribute('POSITION')?.getCount() ?? 0) / 3,
      0
    );

  return {
    dimensiones: max.map((v, i) => +(v - min[i]!).toFixed(3)),
    min: min.map(v => +v.toFixed(3)),
    max: max.map(v => +v.toFixed(3)),
    triangulos: Math.round(triangulos),
    animaciones: raiz.listAnimations().map(a => a.getName()),
    esqueletos: raiz.listSkins().length,
    texturas: raiz.listTextures().length,
    extensiones: raiz.listExtensionsUsed().map(e => e.extensionName),
  };
}

async function inspeccionar() {
  const io = await crearIO();
  const filtro = process.argv[3]?.toLowerCase();
  for (const { carpeta, archivo, ruta } of listarModelos()) {
    if (filtro && !`${carpeta}/${archivo}`.toLowerCase().includes(filtro)) continue;
    const documento = await io.read(ruta);
    const info = describir(documento);
    const kb = (statSync(ruta).size / 1024).toFixed(0);
    console.log(
      `${carpeta}/${archivo} → ${carpeta}/${nombreKebab(archivo)} | ${kb} KB | ` +
        `dim ${info.dimensiones.join(' × ')} m | min ${info.min.join(',')} | ` +
        `${info.triangulos} tris | tex ${info.texturas} | skins ${info.esqueletos}` +
        (info.animaciones.length ? ` | anim: ${info.animaciones.join(', ')}` : '') +
        (info.extensiones.length ? ` | ext: ${info.extensiones.join(', ')}` : '')
    );
  }
}

/**
 * Crea el bucket público si todavía no existe, con la misma configuración que la migración
 * 20260930010000_escenarios_npc_sesiones.sql (idempotente).
 */
async function asegurarBucket(supabase: SupabaseClient) {
  const { data } = await supabase.storage.getBucket(BUCKET);
  if (data) return;
  const { error } = await supabase.storage.createBucket(BUCKET, {
    public: true,
    fileSizeLimit: 52428800,
    allowedMimeTypes: ['model/gltf-binary'],
  });
  if (error) throw new Error(`No se pudo crear el bucket ${BUCKET}: ${error.message}`);
  console.log(`Bucket "${BUCKET}" creado.`);
}

async function subir() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const clave = process.env.SUPABASE_SECRET_KEY;
  if (!url || !clave) {
    throw new Error('Faltan NEXT_PUBLIC_SUPABASE_URL o SUPABASE_SECRET_KEY en .env.local.');
  }
  const supabase = createClient(url, clave, { auth: { persistSession: false } });
  await asegurarBucket(supabase);
  const io = await crearIO();
  const filtro = process.argv[3]?.toLowerCase();

  let totalOriginal = 0;
  let totalOptimizado = 0;
  for (const { carpeta, archivo, ruta } of listarModelos()) {
    if (filtro && !`${carpeta}/${archivo}`.toLowerCase().includes(filtro)) continue;
    const destino = `${carpeta}/${nombreKebab(archivo)}`;

    const documento = await io.read(ruta);
    // weld solo en mallas estáticas: soldar vértices de mallas con esqueleto puede alterar pesos.
    const conEsqueleto = documento.getRoot().listSkins().length > 0;
    await documento.transform(
      dedup(),
      prune(),
      ...(conEsqueleto ? [] : [weld()]),
      draco({ method: 'edgebreaker' })
    );
    const binario = await io.writeBinary(documento);

    const { error } = await supabase.storage.from(BUCKET).upload(destino, binario, {
      contentType: 'model/gltf-binary',
      cacheControl: '31536000',
      upsert: true,
    });
    if (error) throw new Error(`No se pudo subir ${destino}: ${error.message}`);

    const original = readFileSync(ruta).byteLength;
    totalOriginal += original;
    totalOptimizado += binario.byteLength;
    console.log(
      `✓ ${destino}  ${(original / 1024).toFixed(0)} KB → ${(binario.byteLength / 1024).toFixed(0)} KB`
    );
  }
  console.log(
    `\nTotal: ${(totalOriginal / 1048576).toFixed(1)} MB → ${(totalOptimizado / 1048576).toFixed(1)} MB`
  );
}

const comando = process.argv[2];
if (comando === 'inspeccionar') await inspeccionar();
else if (comando === 'subir') await subir();
else {
  console.error('Uso: node scripts/modelos.ts <inspeccionar|subir> [filtro]');
  process.exit(1);
}
