/**
 * Directiva 'use client' este specifică framework-ului Next.js (App Router).
 * Aceasta indică faptul că acest fișier trebuie tratat ca o componentă de client (Client Component),
 * ceea ce ne permite să folosim hook-uri din React (precum useState, useEffect) și să interacționăm 
 * direct cu API-urile browser-ului (precum window.location sau ferestre de confirmare).
 */
'use client'

/**
 * Importăm bibliotecile și utilitarele necesare.
 * React și hook-urile sale sunt folosite pentru a gestiona starea locală a componentei și ciclul de viață.
 * 'supabase' este instanța clientului nostru pentru baza de date, utilizată pentru a citi și scrie date.
 */
import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

/**
 * Componenta 'RenderRow' este o componentă modulară și reutilizabilă creată pentru a randa un rând
 * individual de informații din profil (ex: Nume, Telefon, Adresă).
 * De ce a fost creată așa: Extragerea acestei logici într-o componentă separată previne duplicarea masivă a codului în JSX,
 * menținând fișierul principal mult mai curat și mai ușor de întreținut.
 * 
 * Cum funcționează: Aceasta primește prin 'props' eticheta, valoarea curentă, un identificator unic, funcțiile necesare 
 * pentru actualizare, starea de editare și tipul de input. Pe baza stării 'isEditing', va randa fie text simplu, fie un câmp de input.
 */
const RenderRow = ({ 
  label, 
  valoare, 
  idCamp, 
  onChangeVal, 
  isEditing, 
  toggleEdit, 
  tipInput = 'text' 
}: { 
  label: string, 
  valoare: string, 
  idCamp: string, 
  onChangeVal: (v: string) => void,
  isEditing: boolean,
  toggleEdit: (camp: string) => void,
  tipInput?: 'text' | 'textarea' 
}) => {
  return (
      /**
     * Containerul principal al rândului, structurat cu Flexbox pentru a alinia textul/input-ul
     * la stânga și butonul de acțiune la dreapta.
     */
    <div className="flex justify-between items-center border-b border-gray-100 pb-3 pt-2 text-gray-900">
      <div className="flex-1 pr-4">
        {/**
         * Eticheta câmpului (ex: "NUME ȘI PRENUME"), formatată discret pentru a oferi context valorii afișate.
         */}
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
        {/**
         * Logica de randare condiționată:
         * Dacă rândul este în modul de editare ('isEditing' este true), afișăm elemente de formular.
         * Verificăm și 'tipInput': dacă este 'textarea', randăm un element <textarea> (util pentru adrese lungi),
         * altfel, randăm un <input> text standard. 
         * Atributul 'autoFocus' ajută experiența utilizatorului (UX) focusând automat câmpul când se dă click pe editare.
         */}
        {isEditing ? (
          tipInput === 'textarea' ? (
            <textarea rows={2} value={valoare} onChange={e => onChangeVal(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          ) : (
            <input type="text" value={valoare} onChange={e => onChangeVal(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" autoFocus />
          )
        ) : (
          /**
           * Dacă rândul NU este în mod de editare, afișăm valoarea ca text simplu.
           * Pentru a preveni afișarea unui spațiu complet gol dacă valoarea lipsește, 
           * folosim operatorul '||' pentru a afișa un text fallback ("Nespecificat").
           */
          <span className="text-gray-800 font-medium block min-h-[24px]">{valoare || <span className="text-gray-400 italic font-normal">Nespecificat</span>}</span>
        )}
      </div>
      
      {/**
       * Butonul care comută starea de editare. Își schimbă culoarea și iconița (între 'creion' și 'bifă') 
       * în funcție de starea 'isEditing', oferind feedback vizual imediat utilizatorului.
       */}
      <button 
        type="button" 
        onClick={() => toggleEdit(idCamp)} 
        className={`p-2 rounded-full transition flex-shrink-0 ${isEditing ? 'bg-green-100 text-green-700 hover:bg-green-200' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}
        title={isEditing ? "Finalizează editarea câmpului" : "Modifică acest câmp"}
      >
        {isEditing ? '✓' : '✏️'}
      </button>
    </div>
  )
}

/**
 * Componenta principală a paginii de profil.
 * Aici este gestionată toată logica de business asociată contului utilizatorului: preluarea datelor,
 * validarea stării de autentificare, gestionarea modificărilor și salvarea acestora.
 */
export default function ProfilUtilizator() {
  /**
   * Stări (states) pentru gestionarea interfeței grafice (UI).
   * 'loading' este true inițial pentru a afișa un mesaj de așteptare până la obținerea datelor.
   * 'isUpdating' blochează butonul de salvare pentru a preveni cereri multiple către baza de date.
   * 'message' este folosit pentru a oferi feedback (succes sau eroare) după o acțiune.
   */
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  /**
   * Starea pentru email, extrasă direct din sistemul de autentificare Supabase Auth.
   * Această valoare este tratată ca fiind 'read-only' în această interfață.
   */
  const [email, setEmail] = useState('')
  
   /**
   * Păstrăm o copie exactă a datelor originale extrase din baza de date.
   * De ce: Avem nevoie de această referință statică pentru două lucruri esențiale:
   * 1. Pentru funcționalitatea de "Anulare" (restabilirea datelor la forma inițială).
   * 2. Pentru a calcula logic variabila 'hasChanges' și a activa/dezactiva butonul de "Salvează".
   */
  const [originalData, setOriginalData] = useState({
    nume: '', telefon: '', judet: '', oras: '', adresa: ''
  })

  /**
   * Stările individuale pentru fiecare câmp editabil al profilului.
   * Acestea sunt actualizate în timp real (two-way binding) pe măsură ce utilizatorul scrie în input-uri.
   */
  const [nume, setNume] = useState('')
  const [telefon, setTelefon] = useState('')
  const [judet, setJudet] = useState('')
  const [oras, setOras] = useState('')
  const [adresa, setAdresa] = useState('')

  /**
   * Un obiect de stare care mapează fiecare câmp la un boolean, reprezentând dacă acel câmp
   * specific este sau nu în modul de editare în acest moment.
   */
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({
    nume: false, telefon: false, judet: false, oras: false, adresa: false
  })

   /**
   * Hook-ul useEffect este rulat o singură dată (datorită array-ului de dependențe gol '[]') 
   * la momentul în care componenta este "montată" (încărcată) în DOM-ul paginii.
   * Aici declanșăm extragerea datelor profilului.
   */
  useEffect(() => {
    getProfil()
  }, [])

  /**
   * Funcția responsabilă pentru extragerea datelor profilului din Supabase.
   * Este o funcție asincronă deoarece comunicarea cu baza de date necesită timp.
   */
  const getProfil = async () => {
    setLoading(true)
    /**
     * Primul pas este verificarea sesiunii curente (dacă utilizatorul este logat).
     */
    const { data: { session } } = await supabase.auth.getSession()

     /**
     * Dacă nu există o sesiune activă, forțăm redirecționarea utilizatorului către pagina de login,
     * protejând astfel ruta de profil de accesul neautorizat.
     */
    if (!session) {
      window.location.href = '/login'
      return
    }

    setEmail(session.user.email || '')

    /**
     * Interogăm tabela 'profiles' din Supabase.
     * Căutăm exact rândul care are coloana 'id' egală cu ID-ul unic din sistemul de Autentificare ('session.user.id').
     * '.single()' asigură faptul că primim un singur obiect, nu un array.
     */
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

      /**
     * Dacă am preluat cu succes datele (fără erori), populăm stările aplicației noastre.
     * Folosim un obiect intermediar 'deSalvat' pentru a evita problemele în care valorile din baza
     * de date ar putea fi null, transformându-le garantat în string-uri goale ('').
     */
    if (data && !error) {
      const deSalvat = {
        nume: data.nume || '',
        telefon: data.telefon || '',
        judet: data.judet || '',
        oras: data.oras || '',
        adresa: data.adresa || ''
      }
      
       /**
       * Salvăm atât în state-ul de backup (originalData), cât și în state-urile active.
       */
      setOriginalData(deSalvat)
      setNume(deSalvat.nume)
      setTelefon(deSalvat.telefon)
      setJudet(deSalvat.judet)
      setOras(deSalvat.oras)
      setAdresa(deSalvat.adresa)
    }
    
    /**
     * Odată finalizat procesul, oprim starea de 'loading', permițând interfeței să se randeze complet.
     */
    setLoading(false)
  }

   /**
   * 'hasChanges' este o valoare calculată dinamic (derived state).
   * Verificăm comparativ dacă vreuna din stările actuale (nume, telefon etc.) 
   * diferă de copia de siguranță stocată la început (originalData).
   * Dacă cel puțin una diferă, înseamnă că utilizatorul are "modificări nesalvate".
   */
  const hasChanges = 
    nume !== originalData.nume ||
    telefon !== originalData.telefon ||
    judet !== originalData.judet ||
    oras !== originalData.oras ||
    adresa !== originalData.adresa

    /**
   * Această funcție primește cheia unui câmp (ex: 'nume') și inversează valoarea booleană
   * corespunzătoare în obiectul 'isEditing'.
   * Spre exemplu, dacă câmpul 'nume' era pe vizualizare (false), îl trece pe editare (true).
   */
  const toggleEdit = (camp: string) => {
    setIsEditing(prev => ({ ...prev, [camp]: !prev[camp] }))
  }

    /**
   * Funcția asociată butonului de "Anulează".
   * Rolul ei este să șteargă orice modificare nesalvată, suprascriind stările curente înapoi
   * cu valorile din 'originalData'. De asemenea, închide toate input-urile deschise pentru editare.
   */
  const handleAnuleazaModificari = () => {
    setNume(originalData.nume)
    setTelefon(originalData.telefon)
    setJudet(originalData.judet)
    setOras(originalData.oras)
    setAdresa(originalData.adresa)
    
    setIsEditing({ nume: false, telefon: false, judet: false, oras: false, adresa: false })
    setMessage(null)
  }

  /**
   * Logica butonului de navigare "Înapoi la Pagina Principală".
   * De ce am pus-o aici: Să implementăm o barieră de protecție a datelor (Data Loss Prevention).
   * Protecție suplimentară pentru a nu pierde modificările nesalvate la părăsirea paginii
   */
  const handleInapoiAcasa = () => {
    if (hasChanges) {
      const confirmare = window.confirm(
        'Atenție! Aveți modificări nesalvate pe pagină. Dacă părăsiți pagina acum, toate modificările vor fi pierdute. Sigur doriți să plecați?'
      )
      if (!confirmare) return 
    }
    window.location.href = '/'
  }

  // Implementarea trimiterii emailului securizat pentru modificarea parolei
  const handleTrimiteEmailModificare = async () => {
    setMessage(null)
    
    /**
     * Supabase generează un link securizat care este trimis pe emailul extras din sesiune.
     * Opțiunea 'redirectTo' specifică url-ul unde se va întoarce utilizatorul după ce dă click pe linkul din email.
     * Deoarece utilizatorul este logat, folosesc emailul preluat din sesiune
     */
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

     /**
     * Setăm feedback vizual, informând utilizatorul dacă trimiterea a eșuat sau a avut succes.
     */
    if (resetError) {
      setMessage({ type: 'error', text: 'Eroare la trimiterea emailului: ' + resetError.message })
    } else {
      setMessage({ type: 'success', text: 'Un link pentru setarea unei noi parole a fost trimis pe adresa ta de email.' })
    }
  }

   /**
   * Funcția responsabilă cu procesul de salvare efectivă a modificărilor în baza de date.
   * Aceasta este declanșată la trimiterea (submit) formularului.
   */
  const handleSalveazaProfil = async (e: React.FormEvent) => {
    /** Prevenim comportamentul nativ al formularului (care ar reîncărca complet pagina) */
    e.preventDefault()
    /** Trecem butonul de salvare într-o stare inactivă vizual pentru a bloca multiple click-uri accidentale */
    setIsUpdating(true)
    setMessage(null)

    /** Verificăm din nou existența sesiunii, ca metodă de securitate la momentul salvării */
    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    /**
     * Efectuează operațiunea de 'update' în tabela 'profiles'.
     * Actualizăm rândul al cărui 'id' aparține utilizatorului curent din sesiune.
     */
    const { error } = await supabase
      .from('profiles')
      .update({ nume, telefon, judet, oras, adresa })
      .eq('id', session.user.id)

    /**
     * Gestionarea rezultatului din baza de date.
     */
    if (error) {
      setMessage({ type: 'error', text: 'Eroare la salvare: ' + error.message })
    } else {
      /**
       * În caz de succes: informăm utilizatorul, setăm noile date ca fiind "originalData" 
       * (astfel încât hasChanges să redevină false) și închidem forțat toate inputurile, revenind la vizualizare text.
       */
      setMessage({ type: 'success', text: 'Modificările au fost salvate cu succes!' })
      setOriginalData({ nume, telefon, judet, oras, adresa })
      setIsEditing({ nume: false, telefon: false, judet: false, oras: false, adresa: false })
    }
    /** Deblocăm butonul de salvare la finalul procesului */
    setIsUpdating(false)
  }

   /**
   * Dacă aplicația este încă în procesul inițial de citire a datelor din baza de date,
   * întoarcem un simplu mesaj de așteptare în loc să randăm interfața, prevenind clipiri și erori vizuale.
   */
  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă profilul tău...</div>

  return (
    /**
     * Containerul principal al paginii, centrat pe ecran cu margini și o umbră subtilă.
     */
    <div className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900 mt-6">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-2">Profilul Meu</h1>
      <p className="text-gray-500 mb-6">Gestionați informațiile personale asociate contului de client.</p>

      {/* Mesajele dinamice de eroare sau succes
       * Dacă starea 'message' nu este null (deci s-a efectuat o acțiune recent),
       * afișăm un div de alertă. Culoarea acestuia depinde dinamic de 'message.type' (verde pt success, roșu pt error)
       */}
      {message && (
        <div className={`p-4 mb-6 rounded-lg font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {message.type === 'success' ? '✓ ' : '⚠ '} {message.text}
        </div>
      )}

      <form onSubmit={handleSalveazaProfil} className="space-y-4">
        
        {/**
         * Folosesc componenta mea reutilizabilă RenderRow pentru a păstra UI-ul curat 
         * Invocăm componenta personalizată RenderRow de mai multe ori.
         * Trecând stările ('nume') și setterii ('setNume') prin props, conectăm câmpul la starea globală a formularului.
        */}
        <RenderRow label="Nume și Prenume" valoare={nume} idCamp="nume" onChangeVal={setNume} isEditing={isEditing.nume} toggleEdit={toggleEdit} />
        
        {/**
         * Adresa de email este afișată diferit: nu folosim RenderRow pentru că nu permitem editarea 
         * emailului direct din text (el implică autentificare și flux de confirmare diferit).
         * Este afișat exclusiv cu scop vizual de informare, randat direct în layout.
         */}
        <div className="border-b border-gray-100 pb-3 pt-2 text-gray-900">
          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Adresă de Email</span>
          <span className="text-gray-500 font-medium block bg-gray-50 p-2 rounded border border-gray-100 select-all">{email}</span>
        </div>

        {/**
         * Randăm restul rândurilor. De remarcat adăugarea props-ului opțional 'tipInput="textarea"' 
         * pentru adresa completă, care are nevoie de mai mult spațiu pe ecran.
         */}
        <RenderRow label="Număr de Telefon" valoare={telefon} idCamp="telefon" onChangeVal={setTelefon} isEditing={isEditing.telefon} toggleEdit={toggleEdit} />
        <RenderRow label="Județ" valoare={judet} idCamp="judet" onChangeVal={setJudet} isEditing={isEditing.judet} toggleEdit={toggleEdit} />
        <RenderRow label="Oraș / Localitate" valoare={oras} idCamp="oras" onChangeVal={setOras} isEditing={isEditing.oras} toggleEdit={toggleEdit} />
        <RenderRow label="Adresă Completă de Livrare" valoare={adresa} idCamp="adresa" onChangeVal={setAdresa} isEditing={isEditing.adresa} toggleEdit={toggleEdit} tipInput="textarea" />

        {/* Butonul pentru trimiterea emailului de modificare a parolei, acum funcțional
         * Secțiune separată dedicată inițierii modificării de parolă/date sensibile.
         * Apelarea butonului trimite cererea la Supabase pentru resetarea parolei via Email.
        */}
        <div className="pt-4 pb-4">
          <button 
            type="button" 
            onClick={handleTrimiteEmailModificare}
            className="text-sm font-bold text-[#5c3d2e] hover:text-[#dda15e] flex items-center gap-2 transition"
          >
            ✉ Trimite email pentru modificarea securizată a datelor de cont
          </button>
        </div>

        {/* Bara inferioară cu opțiuni generale de salvare / ieșire
         *  Subsolul formularului (bara de acțiuni).
         * Este utilizat flexbox pentru ca butoanele să se așeze pe un singur rând pe desktop
         * dar pe mai multe coloane pe mobil, folosind clase de responsive design (md:flex-row, w-full md:w-auto).
        */}
        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100 w-full justify-between items-center">
          
          {/** Buton de evadare înapoi la magazin / homepage. */}
          <button 
            type="button" 
            onClick={handleInapoiAcasa}
            className="w-full md:w-auto bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition shadow whitespace-nowrap"
          >
            ← Înapoi la Pagina Principală
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            {/**
             * Butonul Anulează.
             * Este dezactivat automat folosind 'disabled={!hasChanges}' dacă nu s-a făcut nicio modificare pe pagină,
             * prevenind astfel clickurile inutile.
             */}
            <button 
              type="button" 
              onClick={handleAnuleazaModificari}
              disabled={!hasChanges}
              className="w-full sm:w-auto bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Anulează
            </button>

            {/**
             * Butonul de submit al formularului.
             * Starea lui 'disabled' depinde de prezența unor modificări nesalvate sau dacă deja are loc
             * o operațiune de salvare ('isUpdating'), caz în care textul din interior își schimbă formatul.
             */}
            <button 
              type="submit" 
              disabled={!hasChanges || isUpdating}
              className="w-full sm:w-auto bg-[#dda15e] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#bc8a50] transition disabled:opacity-40 disabled:cursor-not-allowed shadow whitespace-nowrap"
            >
              {isUpdating ? 'Se salvează...' : 'Salvează Modificări'}
            </button>
          </div>

        </div>
      </form>
    </div>
  )
}