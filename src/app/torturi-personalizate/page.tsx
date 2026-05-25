'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function TorturiPersonalizate() {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)
  const [userId, setUserId] = useState<string | null>(null)

  // Stări pentru gestionarea câmpurilor din formular
  const [tipTort, setTipTort] = useState('ciocolata')
  const [greutate, setGreutate] = useState('2')
  const [ocazie, setOcazie] = useState('zi_de_nastere')
  const [mesaj, setMesaj] = useState('')
  const [descriere, setDescriere] = useState('')
  const [imagine, setImagine] = useState<File | null>(null)

  // Verificăm dacă utilizatorul este logat în momentul încărcării paginii
  useEffect(() => {
    const checkUser = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      if (session?.user) {
        setUserId(session.user.id)
      }
    }
    checkUser()
  }, [])

  // Modificat: Funcția acum adaugă în coșul local în loc să salveze direct în baza de date
  const handleAdaugaInCos = async (e: React.FormEvent) => {
    e.preventDefault()
    
    // Forțăm autentificarea deoarece avem nevoie de un utilizator valid pentru personalizare
    if (!userId) {
      setError('Trebuie să fii autentificat pentru a adăuga un tort personalizat în coș.')
      return
    }

    setLoading(true)
    setError(null)
    
    let imagineUrl = ''

    // 1. Încărcăm imaginea în storage chiar acum pentru a genera link-ul public.
    // Facem asta pentru a nu pierde fișierul binar când utilizatorul schimbă paginile.
    if (imagine) {
      const extensie = imagine.name.split('.').pop()
      const numeFisier = `custom_${Date.now()}_${Math.random().toString(36).substring(7)}.${extensie}`
      
      const { data: imgData, error: imgError } = await supabase.storage
        .from('produse')
        .upload(numeFisier, imagine)

      if (imgError) {
        setError('Eroare la încărcarea imaginii de referință: ' + imgError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('produse').getPublicUrl(numeFisier)
      imagineUrl = publicUrl
    }

    // 2. Construim obiectul complet cu specificațiile unice ale tortului comandat
    const tortPersonalizatInCos = {
      id_temporar: `custom_${Date.now()}`, // ID unic pe serverul local pentru a putea manipula produsul în coș (ex. ștergere)
      tip_tort: tipTort,
      greutate: parseFloat(greutate),
      ocazie,
      mesaj,
      descriere,
      imagine_referinta: imagineUrl,
      cantitate: 1
    }

    // 3. Citim coșul custom existent în LocalStorage, adăugăm noul tort și salvăm înapoi
    const cosCustomExistent = JSON.parse(localStorage.getItem('custom_cart') || '[]')
    cosCustomExistent.push(tortPersonalizatInCos)
    localStorage.setItem('custom_cart', JSON.stringify(cosCustomExistent))

    // Declanșăm evenimentul global pentru a anunța Navbar-ul să își actualizeze numărul de produse afișat
    window.dispatchEvent(new Event('cartUpdated'))

    setSuccess(true)
    setLoading(false)
  }

  // Interfața de confirmare după adăugarea cu succes în coș
  if (success) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg border border-gray-100 text-center">
        <div className="text-6xl mb-4">🛒</div>
        <h1 className="text-3xl font-bold text-[#5c3d2e] mb-4">Tortul a fost adăugat în coș!</h1>
        <p className="text-gray-700 text-lg mb-8">
          Specificațiile tortului tău au fost salvate în coș. Poți continua cumpărăturile pentru a adăuga și alte prăjituri sau poți merge la coș pentru a finaliza comanda.
        </p>
        <div className="flex gap-4 justify-center">
          <Link href="/" className="bg-[#5c3d2e] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#3e2a20] transition">
            Continuă Cumpărăturile
          </Link>
          <Link href="/cart" className="bg-[#dda15e] text-white font-bold py-3 px-6 rounded-lg hover:bg-[#bc8a50] transition">
            Vezi Coșul
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 mb-16 p-6 md:p-10 bg-white rounded-xl shadow-lg border border-gray-100 text-gray-900">
      <div className="text-center mb-10">
        <h1 className="text-3xl md:text-4xl font-extrabold text-[#5c3d2e] mb-4">✨ Torturi Personalizate</h1>
        <p className="text-gray-600 text-lg">Ai o idee specială? Încarcă o poză de referință, alege compoziția și adaugă tortul în coș.</p>
      </div>

      {!userId && (
        <div className="bg-yellow-50 border-l-4 border-yellow-400 p-4 mb-8">
          <p className="text-sm text-yellow-700 font-bold">
            Pentru a plasa o comandă personalizată trebuie să ai un cont. <Link href="/login" className="underline">Autentifică-te aici</Link>.
          </p>
        </div>
      )}

      {error && <div className="bg-red-50 text-red-600 p-4 mb-6 rounded border border-red-200">{error}</div>}

      <form onSubmit={handleAdaugaInCos} className="space-y-6">
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Compoziție dorită *</label>
            <select 
              value={tipTort} onChange={e => setTipTort(e.target.value)}
              className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 focus:border-[#dda15e] focus:outline-none bg-gray-50"
            >
              <option value="ciocolata">Ciocolată / Fructe de pădure</option>
              <option value="fructe">Fructe proaspete / Diplomat</option>
              <option value="vanilie">Vanilie / Caramel</option>
              <option value="red_velvet">Red Velvet</option>
              <option value="alta">Altă compoziție (specifică în detalii)</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Greutate estimată (kg) *</label>
            <input 
              type="number" step="0.5" min="1" value={greutate} onChange={e => setGreutate(e.target.value)}
              className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 focus:border-[#dda15e] focus:outline-none bg-gray-50" required
            />
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Pentru ce ocazie? *</label>
            <select 
              value={ocazie} onChange={e => setOcazie(e.target.value)}
              className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 focus:border-[#dda15e] focus:outline-none bg-gray-50"
            >
              <option value="zi_de_nastere">Zi de naștere</option>
              <option value="aniversare">Aniversare</option>
              <option value="nunta">Nuntă</option>
              <option value="botez">Botez</option>
              <option value="alta">Alt eveniment</option>
            </select>
          </div>

          <div>
            <label className="block text-sm font-bold text-gray-700 mb-2">Mesaj pe tort (Opțional)</label>
            <input 
              type="text" placeholder="Ex: La mulți ani, Maria!" value={mesaj} onChange={e => setMesaj(e.target.value)}
              className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 focus:border-[#dda15e] focus:outline-none bg-gray-50"
            />
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Detalii suplimentare / Instrucțiuni de design</label>
          <textarea 
            rows={4} placeholder="Descrie cum vrei să arate..." value={descriere} onChange={e => setDescriere(e.target.value)}
            className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 focus:border-[#dda15e] focus:outline-none bg-gray-50"
          ></textarea>
        </div>

        <div className="border-2 border-dashed border-gray-300 p-6 rounded-lg text-center bg-gray-50">
          <label className="block text-sm font-bold text-gray-700 mb-2">Încarcă o poză de referință (Opțional)</label>
          <input 
            type="file" accept="image/*" onChange={e => { if (e.target.files) setImagine(e.target.files[0]) }}
            className="w-full max-w-sm mx-auto text-gray-900 file:mr-4 file:py-2 file:px-4 file:rounded-full file:border-0 file:text-sm file:font-bold file:bg-[#dda15e] file:text-white hover:file:bg-[#bc8a50] cursor-pointer"
          />
        </div>

        <div className="pt-4">
          <button 
            type="submit" disabled={loading || !userId} 
            className="w-full bg-[#dda15e] text-white font-bold py-4 px-6 rounded-lg hover:bg-[#bc8a50] transition disabled:opacity-50 disabled:cursor-not-allowed text-lg shadow-md"
          >
            {loading ? 'Se procesează...' : 'Adaugă în Coș'}
          </button>
        </div>

      </form>
    </div>
  )
}