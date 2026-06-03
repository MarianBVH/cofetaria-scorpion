'use client'

import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function Checkout() {
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Modificat: Salvăm ID-ul comenzii finalizate pentru a-l putea folosi la generarea facturii
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null)
  
  const [validationError, setValidationError] = useState<string | null>(null)
  
  const [userId, setUserId] = useState<string | null>(null)
  const [totalGeneral, setTotalGeneral] = useState(0)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [customCartItems, setCustomCartItems] = useState<any[]>([])

  const [tipLivrare, setTipLivrare] = useState<'livrare' | 'ridicare' | ''>('')
  const [metodaPlata, setMetodaPlata] = useState<'card' | 'la_cofetarie' | ''>('')
  
  // Date de contact și livrare
  const [telefon, setTelefon] = useState('')
  const [oras, setOras] = useState('')
  const [adresa, setAdresa] = useState('')

  // Date NOI pentru facturare
  const [aceeasiAdresa, setAceeasiAdresa] = useState(true)
  const [orasFacturare, setOrasFacturare] = useState('')
  const [adresaFacturare, setAdresaFacturare] = useState('')

  const oraseLivrare = [
    'Hârșova', 'Ciobanu', 'Saraiu', 'Horia', 'Stupina', 'Crucea', 'Gârliciu'
  ]

  useEffect(() => {
    incarcaDatele()
  }, [])

  const incarcaDatele = async () => {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
      return
    }
    
    setUserId(session.user.id)

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (profile) {
      if (profile.telefon) setTelefon(profile.telefon)
      if (profile.adresa) setAdresa(profile.adresa)
      if (profile.oras && oraseLivrare.includes(profile.oras)) setOras(profile.oras)
    }

    const cosStandardLocal = JSON.parse(localStorage.getItem('cart') || '{}')
    const idUri = Object.keys(cosStandardLocal)
    let total = 0
    let itemeStandard: any[] = []

    if (idUri.length > 0) {
      const { data: produseDb } = await supabase.from('products').select('id, nume, pret, stoc').in('id', idUri)
      if (produseDb) {
        produseDb.forEach(prod => {
          const cantitate = cosStandardLocal[prod.id]
          total += prod.pret * cantitate
          itemeStandard.push({ ...prod, cantitate })
        })
      }
    }
    setCartItems(itemeStandard)
    setTotalGeneral(total)

    const cosCustomLocal = JSON.parse(localStorage.getItem('custom_cart') || '[]')
    setCustomCartItems(cosCustomLocal)

    setLoading(false)
  }

  const handleTrimiteComanda = async () => {
    setValidationError(null)

    if (!tipLivrare) { setValidationError('Te rog selectează o metodă de livrare/ridicare.'); return; }
    if (!metodaPlata) { setValidationError('Te rog selectează o metodă de plată.'); return; }
    if (!telefon) { setValidationError('Numărul de telefon este obligatoriu pentru a te putea contacta.'); return; }
    
    if (tipLivrare === 'livrare') {
      if (!oras) { setValidationError('Te rog selectează orașul/localitatea pentru livrare.'); return; }
      if (!adresa) { setValidationError('Te rog completează adresa completă pentru livrare.'); return; }
    }

    // Validare pentru adresa de facturare
    const necesitaFacturareSeparata = tipLivrare === 'ridicare' || (tipLivrare === 'livrare' && !aceeasiAdresa)
    if (necesitaFacturareSeparata) {
      if (!orasFacturare) { setValidationError('Te rog completează orașul pentru facturare.'); return; }
      if (!adresaFacturare) { setValidationError('Te rog completează adresa pentru facturare.'); return; }
    }

    setIsSubmitting(true)

    try {
      // Determinăm datele finale de facturare
      const orasFacturaFinal = tipLivrare === 'livrare' && aceeasiAdresa ? oras : orasFacturare
      const adresaFacturaFinala = tipLivrare === 'livrare' && aceeasiAdresa ? adresa : adresaFacturare

      const { data: orderData, error: orderError } = await supabase.from('orders').insert([{
        user_id: userId,
        total_comanda: totalGeneral,
        status: 'noua',
        tip_livrare: tipLivrare,
        metoda_plata: metodaPlata,
        oras_livrare: tipLivrare === 'livrare' ? oras : 'Hârșova (Ridicare magazin)',
        adresa_livrare: tipLivrare === 'livrare' ? adresa : '-',
        oras_facturare: orasFacturaFinal,
        adresa_facturare: adresaFacturaFinala,
        telefon_contact: telefon
      }]).select().single()

      if (orderError) throw orderError
      const orderId = orderData.id

      if (cartItems.length > 0) {
        for (const item of cartItems) {
          await supabase.from('order_items').insert([{
            order_id: orderId,
            product_id: item.id,
            cantitate: item.cantitate,
            pret_per_bucata: item.pret
          }])

          const { error: rpcError } = await supabase.rpc('scade_stoc', { p_id: item.id, cantitate_vanduta: item.cantitate })
          if (rpcError) {
            await supabase.from('products').update({ stoc: item.stoc - item.cantitate }).eq('id', item.id)
          }
        }
      }

      if (customCartItems.length > 0) {
        for (const customItem of customCartItems) {
          await supabase.from('torturi_personalizate').insert([{
            order_id: orderId,
            user_id: userId,
            tip_tort: customItem.tip_tort,
            greutate: customItem.greutate,
            ocazie: customItem.ocazie,
            mesaj: customItem.mesaj,
            descriere: customItem.descriere,
            imagine_referinta: customItem.imagine_referinta,
            status: 'in asteptare'
          }])
        }
      }

      localStorage.removeItem('cart')
      localStorage.removeItem('custom_cart')
      window.dispatchEvent(new Event('cartUpdated'))
      
      // Salvăm ID-ul comenzii pentru a afișa ecranul de succes
      setSuccessOrderId(orderId)

    } catch (err: any) {
      setValidationError('A apărut o eroare la salvarea comenzii: ' + err.message)
    } finally {
      setIsSubmitting(false)
    }
  }

  // Acțiunea butonului de factură temporar
  const handleAfiseazaFactura = () => {
    alert(`Aici se va deschide factura PDF pentru comanda #${successOrderId}. Funcționalitatea va fi implementată ulterior.`)
  }

  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se pregătesc datele...</div>

  // Ecranul de succes actualizat
  if (successOrderId) {
    return (
      <div className="max-w-2xl mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg border border-gray-100 text-center">
        <div className="text-6xl mb-4 text-green-600">✓</div>
        <h1 className="text-3xl font-bold text-[#5c3d2e] mb-4">Comanda a fost trimisă!</h1>
        <p className="text-gray-700 text-lg mb-8">
          Îți mulțumim! Comanda ta a fost înregistrată cu succes. Dacă ai adăugat torturi personalizate, te vom contacta în scurt timp la numărul de telefon furnizat.
        </p>
        
        {/* NOU: Layout pe coloană pentru a acomoda cele 3 butoane */}
        <div className="flex flex-col gap-4 max-w-sm mx-auto">
          <Link href="/" className="bg-[#5c3d2e] text-white font-bold py-3 px-6 rounded hover:bg-[#3e2a20] transition text-center">
            Înapoi la Pagina Principală
          </Link>
          <Link href="/profil/istoric" className="bg-[#dda15e] text-white font-bold py-3 px-6 rounded hover:bg-[#bc8a50] transition text-center">
            Vezi Istoricul Comenzilor
          </Link>
          <button 
            onClick={handleAfiseazaFactura} 
            className="border-2 border-gray-800 text-gray-800 font-bold py-3 px-6 rounded hover:bg-gray-50 transition text-center mt-2"
          >
            📄 Afișează Factura
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="max-w-3xl mx-auto mt-8 mb-16 bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-8 border-b pb-4">Finalizare Comandă</h1>

      {validationError && (
        <div className="bg-red-50 text-red-600 p-4 mb-6 rounded border border-red-200 font-bold">
          ⚠ {validationError}
        </div>
      )}

      <div className="space-y-8">
        
        <div>
          <h2 className="text-xl font-bold text-gray-800 mb-4">1. Cum dorești să primești comanda?</h2>
          <div className="flex flex-col md:flex-row gap-4">
            <label className={`flex-1 border-2 p-4 rounded-lg cursor-pointer transition ${tipLivrare === 'ridicare' ? 'border-[#dda15e] bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="tipLivrare" checked={tipLivrare === 'ridicare'} onChange={() => setTipLivrare('ridicare')} className="w-5 h-5 text-[#dda15e]" />
                <span className="font-bold">Ridicare personală</span>
              </div>
              <p className="text-sm text-gray-500 mt-2 ml-8">Voi veni eu la cofetăria din Hârșova să ridic produsele.</p>
            </label>

            <label className={`flex-1 border-2 p-4 rounded-lg cursor-pointer transition ${tipLivrare === 'livrare' ? 'border-[#dda15e] bg-orange-50' : 'border-gray-200 hover:border-gray-300'}`}>
              <div className="flex items-center gap-3">
                <input type="radio" name="tipLivrare" checked={tipLivrare === 'livrare'} onChange={() => setTipLivrare('livrare')} className="w-5 h-5 text-[#dda15e]" />
                <span className="font-bold">Livrare prin curier propriu</span>
              </div>
              <p className="text-sm text-gray-500 mt-2 ml-8">Aduceți comanda la adresa mea.</p>
            </label>
          </div>
        </div>

        {tipLivrare && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6 animate-fadeIn">
            
            {/* DATE LIVRARE / CONTACT */}
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Date de Contact și Livrare</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Telefon de contact *</label>
                <input type="text" value={telefon} onChange={(e) => setTelefon(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none" placeholder="07xx xxx xxx" />
              </div>

              {tipLivrare === 'livrare' && (
                <div>
                  <label className="block text-sm font-bold text-gray-700 mb-2">Localitate *</label>
                  <select value={oras} onChange={(e) => setOras(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none">
                    <option value="">-- Selectează localitatea --</option>
                    {oraseLivrare.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                </div>
              )}
            </div>

            {tipLivrare === 'livrare' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Adresă completă *</label>
                <textarea rows={2} value={adresa} onChange={(e) => setAdresa(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none" placeholder="Strada, număr, repere..."></textarea>
              </div>
            )}

            {/* SECȚIUNE NOUĂ: DATE FACTURARE */}
            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4">Adresă de Facturare</h3>
              
              {tipLivrare === 'livrare' && (
                <label className="flex items-center gap-3 mb-4 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={aceeasiAdresa} 
                    onChange={(e) => setAceeasiAdresa(e.target.checked)}
                    className="w-5 h-5 text-[#dda15e] rounded border-gray-300" 
                  />
                  <span className="text-gray-700 font-medium">Adresa de facturare este aceeași cu cea de livrare</span>
                </label>
              )}

              {/* Formularul de facturare se afișează mereu la ridicare, și doar dacă bifa e scoasă la livrare */}
              {(tipLivrare === 'ridicare' || (tipLivrare === 'livrare' && !aceeasiAdresa)) && (
                <div className="bg-white p-4 rounded border border-gray-200 space-y-4 shadow-sm">
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Localitate facturare *</label>
                    <input type="text" value={orasFacturare} onChange={(e) => setOrasFacturare(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none" placeholder="Orașul..." />
                  </div>
                  <div>
                    <label className="block text-sm font-bold text-gray-700 mb-2">Adresă facturare *</label>
                    <textarea rows={2} value={adresaFacturare} onChange={(e) => setAdresaFacturare(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none" placeholder="Strada, număr..."></textarea>
                  </div>
                </div>
              )}
            </div>

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-800 mb-3">Metoda de plată *</h3>
              <select value={metodaPlata} onChange={(e) => setMetodaPlata(e.target.value as any)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none">
                <option value="">-- Alege cum vei plăti --</option>
                <option value="la_cofetarie">Numerar / Cash la primire</option>
                <option value="card">Plată cu Cardul</option>
              </select>
            </div>
          </div>
        )}

        <div className="flex flex-col sm:flex-row gap-4 justify-between items-center pt-6 border-t">
          <div className="text-xl font-bold text-[#5c3d2e]">
            Total plată estimat: {totalGeneral.toFixed(2)} RON
          </div>
          
          <div className="flex gap-4 w-full sm:w-auto">
            <Link href="/cart" className="flex-1 sm:flex-none text-center bg-gray-200 text-gray-800 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition">
              Anulare
            </Link>
            <button 
              onClick={handleTrimiteComanda}
              disabled={isSubmitting}
              className="flex-1 sm:flex-none bg-[#dda15e] text-white font-bold py-3 px-10 rounded-lg hover:bg-[#bc8a50] transition shadow-md disabled:opacity-50"
            >
              {isSubmitting ? 'Se procesează...' : 'Trimite Comanda'}
            </button>
          </div>
        </div>

      </div>
    </div>
  )
}