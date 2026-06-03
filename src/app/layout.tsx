import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'
import Navbar from '@/components/Navbar' // <-- Importăm noua componentă

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'Cofetăria Scorpion | Prăjituri și Torturi în Hârșova',
  description: 'Comandă online cele mai proaspete prăjituri și torturi personalizate din Hârșova.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="ro">
      <body className={`${inter.className} bg-[#fdfbf7] min-h-screen flex flex-col`}>
        
        {/* Folosim componenta Navbar aici */}
        <Navbar />

        {/* CONȚINUTUL PAGINII */}
        <main className="flex-grow max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full">
          {children}
        </main>

        <footer className="bg-gray-800 text-white text-center py-6 mt-auto">
          <p>&copy; {new Date().getFullYear()} Cofetăria Scorpion - Hârșova. Toate drepturile rezervate.</p>
        </footer>
      </body>
    </html>
  )
}