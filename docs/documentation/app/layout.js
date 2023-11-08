import './globals.css'

export const metadata = {
  title: 'Wasmo documentation',
  description: 'Wasmo documentation',
}

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  )
}

