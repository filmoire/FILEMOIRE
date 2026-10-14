import "@fontsource/eb-garamond/400.css";
import "@fontsource/eb-garamond/400-italic.css";
import "@fontsource/eb-garamond/600.css";
import "@fontsource/inter/400.css";
import "@fontsource/inter/500.css";
import "@fontsource/inter/600.css";
import "./globals.css";
import type { Metadata, Viewport } from "next";
import { Providers } from "@/components/shell/providers";

export const metadata: Metadata = {
  title: {
    default: "Filémoire — Une question à la fois, une vie à transmettre.",
    template: "%s · Filémoire",
  },
  description:
    process.env.NEXT_PUBLIC_APP_MODE === "live"
      ? "Filémoire : offrir des questions, recueillir une histoire de famille et créer un livre."
      : "Prototype interactif Filémoire : offrir des questions, recueillir une histoire de famille, créer un livre. Données fictives, intégrations simulées.",
  robots: { index: false, follow: false },
};

export const viewport: Viewport = {
  themeColor: "#4C253B",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="fr">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
