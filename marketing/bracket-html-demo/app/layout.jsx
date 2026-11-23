import '../src/demo.css';

export const metadata = {
  title: 'Bracket — Una jornada, de principio a fin',
  description: 'Descubre cómo consultar jornadas, registrar un marcador y presentar la clasificación en Bracket. Demostración HTML con datos ficticios.',
  icons: { icon: '/logo_app.png' },
};

export default function RootLayout({ children }) {
  return <html lang="es"><body>{children}</body></html>;
}
