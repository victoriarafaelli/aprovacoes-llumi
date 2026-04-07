import type { Metadata } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'Aprovação de Conteúdo',
  description: 'Plataforma de aprovação de conteúdo para social media',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body className="min-h-screen bg-gray-50">{children}</body>
    </html>
  )
}
