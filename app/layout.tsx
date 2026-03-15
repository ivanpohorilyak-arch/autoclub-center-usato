import "./globals.css"

export const metadata = {
  title: "Autoclub Center Usato 2.1",
  description: "Gestione parco usato Autoclub",
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="it">
      <body>{children}</body>
    </html>
  )
}
