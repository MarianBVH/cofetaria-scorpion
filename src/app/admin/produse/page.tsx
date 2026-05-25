'use client'

import { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import Link from 'next/link'

export default function GestioneazaProduse() {
  const [produse, setProduse] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  // Stări pentru Modalul de adăugare NOU
  const [showAddModal, setShowAddModal] = useState(false)
  const [tipProdusSelectat, setTipProdusSelectat] = useState('prajitura')

  useEffect(() => {
    fetchProduse()
  }, [])

  const fetchProduse = async () => {
    const { data } = await supabase.from('products').select('*').order('id', { ascending: false })
    if (data) setProduse(data)
    setLoading(false)
  }

  const stergeProdus = async (id: number) => {
    if (window.confirm('Sigur vrei să ștergi acest produs?')) {
      await supabase.from('products').delete().eq('id', id)
      fetchProduse() 
    }
  }

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-gray-900">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold text-[#5c3d2e]">Gestiune Stocuri și Produse</h1>
        
        {/* Butonul modificat ca să deschidă modalul */}
        <button 
          onClick={() => setShowAddModal(true)}
          className="bg-green-600 text-white px-4 py-2 rounded font-bold hover:bg-green-700 transition shadow-md"
        >
          + Adaugă Produs Nou
        </button>
      </div>

      {loading ? (
        <p>Se încarcă produsele...</p>
      ) : produse.length === 0 ? (
        <p className="text-gray-500">Nu există produse momentan. Adaugă unul nou!</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-gray-900">
            <thead className="text-gray-800">
              <tr className="bg-gray-100">
                <th className="p-3 border-b-2 border-gray-200">ID</th>
                <th className="p-3 border-b-2 border-gray-200">Nume Produs</th>
                <th className="p-3 border-b-2 border-gray-200">Preț</th>
                <th className="p-3 border-b-2 border-gray-200">Stoc</th>
                <th className="p-3 border-b-2 border-gray-200">Acțiuni</th>
              </tr>
            </thead>
            <tbody>
              {produse.map((prod) => (
                <tr key={prod.id} className={`border-b border-gray-100 ${prod.stoc < 5 ? 'bg-red-50' : ''}`}>
                  <td className="p-3">{prod.id}</td>
                  <td className="p-3 font-bold">{prod.nume}</td>
                  <td className="p-3">{prod.pret} RON</td>
                  <td className={`p-3 font-bold ${prod.stoc < 5 ? 'text-red-600' : 'text-green-600'}`}>
                    {prod.stoc} buc.
                  </td>
                  <td className="p-3 flex gap-4">
                    <Link href={`/admin/produse/editeaza/${prod.id}`} className="text-blue-600 hover:underline font-bold">Editează</Link>
                    <button onClick={() => stergeProdus(prod.id)} className="text-red-600 hover:underline font-bold">Șterge</button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          <p className="text-sm text-gray-500 mt-2">* Rândurile roșii indică stoc critic (sub 5 bucăți).</p>
        </div>
      )}

      {/* MODALUL PENTRU ALEGEREA TIPULUI DE PRODUS */}
      {showAddModal && (
        <div className="fixed inset-0 bg-gray-900 bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-xl shadow-2xl max-w-sm w-full border border-gray-200">
            <h2 className="text-xl font-bold text-[#5c3d2e] mb-4 text-center border-b pb-2">Ce dorești să adaugi?</h2>
            
            <div className="mb-6">
              <label className="block text-sm font-bold text-gray-700 mb-2">Selectează tipul produsului:</label>
              <select 
                value={tipProdusSelectat} 
                onChange={(e) => setTipProdusSelectat(e.target.value)}
                className="w-full border-2 border-gray-200 p-3 rounded-lg text-gray-900 bg-gray-50 focus:border-[#dda15e] focus:outline-none transition shadow-sm"
              >
                <option value="prajitura">🍰 Prăjitură</option>
                <option value="tort">🎂 Tort (Prestabilit)</option>
              </select>
            </div>

            <div className="flex gap-4">
              <button 
                onClick={() => setShowAddModal(false)}
                className="flex-1 bg-gray-200 text-gray-800 font-bold py-2 rounded hover:bg-gray-300 transition"
              >
                Anulează
              </button>
              
              {/* Redirecționăm către formular, transmițând parametrul ?tip=prajitura sau ?tip=tort */}
              <Link 
                href={`/admin/produse/adauga?tip=${tipProdusSelectat}`}
                className="flex-1 bg-[#dda15e] text-white text-center font-bold py-2 rounded hover:bg-[#bc8a50] transition shadow"
              >
                Continuă
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}