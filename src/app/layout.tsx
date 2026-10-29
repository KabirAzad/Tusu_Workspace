import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: {
    default: 'TUSU Workspace',
    template: '%s | TUSU Workspace',
  },
  description:
    'Internal team management app for tusuexplore — tasks, chat, and role-based collaboration in one place.',
  icons: {
    icon: '/tusu.png',
    apple: '/tusu.png',
  },
  robots: 'noindex, nofollow', // internal app, no indexing
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  )
}
