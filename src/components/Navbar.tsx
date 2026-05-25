'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function Navbar() {
  const router = useRouter()
  const [user, setUser] = useState<any>(null)
  const [isAdmin, setIsAdmin] = useState(false)

  useEffect(() => {
    // 1. Verificăm dacă există deja o sesiune activă când se încarcă pagina
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUser(session.user)
        checkRole(session.user.id)
      }
    }
    checkUser()

    // 2. Ascultăm schimbările (când cineva se loghează sau se deloghează)
    const { data: authListener } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (session?.user) {
        setUser(session.user)
        checkRole(session.user.id)
      } else {
        setUser(null)
        setIsAdmin(false)
      }
    })

    return () => {
      authListener.subscription.unsubscribe()
    }
  }, [])

  // Funcție pentru a verifica dacă utilizatorul e admin din tabela 'profiles'
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

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/' // Refacem navigarea "hard" și aici
  }

  return (
    <nav className="bg-[#5c3d2e] text-white shadow-md sticky top-0 z-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between h-16 items-center">
          
          <div className="flex-shrink-0">
            <Link href="/" className="text-xl font-bold tracking-wider hover:text-[#dda15e] transition">
              🍰 Cofetăria Scorpion
            </Link>
          </div>

          <div className="flex space-x-6 items-center">
            <Link href="/" className="hover:text-[#dda15e] transition">Acasă</Link>
            
            {/* Coșul este vizibil DOAR dacă utilizatorul NU este admin */}
            {!isAdmin && (
              <Link href="/cart" className="hover:text-[#dda15e] transition font-medium text-[#dda15e]">🛒 Coș</Link>
            )}

            {/* Meniul de Admin (Apare doar dacă isAdmin e true) */}

            {/* Meniul de Admin (Apare doar dacă isAdmin e true) */}
            {isAdmin && (
              <div className="flex space-x-4 border-l border-[#7a5240] pl-4 ml-2">
                <Link href="/admin/produse" className="text-[#ffcc80] hover:text-white transition">Gest. Prăjituri</Link>
                <Link href="/admin/comenzi" className="text-[#ffcc80] hover:text-white transition">Gest. Comenzi</Link>
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
                    // Dacă e logat
                    <>
                      {/* Aceste butoane apar DOAR dacă utilizatorul NU este admin */}
                      {!isAdmin && (
                        <>
                          <Link href="/profil" className="block px-4 py-2 hover:bg-gray-50 border-b border-gray-100">Date personale</Link>
                          <Link href="/profil/istoric" className="block px-4 py-2 hover:bg-gray-50 border-b border-gray-100">Istoric comenzi</Link>
                        </>
                      )}
                      
                      {/* Butonul de deconectare apare pentru toată lumea */}
                      <button onClick={handleLogout} className="w-full text-left px-4 py-2 hover:bg-red-50 text-red-600 transition">
                        Deconectare
                      </button>
                    </>
                  ) : (
                    // Dacă NU e logat
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