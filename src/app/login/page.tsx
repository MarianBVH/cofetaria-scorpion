'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Login() {
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)
    setLoading(true)

    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    if (authError) {
      setError('Email sau parolă incorectă.')
      setLoading(false)
      return
    }

    // Navigare "hard" pentru a forța Navbar-ul să se actualizeze
    window.location.href = '/'
  }

  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-6">Autentificare</h2>

      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm">
          {error}
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
            <a href="#" className="text-xs text-[#dda15e] hover:underline">Ai uitat parola?</a>
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
          {loading ? 'Se verifică...' : 'Intră în cont'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Nu ai cont? <Link href="/register" className="text-[#dda15e] font-bold">Înregistrează-te</Link>.
      </p>
    </div>
  )
}