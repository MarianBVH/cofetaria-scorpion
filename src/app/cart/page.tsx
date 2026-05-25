'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { useRouter } from 'next/navigation'

// Definirea tipurilor de date pentru produsele standard din baza de date
type ProdusStandard = {
  id: number
  nume: string
  pret: number
  imagine: string
  stoc: number
}

// Definirea structurii unui element standard combinat cu cantitatea din coș
type ItemCosStandard = {
  produs: ProdusStandard
  cantitate: number
}

// Definirea structurii pentru torturile personalizate stocate în coș
type ItemTorPersonalizat = {
  id_temporar: string
  tip_tort: string
  greutate: number
  ocazie: string
  mesaj: string
  descriere: string
  imagine_referinta: string
  cantitate: number
}

export default function PaginaCos() {
  const router = useRouter()
  
  // Stările aplicației pentru stocarea produselor din coș și gestionarea încărcării
  const [produseStandard, setProduseStandard] = useState<ItemCosStandard[]>([])
  const [torturiCustom, setTorturiCustom] = useState<ItemTorPersonalizat[]>([])
  const [loading, setLoading] = useState(true)

  // Utilizăm useEffect pentru a citi datele din LocalStorage doar după ce componenta s-a montat în browser.
  // Acest lucru previne erorile de tip "Hydration Mismatch" specifice framework-ului Next.js.
  useEffect(() => {
    incarcaCosul()
  }, [])

  const incarcaCosul = async () => {
    setLoading(true)
    
    // 1. Preluarea și procesarea produselor standard
    const cosStandardLocal = JSON.parse(localStorage.getItem('cart') || '{}')
    const idUriProduse = Object.keys(cosStandardLocal)

    if (idUriProduse.length > 0) {
      // Interogăm baza de date Supabase pentru a aduce detaliile proaspete ale produselor selectate
      const { data, error } = await supabase
        .from('products')
        .select('id, nume, pret, imagine, stoc')
        .in('id', idUriProduse)

      if (data && !error) {
        // Combinăm detaliile din baza de date cu cantitățile salvate local de utilizator
        const itemeCompletate: ItemCosStandard[] = data.map((prod: any) => ({
          produs: prod,
          cantitate: cosStandardLocal[prod.id] || 1
        }))
        setProduseStandard(itemeCompletate)
      }
    } else {
      setProduseStandard([])
    }

    // 2. Preluarea produselor personalizate din LocalStorage
    const cosCustomLocal = JSON.parse(localStorage.getItem('custom_cart') || '[]')
    setTorturiCustom(cosCustomLocal)
    
    setLoading(false)
  }

  // Funcție pentru modificarea cantității produselor standard (cu butoanele + și -)
  const schimbaCantitateStandard = (idProdus: number, delta: number) => {
    const cosStandardLocal = JSON.parse(localStorage.getItem('cart') || '{}')
    const cantitateCurenta = cosStandardLocal[idProdus] || 1
    const nouaCantitate = cantitateCurenta + delta

    if (nouaCantitate < 1) {
      eliminaProdusStandard(idProdus)
      return
    }

    // Verificăm dacă noua cantitate nu depășește stocul faptic din magazin
    const itemModificat = produseStandard.find(item => item.produs.id === idProdus)
    if (itemModificat && nouaCantitate > itemModificat.produs.stoc) {
      alert(`Stoc insuficient! Sunt disponibile doar ${itemModificat.produs.stoc} bucăți.`)
      return
    }

    // Actualizăm valoarea în LocalStorage și reîncărcăm starea paginii
    cosStandardLocal[idProdus] = nouaCantitate
    localStorage.setItem('cart', JSON.stringify(cosStandardLocal))
    window.dispatchEvent(new Event('cartUpdated'))
    incarcaCosul()
  }

  // Funcție pentru ștergerea completă a unui produs standard din coș
  const eliminaProdusStandard = (idProdus: number) => {
    const cosStandardLocal = JSON.parse(localStorage.getItem('cart') || '{}')
    delete cosStandardLocal[idProdus]
    localStorage.setItem('cart', JSON.stringify(cosStandardLocal))
    window.dispatchEvent(new Event('cartUpdated'))
    incarcaCosul()
  }

  // Funcție pentru ștergerea unui tort personalizat din coș
  const eliminaTortPersonalizat = (idTemporar: string) => {
    const cosCustomLocal = JSON.parse(localStorage.getItem('custom_cart') || '[]')
    const cosFiltrat = cosCustomLocal.filter((item: ItemTorPersonalizat) => item.id_temporar !== idTemporar)
    localStorage.setItem('custom_cart', JSON.stringify(cosFiltrat))
    window.dispatchEvent(new Event('cartUpdated'))
    incarcaCosul()
  }

  // Calculul sumei totale pentru produsele care au preț fix (cele standard)
  const totalGeneral = produseStandard.reduce((sum, item) => sum + (item.produs.pret * item.cantitate), 0)

  // Verificăm dacă coșul este complet gol (nu are nici prăjituri, nici torturi custom)
  const esteCosulGol = produseStandard.length === 0 && torturiCustom.length === 0

  if (loading) {
    return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă coșul tău...</div>
  }

  return (
    <div className="max-w-5xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900 mt-6">
      
      {/* Secțiunea de Antet a Coșului cu butonul de poziționare în dreapta sus */}
      <div className="flex flex-col md:flex-row justify-between items-center border-b pb-6 mb-8 gap-4">
        <div>
          <h1 className="text-3xl font-extrabold text-[#5c3d2e]">Coșul tău de cumpărături</h1>
          <p className="text-gray-500 mt-1">Verifică produsele adăugate și continuă spre finalizarea comenzii.</p>
        </div>
        
        {/* Butonul de trimitere plasat în dreapta sus conform cerințelor */}
        {!esteCosulGol && (
          <Link 
            href="/checkout" 
            className="bg-[#dda15e] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#bc8a50] transition shadow-md text-center inline-block"
          >
            Trimite Comanda →
          </Link>
        )}
      </div>

      {esteCosulGol ? (
        <div className="text-center py-16">
          <div className="text-6xl mb-4">🛒</div>
          <h2 className="text-2xl font-bold text-gray-700 mb-2">Coșul tău este gol</h2>
          <p className="text-gray-500 mb-6">Nu ai adăugat niciun produs în coș momentan.</p>
          <Link href="/" className="bg-[#5c3d2e] text-white font-bold py-2 px-6 rounded hover:bg-[#3e2a20] transition">
            Mergi la prăjituri
          </Link>
        </div>
      ) : (
        <div className="space-y-10">
          
          {/* 1. AFIȘARE PRĂJITURI ȘI TORTURI STANDARD */}
          {produseStandard.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#5c3d2e] mb-4 flex items-center gap-2">🍰 Prăjituri și Oferte din Catalog</h3>
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="w-full border-collapse text-left bg-white">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100 text-sm">
                      <th className="p-4">Produs</th>
                      <th className="p-4">Preț unitar</th>
                      <th className="p-4 text-center">Cantitate</th>
                      <th className="p-4">Subtotal</th>
                      <th className="p-4 text-center">Elimină</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {produseStandard.map(item => (
                      <tr key={item.produs.id} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4 flex items-center gap-4">
                          <img src={item.produs.imagine || '/default-cake.jpg'} alt={item.produs.nume} className="w-12 h-12 object-cover rounded-lg border shadow-sm" />
                          <span className="font-bold text-gray-900">{item.produs.nume}</span>
                        </td>
                        <td className="p-4 font-semibold text-gray-700">{item.produs.pret} RON</td>
                        <td className="p-4">
                          <div className="flex items-center justify-center gap-2 bg-gray-100 p-1 rounded-lg w-28 mx-auto border">
                            <button type="button" onClick={() => schimbaCantitateStandard(item.produs.id, -1)} className="px-2 font-bold text-gray-600 hover:text-red-500">-</button>
                            <span className="font-bold text-gray-900 w-8 text-center">{item.cantitate}</span>
                            <button type="button" onClick={() => schimbaCantitateStandard(item.produs.id, 1)} className="px-2 font-bold text-gray-600 hover:text-green-600">+</button>
                          </div>
                        </td>
                        <td className="p-4 font-bold text-gray-900">{(item.produs.pret * item.cantitate).toFixed(2)} RON</td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => eliminaProdusStandard(item.produs.id)} className="text-gray-400 hover:text-red-600 font-bold text-lg transition p-2">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* 2. AFIȘARE TORTURI PERSONALIZATE (CUSTOM) */}
          {torturiCustom.length > 0 && (
            <div>
              <h3 className="text-lg font-bold text-[#5c3d2e] mb-4 flex items-center gap-2">✨ Torturi la Comandă (Personalizate)</h3>
              <div className="overflow-x-auto border rounded-xl shadow-sm">
                <table className="w-full border-collapse text-left bg-white">
                  <thead>
                    <tr className="bg-gray-50 text-gray-700 font-bold border-b border-gray-100 text-sm">
                      <th className="p-4">Detalii Design & Structură</th>
                      <th className="p-4">Specificații Tehnice</th>
                      <th className="p-4">Preț estimat</th>
                      <th className="p-4 text-center">Elimină</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {torturiCustom.map(item => (
                      <tr key={item.id_temporar} className="hover:bg-gray-50/50 transition-colors">
                        <td className="p-4">
                          <div className="flex gap-4 items-start">
                            <img src={item.imagine_referinta || '/default-cake.jpg'} alt="Referință design" className="w-16 h-16 object-cover rounded-lg border shadow-sm flex-shrink-0" />
                            <div className="space-y-1">
                              <div className="font-bold text-gray-900">Compoziție: <span className="capitalize font-medium text-gray-700">{item.tip_tort}</span></div>
                              {item.mesaj && <p className="text-sm text-gray-600">📝 <span className="italic">" {item.mesaj} "</span></p>}
                              {item.descriere && <p className="text-xs text-gray-500 max-w-sm line-clamp-2">{item.descriere}</p>}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 space-y-1 text-sm text-gray-700 font-medium">
                          <div>⚖ Cantitate: <span className="font-bold text-gray-900">{item.greutate} kg</span></div>
                          <div>🎉 Ocazie: <span className="font-bold text-gray-900 capitalize">{item.ocazie.replace(/_/g, ' ')}</span></div>
                        </td>
                        <td className="p-4">
                          <span className="bg-yellow-50 text-yellow-800 text-xs font-bold px-2.5 py-1 rounded-full border border-yellow-200">
                            Preț în așteptare
                          </span>
                        </td>
                        <td className="p-4 text-center">
                          <button type="button" onClick={() => eliminaTortPersonalizat(item.id_temporar)} className="text-gray-400 hover:text-red-600 font-bold text-lg transition p-2">✕</button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
              <p className="text-xs text-gray-500 mt-2 px-2">
                * Prețul final pentru torturile personalizate va fi calculat per kilogram și confirmat telefonic de către operator după analiza complexității modelului ales.
              </p>
            </div>
          )}

          {/* Secțiunea de Subsol: Calculul sumelor și butoanele de redirecționare */}
          <div className="border-t pt-6 bg-gray-50 -mx-6 -mb-6 p-6 rounded-b-xl flex flex-col md:flex-row justify-between items-center gap-6">
            <button 
              type="button" 
              onClick={() => router.back()} 
              className="text-[#5c3d2e] font-bold hover:underline flex items-center gap-2"
            >
              ← Înapoi la magazin
            </button>

            <div className="text-right space-y-2">
              <div className="text-sm text-gray-500">
                Total produse standard: <span className="font-bold text-gray-800">{totalGeneral.toFixed(2)} RON</span>
              </div>
              {torturiCustom.length > 0 && (
                <div className="text-xs text-amber-700 font-semibold">
                  + Prețul torturilor personalizate se adaugă la confirmarea telefonică.
                </div>
              )}
              <div className="text-2xl font-extrabold text-[#5c3d2e]">
                Total de plată: {totalGeneral.toFixed(2)} RON
              </div>
            </div>
          </div>

        </div>
      )}
    </div>
  )
}