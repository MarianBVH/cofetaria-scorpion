'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

export default function AdaugaProdus() {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stări pentru formularul de bază
  const [nume, setNume] = useState('')
  const [descriere, setDescriere] = useState('')
  const [pret, setPret] = useState('')
  const [stoc, setStoc] = useState('0')
  const [alergeni, setAlergeni] = useState('')
  const [imagine, setImagine] = useState<File | null>(null)

  // Stări pentru INGREDIENTE
  const [ingredienteSelectate, setIngredienteSelectate] = useState<string[]>([])
  const [listaIngrediente, setListaIngrediente] = useState<{ nume: string }[]>([])
  const [searchIngredient, setSearchIngredient] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  // 1. Încărcăm lista de ingrediente din DB la pornire
  useEffect(() => {
    const fetchIngrediente = async () => {
      const { data } = await supabase.from('ingrediente').select('nume').order('nume')
      if (data) setListaIngrediente(data)
    }
    fetchIngrediente()
  }, [])

  // Filtrare ingrediente în timp real
  const ingredienteFiltrate = listaIngrediente.filter(ing => 
    ing.nume.toLowerCase().includes(searchIngredient.toLowerCase()) &&
    !ingredienteSelectate.includes(ing.nume)
  )

  // Adăugare ingredient (existent sau nou)
  const adaugaIngredient = async (numeIngredient: string) => {
    const formatNume = numeIngredient.trim()
    if (!formatNume) return

    // Dacă e complet nou, îl salvăm și în DB pentru a-l găsi data viitoare
    const esteNou = !listaIngrediente.some(i => i.nume.toLowerCase() === formatNume.toLowerCase())
    if (esteNou) {
      await supabase.from('ingrediente').insert([{ nume: formatNume }])
      setListaIngrediente([...listaIngrediente, { nume: formatNume }])
    }

    setIngredienteSelectate([...ingredienteSelectate, formatNume])
    setSearchIngredient('')
    setShowMenu(false)
  }

  const eliminaIngredient = (numeDeSters: string) => {
    setIngredienteSelectate(ingredienteSelectate.filter(i => i !== numeDeSters))
  }

  // TRIMITEREA FORMULARULUI
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let imagineUrl = ''

    // 1. Dacă avem o poză, o urcăm în Supabase Storage
    if (imagine) {
      const extensie = imagine.name.split('.').pop()
      const numeFisier = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extensie}`
      
      const { data: imgData, error: imgError } = await supabase.storage
        .from('produse')
        .upload(numeFisier, imagine)

      if (imgError) {
        setError('Eroare la încărcarea imaginii: ' + imgError.message)
        setLoading(false)
        return
      }

      // Generăm link-ul public către imagine
      const { data: { publicUrl } } = supabase.storage.from('produse').getPublicUrl(numeFisier)
      imagineUrl = publicUrl
    }

    // 2. Salvăm produsul în DB
    const { error: dbError } = await supabase.from('products').insert([{
      nume,
      descriere,
      pret: parseFloat(pret),
      stoc: parseInt(stoc),
      alergeni,
      ingrediente: ingredienteSelectate,
      imagine: imagineUrl // Salvăm linkul generat
    }])

    if (dbError) {
      setError('Eroare la salvarea produsului: ' + dbError.message)
      setLoading(false)
    } else {
      router.push('/admin/produse')
    }
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#5c3d2e] mb-6 border-b pb-2">Adaugă Produs Nou</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
        {/* Nume și Preț */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Nume Produs *</label>
            <input type="text" required value={nume} onChange={e => setNume(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
          <div className="flex gap-4">
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Preț (RON) *</label>
              <input type="number" step="0.01" required value={pret} onChange={e => setPret(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
            </div>
            <div className="flex-1">
              <label className="block text-sm font-bold text-gray-700 mb-1">Stoc inițial</label>
              <input type="number" required value={stoc} onChange={e => setStoc(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
            </div>
          </div>
        </div>

        {/* Sectiune Ingrediente (Cerinta ta specifica) */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Ingrediente</label>
          <div className="flex flex-wrap gap-2 items-center min-h-[42px] border p-2 rounded bg-gray-50 relative">
            
            {/* Lista cu ingredientele deja selectate */}
            {ingredienteSelectate.map((ing, idx) => (
              <div key={idx} className="group relative bg-[#dda15e] text-white px-3 py-1 rounded-full text-sm font-medium cursor-default flex items-center overflow-hidden">
                <span className="group-hover:opacity-0 transition-opacity">{ing}</span>
                
                {/* Butonul de eliminare la hover */}
                <button 
                  type="button" 
                  onClick={() => eliminaIngredient(ing)}
                  className="absolute inset-0 bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                >
                  <span className="mr-1">-</span> Elimină
                </button>
              </div>
            ))}

            {/* Căutare / Adăugare Ingredient Nou */}
            <div className="relative">
              <button 
                type="button" 
                onClick={() => setShowMenu(true)}
                className="bg-gray-200 text-gray-700 hover:bg-gray-300 px-3 py-1 rounded-full text-sm transition"
              >
                + Adaugă
              </button>

              {showMenu && (
                <div className="absolute top-full left-0 mt-2 w-64 bg-white border rounded shadow-xl z-10 p-2">
                  <div className="flex justify-between items-center mb-2">
                    <input 
                      type="text" 
                      placeholder="Caută sau scrie unul nou..." 
                      value={searchIngredient}
                      onChange={e => setSearchIngredient(e.target.value)}
                      className="w-full border p-1 rounded text-sm text-gray-900 bg-white focus:outline-none"
                      autoFocus
                    />
                    <button type="button" onClick={() => setShowMenu(false)} className="ml-2 text-red-500 font-bold px-2">X</button>
                  </div>
                  
                  <div className="max-h-40 overflow-y-auto">
                    {ingredienteFiltrate.map((ing, idx) => (
                      <div 
                        key={idx} 
                        onClick={() => adaugaIngredient(ing.nume)}
                        className="p-2 hover:bg-[#fff3e0] cursor-pointer text-sm text-gray-700"
                      >
                        {ing.nume}
                      </div>
                    ))}
                    
                    {/* Opțiune pentru ingredient complet nou */}
                    {searchIngredient && !listaIngrediente.some(i => i.nume.toLowerCase() === searchIngredient.toLowerCase()) && (
                      <div 
                        onClick={() => adaugaIngredient(searchIngredient)}
                        className="p-2 bg-green-50 text-green-700 hover:bg-green-100 cursor-pointer text-sm font-bold border-t mt-1"
                      >
                        + Adaugă "{searchIngredient}" ca nou
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Alergeni & Descriere */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Alergeni</label>
            <textarea value={alergeni} onChange={e => setAlergeni(e.target.value)} rows={3} placeholder="Ex: gluten, lactoză, nuci..." className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descriere Produs</label>
            <textarea value={descriere} onChange={e => setDescriere(e.target.value)} rows={3} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none"></textarea>
          </div>
        </div>

        {/* Încărcare Imagine */}
        <div>
          <label className="block text-sm font-bold text-gray-700 mb-1">Imagine Produs</label>
          <input 
            type="file" 
            accept="image/*" 
            onChange={e => { if (e.target.files) setImagine(e.target.files[0]) }}
            className="w-full border p-2 rounded bg-gray-50 text-gray-900 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-bold file:bg-[#dda15e] file:text-white hover:file:bg-[#bc8a50] cursor-pointer"
          />
        </div>

        {/* Butoane */}
        <div className="flex gap-4 pt-4 border-t">
          <button type="submit" disabled={loading} className="bg-green-600 text-white font-bold py-2 px-6 rounded hover:bg-green-700 transition disabled:opacity-50">
            {loading ? 'Se salvează...' : 'Salvează Produsul'}
          </button>
          <Link href="/admin/produse" className="bg-gray-400 text-white font-bold py-2 px-6 rounded hover:bg-gray-500 transition">
            Anulează
          </Link>
        </div>

      </form>
    </div>
  )
}