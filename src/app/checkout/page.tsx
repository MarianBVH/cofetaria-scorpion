/**
 * Directiva semnalează compilatorului Next.js faptul că acest modul este destinat rulării exclusive
 * pe partea de client. Acest comportament este impus de necesitatea utilizării hook-urilor de stare
 * (useState, useEffect) și de accesarea directă a obiectelor specifice browserului (localStorage, window).
 */
'use client'

/**
 * Importarea resurselor necesare dezvoltării componentei.
 * Sunt importate hook-urile fundamentale React, clientul pentru comunicarea cu baza de date Supabase,
 * componenta Link pentru navigare fluidă și modulul specializat în generarea de documente PDF.
 */
import { useState, useEffect } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'
import { genereazaFacturaPDF, DateFactura } from '@/lib/generareFactura'

/**
 * Componenta principală care gestionează procesul de finalizare a comenzii (Checkout).
 * Aceasta orchestrează colectarea datelor de facturare și livrare, preia informațiile din coșul de cumpărături
 * salvat local și realizează persistența datelor relaționale complexe în baza de date.
 */
export default function Checkout() {
  /**
   * Stări pentru gestionarea ciclului de procesare asincronă.
   * Starea 'loading' blochează afișarea formularului până când datele inițiale sunt preluate.
   * Starea 'isSubmitting' previne acționarea multiplă a butonului de trimitere în timpul salvării comenzii.
   */
  const [loading, setLoading] = useState(true)
  const [isSubmitting, setIsSubmitting] = useState(false)
  
  // Salvăm ID-ul comenzii finalizate pentru a-l putea folosi la generarea facturii
  /**
   * Stare utilizată pentru reținerea identificatorului comenzii proaspăt finalizate.
   * Această valoare este esențială pentru comutarea interfeței către ecranul de succes
   * și pentru a permite generarea ulterioară a facturii fiscale pe baza acestui identificator.
   */
  const [successOrderId, setSuccessOrderId] = useState<number | null>(null)
  
  /**
   * Stare destinată stocării și afișării mesajelor de eroare rezultate în urma validărilor
   * formularului sau în urma eșecului tranzacțiilor la nivel de bază de date.
   */
  const [validationError, setValidationError] = useState<string | null>(null)
  
  /**
   * Stări dedicate păstrării informațiilor utilizatorului curent și detaliilor financiare.
   * Se stochează identificatorul unic de utilizator și numele pentru emiterea corectă a documentelor,
   * precum și colecțiile cu produsele standard și personalizate extrase din sistemul de stocare local.
   */
  const [userId, setUserId] = useState<string | null>(null)
  const [numeClient, setNumeClient] = useState('') // Stocăm numele pentru factură
  const [totalGeneral, setTotalGeneral] = useState(0)
  const [cartItems, setCartItems] = useState<any[]>([])
  const [customCartItems, setCustomCartItems] = useState<any[]>([])

  /**
   * Stări care controlează opțiunile logistice și financiare selectate de utilizator.
   * Aceste valori dictează ramificarea validărilor ulterioare din cadrul formularului.
   */
  const [tipLivrare, setTipLivrare] = useState<'livrare' | 'ridicare' | ''>('')
  const [metodaPlata, setMetodaPlata] = useState<'card' | 'la_cofetarie' | ''>('')
  
  // Date de contact și livrare
  /**
   * Variabile de stare alocate colectării datelor de contact și de destinație.
   * Informațiile sunt introduse manual sau pre-completate automat din profilul utilizatorului.
   */
  const [telefon, setTelefon] = useState('')
  const [oras, setOras] = useState('')
  const [adresa, setAdresa] = useState('')

  // Date pentru facturare
  /**
   * Variabile de stare necesare colectării detaliilor stricte de facturare.
   * Valoarea booleană 'aceeasiAdresa' optimizează experiența utilizatorului prin copierea implicită
   * a adresei de livrare pentru emiterea facturii, reducând timpul de completare a formularului.
   */
  const [aceeasiAdresa, setAceeasiAdresa] = useState(true)
  const [orasFacturare, setOrasFacturare] = useState('')
  const [adresaFacturare, setAdresaFacturare] = useState('')

  /**
   * Lista de referință care conține zonele geografice acoperite de serviciul de livrare.
   * Se utilizează pentru a restrânge opțiunile și pentru a valida intrările utilizatorului,
   * evitând comenzi în locații nesprijinite logistic.
   */
  const oraseLivrare = [
    'Hârșova', 'Ciobanu', 'Saraiu', 'Horia', 'Stupina', 'Crucea', 'Gârliciu'
  ]

  /**
   * Hook de ciclu de viață care declanșează funcția de pregătire a datelor în momentul în care
   * componenta este montată inițial în arborele DOM.
   */
  useEffect(() => {
    incarcaDatele()
  }, [])

  /**
   * Funcția asincronă responsabilă cu asamblarea completă a contextului necesar paginii.
   * Etapele includ validarea sesiunii de utilizator, extragerea prealabilă a profilului pentru completarea
   * automată a câmpurilor și reconstruirea detaliată a coșului pe baza ID-urilor din localStorage.
   */
  const incarcaDatele = async () => {
    /**
     * Se efectuează preluarea și verificarea sesiunii active.
     * În lipsa autorizării, vizitatorul este redirecționat, protejând astfel procesul tranzacțional.
     */
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) {
      window.location.href = '/login'
      return
    }
    
    setUserId(session.user.id)

    /**
     * Se interoghează tabela 'profiles' pentru a obține istoricul datelor utilizatorului.
     * Valorile găsite sunt distribuite direct către stările formularului pentru a accelera finalizarea comenzii.
     */
    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single()
    if (profile) {
      if (profile.nume) setNumeClient(profile.nume)
      if (profile.telefon) setTelefon(profile.telefon)
      if (profile.adresa) setAdresa(profile.adresa)
      if (profile.oras && oraseLivrare.includes(profile.oras)) setOras(profile.oras)
    }

    /**
     * Se preia și se deserializează coșul cu produse standard salvat în mediul local.
     * Se determină cantitățile dorite pe baza colecției de identificatori extrase.
     */
    const cosStandardLocal = JSON.parse(localStorage.getItem('cart') || '{}')
    const idUri = Object.keys(cosStandardLocal)
    let total = 0
    let itemeStandard: any[] = []

    /**
     * Dacă au fost identificate produse standard, se efectuează o cerere securizată către server pentru
     * validarea prețurilor și a numelor, prevenind manipularea datelor financiare pe partea de client.
     * Calculul totalului general se bazează strict pe valorile returnate din baza de date.
     */
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

    /**
     * Produsele personalizate sunt extrase separat, neimplicând calculul de preț inițial
     * datorită naturii lor atipice care necesită estimare telefonică ulterioară.
     */
    const cosCustomLocal = JSON.parse(localStorage.getItem('custom_cart') || '[]')
    setCustomCartItems(cosCustomLocal)

    /**
     * Odată finalizate toate interogările și calculele preliminare, blocajul vizual de încărcare este anulat.
     */
    setLoading(false)
  }

  /**
   * Funcția orchestratoare care tratează confirmarea și salvarea comenzii.
   * Validează cerințele logistice, generează comanda principală și gestionează tranzacțional sub-entitățile aferente.
   */
  const handleTrimiteComanda = async () => {
    /**
     * Reinițializarea erorilor la un nou ciclu de execuție asigură faptul că utilizatorul nu va vedea
     * erori reziduale din sesiunile anterioare de apăsare a butonului.
     */
    setValidationError(null)

    /**
     * Verificări primare obligatorii pentru a asigura un nivel minim de comunicare și logistică.
     * Lipsa oricăreia dintre aceste valori întrerupe lanțul operațional.
     */
    if (!tipLivrare) { setValidationError('Te rog selectează o metodă de livrare/ridicare.'); return; }
    if (!metodaPlata) { setValidationError('Te rog selectează o metodă de plată.'); return; }
    if (!telefon) { setValidationError('Numărul de telefon este obligatoriu pentru a te putea contacta.'); return; }
    
    /**
     * Reguli complexe condiționate: dacă opțiunea selectată este livrarea la domiciliu,
     * devin obligatorii detaliile geografice care precizează ruta curierului.
     */
    if (tipLivrare === 'livrare') {
      if (!oras) { setValidationError('Te rog selectează orașul/localitatea pentru livrare.'); return; }
      if (!adresa) { setValidationError('Te rog completează adresa completă pentru livrare.'); return; }
    }

    // Validare pentru adresa de facturare
    /**
     * Se definește condiția sub care un set separat de adrese de facturare este necesar.
     * Acest caz apare fie când produsele sunt ridicate personal (neexistând adresă de destinație completată anterior),
     * fie când a fost bifată cerința decuplării facturării de destinația logistică.
     */
    const necesitaFacturareSeparata = tipLivrare === 'ridicare' || (tipLivrare === 'livrare' && !aceeasiAdresa)
    if (necesitaFacturareSeparata) {
      if (!orasFacturare) { setValidationError('Te rog completează orașul pentru facturare.'); return; }
      if (!adresaFacturare) { setValidationError('Te rog completează adresa pentru facturare.'); return; }
    }

    /**
     * Acționarea flag-ului de protecție previne repetarea operațiunii pe parcursul schimbului asincron de date cu serverul.
     */
    setIsSubmitting(true)

    try {
      // Determinăm datele finale de facturare
      /**
       * Procesul de consolidare a adresei finale ce urmează a fi preluată ca sediu de facturare.
       * Acesta evaluează dinamic variabilele stărilor implicate.
       */
      const orasFacturaFinal = tipLivrare === 'livrare' && aceeasiAdresa ? oras : orasFacturare
      const adresaFacturaFinala = tipLivrare === 'livrare' && aceeasiAdresa ? adresa : adresaFacturare

      /**
       * Inserarea înregistrării de bază în tabela `orders`.
       * Aceasta definește suma tranzacțională globală și detaliile logistice esențiale care ghidează execuția ulterioară.
       * Returnarea directă a obiectului single permite preluarea instantă a noului identificator alocat (ID).
       */
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

      /**
       * Verificarea și salvarea produselor standard în tabela derivată (order_items).
       * Legătura se realizează pe baza cheii străine generată de cererea anterioară.
       */
      if (cartItems.length > 0) {
        for (const item of cartItems) {
          /**
           * Înregistrarea efectivă a cantităților și istoricului prețurilor asociate fiecărui reper validat prealabil.
           */
          await supabase.from('order_items').insert([{
            order_id: orderId,
            product_id: item.id,
            cantitate: item.cantitate,
            pret_per_bucata: item.pret
          }])

          /**
           * Logica de administrare a stocurilor prin apelarea unei funcții stocate asincrone.
           * În cazul în care serverul raportă eroare la execuția procedurii (RPC), se aplică soluția fallback:
           * actualizarea manuală de tip `update` la nivelul structurii de stoc curentă.
           */
          const { error: rpcError } = await supabase.rpc('scade_stoc', { p_id: item.id, cantitate_vanduta: item.cantitate })
          if (rpcError) {
            await supabase.from('products').update({ stoc: item.stoc - item.cantitate }).eq('id', item.id)
          }
        }
      }

      /**
       * Transpunerea torturilor personalizate, un flux separat care presupune salvarea schițelor, 
       * greutăților cerute și textelor aferente într-o altă entitate tabelară specializată.
       */
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

      /**
       * Odată ce tranzacția pe server s-a efectuat fără excepții, coșurile de rezervă de pe mediu client (localStorage) sunt distruse.
       * Emiterea evenimentului global garantează sincronizarea interfeței de afișaj a cantităților pe celelalte module.
       */
      localStorage.removeItem('cart')
      localStorage.removeItem('custom_cart')
      window.dispatchEvent(new Event('cartUpdated'))
      
      // Salvăm ID-ul comenzii pentru a afișa ecranul de succes
      /**
       * Finalizarea acțiunii atribuie noul identificator componentei vizuale de confirmare și tranziționează interfața.
       */
      setSuccessOrderId(orderId)

    } catch (err: any) {
      /**
       * Declanșarea blocului de interceptare a erorilor informează clientul clar despre natura prăbușirii conexiunii.
       */
      setValidationError('A apărut o eroare la salvarea comenzii: ' + err.message)
    } finally {
      /**
       * Reactivarea obligatorie a uneltelor interactive (butoanele formularelor) indiferent de calea de rezolvare.
       */
      setIsSubmitting(false)
    }
  }

  // Acțiunea butonului de factură
  /**
   * Acțiunea responsabilă pentru inițierea modulului de redactare a facturii.
   * Metoda sintetizează o colecție conformă structurii formale 'DateFactura' și transferă
   * responsabilitatea generării PDF către librăria dedicată.
   */
  const handleAfiseazaFactura = () => {
    if (!successOrderId) return;

    // Determinăm adresa finală de facturare (exact ca la salvarea în baza de date)
    /**
     * Reconstituirea algoritmului de selecție geografică necesar inserării adresei adecvate
     * pe antetul de facturare al documentului, aplicând logicile de preemțiune definite mai sus.
     */
    const orasFacturaFinal = tipLivrare === 'livrare' && aceeasiAdresa ? oras : orasFacturare;
    const adresaFacturaFinala = tipLivrare === 'livrare' && aceeasiAdresa ? adresa : adresaFacturare;

    // Construim obiectul cu datele necesare, respectând interfața DateFactura
    /**
     * Structurarea ordonată a obiectului ce deservește formatarea vizuală a facturii.
     */
    const dateFactura: DateFactura = {
      orderId: successOrderId,
      dataComanda: new Date().toISOString(),
      numeClient: numeClient || 'Client Cofetăria Scorpion',
      telefon: telefon,
      adresaFacturare: adresaFacturaFinala || '-',
      orasFacturare: orasFacturaFinal || 'Hârșova', // Fallback pentru ridicare personală
      tipLivrare: tipLivrare,
      metodaPlata: metodaPlata,
      total: totalGeneral,
      produse: cartItems.map(item => ({
        nume: item.nume,
        cantitate: item.cantitate,
        pret_per_bucata: item.pret
      }))
    };

    // Apelăm funcția care generează și descarcă PDF-ul
    /**
     * Invocarea procedurii externe de compunere și declanșare automată a descărcării în mediul vizitatorului.
     */
    genereazaFacturaPDF(dateFactura);
  }

  /**
   * Secvență responsabilă de semnalarea temporală a unui proces tehnic în fundal.
   * Pe parcursul obținerii datelor preliminare, este interzisă redarea grafică a elementelor statice de introducere.
   */
  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se pregătesc datele...</div>

  // Ecranul de succes actualizat
  /**
   * Ramificare vizuală declanșată exclusiv post-salvare.
   * Transformarea se produce în contextul prezenței identificatorului de succes generat pe structura backendului.
   */
  if (successOrderId) {
    return (
      /*
        * Panoul interactiv de confirmare care înglobează un design restrictiv centrat, destinat semnalării
        * sfârșitului operațiunilor. Sunt prezentate căile adecvate de retragere sau interacțiunile auxiliare.
        */
      <div className="max-w-2xl mx-auto mt-16 p-8 bg-white rounded-xl shadow-lg border border-gray-100 text-center">
        <div className="text-6xl mb-4 text-green-600">✓</div>
        <h1 className="text-3xl font-bold text-[#5c3d2e] mb-4">Comanda a fost trimisă!</h1>
        <p className="text-gray-700 text-lg mb-8">
          Îți mulțumim! Comanda ta a fost înregistrată cu succes. Dacă ai adăugat torturi personalizate, te vom contacta în scurt timp la numărul de telefon furnizat.
        </p>
        
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
    /*
      * Dispunerea globală a machetei grafice atribuite paginii curente.
      * Modulul încorporează clase utilitare pentru controlarea proporțiilor și pentru furnizarea unui vizual curat.
      */
    <div className="max-w-3xl mx-auto mt-8 mb-16 bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-8 border-b pb-4">Finalizare Comandă</h1>

      {/*
        * Afișaj dedicat prezentării critice a erorilor identificate de regulile de validare.
        * Este vizibil utilizatorului doar în momentul semnalizării unei discrepanțe.
        */}
      {validationError && (
        <div className="bg-red-50 text-red-600 p-4 mb-6 rounded border border-red-200 font-bold">
          ⚠ {validationError}
        </div>
      )}

      <div className="space-y-8">
        
        {/*
          * Cadrul principal de control dedicat modalității de procurare a bunurilor de către cumpărător.
          */}
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

        {/*
          * Extindere dinamică a formularului, supusă exigenței unei selecții preliminare logistice.
          * Ascunde porțiunile aglomerate până în punctul validării ramificației superioare.
          */}
        {tipLivrare && (
          <div className="bg-gray-50 p-6 rounded-lg border border-gray-200 space-y-6 animate-fadeIn">
            
            <h3 className="font-bold text-gray-800 border-b pb-2 mb-4">Date de Contact și Livrare</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Telefon de contact *</label>
                <input type="text" value={telefon} onChange={(e) => setTelefon(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none" placeholder="07xx xxx xxx" />
              </div>

              {/*
                * Element selectiv restrâns prin definiție funcționalității de transportare externă.
                */}
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

            {/*
              * Unitate de colectare spațială necesară furnizării coordonatelor explicite destinației curierului.
              */}
            {tipLivrare === 'livrare' && (
              <div>
                <label className="block text-sm font-bold text-gray-700 mb-2">Adresă completă *</label>
                <textarea rows={2} value={adresa} onChange={(e) => setAdresa(e.target.value)} className="w-full p-3 border rounded-lg focus:border-[#dda15e] focus:outline-none" placeholder="Strada, număr, repere..."></textarea>
              </div>
            )}

            <div className="pt-6 border-t border-gray-200">
              <h3 className="font-bold text-gray-800 mb-4">Adresă de Facturare</h3>
              
              {/*
                * Opțiune comutativă destinată simplificării demersurilor birocratice, vizibilă exclusiv livrărilor.
                */}
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

              {/*
                * Panoul de detalii birocratice separat. Această ramură a interfeței preia focusul dacă un utilizator
                * decide să preia coletul personal, sau dacă respinge uniformitatea adreselor.
                */}
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

            {/*
              * Componenta inferioară prin care se reglează metodele asimilării financiare a achiziției.
              */}
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

        {/*
          * Bara operațională de acțiune. Agreghează estimările valorice de achitare și include declanșatorul
          * fundamental prin intermediul căruia procesul descris de cod prinde funcționalitate.
          */}
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