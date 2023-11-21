import './globals.css'

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link href="/wasmo/dist/pagefind-ui.css" rel="stylesheet" />
        <script src="/wasmo/dist/pagefind-ui.js"></script>
      </head>
      <body>{children}</body>
    </html>
  )
}

