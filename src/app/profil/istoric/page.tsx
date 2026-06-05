'use client'

import React, { useEffect, useState } from 'react'
import { supabase } from '@/lib/supabaseClient'
import { genereazaFacturaPDF, DateFactura } from '@/lib/generareFactura'

export default function IstoricComenzi() {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [comenzi, setComenzi] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [expandedOrderId, setExpandedOrderId] = useState<number | null>(null)

  useEffect(() => {
    fetchIstoric()
  }, [])

  const fetchIstoric = async () => {
    setLoading(true)
    const { data: { session } } = await supabase.auth.getSession()

    if (!session) {
      window.location.href = '/login'
      return
    }

    // Am adăugat extragerea numelui și telefonului din profil pentru factură
    const { data: ordersData } = await supabase
      .from('orders')
      .select('*, profiles(nume, telefon, judet)')
      .eq('user_id', session.user.id)
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

  const toggleExpand = (id: number) => {
    setExpandedOrderId(expandedOrderId === id ? null : id)
  }

  // Acțiunea actualizată pentru descărcarea facturii
  const handleAfiseazaFactura = (orderId: number) => {
    // Căutăm comanda specifică în state-ul local
    const cmd = comenzi.find(c => c.id === orderId);
    if (!cmd) return;

    // Mapăm produsele standard din comandă
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const produseStandard = cmd.items.map((item: any) => ({
      nume: item.products?.nume || 'Produs necunoscut',
      cantitate: item.cantitate,
      pret_per_bucata: Number(item.pret_per_bucata)
    }));

    // Mapăm torturile personalizate 
    // Setăm prețul la 0 deoarece prețul final se stabilește de obicei telefonic pentru custom-uri
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const torturiPersonalizate = cmd.customCakes.map((cake: any) => ({
      nume: `Tort Personalizat (${cake.tip_tort}) - ${cake.greutate}kg`,
      cantitate: 1,
      pret_per_bucata: 0 
    }));

    // Construim obiectul pentru factura PDF
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

    // Apelăm funcția de generare
    genereazaFacturaPDF(dateFactura);
  }

  if (loading) return <div className="text-center py-20 font-bold text-[#5c3d2e] text-xl">Se încarcă istoricul...</div>

  return (
    <div className="max-w-4xl mx-auto bg-white p-6 md:p-10 rounded-xl shadow-md border border-gray-100 text-gray-900 mt-6">
      <h1 className="text-3xl font-extrabold text-[#5c3d2e] mb-2">Istoric Comenzi</h1>
      <p className="text-gray-500 mb-6">Verifică statusul livrării și consultă detaliile fiecărei comenzi plasate.</p>

      {comenzi.length === 0 ? (
        <p className="text-gray-500 italic text-center py-10">Nu ai înregistrat nicio comandă în magazinul online.</p>
      ) : (
        <div className="space-y-4">
          {comenzi.map(cmd => (
            <div key={cmd.id} className="border rounded-xl shadow-sm overflow-hidden bg-white">
              
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

              {expandedOrderId === cmd.id && (
                <div className="p-6 border-t bg-gray-50/50 space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    
                    <div>
                      <h4 className="font-bold text-gray-800 mb-2">Produse incluse:</h4>
                      <ul className="space-y-2">
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {cmd.items.map((item: any) => (
                          <li key={item.id} className="bg-white p-3 rounded-lg border text-sm flex justify-between shadow-sm">
                            <span><span className="font-bold">{item.cantitate}x</span> {item.products?.nume}</span>
                            <span className="font-semibold text-gray-600">{item.pret_per_bucata} RON/buc</span>
                          </li>
                        ))}
                        {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
                        {cmd.customCakes.map((cake: any) => (
                          <li key={cake.id} className="bg-white p-3 rounded-lg border text-sm space-y-1 border-amber-200 bg-amber-50/20 shadow-sm">
                            <div className="flex justify-between font-bold text-amber-900">
                              <span>🎂 Tort Personalizat ({cake.tip_tort})</span>
                              <span>{cake.greutate} kg</span>
                            </div>
                            {cake.mesaj && <p className="text-xs italic text-gray-600">Marcaj text: "{cake.mesaj}"</p>}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="space-y-3 text-sm text-gray-700 bg-white p-4 rounded-lg border shadow-sm">
                      <p>
                        <strong>Adresă destinație:</strong> {cmd.adresa_livrare}, {cmd.oras_livrare}, Jud. {cmd.profiles?.judet || '-'}
                      </p>
                      <p><strong>Modalitate preluare:</strong> <span className="capitalize">{cmd.tip_livrare}</span></p>
                      <p><strong>Sistem de plată:</strong> {cmd.metoda_plata === 'la_cofetarie' ? 'Numerar / Cash' : 'Card bancar'}</p>
                      <p>
                        <strong>Informații livrare:</strong>{' '}
                        {cmd.status === 'livrata' 
                          ? 'Comanda a fost predată cu succes.' 
                          : 'Comanda se află în procesare și urmează transportul frigorific la destinație.'}
                      </p>
                    </div>

                  </div>

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