import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="/dist/pagefind-ui.css" rel="stylesheet" />
        <script src="/dist/pagefind-ui.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}

