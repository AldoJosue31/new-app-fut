import "../src/index.css";
import { WebVitals } from "./_components/WebVitals.jsx";
import Providers from "./providers.jsx";

const deploymentHost =
  process.env.VERCEL_PROJECT_PRODUCTION_URL ||
  process.env.VERCEL_URL;
const metadataOrigin =
  process.env.NEXT_PUBLIC_SITE_URL ||
  (deploymentHost ? `https://${deploymentHost}` : "http://localhost:3000");

export const metadata = {
  metadataBase: new URL(metadataOrigin),
  description: "Gestion de ligas y torneos de futbol.",
  icons: {
    icon: "/logo_app.png",
  },
  title: "Bracket app",
};

export const viewport = {
  initialScale: 1,
  width: "device-width",
};

export default function RootLayout({ children }) {
  return (
    <html lang="es">
      <body>
        <WebVitals />
        <Providers>
          <div id="root">{children}</div>
          <div id="modal-root" />
        </Providers>
      </body>
    </html>
  );
}
