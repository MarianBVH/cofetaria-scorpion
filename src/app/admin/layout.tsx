'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { supabase } from '@/lib/supabaseClient'

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [isAuthorized, setIsAuthorized] = useState(false)

  useEffect(() => {
    const checkAdmin = async () => {
      // Luăm sesiunea curentă
      const { data: { session } } = await supabase.auth.getSession()
      
      if (!session) {
        router.push('/login')
        return
      }

      // Verificăm rolul în baza de date
      const { data } = await supabase
        .from('profiles')
        .select('rol')
        .eq('id', session.user.id)
        .single()
      
      if (data?.rol !== 'admin') {
        router.push('/') // Dacă e doar user, îl dăm afară pe prima pagină
        return
      }

      // Dacă a trecut de verificări, îi dăm voie
      setIsAuthorized(true)
    }

    checkAdmin()
  }, [router])

  // Cât timp verifică, arătăm un mesaj de încărcare
  if (!isAuthorized) {
    return <div className="text-center py-20 text-[#5c3d2e] font-bold text-xl">Se verifică permisiunile...</div>
  }

  return <>{children}</>
}