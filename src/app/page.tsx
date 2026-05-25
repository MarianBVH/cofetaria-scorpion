'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

type Produs = {
  id: number;
  nume: string;
  descriere: string;
  pret: number;
  stoc: number;
  alergeni: string;
  ingrediente: string[];
  imagine: string;
}

export default function Home() {
  const [produse, setProduse] = useState<Produs[]>([])
  const [ingredienteLista, setIngredienteLista] = useState<string[]>([])
  const [loading, setLoading] = useState(true)

  // Stări pentru UI și Filtre
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [sortOrder, setSortOrder] = useState('alpha')
  const [tipFiltru, setTipFiltru] = useState('toate') // NOU: 'toate', 'prajituri', 'torturi'
  
  const [ingredientFilters, setIngredientFilters] = useState<Record<string, number>>({})
  const [currentPage, setCurrentPage] = useState(1)
  const produsePePagina = 24

  const [cantitati, setCantitati] = useState<Record<number, number>>({})
  const [produsModal, setProdusModal] = useState<Produs | null>(null)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    fetchData()
  }, [])

  const fetchData = async () => {
    const { data: prodData } = await supabase.from('products').select('*').order('nume')
    if (prodData) setProduse(prodData)

    const { data: ingData } = await supabase.from('ingrediente').select('nume').order('nume')
    if (ingData) {
      const lista = ingData.map(i => i.nume)
      setIngredienteLista(lista)
      
      const initFilters: Record<string, number> = {}
      lista.forEach(ing => initFilters[ing] = 0)
      setIngredientFilters(initFilters)
    }
    setLoading(false)
  }

  const toggleFilter = (ing: string) => {
    setIngredientFilters(prev => ({
      ...prev,
      [ing]: prev[ing] === 0 ? 1 : (prev[ing] === 1 ? 2 : 0)
    }))
    setCurrentPage(1)
  }

  const resetFilters = () => {
    const initFilters: Record<string, number> = {}
    ingredienteLista.forEach(ing => initFilters[ing] = 0)
    setIngredientFilters(initFilters)
    setSortOrder('alpha')
    setSearchQuery('')
    setTipFiltru('toate')
    setCurrentPage(1)
  }

  // Căutare generală
  let produseAfișate = produse.filter(p => 
    p.nume.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // Filtrare pe tip (Prăjituri vs Torturi)
  produseAfișate = produseAfișate.filter(p => {
    const esteTort = p.nume.toLowerCase().includes('tort');
    if (tipFiltru === 'prajituri') return !esteTort;
    if (tipFiltru === 'torturi') return esteTort;
    return true; // pt 'toate'
  })

  // Filtrare ingrediente
  const mustInclude = Object.keys(ingredientFilters).filter(k => ingredientFilters[k] === 1)
  const mustExclude = Object.keys(ingredientFilters).filter(k => ingredientFilters[k] === 2)

  produseAfișate = produseAfișate.filter(p => {
    const ingProdus = p.ingrediente || []
    const hasAllIncluded = mustInclude.every(ing => ingProdus.includes(ing))
    const hasNoneExcluded = !mustExclude.some(ing => ingProdus.includes(ing))
    return hasAllIncluded && hasNoneExcluded
  })

  // Sortare
  produseAfișate.sort((a, b) => {
    if (sortOrder === 'alpha') return a.nume.localeCompare(b.nume)
    if (sortOrder === 'asc') return a.pret - b.pret
    if (sortOrder === 'desc') return b.pret - a.pret
    return 0
  })

  const totalPages = Math.ceil(produseAfișate.length / produsePePagina) || 1
  const paginatedProducts = produseAfișate.slice((currentPage - 1) * produsePePagina, currentPage * produsePePagina)

  const handleCantitate = (id: number, delta: number) => {
    setCantitati(prev => {
      const curent = prev[id] || 1
      return { ...prev, [id]: Math.max(1, curent + delta) }
    })
  }

  const adaugaInCos = (produs: Produs) => {
    const cantitate = cantitati[produs.id] || 1
    if (cantitate > produs.stoc) {
      alert(`Stoc insuficient! Mai avem doar ${produs.stoc} bucăți.`); return;
    }

    const cart = JSON.parse(localStorage.getItem('cart') || '{}')
    cart[produs.id] = (cart[produs.id] || 0) + cantitate
    localStorage.setItem('cart', JSON.stringify(cart))

    window.dispatchEvent(new Event('cartUpdated'))

    setToastMessage(`S-au adăugat ${cantitate}x ${produs.nume} în coș!`)
    setTimeout(() => setToastMessage(''), 3000)
    setCantitati(prev => ({...prev, [produs.id]: 1}))
  }

  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă magazinul...</div>

  return (
    <div className="relative flex min-h-screen">
      
      {/* MENIUL LATERAL */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} w-80 bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out border-r`}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h2 className="text-xl font-bold text-[#5c3d2e]">Meniu Filtrare</h2>
            <button onClick={() => setIsSidebarOpen(false)} className="text-red-500 font-bold text-xl hover:text-red-700">X</button>
          </div>

          <div className="space-y-8">
            {/* Butoanele Noi de Tip Produs */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3">Ce dorești să cauți?</h3>
              <div className="flex flex-col gap-3">
                <button 
                  onClick={() => { setTipFiltru('prajituri'); setIsSidebarOpen(false); }} 
                  className={`py-2 rounded font-bold transition ${tipFiltru === 'prajituri' ? 'bg-[#5c3d2e] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  🍰 Prăjituri
                </button>
                <button 
                  onClick={() => { setTipFiltru('torturi'); setIsSidebarOpen(false); }} 
                  className={`py-2 rounded font-bold transition ${tipFiltru === 'torturi' ? 'bg-[#5c3d2e] text-white shadow-md' : 'bg-gray-100 text-gray-700 hover:bg-gray-200'}`}
                >
                  🎂 Torturi (Prestabilite)
                </button>
                <Link 
                  href="/torturi-personalizate" 
                  className="bg-[#dda15e] text-white py-2 rounded font-bold hover:bg-[#bc8a50] transition text-center block shadow-md"
                >
                  ✨ Torturi Personalizate
                </Link>
                {tipFiltru !== 'toate' && (
                  <button onClick={() => { setTipFiltru('toate'); setIsSidebarOpen(false); }} className="text-sm text-gray-500 hover:text-gray-800 underline mt-2">
                    Arată-le pe toate
                  </button>
                )}
              </div>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-3">Sortează după:</h3>
              <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)} className="w-full p-2 border rounded bg-gray-50 text-gray-900 focus:outline-none focus:border-[#dda15e]">
                <option value="alpha">Alfabetic (A-Z)</option>
                <option value="asc">Preț Crescător</option>
                <option value="desc">Preț Descrescător</option>
              </select>
            </div>

            <div>
              <h3 className="font-bold text-gray-800 mb-3">Ingrediente:</h3>
              <p className="text-xs text-gray-500 mb-2">Apasă odată pentru a include (✓), de două ori pentru a exclude (X).</p>
              <div className="flex flex-col gap-2">
                {ingredienteLista.map(ing => (
                  <button key={ing} onClick={() => toggleFilter(ing)} className="flex items-center justify-between p-2 hover:bg-gray-50 border rounded transition">
                    <span className="text-sm text-gray-700">{ing}</span>
                    <span className={`font-bold w-6 h-6 flex items-center justify-center rounded ${ingredientFilters[ing] === 1 ? 'text-green-600 bg-green-100' : ingredientFilters[ing] === 2 ? 'text-red-600 bg-red-100' : 'text-gray-300 bg-gray-100'}`}>
                      {ingredientFilters[ing] === 1 ? '✓' : ingredientFilters[ing] === 2 ? 'X' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            <button onClick={resetFilters} className="w-full bg-gray-200 text-gray-800 py-2 rounded font-bold hover:bg-gray-300 transition">
              Șterge toate filtrele
            </button>
          </div>
        </div>
      </div>

      {/* Fundalul Blur */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
        ></div>
      )}

      {/* ZONA PRINCIPALĂ */}
      <div className="flex-1 flex flex-col w-full">
        
        <div className="text-center py-8 bg-white border-b sticky top-16 z-20 shadow-sm">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#5c3d2e] mb-6 drop-shadow-sm">
            {tipFiltru === 'prajituri' ? 'Catalog Prăjituri' : tipFiltru === 'torturi' ? 'Catalog Torturi' : 'Toate Produsele'}
          </h1>
          
          <div className="max-w-2xl mx-auto px-4 flex items-center gap-4">
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-[#5c3d2e] text-white rounded shadow hover:bg-[#3e2a20] transition flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            <input 
              type="text" placeholder="Caută..." value={searchQuery}
              onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-[#dda15e] transition shadow-sm"
            />
          </div>
        </div>

        {toastMessage && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-xl z-50 font-bold animate-bounce">
            {toastMessage}
          </div>
        )}

        <div className="flex-grow p-4 md:p-8">
          {produseAfișate.length === 0 ? (
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Ne pare rău!</h2>
              <p className="text-gray-600">Nu am găsit produse care să corespundă căutării tale.</p>
              <button onClick={resetFilters} className="mt-4 text-[#dda15e] hover:underline font-bold">Resetează căutarea</button>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginatedProducts.map(produs => (
                  <div key={produs.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition">
                    <img src={produs.imagine || '/default-cake.jpg'} alt={produs.nume} className="w-full h-48 object-cover border-b" />
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{produs.nume}</h3>
                      <div className="text-xl font-extrabold text-[#d32f2f] my-2">{produs.pret} RON</div>
                      <div className="mt-auto space-y-3">
                        <div className="flex items-center justify-between bg-gray-50 border rounded p-1">
                          <button type="button" onClick={() => handleCantitate(produs.id, -1)} className="px-3 py-1 font-bold text-gray-600 hover:text-[#5c3d2e]">-</button>
                          <input type="number" min="1" value={cantitati[produs.id] || 1} onChange={(e) => setCantitati({...cantitati, [produs.id]: Math.max(1, parseInt(e.target.value) || 1)})} className="w-12 text-center text-gray-900 bg-transparent focus:outline-none font-bold" />
                          <button type="button" onClick={() => handleCantitate(produs.id, 1)} className="px-3 py-1 font-bold text-gray-600 hover:text-[#5c3d2e]">+</button>
                        </div>
                        <button onClick={() => adaugaInCos(produs)} disabled={produs.stoc < 1} className="w-full bg-[#dda15e] text-white font-bold py-2 rounded hover:bg-[#bc8a50] transition disabled:opacity-50">
                          {produs.stoc > 0 ? 'Adaugă în coș' : 'Stoc epuizat'}
                        </button>
                        <button onClick={() => setProdusModal(produs)} className="w-full text-sm text-gray-600 font-bold hover:text-[#5c3d2e] transition">Detalii ingrediente</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {totalPages > 1 && (
                <div className="flex justify-center items-center gap-6 mt-12 mb-8">
                  <button onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))} disabled={currentPage === 1} className="p-3 rounded-full bg-gray-200 text-gray-800 disabled:opacity-30 hover:bg-gray-300 transition">
                    &laquo; Înapoi
                  </button>
                  <span className="font-bold text-gray-700 text-lg">Pagina {currentPage} din {totalPages}</span>
                  <button onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))} disabled={currentPage === totalPages} className="p-3 rounded-full bg-gray-200 text-gray-800 disabled:opacity-30 hover:bg-gray-300 transition">
                    Înainte &raquo;
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {produsModal && (
          <div className="fixed inset-0 bg-black bg-opacity-60 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl max-w-lg w-full overflow-hidden shadow-2xl relative">
              <button onClick={() => setProdusModal(null)} className="absolute top-4 right-4 bg-gray-100 rounded-full p-2 text-gray-600 hover:bg-gray-200 hover:text-red-500 font-bold">X</button>
              <img src={produsModal.imagine || '/default-cake.jpg'} alt={produsModal.nume} className="w-full h-64 object-cover" />
              <div className="p-6">
                <h2 className="text-2xl font-bold text-[#5c3d2e] mb-2">{produsModal.nume}</h2>
                <p className="text-gray-700 mb-4">{produsModal.descriere || 'Fără descriere disponibilă.'}</p>
                <div className="mb-4">
                  <h4 className="font-bold text-gray-900">Ingrediente:</h4>
                  <div className="flex flex-wrap gap-2 mt-2">
                    {produsModal.ingrediente?.map(ing => (
                      <span key={ing} className="bg-yellow-100 text-yellow-800 px-3 py-1 rounded-full text-sm font-medium">{ing}</span>
                    ))}
                  </div>
                </div>
                <div>
                  <h4 className="font-bold text-red-600">Alergeni:</h4>
                  <p className="text-gray-700">{produsModal.alergeni || 'Nu sunt specificați.'}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        <footer className="bg-[#3e2a20] text-white pt-12 pb-6 mt-auto">
          <div className="max-w-7xl mx-auto px-4 grid grid-cols-1 md:grid-cols-2 gap-8 mb-8">
            <div>
              <h3 className="text-2xl font-bold mb-4 text-[#dda15e]">Contactează-ne</h3>
              <p className="flex items-center gap-2 mb-2"><span className="text-xl">📍</span> Șoseaua Constanței nr. 24, Hârșova, Jud. Constanța</p>
              <p className="flex items-center gap-2 mb-2"><span className="text-xl">📞</span> 07xx xxx xxx</p>
              <p className="flex items-center gap-2 mb-2"><span className="text-xl">✉️</span> contact@cofetariascorpion.ro</p>
              <p className="mt-4 text-gray-300">Suntem bucuroși să vă îndulcim zilele!</p>
            </div>
            
            <div className="h-64 rounded-lg overflow-hidden shadow-lg border-2 border-[#5c3d2e]">
              {/* NOU: Harta fixată pe Hârșova cu un Pin */}
              <iframe 
                src="https://maps.google.com/maps?q=Soseaua%20Constantei%20nr.%2024,%20Harsova&t=&z=16&ie=UTF8&iwloc=&output=embed" 
                width="100%" 
                height="100%" 
                style={{border: 0}} 
                allowFullScreen={false} 
                loading="lazy" 
                referrerPolicy="no-referrer-when-downgrade">
              </iframe>
            </div>
          </div>
        </footer>
      </div>
    </div>
  )
}