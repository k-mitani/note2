import './globals.css'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html className="dark">
      <head>
        <link rel="manifest" href="/manifest.json" />
        <link rel="apple-touch-icon" href="/icon.png"></link>
        <link rel="icon" href="/icon.png" />
        <meta name="theme-color" content="#444" />
        <title>note2</title>
      </head>
      <body className='h-screen'>{children}</body>
    </html>
  )
}
