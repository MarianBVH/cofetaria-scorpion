import jsPDF from 'jspdf';
// @ts-ignore
import autoTable from 'jspdf-autotable';

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
 */
const eliminaDiacritice = (str: string) => {
  if (!str) return '';
  return str.normalize("NFD").replace(/[\u0300-\u036f]/g, "");
};

export const genereazaFacturaPDF = (date: DateFactura) => {
  const doc = new jsPDF('p', 'mm', 'a4');

  // --- SECȚIUNEA 1: Antetul Facturii ---
  doc.setFontSize(20);
  doc.setTextColor(92, 61, 46); 
  doc.text(eliminaDiacritice('FACTURA FISCALA'), 105, 20, { align: 'center' });

  doc.setFontSize(10);
  doc.setTextColor(50, 50, 50); 
  
  doc.text(eliminaDiacritice('Furnizor: SCORPION I.I.'), 14, 35);
  doc.text(eliminaDiacritice('C.U.I.: RO12345678'), 14, 40); 
  doc.text(eliminaDiacritice('Sediu: Soseaua Constantei, Nr. 24'), 14, 45);
  doc.text(eliminaDiacritice('Localitate: Harsova, Jud. Constanta'), 14, 50);

  // --- SECȚIUNEA 2: Datele Clientului și ale Comenzii ---
  const dataFormatata = new Date(date.dataComanda).toLocaleDateString('ro-RO');

  doc.text('Client:', 120, 35);
  doc.setFont('helvetica', 'bold');
  doc.text(eliminaDiacritice(date.numeClient), 120, 40);
  doc.setFont('helvetica', 'normal');
  doc.text(`Telefon: ${date.telefon}`, 120, 45);
  doc.text(eliminaDiacritice(`Adresa: ${date.adresaFacturare}, ${date.orasFacturare}`), 120, 50, { maxWidth: 80 });

  doc.text(`Numar Comanda: #${date.orderId}`, 14, 65);
  doc.text(`Data emiterii: ${dataFormatata}`, 14, 70);
  
  const textPlata = date.metodaPlata === 'card' ? 'Card Bancar' : 'Numerar / La ridicare';
  doc.text(eliminaDiacritice(`Metoda de plata: ${textPlata}`), 14, 75);
  
  const textLivrare = date.tipLivrare === 'livrare' ? 'Livrare la domiciliu' : 'Ridicare personala';
  doc.text(eliminaDiacritice(`Metoda de livrare: ${textLivrare}`), 14, 80);

  // --- SECȚIUNEA 3: Tabelul cu Produse ---
  const tabelDate = date.produse.map((prod, index) => [
    index + 1,
    eliminaDiacritice(prod.nume), // Eliminăm diacriticele și din numele prăjiturilor
    prod.cantitate.toString(),
    `${prod.pret_per_bucata.toFixed(2)} RON`,
    `${(prod.cantitate * prod.pret_per_bucata).toFixed(2)} RON`
  ]);

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
    headStyles: { fillColor: [221, 161, 94] }, 
    styles: { fontSize: 10, cellPadding: 3 },
    columnStyles: {
      0: { cellWidth: 15, halign: 'center' }, 
      2: { cellWidth: 25, halign: 'center' }, 
      3: { cellWidth: 35, halign: 'right' },  
      4: { cellWidth: 35, halign: 'right' }   
    }
  });

  // --- SECȚIUNEA 4: Totalul ---
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const finalY = (doc as any).lastAutoTable.finalY || 150;

  doc.setFontSize(12);
  doc.setFont('helvetica', 'bold');
  doc.text(eliminaDiacritice(`Total de plata: ${date.total.toFixed(2)} RON`), 196, finalY + 10, { align: 'right' });

  doc.setFontSize(10);
  doc.setFont('helvetica', 'italic');
  doc.text(eliminaDiacritice('Va multumim pentru cumparaturi! Pofta buna!'), 105, 280, { align: 'center' });

  doc.save(`Factura_Cofetaria_Scorpion_${date.orderId}.pdf`);
};