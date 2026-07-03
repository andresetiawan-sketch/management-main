import jsPDF from 'jspdf';
import { toast } from 'sonner';
import { base44 } from '@/api/cloudflareClient';
import { PKWT_TEMPLATE } from './PKWTTemplate';

const MAROON = [123, 26, 44];

function addPageHeader(doc, nomor, pw) {
  doc.setFillColor(...MAROON);
  doc.rect(0, 0, pw, 30, 'F');
  doc.setTextColor(255, 255, 255);
  doc.setFontSize(13); doc.setFont('helvetica', 'bold');
  doc.text('PERJANJIAN KERJA WAKTU TERTENTU', pw / 2, 13, { align: 'center' });
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  doc.text('( P K W T )', pw / 2, 21, { align: 'center' });
  doc.setTextColor(0, 0, 0);
}

function addFooter(doc, nomor, pw, pageNum) {
  doc.setFontSize(7); doc.setTextColor(150, 150, 150);
  doc.text(
    `${nomor || 'Draft PKWT'} | Halaman ${pageNum} | Dicetak: ${new Date().toLocaleDateString('id-ID')}`,
    pw / 2, 289, { align: 'center' }
  );
  doc.setTextColor(0, 0, 0);
}

function checkNewPage(doc, y, pw, nomor, pageNum) {
  if (y > 270) {
    addFooter(doc, nomor, pw, pageNum.val);
    doc.addPage();
    pageNum.val++;
    addPageHeader(doc, nomor, pw);
    y = 38;
  }
  return y;
}

export function generatePKWTPDF(item, onGenerated) {
  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' });
  const pw = doc.internal.pageSize.getWidth();
  const margin = 18;
  const contentWidth = pw - margin * 2;
  const pageNum = { val: 1 };

  // === HALAMAN 1 ===
  addPageHeader(doc, item.nomor_pkwt, pw);
  let y = 38;

  // Nomor
  doc.setFontSize(10); doc.setFont('helvetica', 'bold');
  doc.text(`Nomor: ${item.nomor_pkwt || '-'}`, pw / 2, y, { align: 'center' });
  y += 4;
  doc.setLineWidth(0.3); doc.setDrawColor(...MAROON);
  doc.line(margin, y, pw - margin, y);
  y += 7;

  // Intro
  doc.setFontSize(9); doc.setFont('helvetica', 'normal');
  const intro = PKWT_TEMPLATE.intro(item);
  const introLines = doc.splitTextToSize(intro, contentWidth);
  doc.text(introLines, margin, y);
  y += introLines.length * 5 + 6;

  // ---- PIHAK PERTAMA ----
  const pp1 = PKWT_TEMPLATE.pihakPertama(item);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('I. ' + pp1.title, margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  pp1.fields.forEach(({ label, value }) => {
    doc.text(label, margin + 5, y);
    doc.text(`:  ${value}`, margin + 55, y);
    y += 5.5;
  });
  y += 4;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('Selanjutnya disebut sebagai', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text('"PIHAK PERTAMA"', margin + 52, y);
  y += 8;

  // ---- PIHAK KEDUA ----
  const pp2 = PKWT_TEMPLATE.pihakKedua(item);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
  doc.text('II. ' + pp2.title, margin, y); y += 6;
  doc.setFont('helvetica', 'normal');
  pp2.fields.forEach(({ label, value }) => {
    doc.text(label, margin + 5, y);
    doc.text(`:  ${value}`, margin + 55, y);
    y += 5.5;
  });
  y += 4;
  doc.text('Selanjutnya disebut sebagai', margin, y);
  doc.setFont('helvetica', 'bold');
  doc.text('"PIHAK KEDUA"', margin + 52, y);
  y += 8;

  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const bothText = 'PIHAK PERTAMA dan PIHAK KEDUA secara bersama-sama selanjutnya disebut "PARA PIHAK" telah sepakat untuk membuat dan menandatangani Perjanjian Kerja Waktu Tertentu ini dengan ketentuan dan syarat-syarat sebagai berikut:';
  const bothLines = doc.splitTextToSize(bothText, contentWidth);
  doc.text(bothLines, margin, y);
  y += bothLines.length * 5 + 8;

  // ===== PASAL 1 - 8 =====
  PKWT_TEMPLATE.pasalList.forEach((pasal) => {
    y = checkNewPage(doc, y, pw, item.nomor_pkwt, pageNum);

    // Header pasal
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
    doc.setTextColor(...MAROON);
    doc.text(`PASAL ${pasal.nomor}`, pw / 2, y, { align: 'center' }); y += 5;
    doc.text(pasal.judul, pw / 2, y, { align: 'center' }); y += 7;
    doc.setTextColor(0, 0, 0);

    const ayatList = pasal.ayat(item);
    let ayatNum = 1;
    ayatList.forEach((ayat) => {
      y = checkNewPage(doc, y, pw, item.nomor_pkwt, pageNum);
      doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
      // Jika bukan sub-item (tidak mulai dgn a./b./c.)
      if (/^[a-z]\.\s/.test(ayat) || ayat.endsWith(':')) {
        const lines = doc.splitTextToSize(ayat, contentWidth - 8);
        doc.text(lines, margin + 8, y);
        y += lines.length * 5 + 1;
      } else {
        const prefix = `${ayatNum}. `;
        const lines = doc.splitTextToSize(prefix + ayat, contentWidth - 5);
        doc.text(lines, margin + 3, y);
        y += lines.length * 5 + 2;
        ayatNum++;
      }
    });
    y += 4;
  });

  // ===== PASAL 9 - LAIN-LAIN =====
  y = checkNewPage(doc, y, pw, item.nomor_pkwt, pageNum);
  doc.setFont('helvetica', 'bold'); doc.setFontSize(9.5);
  doc.setTextColor(...MAROON);
  doc.text('PASAL 9', pw / 2, y, { align: 'center' }); y += 5;
  doc.text('LAIN-LAIN', pw / 2, y, { align: 'center' }); y += 7;
  doc.setTextColor(0, 0, 0);

  const pasal9Ayat = item.pasal_9_ayat && item.pasal_9_ayat.length > 0
    ? item.pasal_9_ayat
    : [
        { isi: 'Hal-hal yang belum diatur dalam perjanjian ini akan diatur kemudian dalam peraturan perusahaan yang berlaku dan merupakan bagian yang tidak terpisahkan dari perjanjian ini.' },
        { isi: 'Perjanjian kerja ini dibuat dalam rangkap 2 (dua), masing-masing mempunyai kekuatan hukum yang sama, satu untuk PIHAK PERTAMA dan satu untuk PIHAK KEDUA.' },
        { isi: 'Perjanjian ini berlaku sejak tanggal ditandatangani oleh kedua belah pihak dan tidak dapat dipindahtangankan kepada pihak lain tanpa persetujuan tertulis dari kedua belah pihak.' },
      ];

  pasal9Ayat.forEach((ayat, idx) => {
    y = checkNewPage(doc, y, pw, item.nomor_pkwt, pageNum);
    doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
    const lines = doc.splitTextToSize(`${idx + 1}. ${ayat.isi}`, contentWidth - 5);
    doc.text(lines, margin + 3, y);
    y += lines.length * 5 + 2;
  });

  // ===== CATATAN =====
  if (item.catatan) {
    y += 4;
    y = checkNewPage(doc, y, pw, item.nomor_pkwt, pageNum);
    doc.setFont('helvetica', 'bold'); doc.setFontSize(9);
    doc.text('CATATAN:', margin, y); y += 5;
    doc.setFont('helvetica', 'normal');
    const catLines = doc.splitTextToSize(item.catatan, contentWidth);
    doc.text(catLines, margin, y);
    y += catLines.length * 5 + 4;
  }

  // ===== TANDA TANGAN =====
  if (y > 220) { addFooter(doc, item.nomor_pkwt, pw, pageNum.val); doc.addPage(); pageNum.val++; addPageHeader(doc, item.nomor_pkwt, pw); y = 38; }
  y += 8;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  const penutup = `Demikian perjanjian ini dibuat dan ditandatangani pada hari ${item.hari_tanda_tangan || '___________'}, tanggal ${item.tanggal_tanda_tangan || '___________'}, di ${item.kota_tanda_tangan || '___________'}, oleh kedua belah pihak dalam keadaan sadar dan tanpa paksaan dari pihak manapun.`;
  const penutupLines = doc.splitTextToSize(penutup, contentWidth);
  doc.text(penutupLines, margin, y);
  y += penutupLines.length * 5 + 14;

  const colW = (contentWidth) / 2;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(9);
  doc.text('PIHAK PERTAMA', margin + colW / 2, y, { align: 'center' });
  doc.text('PIHAK KEDUA', margin + colW + colW / 2, y, { align: 'center' });
  y += 5;
  doc.setFont('helvetica', 'bold');
  const ptName = item.entity_pt || 'Perusahaan';
  const ptLines = doc.splitTextToSize(ptName, colW - 5);
  doc.text(ptLines, margin + colW / 2, y, { align: 'center' });
  doc.text(item.jabatan_direktur || 'Direktur', margin + colW / 2, y + 5, { align: 'center' });
  y += 30;
  doc.setLineWidth(0.3); doc.setDrawColor(0, 0, 0);
  doc.line(margin + 5, y, margin + colW - 5, y);
  doc.line(margin + colW + 5, y, pw - margin - 5, y);
  y += 5;
  doc.setFont('helvetica', 'normal'); doc.setFontSize(8);
  doc.text(item.nama_direktur || '(___________________)', margin + colW / 2, y, { align: 'center' });
  doc.text(item.nama_karyawan || '(___________________)', margin + colW + colW / 2, y, { align: 'center' });

  addFooter(doc, item.nomor_pkwt, pw, pageNum.val);

  const pdfBlob = doc.output('blob');
  const fileName = `PKWT_${(item.nama_karyawan || 'Karyawan').replace(/\s/g, '_')}_${item.nik_karyawan || 'NIK'}.pdf`;
  doc.save(fileName);
  toast.success('PKWT PDF berhasil diunduh');

  if (onGenerated) {
    const file = new File([pdfBlob], fileName, { type: 'application/pdf' });
    base44.integrations.Core.UploadFile({ file }).then(({ file_url }) => {
      onGenerated(file_url);
    }).catch(() => {});
  }
}