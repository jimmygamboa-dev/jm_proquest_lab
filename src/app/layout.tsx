import type { Metadata, Viewport } from 'next';
import './globals.css';
import { StoreProvider } from '../lib/store';
import { Header } from '../components/layout/Header';

export const metadata: Metadata = {
  title: 'JM PROQUEST · Sistema Operativo y Trazabilidad V1',
  description: 'Control de producción, trazabilidad en 4 segmentos y dashboard de rendimiento para planta de harina de grillo.',
  manifest: '/manifest.json',
};

export const viewport: Viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="es">
      <body className="min-h-screen bg-slate-100 flex flex-col font-sans antialiased text-slate-900 selection:bg-blue-500 selection:text-white">
        <StoreProvider>
          <Header />
          <main className="flex-1 pb-16">{children}</main>
        </StoreProvider>
      </body>
    </html>
  );
}
