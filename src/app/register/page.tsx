'use client'

import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Register() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  // Am adăugat această stare pentru a controla ce afișează pagina.
  // Dacă formularul este completat corect și trimis, isSubmitted devine true,
  // iar pagina va afișa mesajul de verificare a email-ului în loc de formular.
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  // Stări pentru butoanele de ascuns/arătat parola (UX îmbunătățit)
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  // Am păstrat structura completă a obiectului formData exact cum am proiectat-o inițial,
  // pentru a captura toate datele de livrare încă de la înregistrare.
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

  // Funcție universală de actualizare a stărilor formularului
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(null)

    // 1. Verificare de bază pe partea de client înainte de a contacta serverul
    if (formData.parola !== formData.confirmareParola) {
      setError('Parolele nu coincid!')
      return
    }

    setLoading(true)

    // 2. Crearea contului în sistemul de autentificare Supabase (tabela auth.users)
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.parola,
    })

    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    // 3. Dacă autentificarea a reușit, populăm tabela 'profiles' legată de acest utilizator
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
        // Tratez eroarea separat pentru a ști dacă a picat la salvarea datelor personale
        setError('Eroare la salvarea profilului: ' + profileError.message)
        setLoading(false)
      } else {
        // MODIFICARE: În loc de `window.location.href = '/login'`, setăm starea la true.
        // Acest lucru va declanșa afișarea interfeței de succes (verificare email).
        setIsSubmitted(true)
        setLoading(false)
      }
    }
  }

  // INTERFAȚA 1: Afișată DOAR DUPĂ o înregistrare cu succes
  if (isSubmitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-extrabold text-[#5c3d2e] mb-4">Verifică-ți adresa de email!</h2>
          <p className="text-gray-600 mb-6">
            Ți-am trimis un link de confirmare pe adresa <span className="font-bold text-gray-900">{formData.email}</span>. 
            Contul tău a fost creat, dar trebuie activat făcând click pe linkul din acel email.
          </p>
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-6 border border-yellow-200">
            <strong>Notă:</strong> Dacă nu găsești email-ul în Inbox, te rog să verifici și folderul Spam / Junk.
          </div>
          <Link href="/login" className="inline-block bg-[#dda15e] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#bc8a50] transition shadow-md w-full">
            Mergi la pagina de Logare
          </Link>
        </div>
      </div>
    )
  }

  // INTERFAȚA 2: Formularul original de înregistrare (afișat implicit)
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