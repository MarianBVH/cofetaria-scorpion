'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Login() {
  // Stocăm datele introduse de utilizator în formulare
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  // Stare pentru a comuta vizibilitatea parolei în câmpul de input
  const [showPassword, setShowPassword] = useState(false)
  
  // Stări pentru gestionarea interfeței pe durata cererilor asincrone
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Nouă stare: o folosesc pentru a afișa mesaje de succes (ex: când s-a trimis emailul de resetare)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  // Funcția principală care gestionează procesul de autentificare
  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    // Aici apelez API-ul Supabase pentru a autentifica utilizatorul cu email și parolă
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    // Dacă Supabase returnează o eroare, o afișez în interfață
    if (authError) {
      setError('Email sau parolă incorectă.')
      setLoading(false)
      return
    }

    // Navigare "hard" (prin window.location) pentru a forța reîncărcarea paginii
    // Astfel mă asigur că Navbar-ul și restul componentelor preiau noua sesiune din Supabase
    window.location.href = '/'
  }

  // Funcție nouă: gestionează trimiterea emailului de resetare a parolei
  const handleResetareParola = async () => {
    setError(null)
    setSuccessMessage(null)

    // Validez ca utilizatorul să fi introdus adresa de email înainte de a cere resetarea
    if (!email) {
      setError('Te rog să introduci adresa de email în câmpul de mai sus pentru a reseta parola.')
      return
    }

    setLoading(true)

    // Apelez funcția Supabase care trimite un email cu un link securizat de resetare.
    // Setez 'redirectTo' către o pagină specială din aplicația mea unde utilizatorul va scrie noua parolă.
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (resetError) {
      setError('A apărut o eroare la trimiterea emailului: ' + resetError.message)
    } else {
      setSuccessMessage('Am trimis un link pentru resetarea parolei pe adresa ta de email. Te rog să verifici inbox-ul!')
    }
    
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-6">Autentificare</h2>

      {/* Afișarea erorilor generale */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm font-bold">
          ⚠ {error}
        </div>
      )}

      {/* Afișarea mesajelor de succes (ex: email trimis) */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-3 mb-4 rounded border border-green-200 text-sm font-bold">
          ✓ {successMessage}
        </div>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            required 
            onChange={(e) => setEmail(e.target.value)} 
            className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" 
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">Parolă</label>
            {/* Am transformat link-ul vechi într-un buton care declanșează funcția de resetare */}
            <button 
              type="button" 
              onClick={handleResetareParola}
              className="text-xs text-[#dda15e] font-bold hover:underline"
            >
              Ai uitat parola?
            </button>
          </div>
          <div className="relative mt-1 flex items-center">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              onChange={(e) => setPassword(e.target.value)} 
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

        <button type="submit" disabled={loading} className="w-full bg-[#5c3d2e] text-white font-bold py-2 px-4 rounded hover:bg-[#3e2a20] transition disabled:opacity-50 mt-4">
          {loading ? 'Se procesează...' : 'Intră în cont'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Nu ai cont? <Link href="/register" className="text-[#dda15e] font-bold">Înregistrează-te</Link>.
      </p>
    </div>
  )
}