import type { Metadata, Viewport } from 'next';
import type { ReactNode } from 'react';
import './globals.css';

export const metadata: Metadata = {
  title: 'NutriApp · Mi dieta',
  description: 'Tu plan de alimentación y rutina de ejercicio.',
  appleWebApp: { capable: true, title: 'NutriApp', statusBarStyle: 'default' },
  icons: { icon: '/icon-192.png', apple: '/apple-touch-icon.png' },
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  themeColor: '#047857',
};

const CAPTURAR_AVISO = `
window.addEventListener('beforeinstallprompt', function(e) {
  e.preventDefault();
  window.__avisoInstalacion = e;
  window.dispatchEvent(new Event('nutri-instalacion-cambio'));
});
window.addEventListener('appinstalled', function() {
  window.__avisoInstalacion = null;
  window.dispatchEvent(new Event('nutri-instalacion-cambio'));
});`;

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="es-PE" className="h-full antialiased">
      <head>
        <script dangerouslySetInnerHTML={{ __html: CAPTURAR_AVISO }} />
      </head>
      <body className="min-h-full">{children}</body>
    </html>
  );
}
