'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

// Definirea tipului de date pentru un Produs
// Acesta mapează structura din baza de date Supabase pentru tabela 'products'
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
  // --- Stări pentru Datele din Baza de Date ---
  // Lista completă de produse adusă din baza de date
  const [produse, setProduse] = useState<Produs[]>([])
  // Lista completă de ingrediente disponibile pentru filtrare
  const [ingredienteLista, setIngredienteLista] = useState<string[]>([])
  // Stare pentru a indica dacă datele sunt în curs de încărcare
  const [loading, setLoading] = useState(true)

  // --- Stări pentru UI și Filtre ---
  // Controlează deschiderea/închiderea meniului lateral (sidebar)
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  // Stochează textul introdus în bara de căutare
  const [searchQuery, setSearchQuery] = useState('')
  // Stochează criteriul de sortare (ex: 'alpha', 'asc', 'desc')
  const [sortOrder, setSortOrder] = useState('alpha')
  // Tipul de produs selectat pentru afișare (toate, prăjituri, torturi)
  const [tipFiltru, setTipFiltru] = useState('toate') // NOU: 'toate', 'prajituri', 'torturi'
  
  // Dicționar care reține starea filtrului pentru fiecare ingredient: 
  // 0 = neutru, 1 = trebuie să conțină (✓), 2 = nu trebuie să conțină (X)
  const [ingredientFilters, setIngredientFilters] = useState<Record<string, number>>({})
  // Pagina curentă pentru paginare
  const [currentPage, setCurrentPage] = useState(1)
  const produsePePagina = 12

  // --- Stări pentru Coșul de Cumpărături și Interacțiuni ---
  // Reține cantitatea selectată temporar pentru fiecare produs înainte de a fi adăugat în coș
  const [cantitati, setCantitati] = useState<Record<number, number>>({})
  // Produsul selectat pentru a fi afișat în modalul de detalii (null dacă modalul este închis)
  const [produsModal, setProdusModal] = useState<Produs | null>(null)
  // Mesajul afișat în notificarea de tip "toast" la adăugarea în coș
  const [toastMessage, setToastMessage] = useState('')

  // Execută `fetchData` o singură dată la încărcarea componentei
  useEffect(() => {
    fetchData()
  }, [])

  // Funcția care preia produsele și ingredientele din Supabase
  const fetchData = async () => {
    // Preluare produse ordonate alfabetic
    const { data: prodData } = await supabase.from('products').select('*').order('nume')
    if (prodData) setProduse(prodData)

    // Preluare ingrediente ordonate alfabetic
    const { data: ingData } = await supabase.from('ingrediente').select('nume').order('nume')
    if (ingData) {
      const lista = ingData.map(i => i.nume)
      setIngredienteLista(lista)
      
      // Inițializare dicționar filtre ingrediente cu valoarea 0 (neutru) pentru toate
      const initFilters: Record<string, number> = {}
      lista.forEach(ing => initFilters[ing] = 0)
      setIngredientFilters(initFilters)
    }
    // Oprește starea de încărcare după ce datele au fost preluate
    setLoading(false)
  }

  // Funcție pentru a schimba ciclic starea filtrului unui ingredient (0 -> 1 -> 2 -> 0)
  const toggleFilter = (ing: string) => {
    setIngredientFilters(prev => ({
      ...prev,
      [ing]: prev[ing] === 0 ? 1 : (prev[ing] === 1 ? 2 : 0)
    }))
    // Resetăm pagina la 1 când se schimbă un filtru pentru a vedea rezultatele de la început
    setCurrentPage(1)
  }

  // Resetarea tuturor filtrelor la valorile implicite
  const resetFilters = () => {
    const initFilters: Record<string, number> = {}
    ingredienteLista.forEach(ing => initFilters[ing] = 0)
    setIngredientFilters(initFilters)
    setSortOrder('alpha')
    setSearchQuery('')
    setTipFiltru('toate')
    setCurrentPage(1)
  }

  // --- Logica de Filtrare și Sortare ---

  // 1. Căutare generală: filtrează după textul introdus în bara de căutare
  let produseAfișate = produse.filter(p => 
    p.nume.toLowerCase().includes(searchQuery.toLowerCase())
  )

  // 2. Filtrare pe tip (Prăjituri vs Torturi): folosim un simplu "includes('tort')" ca regulă
  produseAfișate = produseAfișate.filter(p => {
    const esteTort = p.nume.toLowerCase().includes('tort');
    if (tipFiltru === 'prajituri') return !esteTort;
    if (tipFiltru === 'torturi') return esteTort;
    return true; // pt 'toate'
  })

  // 3. Filtrare ingrediente: extragem listele de incluziuni și excluderi obligatorii
  const mustInclude = Object.keys(ingredientFilters).filter(k => ingredientFilters[k] === 1)
  const mustExclude = Object.keys(ingredientFilters).filter(k => ingredientFilters[k] === 2)

  produseAfișate = produseAfișate.filter(p => {
    const ingProdus = p.ingrediente || []
    // Verificăm dacă produsul conține toate ingredientele cerute
    const hasAllIncluded = mustInclude.every(ing => ingProdus.includes(ing))
    // Verificăm dacă produsul NU conține niciunul din ingredientele excluse
    const hasNoneExcluded = !mustExclude.some(ing => ingProdus.includes(ing))
    return hasAllIncluded && hasNoneExcluded
  })

  // 4. Sortare: aplicăm ordinea selectată (alfabetică sau după preț)
  produseAfișate.sort((a, b) => {
    if (sortOrder === 'alpha') return a.nume.localeCompare(b.nume)
    if (sortOrder === 'asc') return a.pret - b.pret
    if (sortOrder === 'desc') return b.pret - a.pret
    return 0
  })

  // --- Paginare ---
  // Calculăm numărul total de pagini
  const totalPages = Math.ceil(produseAfișate.length / produsePePagina) || 1
  // Extragem doar produsele corespunzătoare paginii curente
  const paginatedProducts = produseAfișate.slice((currentPage - 1) * produsePePagina, currentPage * produsePePagina)

  // Funcție pentru ajustarea cantității unui produs înainte de adăugare (+ / -)
  const handleCantitate = (id: number, delta: number) => {
    setCantitati(prev => {
      const curent = prev[id] || 1
      // Ne asigurăm că cantitatea nu scade sub 1
      return { ...prev, [id]: Math.max(1, curent + delta) }
    })
  }

  // Funcție pentru adăugarea unui produs în coș (salvat în localStorage)
  const adaugaInCos = (produs: Produs) => {
    const cantitate = cantitati[produs.id] || 1
    // Validare stoc
    if (cantitate > produs.stoc) {
      alert(`Stoc insuficient! Mai avem doar ${produs.stoc} bucăți.`); return;
    }

    // Citim coșul actual din localStorage sau inițializăm un obiect gol
    const cart = JSON.parse(localStorage.getItem('cart') || '{}')
    // Adăugăm sau actualizăm cantitatea pentru produsul selectat
    cart[produs.id] = (cart[produs.id] || 0) + cantitate
    localStorage.setItem('cart', JSON.stringify(cart))

    // Emitem un eveniment custom pentru a notifica alte componente (ex: iconița din Navbar) că s-a actualizat coșul
    window.dispatchEvent(new Event('cartUpdated'))

    // Afișăm un mesaj de succes (toast) pentru 3 secunde
    setToastMessage(`S-au adăugat ${cantitate}x ${produs.nume} în coș!`)
    setTimeout(() => setToastMessage(''), 3000)
    // Resetăm cantitatea din input la 1 după adăugare
    setCantitati(prev => ({...prev, [produs.id]: 1}))
  }

  // Afișează un indicator de încărcare până când datele sunt aduse de la Supabase
  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă magazinul...</div>

  return (
    <div className="relative flex min-h-screen">
      
      {/* MENIUL LATERAL (Sidebar pentru Filtre) */}
      {/* Sidebar-ul se ascunde / afișează în funcție de isSidebarOpen modificând clasele de Tailwind (translate-x) */}
      <div className={`fixed inset-y-0 left-0 transform ${isSidebarOpen ? "translate-x-0" : "-translate-x-full"} w-80 bg-white shadow-2xl z-50 transition-transform duration-300 ease-in-out border-r`}>
        <div className="p-6 h-full overflow-y-auto">
          <div className="flex justify-between items-center mb-8 border-b pb-4">
            <h2 className="text-xl font-bold text-[#5c3d2e]">Meniu Filtrare</h2>
            {/* Buton de închidere a meniului lateral */}
            <button onClick={() => setIsSidebarOpen(false)} className="text-red-500 font-bold text-xl hover:text-red-700">X</button>
          </div>

          <div className="space-y-8">
            {/* Butoanele Noi de Tip Produs */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3">Ce dorești să cauți?</h3>
              <div className="flex flex-col gap-3">
                {/* Butoane pentru selecția tipului principal de produs */}
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
                  🎂 Torturi (La liber)
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

            {/* Secțiunea de filtrare multiplă pe ingrediente */}
            <div>
              <h3 className="font-bold text-gray-800 mb-3">Ingrediente:</h3>
              <p className="text-xs text-gray-500 mb-2">Apasă odată pentru a include (✓), de două ori pentru a exclude (X).</p>
              <div className="flex flex-col gap-2">
                {ingredienteLista.map(ing => (
                  <button key={ing} onClick={() => toggleFilter(ing)} className="flex items-center justify-between p-2 hover:bg-gray-50 border rounded transition">
                    <span className="text-sm text-gray-700">{ing}</span>
                    {/* Indicator vizual pentru starea filtrului curent: ✓ (include), X (exclude), gol (neutru) */}
                    <span className={`font-bold w-6 h-6 flex items-center justify-center rounded ${ingredientFilters[ing] === 1 ? 'text-green-600 bg-green-100' : ingredientFilters[ing] === 2 ? 'text-red-600 bg-red-100' : 'text-gray-300 bg-gray-100'}`}>
                      {ingredientFilters[ing] === 1 ? '✓' : ingredientFilters[ing] === 2 ? 'X' : ''}
                    </span>
                  </button>
                ))}
              </div>
            </div>

            {/* Buton pentru resetarea generală a filtrelor */}
            <button onClick={resetFilters} className="w-full bg-gray-200 text-gray-800 py-2 rounded font-bold hover:bg-gray-300 transition">
              Șterge toate filtrele
            </button>
          </div>
        </div>
      </div>

      {/* Fundalul Blur afișat când meniul lateral este deschis; apăsarea sa închide meniul */}
      {isSidebarOpen && (
        <div 
          onClick={() => setIsSidebarOpen(false)} 
          className="fixed inset-0 bg-black/40 backdrop-blur-md z-40"
        ></div>
      )}

      {/* ZONA PRINCIPALĂ */}
      <div className="flex-1 flex flex-col w-full">
        
        {/* Bara superioară lipicioasă (sticky) ce conține titlul și bara de căutare */}
        <div className="text-center py-8 bg-white border-b sticky top-16 z-20 shadow-sm">
          <h1 className="text-4xl md:text-5xl font-extrabold text-[#5c3d2e] mb-6 drop-shadow-sm">
            {tipFiltru === 'prajituri' ? 'Catalog Prăjituri' : tipFiltru === 'torturi' ? 'Catalog Torturi' : 'Toate Produsele'}
          </h1>
          
          <div className="max-w-2xl mx-auto px-4 flex items-center gap-4">
            {/* Buton de deschidere meniu lateral */}
            <button onClick={() => setIsSidebarOpen(true)} className="p-3 bg-[#5c3d2e] text-white rounded shadow hover:bg-[#3e2a20] transition flex-shrink-0">
              <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" /></svg>
            </button>
            {/* Bara de căutare tip input */}
            <input 
              type="text" placeholder="Caută..." value={searchQuery}
              onChange={(e) => {setSearchQuery(e.target.value); setCurrentPage(1);}}
              className="w-full p-3 border-2 border-gray-200 rounded-lg text-gray-900 focus:outline-none focus:border-[#dda15e] transition shadow-sm"
            />
          </div>
        </div>

        {/* Afișarea unei alerte tip "Toast" când un produs este adăugat în coș */}
        {toastMessage && (
          <div className="fixed top-24 left-1/2 transform -translate-x-1/2 bg-green-600 text-white px-6 py-3 rounded-full shadow-xl z-50 font-bold animate-bounce">
            {toastMessage}
          </div>
        )}

        {/* Container pentru afișarea efectivă a produselor */}
        <div className="flex-grow p-4 md:p-8">
          {produseAfișate.length === 0 ? (
            // Mesaj fallback afișat dacă niciun produs nu corespunde filtrelor/căutării
            <div className="text-center py-20">
              <h2 className="text-2xl font-bold text-red-600 mb-2">Ne pare rău!</h2>
              <p className="text-gray-600">Nu am găsit produse care să corespundă căutării tale.</p>
              <button onClick={resetFilters} className="mt-4 text-[#dda15e] hover:underline font-bold">Resetează căutarea</button>
            </div>
          ) : (
            <>
              {/* Grilă responsivă pentru cardurile de produse */}
              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                {paginatedProducts.map(produs => (
                  <div key={produs.id} className="bg-white rounded-xl shadow-md border border-gray-100 overflow-hidden flex flex-col hover:shadow-lg transition">
                    {/* Imaginea produsului, cu o imagine de fallback dacă aceasta lipsește */}
                    <img src={produs.imagine || '/default-cake.jpg'} alt={produs.nume} className="w-full h-48 object-cover border-b" />
                    <div className="p-4 flex flex-col flex-grow">
                      <h3 className="text-lg font-bold text-gray-900 truncate">{produs.nume}</h3>
                      <div className="text-xl font-extrabold text-[#d32f2f] my-2">{produs.pret} RON</div>
                      <div className="mt-auto space-y-3">
                        {/* Control selector cantitate (+ / input / -) */}
                        <div className="flex items-center justify-between bg-gray-50 border rounded p-1">
                          <button type="button" onClick={() => handleCantitate(produs.id, -1)} className="px-3 py-1 font-bold text-gray-600 hover:text-[#5c3d2e]">-</button>
                          <input type="number" min="1" value={cantitati[produs.id] || 1} onChange={(e) => setCantitati({...cantitati, [produs.id]: Math.max(1, parseInt(e.target.value) || 1)})} className="w-12 text-center text-gray-900 bg-transparent focus:outline-none font-bold" />
                          <button type="button" onClick={() => handleCantitate(produs.id, 1)} className="px-3 py-1 font-bold text-gray-600 hover:text-[#5c3d2e]">+</button>
                        </div>
                        {/* Buton "Adaugă în coș" condiționat de disponibilitatea stocului */}
                        <button onClick={() => adaugaInCos(produs)} disabled={produs.stoc < 1} className="w-full bg-[#dda15e] text-white font-bold py-2 rounded hover:bg-[#bc8a50] transition disabled:opacity-50">
                          {produs.stoc > 0 ? 'Adaugă în coș' : 'Stoc epuizat'}
                        </button>
                        {/* Buton care deschide modalul cu detalii pentru produs */}
                        <button onClick={() => setProdusModal(produs)} className="w-full text-sm text-gray-600 font-bold hover:text-[#5c3d2e] transition">Detalii ingrediente</button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Controalele de paginare afișate doar dacă sunt mai multe pagini */}
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

        {/* Modalul pentru afișarea detaliilor complete ale unui produs (Ingrediente, Alergeni, Descriere) */}
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

        {/* Secțiunea Footer cu informații de contact și hartă integrată Google Maps */}
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