'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

// Componenta modulară pe care am creat-o pentru a randa un rând editabil din profil.
// Aceasta primește datele și funcțiile de update prin props, menținând codul curat.
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
    <div className="flex justify-between items-center border-b border-gray-100 pb-3 pt-2 text-gray-900">
      <div className="flex-1 pr-4">
        <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">{label}</span>
        {isEditing ? (
          tipInput === 'textarea' ? (
            <textarea rows={2} value={valoare} onChange={e => onChangeVal(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" />
          ) : (
            <input type="text" value={valoare} onChange={e => onChangeVal(e.target.value)} className="w-full border p-2 rounded text-gray-900 bg-white focus:border-[#dda15e] focus:outline-none" autoFocus />
          )
        ) : (
          <span className="text-gray-800 font-medium block min-h-[24px]">{valoare || <span className="text-gray-400 italic font-normal">Nespecificat</span>}</span>
        )}
      </div>
      
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

export default function ProfilUtilizator() {
  // Stări pentru gestionarea interfeței
  const [loading, setLoading] = useState(true)
  const [isUpdating, setIsUpdating] = useState(false)
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null)

  // Stocarea datelor utilizatorului
  const [email, setEmail] = useState('')
  
  // Păstrez o copie a datelor originale pentru a putea da "Anulare" sau a verifica dacă au existat modificări
  const [originalData, setOriginalData] = useState({
    nume: '', telefon: '', judet: '', oras: '', adresa: ''
  })

  // Stările pentru fiecare câmp în parte
  const [nume, setNume] = useState('')
  const [telefon, setTelefon] = useState('')
  const [judet, setJudet] = useState('')
  const [oras, setOras] = useState('')
  const [adresa, setAdresa] = useState('')

  // Mențin starea de editare pentru fiecare câmp
  const [isEditing, setIsEditing] = useState<Record<string, boolean>>({
    nume: false, telefon: false, judet: false, oras: false, adresa: false
  })

  // Efect hook apelat la montarea componentei pentru a încărca datele
  useEffect(() => {
    getProfil()
  }, [])

  // Funcție asincronă care preia sesiunea și datele profilului din baza de date
  const getProfil = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      window.location.href = '/login'
      return
    }

    setEmail(session.user.email || '')

    // Caut rândul specific din tabela profiles bazat pe ID-ul din sistemul de Auth
    const { data, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', session.user.id)
      .single()

    if (data && !error) {
      const deSalvat = {
        nume: data.nume || '',
        telefon: data.telefon || '',
        judet: data.judet || '',
        oras: data.oras || '',
        adresa: data.adresa || ''
      }
      
      setOriginalData(deSalvat)
      setNume(deSalvat.nume)
      setTelefon(deSalvat.telefon)
      setJudet(deSalvat.judet)
      setOras(deSalvat.oras)
      setAdresa(deSalvat.adresa)
    }
    setLoading(false)
  }

  // Verific dacă există vreo discrepanță între datele originale și cele din inputuri
  const hasChanges = 
    nume !== originalData.nume ||
    telefon !== originalData.telefon ||
    judet !== originalData.judet ||
    oras !== originalData.oras ||
    adresa !== originalData.adresa

  // Comută un câmp între vizualizare text și input editabil
  const toggleEdit = (camp: string) => {
    setIsEditing(prev => ({ ...prev, [camp]: !prev[camp] }))
  }

  // Funcție pentru butonul de anulare, care resetează stările la datele originale
  const handleAnuleazaModificari = () => {
    setNume(originalData.nume)
    setTelefon(originalData.telefon)
    setJudet(originalData.judet)
    setOras(originalData.oras)
    setAdresa(originalData.adresa)
    
    setIsEditing({ nume: false, telefon: false, judet: false, oras: false, adresa: false })
    setMessage(null)
  }

  // Protecție suplimentară pentru a nu pierde modificările nesalvate la părăsirea paginii
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
    
    // Deoarece utilizatorul este logat, folosesc emailul preluat din sesiune
    const { error: resetError } = await supabase.auth.resetPasswordForEmail(email, {
      redirectTo: `${window.location.origin}/update-password`,
    })

    if (resetError) {
      setMessage({ type: 'error', text: 'Eroare la trimiterea emailului: ' + resetError.message })
    } else {
      setMessage({ type: 'success', text: 'Un link pentru setarea unei noi parole a fost trimis pe adresa ta de email.' })
    }
  }

  // Funcție asincronă care trimite modificările efectuate în baza de date Supabase
  const handleSalveazaProfil = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsUpdating(true)
    setMessage(null)

    const { data: { session } } = await supabase.auth.getSession()
    if (!session) return

    const { error } = await supabase
      .from('profiles')
      .update({ nume, telefon, judet, oras, adresa })
      .eq('id', session.user.id)

    if (error) {
      setMessage({ type: 'error', text: 'Eroare la salvare: ' + error.message })
    } else {
      setMessage({ type: 'success', text: 'Modificările au fost salvate cu succes!' })
      setOriginalData({ nume, telefon, judet, oras, adresa })
      setIsEditing({ nume: false, telefon: false, judet: false, oras: false, adresa: false })
    }
    setIsUpdating(false)
  }

  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă profilul tău...</div>

  return (
    <div className="max-w-3xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900 mt-6">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-2">Profilul Meu</h1>
      <p className="text-gray-500 mb-6">Gestionați informațiile personale asociate contului de client.</p>

      {/* Mesajele dinamice de eroare sau succes */}
      {message && (
        <div className={`p-4 mb-6 rounded-lg font-bold border ${message.type === 'success' ? 'bg-green-50 text-green-700 border-green-200' : 'bg-red-50 text-red-600 border-red-200'}`}>
          {message.type === 'success' ? '✓ ' : '⚠ '} {message.text}
        </div>
      )}

      <form onSubmit={handleSalveazaProfil} className="space-y-4">
        
        {/* Folosesc componenta mea reutilizabilă RenderRow pentru a păstra UI-ul curat */}
        <RenderRow label="Nume și Prenume" valoare={nume} idCamp="nume" onChangeVal={setNume} isEditing={isEditing.nume} toggleEdit={toggleEdit} />
        
        <div className="border-b border-gray-100 pb-3 pt-2 text-gray-900">
          <span className="block text-xs font-bold text-gray-400 uppercase tracking-wider mb-1">Adresă de Email</span>
          <span className="text-gray-500 font-medium block bg-gray-50 p-2 rounded border border-gray-100 select-all">{email}</span>
        </div>

        <RenderRow label="Număr de Telefon" valoare={telefon} idCamp="telefon" onChangeVal={setTelefon} isEditing={isEditing.telefon} toggleEdit={toggleEdit} />
        <RenderRow label="Județ" valoare={judet} idCamp="judet" onChangeVal={setJudet} isEditing={isEditing.judet} toggleEdit={toggleEdit} />
        <RenderRow label="Oraș / Localitate" valoare={oras} idCamp="oras" onChangeVal={setOras} isEditing={isEditing.oras} toggleEdit={toggleEdit} />
        <RenderRow label="Adresă Completă de Livrare" valoare={adresa} idCamp="adresa" onChangeVal={setAdresa} isEditing={isEditing.adresa} toggleEdit={toggleEdit} tipInput="textarea" />

        {/* Butonul pentru trimiterea emailului de modificare a parolei, acum funcțional */}
        <div className="pt-4 pb-4">
          <button 
            type="button" 
            onClick={handleTrimiteEmailModificare}
            className="text-sm font-bold text-[#5c3d2e] hover:text-[#dda15e] flex items-center gap-2 transition"
          >
            ✉ Trimite email pentru modificarea securizată a datelor de cont
          </button>
        </div>

        {/* Bara inferioară cu opțiuni generale de salvare / ieșire */}
        <div className="flex flex-col md:flex-row gap-4 pt-6 border-t border-gray-100 w-full justify-between items-center">
          
          <button 
            type="button" 
            onClick={handleInapoiAcasa}
            className="w-full md:w-auto bg-gray-800 text-white font-bold py-3 px-6 rounded-lg hover:bg-gray-700 transition shadow whitespace-nowrap"
          >
            ← Înapoi la Pagina Principală
          </button>

          <div className="flex flex-col sm:flex-row gap-3 w-full md:w-auto">
            <button 
              type="button" 
              onClick={handleAnuleazaModificari}
              disabled={!hasChanges}
              className="w-full sm:w-auto bg-gray-200 text-gray-700 font-bold py-3 px-6 rounded-lg hover:bg-gray-300 transition disabled:opacity-40 disabled:cursor-not-allowed whitespace-nowrap"
            >
              Anulează
            </button>

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