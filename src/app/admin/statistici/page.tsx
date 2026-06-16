"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { PieChart, Pie, Cell, Tooltip as RechartsTooltip, ResponsiveContainer } from "recharts";

// Paletă de culori atractive pentru graficul Pie
const COLORS = ['#f59e0b', '#10b981', '#3b82f6', '#ef4444', '#8b5cf6', '#ec4899', '#14b8a6', '#f97316', '#6366f1', '#84cc16'];

export default function StatisticiDashboard() {
  const [orders, setOrders] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [uniqueProducts, setUniqueProducts] = useState<string[]>([]);

  // Stări independente pentru selectoarele de timp ale fiecărui card
  const [timeTopProducts, setTimeTopProducts] = useState("30");
  const [timeRevenue, setTimeRevenue] = useState("30");
  const [timeDelivery, setTimeDelivery] = useState("30");
  const [timeSpecific, setTimeSpecific] = useState("30");

  // Stări pentru produsul specific și comparație
  const [product1, setProduct1] = useState("");
  const [product2, setProduct2] = useState("");
  const [isComparing, setIsComparing] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    // Extragem comenzile livrate împreună cu produsele (pentru a obține numele lor)
    const { data, error } = await supabase
      .from('orders')
      .select(`
        id, data_comanda, total_comanda, status, tip_livrare,
        order_items ( cantitate, pret_per_bucata, products ( nume ) )
      `)
      .eq('status', 'livrata');

    if (error) {
      console.error("Eroare la extragerea datelor:", error);
    } else {
      const fetchedOrders = data || [];
      setOrders(fetchedOrders);

      // Extragem o listă unică de produse pentru dropdown-ul de căutare
      const productsSet = new Set<string>();
      fetchedOrders.forEach(order => {
        order.order_items.forEach((item: any) => {
          if (item.products?.nume) productsSet.add(item.products.nume);
        });
      });
      setUniqueProducts(Array.from(productsSet).sort());
    }
    setLoading(false);
  };

  // Funcție utilitară pentru filtrarea comenzilor pe baza perioadei selectate
  const filterOrdersByTime = (data: any[], days: string) => {
    if (days === "all") return data;
    const dateLimit = new Date();
    dateLimit.setDate(dateLimit.getDate() - parseInt(days));
    return data.filter(order => new Date(order.data_comanda) >= dateLimit);
  };

  // 1. Calcul pentru Top 10 Produse
  const getTopProductsData = () => {
    const filteredOrders = filterOrdersByTime(orders, timeTopProducts);
    const productStats: Record<string, { cantitate: number, valoare: number }> = {};
    let totalProduseVandute = 0;
    let totalIncasatDinProduse = 0;

    filteredOrders.forEach(order => {
      order.order_items.forEach((item: any) => {
        const nume = item.products?.nume || "Produs Necunoscut";
        const valoareItem = item.cantitate * item.pret_per_bucata;
        
        if (!productStats[nume]) {
          productStats[nume] = { cantitate: 0, valoare: 0 };
        }
        productStats[nume].cantitate += item.cantitate;
        productStats[nume].valoare += valoareItem;
        
        totalProduseVandute += item.cantitate;
        totalIncasatDinProduse += valoareItem;
      });
    });

    // Transformăm în array, sortăm descrescător și luăm doar primele 10
    const sortedProducts = Object.entries(productStats)
      .map(([name, stats]) => ({ name, ...stats }))
      .sort((a, b) => b.cantitate - a.cantitate)
      .slice(0, 10);

    return { sortedProducts, totalProduseVandute, totalIncasatDinProduse };
  };

  // 2. Calcul pentru Venit Total și AOV
  const getRevenueStats = () => {
    const filteredOrders = filterOrdersByTime(orders, timeRevenue);
    const totalRevenue = filteredOrders.reduce((sum, order) => sum + order.total_comanda, 0);
    const orderCount = filteredOrders.length;
    const aov = orderCount > 0 ? (totalRevenue / orderCount).toFixed(2) : "0.00";
    return { totalRevenue, aov, orderCount };
  };

  // 3. Calcul pentru Livrare vs Ridicare
  const getDeliveryStats = () => {
    const filteredOrders = filterOrdersByTime(orders, timeDelivery);
    let livrare = 0;
    let ridicare = 0;

    filteredOrders.forEach(order => {
      if (order.tip_livrare?.toLowerCase().includes("livrare")) livrare++;
      else ridicare++;
    });

    return [
      { name: "Livrare la domiciliu", value: livrare },
      { name: "Ridicare din magazin", value: ridicare }
    ];
  };

  // 4. Calcul Produs Specific (pentru comparație)
  const getSpecificProductStats = (productName: string) => {
    if (!productName) return { cantitate: 0, valoare: 0 };
    const filteredOrders = filterOrdersByTime(orders, timeSpecific);
    let cantitate = 0;
    let valoare = 0;

    filteredOrders.forEach(order => {
      order.order_items.forEach((item: any) => {
        if (item.products?.nume === productName) {
          cantitate += item.cantitate;
          valoare += (item.cantitate * item.pret_per_bucata);
        }
      });
    });

    return { cantitate, valoare };
  };

  if (loading) return <div className="p-10 text-center text-lg">Se încarcă statisticile...</div>;

  const topProductsInfo = getTopProductsData();
  const revenueStats = getRevenueStats();
  const deliveryStats = getDeliveryStats();
  const statsProduct1 = getSpecificProductStats(product1);
  const statsProduct2 = getSpecificProductStats(product2);

  return (
    <div className="max-w-7xl mx-auto p-6 space-y-8 bg-gray-50 min-h-screen">
      <h1 className="text-3xl font-bold text-gray-800 mb-8">Panou de Statistici</h1>

      {/* Datalist global pentru căutarea prăjiturilor */}
      <datalist id="lista-prajituri">
        {uniqueProducts.map(p => (
          <option key={p} value={p} />
        ))}
      </datalist>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
        
        {/* CARD 1: Cele mai populare produse (Top 10) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Top 10 Produse Populare</h2>
            <select 
              value={timeTopProducts} 
              onChange={(e) => setTimeTopProducts(e.target.value)}
              className="border border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm font-medium text-gray-900 bg-white p-2"
            >
              <option value="7">Ultima săptămână</option>
              <option value="30">Ultimele 30 de zile</option>
              <option value="90">Ultimele 3 luni</option>
              <option value="365">Ultimul an</option>
              <option value="all">Toată perioada</option>
            </select>
          </div>

          <div className="flex flex-col md:flex-row items-center justify-between">
            {/* Graficul Pie */}
            <div className="w-full md:w-1/2 h-[300px]">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={topProductsInfo.sortedProducts}
                    dataKey="cantitate"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    outerRadius={100}
                    innerRadius={60}
                    paddingAngle={2}
                  >
                    {topProductsInfo.sortedProducts.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Pie>
                  <RechartsTooltip formatter={(value) => [`${value} buc.`, "Cantitate"]} />
                </PieChart>
              </ResponsiveContainer>
            </div>

            {/* Legenda Laterală Detaliată */}
            <div className="w-full md:w-1/2 space-y-3 mt-6 md:mt-0 px-4">
              <h3 className="font-semibold text-gray-600 mb-2 border-b pb-2">Detalii Vânzări (Top {topProductsInfo.sortedProducts.length})</h3>
              {topProductsInfo.sortedProducts.map((prod, index) => (
                <div key={prod.name} className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 w-1/2">
                    <span className="w-3 h-3 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }}></span>
                    <span className="font-medium text-gray-700 truncate" title={prod.name}>{prod.name}</span>
                  </div>
                  <div className="w-1/4 text-right text-gray-600">{prod.cantitate} buc.</div>
                  <div className="w-1/4 text-right font-semibold text-amber-600">{prod.valoare} RON</div>
                </div>
              ))}
              {topProductsInfo.sortedProducts.length === 0 && (
                <p className="text-gray-500 text-sm">Nu există date pentru perioada selectată.</p>
              )}
            </div>
          </div>

          {/* Totaluri Fix Sub Grafic */}
          <div className="mt-8 grid grid-cols-2 gap-4 border-t pt-6 bg-gray-50 p-4 rounded-xl">
            <div className="text-center border-r border-gray-200">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Total Produse Vândute</p>
              <p className="text-2xl font-bold text-gray-800">{topProductsInfo.totalProduseVandute} buc.</p>
            </div>
            <div className="text-center">
              <p className="text-sm text-gray-500 uppercase tracking-wider">Total Încasat (din Top)</p>
              <p className="text-2xl font-bold text-green-600">{topProductsInfo.totalIncasatDinProduse} RON</p>
            </div>
          </div>
        </div>

        {/* CARD 4: Analiză și Comparație Produs Specific */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 lg:col-span-2">
          <div className="flex justify-between items-center mb-6 border-b pb-4">
            <h2 className="text-xl font-bold text-gray-800">Analiză Produs Specific</h2>
            <select 
              value={timeSpecific} 
              onChange={(e) => setTimeSpecific(e.target.value)}
              className="border border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm font-medium text-gray-900 bg-white p-2"
            >
              <option value="7">Ultima săptămână</option>
              <option value="30">Ultimele 30 de zile</option>
              <option value="90">Ultimele 3 luni</option>
              <option value="365">Ultimul an</option>
              <option value="all">Toată perioada</option>
            </select>
          </div>

          <div className="space-y-6">
            {/* Controalele de selecție */}
            <div className="flex flex-col md:flex-row gap-6 items-start md:items-end">
              <div className="w-full md:w-1/3">
                <label className="block text-sm font-medium text-gray-700 mb-1">Alege Produsul Principal</label>
                <input 
                  type="text"
                  list="lista-prajituri"
                  value={product1}
                  onChange={(e) => setProduct1(e.target.value)}
                  placeholder="Caută prăjitură..."
                  className="w-full border border-gray-300 rounded-lg shadow-sm p-2 text-gray-900 focus:ring-amber-500 focus:border-amber-500"
                />
              </div>

              <div className="w-full md:w-1/3 flex items-center h-full pb-2">
                <label className="flex items-center space-x-2 cursor-pointer">
                  <input 
                    type="checkbox" 
                    checked={isComparing} 
                    onChange={(e) => {
                      setIsComparing(e.target.checked);
                      if (!e.target.checked) setProduct2(""); // Resetăm produsul 2 dacă ascundem
                    }}
                    className="w-5 h-5 text-amber-600 border-gray-300 rounded focus:ring-amber-500"
                  />
                  <span className="text-sm font-medium text-gray-700">Compară cu un alt produs</span>
                </label>
              </div>

              {isComparing && (
                <div className="w-full md:w-1/3">
                  <label className="block text-sm font-medium text-gray-700 mb-1">Alege Produsul 2</label>
                  <input 
                    type="text"
                    list="lista-prajituri"
                    value={product2}
                    onChange={(e) => setProduct2(e.target.value)}
                    placeholder="Caută produs pentru comparație..."
                    className="w-full border border-gray-300 rounded-lg shadow-sm p-2 text-gray-900 focus:ring-amber-500 focus:border-amber-500"
                  />
                </div>
              )}
            </div>

            {/* Afișarea Datelor */}
            <div className="mt-8">
              {!product1 && !product2 ? (
                <p className="text-gray-500 italic">Selectează un produs pentru a vizualiza datele.</p>
              ) : (
                <div className={`grid grid-cols-1 ${isComparing && product2 ? 'md:grid-cols-2' : 'md:grid-cols-1'} gap-6`}>
                  
                  {/* Date Produs 1 */}
                  {product1 && (
                    <div className="bg-amber-50 p-6 rounded-xl border border-amber-200 shadow-sm">
                      <h3 className="text-lg font-bold text-amber-900 mb-4">{product1}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-amber-700 uppercase tracking-wider">Cantitate Vândută</p>
                          <p className="text-3xl font-black text-amber-600 mt-1">{statsProduct1.cantitate} <span className="text-lg font-medium">buc.</span></p>
                        </div>
                        <div>
                          <p className="text-sm text-amber-700 uppercase tracking-wider">Încasări Totale</p>
                          <p className="text-3xl font-black text-green-600 mt-1">{statsProduct1.valoare} <span className="text-lg font-medium">RON</span></p>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Date Produs 2 (Afișat doar dacă comparăm) */}
                  {isComparing && product2 && (
                    <div className="bg-blue-50 p-6 rounded-xl border border-blue-200 shadow-sm">
                      <h3 className="text-lg font-bold text-blue-900 mb-4">{product2}</h3>
                      <div className="grid grid-cols-2 gap-4">
                        <div>
                          <p className="text-sm text-blue-700 uppercase tracking-wider">Cantitate Vândută</p>
                          <p className="text-3xl font-black text-blue-600 mt-1">{statsProduct2.cantitate} <span className="text-lg font-medium">buc.</span></p>
                        </div>
                        <div>
                          <p className="text-sm text-blue-700 uppercase tracking-wider">Încasări Totale</p>
                          <p className="text-3xl font-black text-green-600 mt-1">{statsProduct2.valoare} <span className="text-lg font-medium">RON</span></p>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>

        {/* CARD 2: Venit Total & AOV */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Performanță Financiară</h2>
            <select 
              value={timeRevenue} 
              onChange={(e) => setTimeRevenue(e.target.value)}
              className="border border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm font-medium text-gray-900 bg-white p-2"
            >
              <option value="7">Ultima săptămână</option>
              <option value="30">Ultimele 30 de zile</option>
              <option value="90">Ultimele 3 luni</option>
              <option value="365">Ultimul an</option>
              <option value="all">Toată perioada</option>
            </select>
          </div>
          
          <div className="space-y-6 flex-grow flex flex-col justify-center">
            <div className="bg-amber-50 p-6 rounded-xl border border-amber-100">
              <p className="text-sm text-amber-800 uppercase tracking-wider font-semibold">Venit Total</p>
              <p className="text-4xl font-black text-amber-600 mt-2">{revenueStats.totalRevenue} RON</p>
              <p className="text-sm text-amber-700 mt-1">Generat din {revenueStats.orderCount} comenzi finalizate</p>
            </div>

            <div className="bg-blue-50 p-6 rounded-xl border border-blue-100">
              <p className="text-sm text-blue-800 uppercase tracking-wider font-semibold">Valoarea Medie a Comenzii (AOV)</p>
              <p className="text-4xl font-black text-blue-600 mt-2">{revenueStats.aov} RON</p>
              <p className="text-sm text-blue-700 mt-1">Media cheltuită de un client per comandă</p>
            </div>
          </div>
        </div>

        {/* CARD 3: Proporție Livrare vs Ridicare */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-100 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <h2 className="text-xl font-bold text-gray-800">Metode de Predare</h2>
            <select 
              value={timeDelivery} 
              onChange={(e) => setTimeDelivery(e.target.value)}
              className="border border-gray-300 rounded-lg shadow-sm focus:ring-amber-500 focus:border-amber-500 text-sm font-medium text-gray-900 bg-white p-2"
            >
              <option value="7">Ultima săptămână</option>
              <option value="30">Ultimele 30 de zile</option>
              <option value="90">Ultimele 3 luni</option>
              <option value="365">Ultimul an</option>
              <option value="all">Toată perioada</option>
            </select>
          </div>

          <div className="h-[250px] w-full mt-4">
            <ResponsiveContainer width="100%" height="100%">
              <PieChart>
                <Pie
                  data={deliveryStats}
                  dataKey="value"
                  nameKey="name"
                  cx="50%"
                  cy="50%"
                  outerRadius={80}
                  label={(props) => `${props.name} ${((props.percent || 0) * 100).toFixed(0)}%`}
                >
                  <Cell fill="#3b82f6" /> {/* Albastru pentru Livrare */}
                  <Cell fill="#10b981" /> {/* Verde pentru Ridicare */}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </div>
          
          <div className="mt-4 flex justify-center gap-8 text-sm border-t pt-4">
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-blue-500"></span>
                <span className="text-gray-600 font-medium">{deliveryStats[0].value} Livrări</span>
             </div>
             <div className="flex items-center gap-2">
                <span className="w-3 h-3 rounded-full bg-emerald-500"></span>
                <span className="text-gray-600 font-medium">{deliveryStats[1].value} Ridicări</span>
             </div>
          </div>
        </div>

      </div>
    </div>
  );
}