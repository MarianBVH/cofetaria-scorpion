/**
 * Directiva indică mediului de rulare Next.js că această componentă trebuie randată exclusiv pe partea de client.
 * Este o cerință esențială deoarece modulul utilizează hook-uri React (useState) pentru gestionarea stării
 * și necesită acces la interacțiunile directe ale utilizatorului cu interfața (evenimente DOM).
 */
'use client'

/**
 * Importurile bibliotecilor necesare pentru funcționarea modulului.
 * Se utilizează hook-uri React pentru controlul stărilor locale.
 * Clientul Supabase este importat pentru a facilita cererile asincrone de autentificare către baza de date.
 * Componenta Link din Next.js este folosită pentru a asigura o navigare rapidă și fluidă fără reîncărcarea întregii pagini.
 */
import { useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

/**
 * Componenta principală responsabilă cu procesul de autentificare a utilizatorilor.
 * Rolul său este de a gestiona starea formularului, de a efectua validări de bază,
 * de a comunica asincron cu API-ul de securitate și de a afișa mesaje de succes sau de eroare corespunzătoare.
 */
export default function Login() {
  /**
   * Stările locale utilizate pentru a reține temporar adresa de email și parola.
   * Valorile acestora se actualizează dinamic pe măsură ce utilizatorul completează câmpurile formularului.
   */
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  
  /**
   * Stare booleană care controlează modul de afișare al parolei.
   * Modificarea acestei stări permite alterarea tipului de input între 'password' (text mascat) și 'text' (vizibil),
   * îmbunătățind experiența utilizatorului atunci când dorește să verifice corectitudinea datelor introduse.
   */
  const [showPassword, setShowPassword] = useState(false)
  
  /**
   * Stări destinate managementului interfeței pe durata cererilor asincrone de rețea.
   * Starea 'loading' blochează interacțiunile redundante, prevenind executarea unor operațiuni multiple simultane.
   * Starea 'error' stochează și expune utilizatorului mesajele rezultate în urma unei autentificări nereușite.
   */
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  
  /**
   * Stare auxiliară utilizată pentru a stoca mesajele de confirmare pozitivă.
   * Se folosește cu precădere pentru a notifica utilizatorul în momentul în care acțiuni secundare,
   * precum trimiterea unui link de resetare a parolei, s-au încheiat cu succes.
   */
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  /**
   * Funcția asincronă care orchestrează fluxul de logare.
   * Se declanșează la trimiterea (submit) formularului de autentificare.
   * Aceasta previne comportamentul implicit al browserului și coordonează cererea de logare.
   *
   * @param e Evenimentul generat de formular, necesar pentru oprirea comportamentului implicit (reîncărcarea paginii).
   */
  const handleLogin = async (e: React.FormEvent) => {
    /**
     * Se oprește reîncărcarea standard a paginii și se reinițializează stările de feedback.
     * Se activează starea de încărcare pentru a dezactiva butonul de trimitere.
     */
    e.preventDefault()
    setError(null)
    setSuccessMessage(null)
    setLoading(true)

    /**
     * Se apelează serviciul de autentificare furnizat de Supabase.
     * Această metodă compară adresa de email și parola introduse de utilizator cu cele din baza de date sigură.
     */
    const { error: authError } = await supabase.auth.signInWithPassword({
      email,
      password,
    })

    /**
     * Analiza rezultatului întors de către Supabase.
     * Dacă se întâmpină o eroare (cum ar fi parolă greșită sau cont inexistent),
     * procesul este oprit, iar utilizatorul primește un mesaj informativ clar.
     */
    if (authError) {
      setError('Email sau parolă incorectă.')
      setLoading(false)
      return
    }

    /**
     * În urma validării cu succes a credențialelor, se efectuează o redirecționare directă utilizând obiectul window.
     * Acest tip de navigare forțează reîncărcarea completă a contextului aplicației,
     * fiind o măsură eficientă pentru a asigura preluarea globală a sesiunii noi (ex. reactualizarea meniului de navigare).
     */
    window.location.href = '/'
  }

  /**
   * Funcția asincronă creată pentru a gestiona cererile de resetare a parolei.
   * Rolul său este de a valida disponibilitatea adresei de email și de a declanșa trimiterea
   * unui mesaj electronic ce conține un link de securitate necesar procesului de restabilire.
   */
  const handleResetareParola = async () => {
    /**
     * Curățarea prealabilă a mesajelor anterioare, vizând asigurarea că utilizatorul primește doar feedback relevant acțiunii curente.
     */
    setError(null)
    setSuccessMessage(null)

    /**
     * Sistemul validează existența unei adrese de email introduse anterior.
     * Dacă respectiva căsuță de input este necompletată, execuția se oprește prematur, iar utilizatorul este îndrumat.
     */
    if (!email) {
      setError('Te rog să introduci adresa de email în câmpul de mai sus pentru a reseta parola.')
      return
    }

    setLoading(true)

    /**
     * Se instruiește sistemul de autentificare să trimită un email de recuperare pe adresa specificată.
     * Variabila 'redirectTo' este esențială, deoarece specifică traiectoria utilizatorului după accesarea linkului din email,
     * direcționându-l în mod corespunzător spre interfața de actualizare a parolei.
     */
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    /**
     * După apelul asincron, interfața furnizează un rezultat pozitiv sau negativ utilizatorului.
     * Starea de succes sau de eșec este setată, permițând randarea mesajelor în UI, urmată de deblocarea aplicației.
     */
    if (resetError) {
      setError('A apărut o eroare la trimiterea emailului: ' + resetError.message)
    } else {
      setSuccessMessage('Am trimis un link pentru resetarea parolei pe adresa ta de email. Te rog să verifici inbox-ul!')
    }
    
    setLoading(false)
  }

  /**
   * Funcția de redare a interfeței componentei.
   * Containerul principal utilizează clase utilitare pentru a se centra pe ecran și a expune vizual formularul.
   */
  return (
    <div className="max-w-md mx-auto mt-16 bg-white p-8 border rounded-lg shadow-sm">
      <h2 className="text-2xl font-bold text-center text-[#5c3d2e] mb-6">Autentificare</h2>

      {/*
       * Secțiune destinată randării condiționate a eventualelor erori captate pe parcursul autentificării sau resetării.
       * Blocul HTML va apărea vizibil pe ecran numai dacă variabila de stare 'error' are o valoare atribuită.
       */}
      {error && (
        <div className="bg-red-50 text-red-600 p-3 mb-4 rounded border border-red-200 text-sm font-bold">
          ⚠ {error}
        </div>
      )}

      {/*
       * Similară zonei de eroare, această secțiune este folosită pentru a afișa mesaje cu o conotație pozitivă.
       * Exemplul tipic este confirmarea expedierii cu succes a instrucțiunilor de resetare pe adresa de email.
       */}
      {successMessage && (
        <div className="bg-green-50 text-green-700 p-3 mb-4 rounded border border-green-200 text-sm font-bold">
          ✓ {successMessage}
        </div>
      )}

      {/*
       * Formularul principal de interacțiune. Atributul 'onSubmit' leagă evenimentul nativ de metoda
       * personalizată responsabilă cu tratarea cererilor de logare.
       */}
      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          {/*
           * Secțiunea dedicată captării adresei de email a utilizatorului. 
           * Evenimentul 'onChange' asigură preluarea asincronă, la fiecare tastare, a datelor 
           * și actualizarea permanentă a stării 'email'.
           */}
          <label className="block text-sm font-medium text-gray-700">Email</label>
          <input 
            type="email" 
            required 
            onChange={(e) => setEmail(e.target.value)} 
            className="mt-1 w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" 
          />
        </div>

        <div>
          <div className="flex justify-between items-center">
            <label className="block text-sm font-medium text-gray-700">Parolă</label>
            {/*
             * Buton integrat în nivelul etichetei, alocat pentru a facilita recuperarea parolei pierdute.
             * Deoarece nu servește trimiterii formularului, acesta primește explicit tipul 'button'.
             * Apăsarea sa apelează logica independentă destinată comunicării cu serverul de recuperare.
             */}
            <button 
              type="button" 
              onClick={handleResetareParola}
              className="text-xs text-[#dda15e] font-bold hover:underline"
            >
              Ai uitat parola?
            </button>
          </div>
          {/*
           * Container cu o dispunere relativă, folosit pentru poziționarea internă și corectă
           * a elementului de mascare/demascare (toggle) a textului parolei.
           */}
          <div className="relative mt-1 flex items-center">
            {/*
             * Câmpul pentru parolă evaluează dinamic valoarea stării 'showPassword' pentru a ajusta tipul.
             * Astfel textul poate fi redat ca 'password' sau 'text', optimizând verificarea acestuia de către utilizator.
             */}
            <input 
              type={showPassword ? "text" : "password"} 
              required 
              onChange={(e) => setPassword(e.target.value)} 
              className="w-full p-2 border rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none pr-20" 
            />
            {/*
             * Declanșatorul vizibilității. O simplă apăsare de buton inversează valoarea variabilei boolene
             * din starea locală, influențând tipul imput-ului principal de mai sus.
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

        {/*
         * Butonul care validează procesul formularului complet. 
         * Acesta primește instrucțiunea 'disabled' conectată direct la starea de procesare, asigurând o izolare
         * la nivelul componentei prin prevenirea declanșării simultane a multiplelor instanțe asincrone de logare.
         */}
        <button type="submit" disabled={loading} className="w-full bg-[#5c3d2e] text-white font-bold py-2 px-4 rounded hover:bg-[#3e2a20] transition disabled:opacity-50 mt-4">
          {loading ? 'Se procesează...' : 'Intră în cont'}
        </button>
      </form>

      {/*
       * Secțiunea finală de ancorare, direcționând utilizatorii potențiali noi
       * către panoul dedicat de înregistrare, sporind fluxul de navigare.
       */}
      <p className="text-center text-sm text-gray-600 mt-4">
        Nu ai cont? <Link href="/register" className="text-[#dda15e] font-bold">Înregistrează-te</Link>.
      </p>
    </div>
  )
}