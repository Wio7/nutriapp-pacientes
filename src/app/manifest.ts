import type { MetadataRoute } from 'next';
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'NutriApp · Mi dieta',
    short_name: 'NutriApp',
    description: 'Tu dieta, rutina y progreso con Camilo Villafranca.',
    lang: 'es-PE',
    start_url: '/hoy',
    display: 'standalone',
    background_color: '#f3f9f5',
    theme_color: '#047857',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png' },
      { src: '/icon-maskable-512.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  };
}
