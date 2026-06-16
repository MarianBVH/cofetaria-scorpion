'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

// Componenta Navbar gestionează bara de navigare principală a aplicației.
// Aceasta include rutele publice, secțiunea de administrare și autentificarea utilizatorilor.
export default function Navbar() {
  const router = useRouter()
  
  // --- Stări pentru Autentificare și Roluri ---
  // Reține datele utilizatorului curent (null dacă nu este logat)
  const [user, setUser] = useState<any>(null)
  // Flag care indică dacă utilizatorul curent are drepturi de administrator
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // 1. Verificăm dacă există deja o sesiune activă când se încarcă componenta
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        checkRole(session.user.id)
      }
    }
    checkUser()

    // 2. Setăm un "listener" (ascultător) pentru schimbările stării de autentificare
    // Se declanșează automat când utilizatorul se loghează, se deloghează sau sesiunea expiră
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        checkRole(session.user.id)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    })

    // Funcția de curățare (cleanup) pentru a evita memory leaks când componenta este demontată
    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Funcție pentru a verifica nivelul de acces (rolul) utilizatorului
  // Face o interogare în tabela 'profiles' pentru a vedea dacă câmpul 'rol' este 'admin'
  const checkRole = async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('rol')
      .eq('id', userId)
      .single()
    
    if (data?.rol === 'admin') {
      setIsAdmin(true)
    }
  }

  // Funcție declanșată la apăsarea butonului de deconectare
  const handleLogout = async () => {
    await supabase.auth.signOut()
    // Folosim window.location.href în loc de router.push pentru a forța o reîncărcare completă
    // și curățarea stărilor stocate în memorie / localStorage
    window.location.href = '/' // Refacem navigarea "hard" și aici
  }

  return (
    // Containerul principal - bara este fixată sus (sticky) și are o prioritate vizuală mare (z-50)
    <nav className="bg-[#5c3d2e] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          {/* SECȚIUNEA STÂNGĂ - Logo / Titlu */}
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold tracking-wider hover:text-[#dda15e] transition">
              🍰 Cofetăria Scorpion
            </Link>
          </div>

          {/* SECȚIUNEA DREAPTĂ - Link-uri de navigare și meniul contului */}
          <div className="flex space-x-6 items-center">
            <Link href="/" className="hover:text-[#dda15e] transition">Acasă</Link>
            
            {/* Link pentru Coșul de cumpărături 
                Este ascuns intenționat pentru conturile de admin pentru a nu încurca fluxul */}
            {!isAdmin && (
              <Link href="/cart" className="hover:text-[#dda15e] transition font-medium text-[#dda15e]">🛒 Coș</Link>
            )}

            {/* Meniul de Administrare
                Afișează scurtături către uneltele de gestiune DOAR pentru utilizatorii cu rol 'admin' */}
            {isAdmin && (
              <div className="flex space-x-4 border-l border-[#7a5240] pl-4 ml-2">
                <Link href="/admin/produse" className="text-[#ffcc80] hover:text-white transition">Gest. Prăjituri</Link>
                <Link href="/admin/comenzi" className="text-[#ffcc80] hover:text-white transition">Gest. Comenzi</Link>
                <Link href="/admin/statistici" className="text-[#ffcc80] hover:text-white transition">Statistici</Link>
              </div>
            )}

            {/* Butonul Cont Dinamic */}
            <div className="relative group">
              <button className="hover:text-[#dda15e] transition flex items-center gap-1 py-2">
                Cont ▾
              </button>
              
              <div className="absolute right-0 top-full pt-2 w-48 hidden group-hover:block">
                <div className="bg-white text-gray-800 rounded-md shadow-lg border border-gray-100 overflow-hidden">
                  
                  {user ? (
                    // Meniul pentru un utilizator AUTENTIFICAT
                    <>
                      {/* Aceste opțiuni sunt specifice clienților și sunt ascunse pentru administratori */}
                      {!isAdmin && (
                        <>
                          <Link href="/profil" className="block px-4 py-2 hover:bg-gray-50 border-b border-gray-100">Date personale</Link>
                          <Link href="/profil/istoric" className="block px-4 py-2 hover:bg-gray-50 border-b border-gray-100">Istoric comenzi</Link>
                        </>
                      )}
                      
                      {/* Butonul de deconectare este mereu vizibil pentru orice utilizator logat (client sau admin) */}
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition">
                        Deconectare
                      </button>
                    </>
                  ) : (
                    // Meniul pentru un vizitator NEAUTENTIFICAT (Oaspete)
                    <>
                      <Link href="/login" className="block px-4 py-2 hover:bg-gray-50 border-b border-gray-100">Logare</Link>
                      <Link href="/register" className="block px-4 py-2 hover:bg-gray-50">Înregistrare</Link>
                    </>
                  )}

                </div>
              </div>
            </div>
            
          </div>
        </div>
      </div>
    </nav>
  )
}