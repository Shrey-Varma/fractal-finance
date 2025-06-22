import React from 'react';
import './globals.css';

export const metadata = {
  title: 'Fractal - Personal Finance Automation',
  description: 'Automate your personal finance with intelligent rules',
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