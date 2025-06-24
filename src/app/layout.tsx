import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Fractal - Personal Finance Automation',
  description: 'Automate your personal finance with intelligent rules',
  icons: {
    icon: '/assets/favicon.png',
    shortcut: '/assets/favicon.png',
    apple: '/assets/favicon.png',
  },
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
} 