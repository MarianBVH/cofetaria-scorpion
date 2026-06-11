/**
 * Modul responsabil pentru generarea facturilor în format PDF pe partea de client.
 * Utilizează bibliotecile `jspdf` pentru desenarea documentului și `jspdf-autotable` 
 * pentru formatarea tabelară a produselor.
 */
import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

/**
 * Interfața care definește structura completă a datelor necesare pentru generarea unei facturi.
 * Asigură tipizarea strictă și previne omiterea unor informații vitale în documentul final.
 */
export interface DateFactura {
  orderId: number;
  dataComanda: string;
  numeClient: string;
  telefon: string;
  adresaFacturare: string;
  orasFacturare: string;
  tipLivrare: string;
  metodaPlata: string;
  total: number;
  produse: { nume: string; cantitate: number; pret_per_bucata: number }[];
}

/**
 * Funcție utilitară pentru a înlocui literele cu diacritice cu echivalentul lor standard.
  * Previne apariția spațiilor goale în jsPDF atunci când se folosesc fonturi default (fără suport UTF-8 extins).
 * 
 * Motiv: Fonturile implicite incluse în jsPDF (ex: Helvetica) folosesc formatul WinAnsiEncoding, 
 * care nu suportă caracterele UTF-8 extinse specifice limbii române (ă, î, â, ș, ț). Fără această 
 * procesare, caracterele respective ar fi ignorate sau randate incorect pe PDF.
 * 
 * @param str Șirul de caractere care trebuie normalizat.
 * @returns Șirul de caractere fără diacritice.
 */
const eliminaDiacritice = (str: string) => {
  if (!str) return '';
   // Normalize("NFD") separă caracterele de baza de semnele diacritice, 
  // iar replace-ul cu regex elimină strict codurile Unicode ale acelor semne.
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

/**
 * Generază și descarcă factura în format PDF pe baza datelor furnizate.
 * 
 * @param date Obiectul care conține toate datele necesare (client, comandă, produse).
 */
export const genereazaFacturaPDF = (date: DateFactura) => {
    // Inițializăm un document PDF nou: format Portret, unitate de măsură în milimetri, dimensiune pagină A4.
  const doc = new jsPDF('p', 'mm', 'a4');

  // --- SECȚIUNEA 1: Antetul Facturii ---
  doc.setFontSize(20);
  doc.setTextColor(92, 61, 46);// O nuanță de maro închis (#5c3d2e), pentru a păstra brandingul aplicației 
  doc.text(eliminaDiacritice('FACTURA FISCALA'), 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50); // Gri închis pentru un contrast optim la citire
  
  // Datele fixe ale furnizorului (pot fi ulterior extrase din variabile de mediu/configurări)
  doc.text(eliminaDiacritice('Furnizor: SCORPION I.I.'), 14, 35);
  doc.text(eliminaDiacritice('C.U.I.: RO12345678'), 14, 40); 
  doc.text(eliminaDiacritice('Sediu: Soseaua Constantei, Nr. 24'), 14, 45);
  doc.text(eliminaDiacritice('Localitate: Harsova, Jud. Constanta'), 14, 50);

  // --- SECȚIUNEA 2: Datele Clientului și ale Comenzii ---
  // Formatăm data comenzii conform standardului din România (ZZ.LL.AAAA)
  const dataFormatata = new Date(date.dataComanda).toLocaleDateString('ro-RO');

  doc.text('Client:', 120, 35);
  doc.setFont('helvetica', 'bold');
  doc.text(eliminaDiacritice(date.numeClient), 120, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`Telefon: ${date.telefon}`, 120, 45);
  // Limităm lățimea adresei la 80mm pentru a permite "text-wrapping" pe mai multe rânduri dacă este prea lungă
  doc.text(eliminaDiacritice(`Adresa: ${date.adresaFacturare}, ${date.orasFacturare}`), 120, 50, { maxWidth: 80 });

  doc.text(`Numar Comanda: #${date.orderId}`, 14, 65);
  doc.text(`Data emiterii: ${dataFormatata}`, 14, 70);
  
  const textPlata = date.metodaPlata === 'card' ? 'Card Bancar' : 'Numerar / La ridicare';
  doc.text(eliminaDiacritice(`Metoda de plata: ${textPlata}`), 14, 75);
  
  const textLivrare = date.tipLivrare === 'livrare' ? 'Livrare la domiciliu' : 'Ridicare personala';
  doc.text(eliminaDiacritice(`Metoda de livrare: ${textLivrare}`), 14, 80);

  // --- SECȚIUNEA 3: Tabelul cu Produse ---
  // Mapăm produsele primite într-un format de array de array-uri, specific cerințelor bibliotecii autoTable
  const tabelDate = date.produse.map((prod, index) => [
    index + 1,
    eliminaDiacritice(prod.nume), // Eliminăm diacriticele și din numele prăjiturilor
    prod.cantitate.toString(),
    `${prod.pret_per_bucata.toFixed(2)} RON`,
    `${(prod.cantitate * prod.pret_per_bucata).toFixed(2)} RON`
  ]);

    // Configurare și desenare tabel
  autoTable(doc, {
    startY: 90, 
    head: [[
      'Nr.', 
      eliminaDiacritice('Denumire Produs'), 
      'Cantitate', 
      eliminaDiacritice('Pret Unitar'), 
      'Valoare'
    ]],
    body: tabelDate, 
    theme: 'striped',
    headStyles: { fillColor: [221, 161, 94] },// Culoare pentru capul de tabel (asortată cu tema vizuală #dda15e) 
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' }, // Nr. Crt.
      2: { cellWidth: 25, halign: 'center' }, //Cantitate
      3: { cellWidth: 35, halign: 'right' },  //Pret Unitar
      4: { cellWidth: 35, halign: 'right' }   //Valoare Totala
    }
  });

  // --- SECȚIUNEA 4: Totalul ---
  // Deoarece dimensiunea tabelului variază în funcție de numărul de produse,
  // trebuie să preluăm coordonata Y la care s-a terminat de desenat tabelul.
  // Fallback la 150 în caz de eroare.
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  // Plasăm textul totalului imediat sub tabel, aliniat la dreapta
  doc.text(eliminaDiacritice(`Total de plata: ${date.total.toFixed(2)} RON`), 196, finalY + 10, { align: 'right' });

  // --- SECȚIUNEA 5: Subsol / Mesaj de final ---
  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(eliminaDiacritice('Va multumim pentru cumparaturi! Pofta buna!'), 105, 280, { align: 'center' });

  // Declanșăm salvarea documentului PDF pe dispozitivul utilizatorului
  doc.save(`Factura_Cofetaria_Scorpion_${date.orderId}.pdf`);
};