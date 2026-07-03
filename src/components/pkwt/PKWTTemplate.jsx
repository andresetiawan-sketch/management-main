// Template PKWT standar - pasal 1-8 fixed, pasal 9 editable
// Tanda [] = field yang bisa diisi/diubah saat pembuatan

export const DEFAULT_PASAL_9_AYAT = [
  {
    id: 1,
    isi: 'Hal-hal yang belum diatur dalam perjanjian ini akan diatur kemudian dalam peraturan perusahaan yang berlaku dan merupakan bagian yang tidak terpisahkan dari perjanjian ini.'
  },
  {
    id: 2,
    isi: 'Perjanjian kerja ini dibuat dalam rangkap 2 (dua), masing-masing mempunyai kekuatan hukum yang sama, satu untuk PIHAK PERTAMA dan satu untuk PIHAK KEDUA.'
  },
  {
    id: 3,
    isi: 'Perjanjian ini berlaku sejak tanggal ditandatangani oleh kedua belah pihak dan tidak dapat dipindahtangankan kepada pihak lain tanpa persetujuan tertulis dari kedua belah pihak.'
  }
];

export const PKWT_TEMPLATE = {
  intro: (data) => `Pada hari ini ${data.hari_tanda_tangan || '[HARI]'}, tanggal ${data.tanggal_tanda_tangan || '[TANGGAL]'}, bertempat di ${data.kota_tanda_tangan || '[KOTA]'}, telah disepakati dan ditandatangani Perjanjian Kerja Waktu Tertentu (selanjutnya disebut "PKWT") antara:`,

  pihakPertama: (data) => ({
    title: 'PIHAK PERTAMA',
    fields: [
      { label: 'Nama Perusahaan', value: data.entity_pt || '[NAMA PERUSAHAAN]' },
      { label: 'Bidang Usaha', value: 'Jasa Pengamanan & Pengelolaan Fasilitas' },
      { label: 'Alamat', value: data.alamat_perusahaan || '[ALAMAT PERUSAHAAN]' },
      { label: 'Diwakili oleh', value: data.nama_direktur || '[NAMA DIREKTUR/PIMPINAN]' },
      { label: 'Jabatan', value: data.jabatan_direktur || 'Direktur' },
    ]
  }),

  pihakKedua: (data) => ({
    title: 'PIHAK KEDUA',
    fields: [
      { label: 'Nama Lengkap', value: data.nama_karyawan || '[NAMA KARYAWAN]' },
      { label: 'NIK Karyawan', value: data.nik_karyawan || '[NIK]' },
      { label: 'NIK E-KTP', value: data.nik_ektp || '[NIK E-KTP]' },
      { label: 'Tempat/Tgl Lahir', value: `${data.tempat_lahir || '[TEMPAT]'}, ${data.tanggal_lahir || '[TANGGAL LAHIR]'}` },
      { label: 'Alamat', value: data.alamat_karyawan || '[ALAMAT KARYAWAN]' },
      { label: 'Jabatan', value: data.jabatan || '[JABATAN]' },
      { label: 'Area Penugasan', value: data.area_tugas || '[AREA PENUGASAN]' },
    ]
  }),

  pasalList: [
    {
      nomor: 1,
      judul: 'JANGKA WAKTU PERJANJIAN',
      ayat: (data) => [
        `Pihak Pertama mempekerjakan Pihak Kedua sebagai karyawan dengan status Perjanjian Kerja Waktu Tertentu (PKWT) terhitung mulai tanggal ${data.tanggal_mulai || '[TANGGAL MULAI]'} sampai dengan tanggal ${data.tanggal_selesai || '[TANGGAL SELESAI]'}.`,
        `Masa kontrak kerja ini adalah selama ${data.durasi_bulan || '[DURASI]'} (${data.durasi_terbilang || '[TERBILANG DURASI]'}) bulan.`,
        `Apabila masa kontrak berakhir dan PIHAK PERTAMA tidak memberitahukan perpanjangan atau pengakhiran kontrak, maka kontrak ini dianggap berakhir dengan sendirinya.`,
        `Perpanjangan PKWT dapat dilakukan berdasarkan kesepakatan tertulis kedua belah pihak paling lambat ${data.batas_perpanjangan || '30 (tiga puluh)'} hari sebelum masa kontrak berakhir.`,
      ]
    },
    {
      nomor: 2,
      judul: 'PENEMPATAN DAN TUGAS',
      ayat: (data) => [
        `PIHAK KEDUA ditempatkan dan ditugaskan di ${data.area_tugas || '[AREA PENUGASAN]'} dengan jabatan sebagai ${data.jabatan || '[JABATAN]'}.`,
        `PIHAK KEDUA wajib melaksanakan tugas dan tanggung jawab sesuai dengan deskripsi pekerjaan yang ditetapkan PIHAK PERTAMA.`,
        `PIHAK PERTAMA berhak memindahtugaskan PIHAK KEDUA ke tempat kerja lain dalam lingkungan perusahaan sesuai kebutuhan operasional, dengan pemberitahuan terlebih dahulu.`,
        `PIHAK KEDUA bersedia ditempatkan di ${data.wilayah_penugasan || '[WILAYAH PENUGASAN]'} dan area-area yang ditentukan oleh PIHAK PERTAMA.`,
      ]
    },
    {
      nomor: 3,
      judul: 'JAM KERJA DAN SHIFT',
      ayat: (data) => [
        `Jam kerja PIHAK KEDUA mengikuti jadwal shift yang ditetapkan oleh PIHAK PERTAMA sesuai kebutuhan operasional di lapangan.`,
        `Sistem shift yang berlaku adalah: Shift Pagi, Shift Siang, dan Shift Malam, dengan durasi ${data.durasi_shift || '8 (delapan)'} jam per shift.`,
        `Jadwal shift dapat berubah sesuai dengan kebutuhan operasional dengan pemberitahuan minimal ${data.pemberitahuan_shift || '1 (satu)'} hari sebelumnya.`,
        `Pekerjaan melebihi jam kerja normal akan dihitung sebagai kerja lembur sesuai ketentuan perundang-undangan yang berlaku.`,
      ]
    },
    {
      nomor: 4,
      judul: 'UPAH DAN TUNJANGAN',
      ayat: (data) => [
        `PIHAK PERTAMA setuju untuk membayar upah pokok kepada PIHAK KEDUA sebesar Rp ${data.gaji_pokok || '[NOMINAL GAJI POKOK]'} (${data.gaji_pokok_terbilang || '[TERBILANG]'}) per bulan.`,
        `Disamping upah pokok tersebut di atas, PIHAK KEDUA juga mendapatkan tunjangan-tunjangan sesuai kebijakan perusahaan yang berlaku, antara lain: Tunjangan Kehadiran, Tunjangan Jabatan, dan Tunjangan Transportasi.`,
        `Pembayaran upah dilakukan selambat-lambatnya pada tanggal ${data.tanggal_gajian || '[TANGGAL GAJIAN]'} setiap bulannya melalui transfer ke rekening Bank ${data.bank_karyawan || '[NAMA BANK]'} Nomor Rekening ${data.no_rekening || '[NOMOR REKENING]'} atas nama ${data.nama_karyawan || '[NAMA KARYAWAN]'}.`,
        `Upah dapat ditinjau kembali berdasarkan penilaian kinerja dan kebijakan perusahaan yang berlaku.`,
      ]
    },
    {
      nomor: 5,
      judul: 'HAK DAN KEWAJIBAN',
      ayat: () => [
        `Hak PIHAK KEDUA:`,
        `a. Mendapatkan upah dan tunjangan sesuai yang telah disepakati dalam perjanjian ini;`,
        `b. Mendapatkan jaminan sosial (BPJS Ketenagakerjaan dan BPJS Kesehatan) sesuai ketentuan peraturan perundang-undangan yang berlaku;`,
        `c. Mendapatkan cuti tahunan selama 12 (dua belas) hari kerja setelah bekerja selama 12 (dua belas) bulan berturut-turut;`,
        `d. Mendapatkan perlengkapan dan alat kerja yang diperlukan untuk melaksanakan tugas.`,
        `Kewajiban PIHAK KEDUA:`,
        `a. Melaksanakan tugas dan tanggung jawab dengan sebaik-baiknya sesuai ketentuan dan instruksi PIHAK PERTAMA;`,
        `b. Mematuhi peraturan perusahaan, tata tertib, dan prosedur operasional standar yang berlaku;`,
        `c. Menjaga kerahasiaan informasi, data, dan rahasia perusahaan;`,
        `d. Merawat dan menjaga perlengkapan/peralatan kerja milik perusahaan.`,
      ]
    },
    {
      nomor: 6,
      judul: 'TATA TERTIB DAN SANKSI',
      ayat: () => [
        `PIHAK KEDUA wajib mematuhi peraturan dan tata tertib perusahaan sebagaimana yang tertuang dalam Peraturan Perusahaan (PP) dan Standar Operasional Prosedur (SOP) yang berlaku.`,
        `Pelanggaran terhadap tata tertib perusahaan dapat mengakibatkan sanksi berupa: Surat Peringatan (SP I, SP II, SP III), skorsing, atau pemutusan hubungan kerja sesuai tingkat pelanggaran.`,
        `Tindakan-tindakan berikut dapat mengakibatkan pemutusan hubungan kerja dengan segera (tanpa surat peringatan): melakukan tindak pidana, melakukan tindak kekerasan di lingkungan kerja, membocorkan rahasia perusahaan, dan tindakan sejenisnya yang merugikan perusahaan.`,
        `PIHAK KEDUA dilarang keras melakukan hal-hal yang dapat merugikan nama baik perusahaan dan klien.`,
      ]
    },
    {
      nomor: 7,
      judul: 'PENGAKHIRAN PERJANJIAN',
      ayat: (data) => [
        `Perjanjian kerja ini berakhir dengan sendirinya pada tanggal ${data.tanggal_selesai || '[TANGGAL SELESAI]'} tanpa diperlukan pemberitahuan pengakhiran dari masing-masing pihak.`,
        `Perjanjian kerja ini dapat diakhiri sebelum waktunya atas kesepakatan kedua belah pihak dengan pemberitahuan tertulis minimal ${data.notif_phk || '14 (empat belas)'} hari sebelumnya.`,
        `PIHAK PERTAMA dapat mengakhiri perjanjian kerja ini sebelum waktunya apabila PIHAK KEDUA melakukan pelanggaran berat sebagaimana dimaksud dalam Pasal 6 ayat 3 perjanjian ini.`,
        `Dalam hal terjadi pengakhiran kontrak sebelum masa kontrak berakhir oleh PIHAK PERTAMA tanpa alasan yang sah, maka PIHAK PERTAMA wajib memberikan kompensasi sesuai ketentuan peraturan perundang-undangan yang berlaku.`,
      ]
    },
    {
      nomor: 8,
      judul: 'PENYELESAIAN PERSELISIHAN',
      ayat: (data) => [
        `Apabila terjadi perselisihan antara PIHAK PERTAMA dan PIHAK KEDUA dalam pelaksanaan perjanjian ini, kedua pihak sepakat untuk terlebih dahulu menyelesaikan secara musyawarah untuk mufakat.`,
        `Apabila penyelesaian secara musyawarah tidak berhasil, maka akan diselesaikan melalui Dinas Tenaga Kerja setempat sesuai ketentuan perundang-undangan yang berlaku.`,
        `Apabila penyelesaian melalui mediasi tidak berhasil, maka kedua belah pihak sepakat untuk menyelesaikan perselisihan melalui Pengadilan Hubungan Industrial ${data.kota_pengadilan || '[NAMA KOTA]'}.`,
      ]
    },
  ]
};