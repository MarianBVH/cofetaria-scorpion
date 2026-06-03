'use client'

import { useState, useEffect, use } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { useRouter } from 'next/navigation'
import Link from 'next/link'

// Observă că params este acum declarat ca o Promisiune
export default function EditeazaProdus({ params }: { params: Promise<{ id: string }> }) {
  const router = useRouter()
  
  // Despachetăm parametrii folosind React.use()
  const { id: productId } = use(params)

  const [loadingInitial, setLoadingInitial] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Stări pentru formular
  const [nume, setNume] = useState('')
  const [descriere, setDescriere] = useState('')
  const [pret, setPret] = useState('')
  const [stoc, setStoc] = useState('0')
  const [alergeni, setAlergeni] = useState('')
  const [imagineCurenta, setImagineCurenta] = useState('')
  const [imagineNoua, setImagineNoua] = useState<File | null>(null)

  // Stări pentru Ingrediente
  const [ingredienteSelectate, setIngredienteSelectate] = useState<string[]>([])
  const [listaIngrediente, setListaIngrediente] = useState<{ nume: string }[]>([])
  const [searchIngredient, setSearchIngredient] = useState('')
  const [showMenu, setShowMenu] = useState(false)

  useEffect(() => {
    fetchInitialData()
  }, [productId]) // Adăugăm productId ca dependență

  const fetchInitialData = async () => {
    // 1. Aducem lista globală de ingrediente
    const { data: ingData } = await supabase.from('ingrediente').select('nume').order('nume')
    if (ingData) setListaIngrediente(ingData)

    // 2. Aducem datele produsului curent
    const { data: prodData, error: prodError } = await supabase
      .from('products')
      .select('*')
      .eq('id', productId)
      .single()

    if (prodError || !prodData) {
      setError('Produsul nu a fost găsit.')
    } else {
      setNume(prodData.nume)
      setDescriere(prodData.descriere || '')
      setPret(prodData.pret.toString())
      setStoc(prodData.stoc.toString())
      setAlergeni(prodData.alergeni || '')
      setImagineCurenta(prodData.imagine || '')
      setIngredienteSelectate(prodData.ingrediente || [])
    }
    setLoadingInitial(false)
  }

  const ingredienteFiltrate = listaIngrediente.filter(ing => 
    ing.nume.toLowerCase().includes(searchIngredient.toLowerCase()) &&
    !ingredienteSelectate.includes(ing.nume)
  )

  const adaugaIngredient = async (numeIngredient: string) => {
    const formatNume = numeIngredient.trim()
    if (!formatNume) return

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

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    setError(null)

    let imagineFinalaUrl = imagineCurenta

    // Dacă utilizatorul a selectat o poză nouă, o urcăm în cloud
    if (imagineNoua) {
      const extensie = imagineNoua.name.split('.').pop()
      const numeFisier = `${Date.now()}_${Math.random().toString(36).substring(7)}.${extensie}`
      
      const { data: imgData, error: imgError } = await supabase.storage
        .from('produse')
        .upload(numeFisier, imagineNoua)

      if (imgError) {
        setError('Eroare la încărcarea imaginii noi: ' + imgError.message)
        setLoading(false)
        return
      }

      const { data: { publicUrl } } = supabase.storage.from('produse').getPublicUrl(numeFisier)
      imagineFinalaUrl = publicUrl
    }

    // Actualizăm baza de date
    const { error: dbError } = await supabase
      .from('products')
      .update({
        nume,
        descriere,
        pret: parseFloat(pret),
        stoc: parseInt(stoc),
        alergeni,
        ingrediente: ingredienteSelectate,
        imagine: imagineFinalaUrl
      })
      .eq('id', productId)

    if (dbError) {
      setError('Eroare la actualizarea produsului: ' + dbError.message)
      setLoading(false)
    } else {
      router.push('/admin/produse')
    }
  }

  if (loadingInitial) {
    return <div className="text-center py-20 font-bold text-[#5c3d2e]">Se încarcă datele produsului...</div>
  }

  return (
    <div className="max-w-3xl mx-auto bg-white p-8 rounded-lg shadow-sm border border-gray-100">
      <h1 className="text-2xl font-bold text-[#5c3d2e] mb-6 border-b pb-2">Editează Produsul #{productId}</h1>

      {error && <div className="bg-red-50 text-red-600 p-3 mb-4 rounded">{error}</div>}

      <form onSubmit={handleSubmit} className="space-y-6">
        
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
              <label className="block text-sm font-bold text-gray-700 mb-1">Stoc disponibil</label>
              <input type="number" required value={stoc} onChange={e => setStoc(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
            </div>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold text-gray-700 mb-2">Ingrediente</label>
          <div className="flex flex-wrap gap-2 items-center min-h-[42px] border p-2 rounded bg-gray-50 relative">
            
            {ingredienteSelectate.map((ing, idx) => (
              <div key={idx} className="group relative bg-[#dda15e] text-white px-3 py-1 rounded-full text-sm font-medium cursor-default flex items-center overflow-hidden">
                <span className="group-hover:opacity-0 transition-opacity">{ing}</span>
                <button 
                  type="button" 
                  onClick={() => eliminaIngredient(ing)}
                  className="absolute inset-0 bg-red-500 text-white flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity font-bold"
                >
                  <span className="mr-1">-</span> Elimină
                </button>
              </div>
            ))}

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

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Alergeni</label>
            <textarea value={alergeni} onChange={e => setAlergeni(e.target.value)} rows={3} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none"></textarea>
          </div>
          <div>
            <label className="block text-sm font-bold text-gray-700 mb-1">Descriere Produs</label>
            <textarea value={descriere} onChange={e => setDescriere(e.target.value)} rows={3} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none"></textarea>
          </div>
        </div>

        <div className="border p-4 rounded bg-gray-50">
          <label className="block text-sm font-bold text-gray-700 mb-2">Imagine Produs</label>
          
          {imagineCurenta && (
            <div className="mb-4 flex items-center gap-4">
              <img src={imagineCurenta} alt="Imagine curentă" className="w-20 h-20 object-cover rounded border" />
              <span className="text-sm text-gray-500">Imaginea curentă. Încarcă alta mai jos pentru a o înlocui.</span>
            </div>
          )}

          <input 
            type="file" 
            accept="image/*" 
            onChange={e => { if (e.target.files) setImagineNoua(e.target.files[0]) }}
            className="w-full text-gray-900 file:mr-4 file:py-1 file:px-3 file:rounded file:border-0 file:text-sm file:font-bold file:bg-[#dda15e] file:text-white hover:file:bg-[#bc8a50] cursor-pointer"
          />
        </div>

        <div className="flex gap-4 pt-4 border-t">
          <button type="submit" disabled={loading} className="bg-blue-600 text-white font-bold py-2 px-6 rounded hover:bg-blue-700 transition disabled:opacity-50">
            {loading ? 'Se salvează...' : 'Actualizează Produsul'}
          </button>
          <Link href="/admin/produse" className="bg-gray-400 text-white font-bold py-2 px-6 rounded hover:bg-gray-500 transition">
            Anulează
          </Link>
        </div>

      </form>
    </div>
  )
}