export type ModoInstalacion = 'oculto' | 'nativo' | 'ios';

export function decidirInstalacion(estado: {
  abiertaComoApp: boolean;
  hayAvisoNativo: boolean;
  esIos: boolean;
  iosYaInstalada: boolean;
}): ModoInstalacion {
  if (estado.abiertaComoApp) return 'oculto';
  if (estado.hayAvisoNativo) return 'nativo';
  if (estado.esIos && !estado.iosYaInstalada) return 'ios';
  return 'oculto';
}

export function esDispositivoIos(userAgent: string, plataforma: string, puntosTactiles: number): boolean {
  return /iPhone|iPad|iPod/.test(userAgent) || (plataforma === 'MacIntel' && puntosTactiles > 1);
}
