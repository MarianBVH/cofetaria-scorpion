/**
 * Directiva 'use client' marchează acest fișier ca fiind un Client Component în arhitectura Next.js App Router.
 * Acest lucru este obligatoriu deoarece componenta interacționează direct cu API-urile browser-ului, 
 * utilizează hook-uri de stare (useState, useEffect) și atașează listenere pe evenimentele DOM (onSubmit, onClick).
 */
'use client'

/**
 * Importăm hook-urile React necesare gestionării stării locale și a ciclului de viață al componentei.
 */
import { useState, useEffect } from 'react'

/**
 * Importăm clientul Supabase preconfigurat. Acesta este vital pentru a interacționa 
 * cu serviciile de autentificare, permițându-ne să validăm sesiunea curentă și să suprascriem parola.
 */
import { supabase } from '@/lib/supabaseClient'

/**
 * Importăm componenta Link din Next.js pentru o navigare rapidă pe partea de client (Client-Side Routing),
 * fără a reîncărca complet pagina după o eventuală reușită a resetării.
 */
import Link from 'next/link'

/**
 * Componenta `UpdatePassword` este responsabilă pentru afișarea și procesarea formularului 
 * prin care un utilizator își poate seta o nouă parolă. Pagina este accesată, de regulă, 
 * în urma accesării unui link securizat de recuperare trimis pe email.
 */
export default function UpdatePassword() {
  // Stocăm valorile introduse pentru parola nouă
  /**
   * Stările controlate destinate valorilor din formular. 
   * Folosirea stării locale ne permite să implementăm validări instantanee (ex. verificarea parolelor).
   */
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  
  // Stare pentru a ascunde/afișa caracterele parolei
  /**
   * Stare booleană pentru a îmbunătăți experiența utilizatorului (UX). 
   * Când este true, atributul "type" al input-urilor se transformă din "password" în "text".
   */
  const [showPassword, setShowPassword] = useState(false)
  
  // Stări pentru gestionarea interfeței (încărcare, erori, succes)
  /**
   * Stări pentru gestionarea ciclului de viață al request-ului către API:
   * - loading: blochează acțiunile multiple pe durata prelucrării cererii.
   * - error: păstrează și expune mesaje de eroare de la validările frontend sau din backend.
   * - success: declanșează o schimbare de interfață în urma modificării cu succes a parolei.
   */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [success, setSuccess] = useState(false)

  // Asigur că verific dacă utilizatorul a ajuns aici cu o sesiune validă (primită prin link-ul din email)
  /**
   * Hook-ul useEffect este folosit pentru a valida dacă utilizatorul a ajuns pe această pagină printr-un flux corect.
   * Când un utilizator dă click pe link-ul de recuperare trimis prin email, URL-ul conține un token de tip 'hash'.
   * Supabase interceptează automat acest token și creează o sesiune locală de scurtă durată în browser.
   * Aici verificăm dacă acest proces de creare a sesiunii a reușit. Dacă `session` lipsește, token-ul a fost alterat sau a expirat.
   */
  useEffect(() => {
    // Supabase interceptează automat token-ul din URL și creează sesiunea
    // Aici verific doar dacă totul a decurs bine.
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (!session) {
        setError('Link-ul de resetare este invalid sau a expirat. Te rog să ceri altul de pe pagina de login.')
      }
    })
  }, [])

  // Funcția care execută efectiv schimbarea parolei în baza de date
  /**
   * Funcția declanșată la trimiterea formularului (onSubmit). 
   * Aceasta validează input-ul utilizatorului și comunică cu serverul de autentificare Supabase.
   */
  const handleUpdatePassword = async (e: React.FormEvent) => {
    // Prevenim comportamentul implicit al browser-ului de a reîncărca pagina la trimiterea formularului.
    e.preventDefault()
    // Resetăm erorile vechi pentru a oferi feedback proaspăt la fiecare încercare.
    setError(null)
    
    // Prima validare de securitate la nivel de frontend
    /**
     * Validare Frontend 1: Se asigură că ambele câmpuri sunt identice.
     * Motiv: Previne situația în care utilizatorul ar salva din greșeală o parolă cu typos.
     */
    if (newPassword !== confirmPassword) {
      setError('Parolele introduse nu coincid!')
      return
    }

    /**
     * Validare Frontend 2: Parola trebuie să îndeplinească o complexitate minimă.
     * Motiv: Previne rejectarea inutilă de către Supabase și impune un minim de securitate.
     */
    if (newPassword.length < 6) {
      setError('Parola trebuie să aibă cel puțin 6 caractere.')
      return
    }

    // Trecem în modul de așteptare pentru a dezactiva butonul de submit pe durata request-ului.
    setLoading(true)

    // Aici apelez metoda Supabase pentru a actualiza datele utilizatorului logat
    /**
     * Apelăm metoda `updateUser` din clientul Supabase Auth.
     * Acest apel va reuși DOAR dacă există deja o sesiune activă (asigurată de token-ul din URL).
     * Transmitem obiectul cu un câmp `password` pentru a suprascrie parola veche a contului curent.
     */
    const { error: updateError } = await supabase.auth.updateUser({
      password: newPassword
    })

    // Tratarea erorilor returnate direct din baza de date sau din regulile de securitate ale Supabase.
    if (updateError) {
      setError('Eroare la actualizarea parolei: ' + updateError.message)
    } else {
      // Dacă actualizarea a fost cu succes, actualizez interfața pentru a-i afișa mesajul
      // La succes, setăm variabila de control pe `true` pentru a declanșa randarea mesajului de confirmare.
      setSuccess(true)
    }
    
    // Oprim starea de încărcare, fie că am întâmpinat o eroare sau un succes.
    setLoading(false)
  }

  // Interfața de succes afișată DUPĂ ce parola a fost schimbată
  /**
   * 'Early Return' Pattern: Dacă parola a fost schimbată cu succes, utilizatorul nu mai are nevoie de formular.
   * Astfel, randăm o interfață izolată strict pentru mesajul de succes și un buton către home.
   */
  if (success) {
    return (
      <div className="max-w-md mx-auto mt-20 bg-white p-8 border rounded-lg shadow-sm text-center">
        <div className="text-5xl text-green-500 mb-4">✓</div>
        <h2 className="text-2xl font-bold text-[#5c3d2e] mb-4">Parolă actualizată!</h2>
        <p className="text-gray-600 mb-8">
          Parola ta a fost modificată cu succes. Acum poți folosi noua parolă pentru a te autentifica în aplicație.
        </p>
        <Link href="/" className="bg-[#5c3d2e] text-white font-bold py-3 px-6 rounded hover:bg-[#3e2a20] transition inline-block">
          Mergi la pagina principală
        </Link>
      </div>
    )
  }

  // Interfața principală a formularului de resetare
  /**
   * Interfața principală care este afișată inițial la deschiderea paginii.
   */
  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-2">Setează Parola Nouă</h2>
      <p className="text-center text-sm text-gray-500 mb-6">
        Introdu mai jos o parolă nouă pentru contul tău.
      </p>

      {/*
        * Afișare Condiționată: Blocul de eroare devine vizibil în DOM doar dacă `error` nu este null.
        */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm font-bold">
          ⚠ {error}
        </div>
      )}

      <form onSubmit={handleUpdatePassword} className="space-y-4">
        
        {/* Câmpul pentru Parola Nouă */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Parolă nouă</label>
          <div className="relative mt-1 flex items-center">
            {/* 
              * Folosim atributul `type` variabil. Dacă `showPassword` e true, va afișa text clar (text), 
              * altfel ascunde caracterele (password).
              */}
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              minLength={6}
              onChange={(e) => setNewPassword(e.target.value)} 
              className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-20" 
            />
            {/* 
              * Buton de toggle a vizibilității parolei. Este poziționat absolut (`absolute right-2`) 
              * pentru a fi plasat în interiorul aceluiași rând vizual cu input-ul.
              */}
            <button 
              type="button" 
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-2 text-gray-600 hover:text-[#5c3d2e] font-bold text-sm bg-white px-2 py-1"
            >
              {showPassword ? "Ascunde" : "Vezi"}
            </button>
          </div>
        </div>

        {/* Câmpul pentru Confirmarea Parolei */}
        <div>
          <label className="block text-sm font-medium text-gray-700">Confirmă parola nouă</label>
          <div className="relative mt-1 flex items-center">
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              minLength={6}
              onChange={(e) => setConfirmPassword(e.target.value)} 
              className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-20" 
            />
          </div>
        </div>

        {/* 
          * Butonul de submit. Acesta este dezactivat condiționat (`disabled`):
          * fie când este în proces de `loading`, fie dacă eroarea afișată sugerează că link-ul este invalid, 
          * pentru a nu lăsa utilizatorul să trimită cereri imposibil de soluționat.
          */}
        <button 
          type="submit" 
          disabled={loading || !!error?.includes('invalid')} 
          className="w-full bg-[#dda15e] text-white font-bold py-3 px-4 rounded hover:bg-[#bc8a50] transition disabled:opacity-50 mt-4 shadow-sm"
        >
          {loading ? 'Se salvează...' : 'Salvează parola'}
        </button>
      </form>
    </div>
  )
}