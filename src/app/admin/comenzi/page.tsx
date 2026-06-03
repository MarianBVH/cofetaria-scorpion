'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'

export default function GestioneazaComenzi() {
  const [comenzi, setComenzi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  useEffect(() => {
    fetchComenzi()
  }, [])

  const fetchComenzi = async () => {
    setLoading(true)
    
    // Am adăugat 'judet' în interogarea profilului
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, profiles(nume, telefon, judet)')
      .order('data_comanda', { ascending: false })
      
    if (ordersData) {
      const comenziComplete = await Promise.all(ordersData.map(async (order) => {
        const { data: items } = await supabase
          .from('order_items')
          .select('*, products(nume)')
          .eq('order_id', order.id)

        const { data: customCakes } = await supabase
          .from('torturi_personalizate')
          .select('*')
          .eq('order_id', order.id)

        return {
          ...order,
          items: items || [],
          customCakes: customCakes || []
        }
      }))
      
      setComenzi(comenziComplete)
    }

    setLoading(false)
  }

  const updateStatus = async (id: number, nouStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: nouStatus }).eq('id', id)
    if (!error) fetchComenzi()
    else alert('Eroare la actualizare: ' + error.message)
  }

  const getStatusColor = (status: string) => {
    switch (status.toLowerCase()) {
      case 'noua': return 'bg-blue-100 text-blue-800'
      case 'procesata': return 'bg-yellow-100 text-yellow-800'
      case 'in livrare': return 'bg-purple-100 text-purple-800'
      case 'livrata': return 'bg-green-100 text-green-800'
      case 'anulata': return 'bg-red-100 text-red-800'
      default: return 'bg-gray-100 text-gray-800'
    }
  }

  const toggleExpand = (id: number) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }

  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă comenzile...</div>

  return (
    <div className="bg-white p-6 rounded-lg shadow-sm border border-gray-100 text-gray-900">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-8 border-b pb-4">Gestiune Comenzi</h1>

      <div className="mb-12">
        <h2 className="text-xl font-bold text-gray-800 mb-4 flex items-center gap-2">🛒 Toate Comenzile</h2>
        
        {comenzi.length === 0 ? (
          <p className="text-gray-500">Nu există comenzi momentan.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse border border-gray-200">
              <thead className="bg-gray-50 text-gray-700">
                <tr>
                  <th className="p-3 border-b w-10"></th>
                  <th className="p-3 border-b">ID / Dată</th>
                  <th className="p-3 border-b">Client / Telefon</th>
                  <th className="p-3 border-b">Livrare / Plată</th>
                  <th className="p-3 border-b">Total Estimat</th>
                  <th className="p-3 border-b">Status</th>
                  <th className="p-3 border-b text-center">Acțiune</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {comenzi.map(cmd => (
                  <React.Fragment key={cmd.id}>
                    <tr 
                      className={`hover:bg-gray-50 cursor-pointer transition ${expandedOrderId === cmd.id ? 'bg-orange-50' : ''}`}
                      onClick={() => toggleExpand(cmd.id)}
                    >
                      <td className="p-3 text-center text-[#dda15e] font-bold">
                        {expandedOrderId === cmd.id ? '▼' : '▶'}
                      </td>
                      <td className="p-3">
                        <div className="font-bold text-gray-900">#{cmd.id}</div>
                        <div className="text-xs text-gray-500">{new Date(cmd.data_comanda).toLocaleString('ro-RO')}</div>
                      </td>
                      <td className="p-3">
                        <div className="font-bold">{cmd.profiles?.nume || 'Client Necunoscut'}</div>
                        <div className="text-sm text-gray-600">{cmd.telefon_contact}</div>
                      </td>
                      <td className="p-3 text-sm">
                        <div className="capitalize font-bold">{cmd.tip_livrare}</div>
                        <div className="text-gray-600">
                          {cmd.oras_livrare}{cmd.profiles?.judet ? `, Jud. ${cmd.profiles.judet}` : ''}
                        </div>
                        <div className="text-xs mt-1 bg-gray-200 inline-block px-2 rounded">{cmd.metoda_plata === 'la_cofetarie' ? 'Numerar' : 'Card'}</div>
                      </td>
                      <td className="p-3 font-extrabold text-[#d32f2f]">
                        {cmd.total_comanda} RON
                        {cmd.customCakes.length > 0 && <span className="text-xs text-amber-600 block">+ Tort Custom</span>}
                      </td>
                      <td className="p-3">
                        <span className={`px-2 py-1 rounded text-xs font-bold capitalize ${getStatusColor(cmd.status)}`}>
                          {cmd.status}
                        </span>
                      </td>
                      <td className="p-3" onClick={(e) => e.stopPropagation()}>
                        <select 
                          className="border p-1 rounded text-sm w-full focus:outline-none focus:border-[#dda15e] bg-white"
                          value={cmd.status}
                          onChange={(e) => updateStatus(cmd.id, e.target.value)}
                        >
                          <option value="noua">Nouă</option>
                          <option value="procesata">Procesată</option>
                          <option value="in livrare">În Livrare</option>
                          <option value="livrata">Livrată</option>
                          <option value="anulata">Anulată</option>
                        </select>
                      </td>
                    </tr>

                    {expandedOrderId === cmd.id && (
                      <tr className="bg-gray-50 border-b-2 border-gray-200">
                        <td colSpan={7} className="p-6">
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            
                            <div>
                              <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Produse Standard</h4>
                              {cmd.items.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">Nu există produse standard în această comandă.</p>
                              ) : (
                                <ul className="space-y-2">
                                  {cmd.items.map((item: any) => (
                                    <li key={item.id} className="flex justify-between text-sm bg-white p-2 rounded border">
                                      <span><span className="font-bold">{item.cantitate}x</span> {item.products?.nume || 'Produs sters'}</span>
                                      <span className="font-semibold text-gray-700">{item.pret_per_bucata} RON/buc</span>
                                    </li>
                                  ))}
                                </ul>
                              )}
                              {cmd.tip_livrare === 'livrare' && (
                                <div className="mt-4 text-sm bg-white p-3 rounded border">
                                  <strong>Adresă Livrare:</strong> {cmd.adresa_livrare}, {cmd.oras_livrare}, Jud. {cmd.profiles?.judet || '-'}
                                </div>
                              )}
                            </div>

                            <div>
                              <h4 className="font-bold text-gray-800 mb-3 border-b pb-2">Torturi Personalizate (Cotații de preț)</h4>
                              {cmd.customCakes.length === 0 ? (
                                <p className="text-sm text-gray-500 italic">Nu s-a solicitat niciun tort personalizat.</p>
                              ) : (
                                <div className="space-y-4">
                                  {cmd.customCakes.map((cake: any) => (
                                    <div key={cake.id} className="bg-white p-3 rounded border flex gap-4 text-sm shadow-sm">
                                      {cake.imagine_referinta && (
                                        <a href={cake.imagine_referinta} target="_blank" rel="noopener noreferrer" className="flex-shrink-0">
                                          <img src={cake.imagine_referinta} alt="Ref" className="w-16 h-16 object-cover rounded border hover:opacity-80 transition" />
                                        </a>
                                      )}
                                      <div>
                                        <div className="font-bold text-gray-900 capitalize">{cake.tip_tort.replace('_', ' ')} - {cake.greutate} kg</div>
                                        <div className="text-gray-700 mt-1"><strong>Ocazie:</strong> {cake.ocazie.replace('_', ' ')}</div>
                                        {cake.mesaj && <div className="text-gray-700 mt-1"><strong>Mesaj:</strong> "{cake.mesaj}"</div>}
                                        {cake.descriere && <div className="text-gray-600 mt-2 text-xs border-t pt-2">{cake.descriere}</div>}
                                      </div>
                                    </div>
                                  ))}
                                </div>
                              )}
                            </div>

                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}