/**
 * Directiva indică faptul că acest modul este o componentă randată exclusiv pe partea de client (Client Component).
 * Aceasta este necesară deoarece se utilizează hook-uri React (useState, useEffect) și funcționalități
 * interactive care depind de mediul browser-ului.
 */
'use client'

/**
 * Importul bibliotecilor și modulelor necesare pentru funcționarea componentei.
 * React este utilizat pentru gestionarea stării și a ciclului de viață.
 * Clientul Supabase facilitează interacțiunea asincronă cu baza de date.
 * Modulul de generare a facturilor permite exportul detaliilor comenzilor în format PDF.
 */
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { genereazaFacturaPDF, DateFactura } from '@/lib/generareFactura'

/**
 * Componenta principală care gestionează vizualizarea istoricului de comenzi al utilizatorului autentificat.
 * Logica include preluarea datelor din mai multe tabele relaționale, formatarea acestora și afișarea
 * într-o interfață interactivă de tip "acordeon", cu posibilitatea de a descărca o factură fiscală.
 */
export default function IstoricComenzi() {
  /**
   * Starea responsabilă de stocarea listei complete a comenzilor.
   * Fiecare element din array conține detaliile de bază ale comenzii, profilul utilizatorului,
   * precum și array-uri imbricate cu produsele standard și torturile personalizate achiziționate.
   */
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comenzi, setComenzi] = useState<any[]>([])

  /**
   * Stare care indică dacă datele sunt în curs de preluare de la server.
   * Este utilizată pentru a afișa un mesaj de așteptare în interfața grafică până când informațiile sunt disponibile.
   */
  const [loading, setLoading] = useState(true)

  /**
   * Stare care reține identificatorul (ID-ul) comenzii care este extinsă (afișează detalii) la un moment dat.
   * Valoarea 'null' semnifică faptul că toate comenzile sunt restrânse.
   */
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  /**
   * Hook-ul de ciclu de viață care se execută o singură dată la montarea componentei în DOM.
   * Rolul său este de a iniția procesul de preluare a istoricului comenzilor imediat ce interfața devine activă.
   */
  useEffect(() => {
    fetchIstoric()
  }, [])

  /**
   * Funcția asincronă responsabilă cu obținerea istoricului comenzilor din baza de date.
   * Se efectuează verificarea sesiunii, urmată de interogări relaționale pentru a aduna toate datele necesare.
   */
  const fetchIstoric = async () => {
    setLoading(true)

    /**
     * Se obține sesiunea curentă pentru a valida dacă acțiunea este realizată de un utilizator autentificat.
     */
    const { data: { session } } = await supabase.auth.getSession()

    /**
     * În absența unei sesiuni valide, utilizatorul este redirecționat către pagina de autentificare,
     * protejând astfel datele sensibile din profil.
     */
    if (!session) {
      window.location.href = '/login'
      return
    }

    /**
     * Se extrag comenzile asociate ID-ului utilizatorului curent.
     * Interogarea include un "join" cu tabela de profiluri pentru a prelua numele, telefonul și județul,
     * informații esențiale care vor fi integrate ulterior pe factura fiscală.
     * Rezultatele sunt sortate descrescător după data comenzii pentru a afișa cele mai recente activități la început.
     */
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, profiles(nume, telefon, judet)')
      .eq('user_id', session.user.id)
      .order('data_comanda', { ascending: false })

    /**
     * Dacă interogarea principală a returnat rezultate, se procedează la detalierea fiecărei comenzi în parte.
     */
    if (ordersData) {
      /**
       * Deoarece se realizează cereri separate pentru fiecare comandă, se folosește Promise.all
       * pentru a procesa toate interogările în mod concurent, îmbunătățind timpul de răspuns.
       */
      const comenziComplete = await Promise.all(ordersData.map(async (order) => {
        /**
         * Se extrag produsele standard incluse în comanda curentă,
         * realizându-se o relație cu tabela de produse pentru a prelua denumirile acestora.
         */
        const { data: items } = await supabase
          .from('order_items')
          .select('*, products(nume)')
          .eq('order_id', order.id)

        /**
         * Se extrag, în mod similar, posibilele torturi personalizate atașate comenzii curente.
         */
        const { data: customCakes } = await supabase
          .from('torturi_personalizate')
          .select('*')
          .eq('order_id', order.id)

        /**
         * Se combină informațiile comenzii de bază cu lista de produse standard și torturi personalizate.
         * În cazul în care interogările nu returnează date, se asignează array-uri goale ca soluție de rezervă (fallback).
         */
        return {
          ...order,
          items: items || [],
          customCakes: customCakes || []
        }
      }))

      /**
       * Starea componentei este actualizată cu lista completă și structurată a comenzilor.
       */
      setComenzi(comenziComplete)
    }

    /**
     * Indicatorul de încărcare este dezactivat, permițând redarea interfeței finale cu datele obținute.
     */
    setLoading(false)
  }

  /**
   * Funcția care controlează vizibilitatea detaliilor unei comenzi (acordeon).
   * La o nouă apelare cu același ID, starea se resetează la null, ascunzând detaliile.
   * Dacă ID-ul este diferit, starea preia noul ID, extinzând panoul corespunzător.
   *
   * @param id Identificatorul comenzii care trebuie extinsă sau restrânsă.
   */
  const toggleExpand = (id: number) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }

  /**
   * Funcția orchestrează extragerea, transformarea și preluarea datelor în vederea generării unei facturi PDF.
   * Structurile de date ale produselor și torturilor sunt unificate pentru a respecta interfața prevăzută de modulul de facturare.
   *
   * @param orderId Identificatorul comenzii pentru care se solicită emiterea facturii.
   */
  const handleAfiseazaFactura = (orderId: number) => {
    /**
     * Se identifică instanța comenzii direct din starea locală, eliminând necesitatea unei interogări suplimentare la baza de date.
     */
    const cmd = comenzi.find(c => c.id === orderId);
    if (!cmd) return;

    /**
     * Se parcurge colecția de articole standard, mapând proprietățile într-un format acceptat de funcția de generare PDF.
     * Se realizează preluarea în siguranță a numelui, utilizând o valoare de fallback în cazul în care aceasta lipsește.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const produseStandard = cmd.items.map((item: any) => ({
      nume: item.products?.nume || 'Produs necunoscut',
      cantitate: item.cantitate,
      pret_per_bucata: Number(item.pret_per_bucata)
    }));

    /**
     * Se formatează și lista de torturi personalizate.
     * Se atribuie o valoare nulă (0) pentru preț, deoarece detaliile financiare aferente comenzilor personalizate
     * sunt, conform logicii de business, clarificate telefonic ulterior plasării comenzii, nefiind taxate fix inițial.
     */
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const torturiPersonalizate = cmd.customCakes.map((cake: any) => ({
      nume: `Tort Personalizat (${cake.tip_tort}) - ${cake.greutate}kg`,
      cantitate: 1,
      pret_per_bucata: 0 
    }));

    /**
     * Se consolidează structura finală conform interfeței stipulate `DateFactura`.
     * Se asigură concatenarea detaliilor financiare, logistice (adrese de livrare sau facturare) și identificarea completă a clientului.
     */
    const dateFactura: DateFactura = {
      orderId: cmd.id,
      dataComanda: cmd.data_comanda,
      numeClient: cmd.profiles?.nume || 'Client Cofetăria Scorpion',
      telefon: cmd.profiles?.telefon || '-',
      adresaFacturare: cmd.adresa_facturare || cmd.adresa_livrare || '-',
      orasFacturare: cmd.oras_facturare || cmd.oras_livrare || 'Hârșova',
      tipLivrare: cmd.tip_livrare,
      metodaPlata: cmd.metoda_plata,
      total: Number(cmd.total_comanda),
      produse: [...produseStandard, ...torturiPersonalizate]
    };

    /**
     * Execuția generării PDF este delegată modulului specializat `generareFacturaPDF`, pasându-i obiectul compus anterior.
     */
    genereazaFacturaPDF(dateFactura);
  }

  /**
   * Cât timp datele sunt în curs de preluare de la server, interfața afișează un ecran de așteptare clar.
   * Acest comportament previne redarea unui bloc vizual gol și asigură o comunicare clară a stării sistemului către utilizator.
   */
  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă istoricul...</div>

  return (
    /**
     * Containerul principal al structurii grafice, formatat cu un aspect de tip card pentru evidențierea conținutului
     * pe un fundal contrastant moderat.
     */
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900 mt-6">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-2">Istoric Comenzi</h1>
      <p className="text-gray-500 mb-6">Verifică statusul livrării și consultă detaliile fiecărei comenzi plasate.</p>

      {/*
        * Redarea este condiționată de existența unor comenzi în contul utilizatorului.
        * Dacă array-ul este gol, se prezintă un mesaj informativ (fallback).
        */}
      {comenzi.length === 0 ? (
        <p className="text-gray-500 italic text-center py-10">Nu ai înregistrat nicio comandă în magazinul online.</p>
      ) : (
        /*
         * Se creează o listă spațiată vertical care va găzdui colecția elementelor de comandă.
         */
        <div className="space-y-4">
          {/*
            * Generarea dinamică a cardurilor pentru fiecare comandă preluată.
            */}
          {comenzi.map(cmd => (
            /*
             * Elementul wrapper al comenzii unice, responsabil pentru delimitarea vizuală de celelalte elemente din listă.
             */
            <div key={cmd.id} className="border rounded-xl shadow-sm overflow-hidden bg-white">
              
              {/*
                * Zona interactivă (Header-ul Acordeonului) a comenzii.
                * Clicul declanșează extinderea sau restrângerea panoului de detalii.
                * Stilurile CSS variază subtil dacă elementul se află în stare activă (extins) pentru a ghida atenția vizuală.
                */}
              <div 
                onClick={() => toggleExpand(cmd.id)}
                className={`p-4 flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 cursor-pointer transition ${expandedOrderId === cmd.id ? 'bg-orange-50/50' : 'hover:bg-gray-50'}`}
              >
                <div>
                  <div className="font-bold text-gray-900 text-lg">Comanda #{cmd.id}</div>
                  <div className="text-sm text-gray-500">Data plasării: {new Date(cmd.data_comanda).toLocaleDateString('ro-RO')}</div>
                </div>

                <div className="flex items-center gap-6 w-full sm:w-auto justify-between sm:justify-end">
                  <div className="text-right">
                    <span className="text-sm text-gray-500 block">Total achitat</span>
                    <span className="font-extrabold text-[#5c3d2e] text-lg">{cmd.total_comanda.toFixed(2)} RON</span>
                  </div>
                  
                  {/*
                    * Stilul badge-ului (etichetei) este calculat dinamic în funcție de starea operațională a comenzii,
                    * aplicând culori sugestive (albastru pentru cereri noi, verde pentru finalizate).
                    */}
                  <span className={`px-3 py-1 rounded-full text-xs font-bold capitalize 
                    ${cmd.status === 'noua' ? 'bg-blue-100 text-blue-800' : 
                      cmd.status === 'livrata' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'}`}
                  >
                    {cmd.status}
                  </span>
                  
                  <span className="text-[#dda15e] font-bold hidden sm:inline text-sm">
                    {expandedOrderId === cmd.id ? 'Ascunde ▲' : 'Vezi detalii ▼'}
                  </span>
                </div>
              </div>

              {/*
                * Corpul principal detaliat. Această diviziune se inserează în interfață exclusiv atunci când
                * starea locală a elementului extins corespunde identificatorului comenzii evaluate curent.
                */}
              {expandedOrderId === cmd.id && (
                <div className="p-6 border-t bg-gray-50/50 space-y-6">
                  {/*
                    * Prezentarea sistematică, pe două coloane, separă lista produselor achiziționate de detaliile logistice și financiare.
                    */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2">Produse incluse:</h4>
                      <ul className="space-y-2">
                        {/*
                          * Se iterează prin colecția de articole standard achiziționate.
                          * Se afișează, într-o manieră compactă, cantitatea, numele asociat din baza de date și prețul per unitate.
                          */}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {cmd.items.map((item: any) => (
                          <li key={item.id} className="bg-white p-3 rounded-lg border text-sm flex justify-between shadow-sm">
                            <span><span className="font-bold">{item.cantitate}x</span> {item.products?.nume}</span>
                            <span className="font-semibold text-gray-600">{item.pret_per_bucata} RON/buc</span>
                          </li>
                        ))}
                        {/*
                          * Se listează suplimentar orice cereri specifice (torturi personalizate) stocate,
                          * evidențiindu-le vizual cu o culoare și o iconiță distinctivă din cauza naturii lor speciale.
                          */}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {cmd.customCakes.map((cake: any) => (
                          <li key={cake.id} className="bg-white p-3 rounded-lg border text-sm space-y-1 border-amber-200 bg-amber-50/20 shadow-sm">
                            <div className="flex justify-between font-bold text-amber-900">
                              <span>🎂 Tort Personalizat ({cake.tip_tort})</span>
                              <span>{cake.greutate} kg</span>
                            </div>
                            {/*
                              * Prezentarea opțională a unui mesaj personalizat marcat pe suprafața tortului, dacă acesta a fost cerut.
                              */}
                            {cake.mesaj && <p className="text-xs italic text-gray-600">Marcaj text: "{cake.mesaj}"</p>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    {/*
                      * Coloana dedicată sumarelor logistice preia informațiile primare legate de preluarea și instrumentele de plată ale comenzii.
                      */}
                    <div className="space-y-3 text-sm text-gray-700 bg-white p-4 rounded-lg border shadow-sm">
                      <p>
                        <strong>Adresă destinație:</strong> {cmd.adresa_livrare}, {cmd.oras_livrare}, Jud. {cmd.profiles?.judet || '-'}
                      </p>
                      <p><strong>Modalitate preluare:</strong> <span className="capitalize">{cmd.tip_livrare}</span></p>
                      <p><strong>Sistem de plată:</strong> {cmd.metoda_plata === 'la_cofetarie' ? 'Numerar / Cash' : 'Card bancar'}</p>
                      <p>
                        <strong>Informații livrare:</strong>{' '}
                        {/*
                          * Afișarea contextuală a unui mesaj despre starea transportului în funcție de situația de închidere ('status') a comenzii.
                          */}
                        {cmd.status === 'livrata' 
                          ? 'Comanda a fost predată cu succes.' 
                          : 'Comanda se află în procesare și urmează transportul frigorific la destinație.'}
                      </p>
                    </div>

                  </div>

                  {/*
                    * Subsolul zonei detaliate înglobează funcționalități conexe, precum declanșatorul responsabil pentru obținerea facturii fiscale.
                    */}
                  <div className="border-t pt-4 flex justify-end">
                    <button 
                      type="button" 
                      onClick={() => handleAfiseazaFactura(cmd.id)}
                      className="bg-gray-800 text-white text-sm font-bold py-2 px-4 rounded hover:bg-gray-700 transition shadow"
                    >
                      📄 Afișează Factura
                    </button>
                  </div>

                </div>
              )}

            </div>
          ))}
        </div>
      )}
    </div>
  )
}