// Tipos mínimos del paquete `draco3dgltf` (no publica declaraciones propias).
declare module 'draco3dgltf' {
  interface Draco3dGltf {
    createDecoderModule(): Promise<unknown>;
    createEncoderModule(): Promise<unknown>;
  }
  const draco3d: Draco3dGltf;
  export default draco3d;
}
