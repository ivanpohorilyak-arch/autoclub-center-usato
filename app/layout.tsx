import "./globals.css"
import type { Metadata, Viewport } from "next"
import { RegisterSW } from "../components/pwa/register-sw"

export const metadata: Metadata = {
  title: "Autoclub Center Usato 2.1",
  description: "Gestione parco usato Autoclub",
  manifest: "/manifest.json",
  applicationName: "Autoclub",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "Autoclub",
  },
  icons: {
    icon: [
      { url: "/favicon.ico" },
      { url: "/icon-192.png", sizes: "192x192", type: "image/png" },
      { url: "/icon-512.png", sizes: "512x512", type: "image/png" },
    ],
    apple: { url: "/apple-touch-icon.png", sizes: "180x180", type: "image/png" },
  },
  formatDetection: {
    telephone: false,
  },
}

export const viewport: Viewport = {
  themeColor: "#0f172a",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  viewportFit: "cover",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>
        {children}
        <RegisterSW />
      </body>
    </html>
  )
}
