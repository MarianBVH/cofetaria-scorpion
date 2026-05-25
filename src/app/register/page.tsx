'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Stări pentru butoanele de ascuns/arătat parola
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  const [formData, setFormData] = useState({
    nume: '',
    prenume: '',
    email: '',
    telefon: '',
    judet: '',
    oras: '',
    adresa: '',
    parola: '',
    confirmareParola: ''
  })

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    if (formData.parola !== formData.confirmareParola) {
      setError('Parolele nu coincid!')
      return
    }

    setLoading(true)

    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.parola,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            nume: `${formData.nume} ${formData.prenume}`,
            telefon: formData.telefon,
            judet: formData.judet,
            oras: formData.oras,
            adresa: formData.adresa,
            rol: 'user'
          }
        ])

      if (profileError) {
        setError('Eroare la salvarea profilului: ' + profileError.message)
      } else {
        // Redirecționare hard pentru a forța reîncărcarea cu noul cont
        window.location.href = '/login?registered=true'
      }
    }
    setLoading(false)
  }

  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-6">Înregistrare Cont Nou</h2>
      
      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Nume *</label>
            <input type="text" name="nume" required onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Prenume *</label>
            <input type="text" name="prenume" required onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email *</label>
          <input type="email" name="email" required onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Județ</label>
            <input type="text" name="judet" onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Oraș</label>
            <input type="text" name="oras" onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Adresă completă</label>
          <textarea name="adresa" rows={2} onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Telefon</label>
          <input type="text" name="telefon" onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Parolă *</label>
            <div className="relative mt-1 flex items-center">
              <input 
                type={showPassword ? "text" : "password"} 
                name="parola" 
                required minLength={6} 
                onChange={handleChange} 
                className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 text-gray-600 hover:text-[#5c3d2e] font-bold text-xs bg-white px-1"
              >
                {showPassword ? "Ascunde" : "Vezi"}
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Confirmă *</label>
            <div className="relative mt-1 flex items-center">
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmareParola" 
                required minLength={6} 
                onChange={handleChange} 
                className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 text-gray-600 hover:text-[#5c3d2e] font-bold text-xs bg-white px-1"
              >
                {showConfirmPassword ? "Ascunde" : "Vezi"}
              </button>
            </div>
          </div>
        </div>

        <button type="submit" disabled={loading} className="w-full bg-[#dda15e] text-white font-bold py-2 px-4 rounded hover:bg-[#bc8a50] transition disabled:opacity-50 mt-4">
          {loading ? 'Se procesează...' : 'Creează Cont'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Ai deja cont? <Link href="/login" className="text-[#dda15e] font-bold">Autentifică-te</Link>.
      </p>
    </div>
  )
}