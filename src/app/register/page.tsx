/**
 * Directiva 'use client' este obligatorie în arhitectura Next.js App Router pentru componentele
 * care necesită interactivitate pe partea de client. Deoarece folosim hook-uri React (useState) 
 * și manipulăm evenimente DOM (onClick, onSubmit), acest fișier trebuie randat pe client.
 */
'use client'

/**
 * Importăm hook-urile necesare din React pentru gestionarea stărilor locale.
 */
import { useState } from 'react'

/**
 * Importăm clientul Supabase pentru a interacționa cu backend-ul (autentificare și baza de date).
 */
import { supabase } from '@/lib/supabaseClient'

/**
 * Importăm componenta Link din Next.js pentru o navigare rapidă pe partea de client, 
 * fără reîncărcarea paginii.
 */
import Link from 'next/link'

/**
 * Componenta principală de Înregistrare a utilizatorilor.
 * Gestionează procesul de creare a unui cont nou, inclusiv validarea datelor, 
 * salvarea în Supabase Auth și popularea tabelei de profile asociate utilizatorului.
 */
export default function Register() {
  /**
   * Stări pentru gestionarea ciclului de viață al cererii (request-ului):
   * - loading: previne trimiterile multiple (double-submit) prin dezactivarea butonului de submit.
   * - error: stochează mesajele de eroare (fie de validare frontend, fie returnate de Supabase) pentru a le afișa utilizatorului.
   */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Stare booleană care controlează fluxul interfeței (UI).
   * Când înregistrarea se finalizează cu succes, această stare devine true,
   * ascunzând formularul și afișând mesajul care îndrumă utilizatorul să-și verifice emailul.
   */
  const [isSubmitted, setIsSubmitted] = useState(false)
  
  /**
   * Stări pentru îmbunătățirea experienței utilizatorului (UX) la completarea parolelor.
   * Acestea transformă atributul 'type' al input-urilor din 'password' în 'text' pentru o verificare vizuală a corectitudinii.
   */
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)

  /**
   * Obiect centralizat pentru stocarea tuturor valorilor introduse în formular.
   * Folosirea unui singur obiect în loc de state-uri individuale per câmp menține codul mai curat 
   * și simplifică logica de actualizare. Structura de aici corespunde și cu nevoile ulterioare (ex. tabela profiles).
   */
  const [formData, setFormData] = useState({
    nume: '',
    prenume: '',
    email: '',
    telefon: '',
    judet: '',
    oras: '',
    adresa: '',
    parola: '',
    confirmareParola: ''
  })

  /**
   * Funcție generică pentru actualizarea datelor din `formData`.
   * Folosește atributul `name` al elementului HTML (input/textarea) drept cheie dinamică.
   * 
   * @param e Evenimentul de schimbare generat de interacțiunea cu input-urile.
   */
  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    setFormData({ ...formData, [e.target.name]: e.target.value })
  }

  /**
   * Funcția declanșată la trimiterea formularului de înregistrare.
   * Orchestrează validările, comunicarea cu API-ul de autentificare și crearea profilului extins.
   * 
   * @param e Evenimentul de submit al formularului.
   */
  const handleRegister = async (e: React.FormEvent) => {
    // Prevenim comportamentul nativ al browser-ului de a da refresh paginii la submit.
    e.preventDefault()
    // Curățăm erorile anterioare pentru a asigura un feedback precis la o nouă încercare.
    setError(null)

    /**
     * 1. Validare Frontend: Securitate și coerență
     * Verificăm ca ambele câmpuri de parolă să fie identice, evitând astfel crearea unui cont
     * pe care utilizatorul să nu îl poată accesa ulterior din cauza unei greșeli de tastare.
     */
    if (formData.parola !== formData.confirmareParola) {
      setError('Parolele nu coincid!')
      return
    }

    // Trecem aplicația în starea de procesare pentru a da un feedback vizual și a bloca submit-urile adiționale.
    setLoading(true)

    /**
     * 2. Înregistrarea utilizatorului în Supabase Auth
     * Această metodă creează utilizatorul în mod securizat în baza de date principală de autentificare (auth.users).
     * Supabase va trimite automat un email de confirmare pe baza setărilor de proiect (Email Confirmations).
     */
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: formData.email,
      password: formData.parola,
    })

    // Tratarea erorilor returnate de Supabase (ex. parola prea scurtă, email deja existent).
    if (authError) {
      setError(authError.message)
      setLoading(false)
      return
    }

    /**
     * 3. Crearea profilului utilizatorului (Tabela 'profiles')
     * Dacă înregistrarea a reușit, avem la dispoziție obiectul authData.user care conține un 'id' (UUID) unic.
     * Folosim acel ID pentru a crea un rând legat (via Foreign Key) în tabela publică 'profiles', 
     * stocând astfel datele adiționale de facturare și livrare.
     */
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('profiles')
        .insert([
          {
            id: authData.user.id,
            nume: `${formData.nume} ${formData.prenume}`,
            telefon: formData.telefon,
            judet: formData.judet,
            oras: formData.oras,
            adresa: formData.adresa,
            rol: 'user'
          }
        ])

      if (profileError) {
        // Tratăm eroarea separat. Este util pentru debugging să știm exact dacă problema 
        // a intervenit la auth sau doar la insertul de date conexe.
        setError('Eroare la salvarea profilului: ' + profileError.message)
        setLoading(false)
      } else {
        // Setăm variabila de control pe `true`. Acest lucru va re-randa componenta 
        // și va ascunde formularul, afișând mesajul despre trimiterea emailului de confirmare.
        setIsSubmitted(true)
        setLoading(false)
      }
    }
  }

  /**
   * INTERFAȚA 1: Starea de succes a componentei ('Early Return')
   * Dacă utilizatorul a finalizat cu succes toți pașii de mai sus, returnăm o interfață
   * de confirmare, solicitându-i să-și verifice emailul. Se renunță complet la afișarea formularului.
   */
  if (isSubmitted) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white p-8 rounded-xl shadow-lg border border-gray-100 text-center">
          <div className="text-6xl mb-4">📧</div>
          <h2 className="text-2xl font-extrabold text-[#5c3d2e] mb-4">Verifică-ți adresa de email!</h2>
          <p className="text-gray-600 mb-6">
            Ți-am trimis un link de confirmare pe adresa <span className="font-bold text-gray-900">{formData.email}</span>. 
            Contul tău a fost creat, dar trebuie activat făcând click pe linkul din acel email.
          </p>
          <div className="p-4 bg-yellow-50 text-yellow-800 rounded-lg text-sm mb-6 border border-yellow-200">
            <strong>Notă:</strong> Dacă nu găsești email-ul în Inbox, te rog să verifici și folderul Spam / Junk.
          </div>
          <Link href="/login" className="inline-block bg-[#dda15e] text-white font-bold py-3 px-8 rounded-lg hover:bg-[#bc8a50] transition shadow-md w-full">
            Mergi la pagina de Logare
          </Link>
        </div>
      </div>
    )
  }

  /**
   * INTERFAȚA 2: Formularul implicit de înregistrare.
   */
  return (
    <div className="max-w-md mx-auto mt-10 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-6">Înregistrare Cont Nou</h2>
      
      {/*
       * Afișare condiționată pentru mesaje de eroare. 
       * Dacă valoarea 'error' nu este null, va apărea acest bloc roșu de alertă.
       */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm">
          {error}
        </div>
      )}

      <form onSubmit={handleRegister} className="space-y-4">
        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Nume *</label>
            <input type="text" name="nume" required onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Prenume *</label>
            <input type="text" name="prenume" required onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Email *</label>
          <input type="email" name="email" required onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Județ</label>
            <input type="text" name="judet" onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Oraș</label>
            <input type="text" name="oras" onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          </div>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Adresă completă</label>
          <textarea name="adresa" rows={2} onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none"></textarea>
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700">Telefon</label>
          <input type="text" name="telefon" onChange={handleChange} className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
        </div>

        <div className="flex gap-4">
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Parolă *</label>
            <div className="relative mt-1 flex items-center">
              {/*
               * Input pentru parolă ce comută tipul de la 'password' la 'text' 
               * în funcție de starea showPassword.
               */}
              <input 
                type={showPassword ? "text" : "password"} 
                name="parola" 
                required minLength={6} 
                onChange={handleChange} 
                className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-2 text-gray-600 hover:text-[#5c3d2e] font-bold text-xs bg-white px-1"
              >
                {showPassword ? "Ascunde" : "Vezi"}
              </button>
            </div>
          </div>
          
          <div className="flex-1">
            <label className="block text-sm font-medium text-gray-700">Confirmă *</label>
            <div className="relative mt-1 flex items-center">
              {/*
               * Input pentru confirmarea parolei ce funcționează exact la fel 
               * ca și cel anterior, fiind controlat de showConfirmPassword.
               */}
              <input 
                type={showConfirmPassword ? "text" : "password"} 
                name="confirmareParola" 
                required minLength={6} 
                onChange={handleChange} 
                className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-16" 
              />
              <button 
                type="button" 
                onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                className="absolute right-2 text-gray-600 hover:text-[#5c3d2e] font-bold text-xs bg-white px-1"
              >
                {showConfirmPassword ? "Ascunde" : "Vezi"}
              </button>
            </div>
          </div>
        </div>

        {/*
         * Buton de submit. Devine dezactivat vizual (opacity scade) și funcțional 
         * dacă aplicația se află în starea de 'loading'.
         */}
        <button type="submit" disabled={loading} className="w-full bg-[#dda15e] text-white font-bold py-2 px-4 rounded hover:bg-[#bc8a50] transition disabled:opacity-50 mt-4">
          {loading ? 'Se procesează...' : 'Creează Cont'}
        </button>
      </form>

      <p className="text-center text-sm text-gray-600 mt-4">
        Ai deja cont? <Link href="/login" className="text-[#dda15e] font-bold">Autentifică-te</Link>.
      </p>
    </div>
  )
}