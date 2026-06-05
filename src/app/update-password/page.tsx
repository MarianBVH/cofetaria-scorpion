'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function UpdatePassword() {
  // Stocăm valorile introduse pentru parola nouă
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Stare pentru a ascunde/afișa caracterele parolei
  const [showPassword, setShowPassword] = useState(false)
  
  // Stări pentru gestionarea interfeței (încărcare, erori, succes)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Asigur că verific dacă utilizatorul a ajuns aici cu o sesiune validă (primită prin link-ul din email)
  useEffect(() => {
    // Supabase interceptează automat token-ul din URL și creează sesiunea
    // Aici verific doar dacă totul a decurs bine.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Link-ul de resetare este invalid sau a expirat. Te rog să ceri altul de pe pagina de login.')
      }
    })
  }, [])

  // Funcția care execută efectiv schimbarea parolei în baza de date
  const handleUpdatePassword = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    
    // Prima validare de securitate la nivel de frontend
    if (newPassword !== confirmPassword) {
      setError('Parolele introduse nu coincid!')
      return
    }

    if (newPassword.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.')
      return
    }

    setLoading(true)

    // Aici apelez metoda Supabase pentru a actualiza datele utilizatorului logat
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    if (updateError) {
      setError('Eroare la actualizarea parolei: ' + updateError.message)
    } else {
      // Dacă actualizarea a fost cu succes, actualizez interfața pentru a-i afișa mesajul
      setSuccess(true)
    }
    
    setLoading(false)
  }

  // Interfața de succes afișată DUPĂ ce parola a fost schimbată
  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 border rounded-lg shadow-sm text-center">
        <div className="text-5xl text-green-500 mb-4">✓</div>
        <h2 className="text-2xl font-bold text-[#5c3d2e] mb-4">Parolă actualizată!</h2>
        <p className="text-gray-600 mb-8">
          Parola ta a fost modificată cu succes. Acum poți folosi noua parolă pentru a te autentifica în aplicație.
        </p>
        <Link href="/" className="bg-[#5c3d2e] text-white font-bold py-3 px-6 rounded hover:bg-[#3e2a20] transition inline-block">
          Mergi la pagina principală
        </Link>
      </div>
    )
  }

  // Interfața principală a formularului de resetare
  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-2">Setează Parola Nouă</h2>
      <p className="text-center text-sm text-gray-500 mb-6">
        Introdu mai jos o parolă nouă pentru contul tău.
      </p>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm font-bold">
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        
        <div>
          <label className="block text-sm font-medium text-gray-700">Parolă nouă</label>
          <div className="relative mt-1 flex items-center">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              minLength={6}
              onChange={(e) => setNewPassword(e.target.value)} 
              className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-20" 
            />
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 text-gray-600 hover:text-[#5c3d2e] font-bold text-sm bg-white px-2 py-1"
            >
              {showPassword ? "Ascunde" : "Vezi"}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmă parola nouă</label>
          <div className="relative mt-1 flex items-center">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              minLength={6}
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-20" 
            />
          </div>
        </div>

        <button 
          type="submit" 
          disabled={loading || !!error?.includes('invalid')} 
          className="w-full bg-[#dda15e] text-white font-bold py-3 px-4 rounded hover:bg-[#bc8a50] transition disabled:opacity-50 mt-4 shadow-sm"
        >
          {loading ? 'Se salvează...' : 'Salvează parola'}
        </button>
      </form>
    </div>
  )
}