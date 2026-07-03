import { useState, useMemo } from 'react';
import { useQuery } from '@tanstack/react-query';
import { base44 } from '@/api/cloudflareClient';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';
import { Download, FileSpreadsheet, Users, TrendingUp, AlertCircle, CheckCircle2 } from 'lucide-react';
import { toast } from 'sonner';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

const BULAN_NAME = ['Januari', 'Februari', 'Maret', 'April', 'Mei', 'Juni', 'Juli', 'Agustus', 'September', 'Oktober', 'November', 'Desember'];

export default function AttendanceDashboard() {
  const today = new Date();
  const [filterBulan, setFilterBulan] = useState(String(today.getMonth() + 1));
  const [filterTahun, setFilterTahun] = useState(String(today.getFullYear()));
  const [exportingPdf, setExportingPdf] = useState(false);

  const datePrefix = `${filterTahun}-${String(filterBulan).padStart(2, '0')}`;
  const bulanLabel = BULAN_NAME[parseInt(filterBulan) - 1];

  const { data: areas = [], isLoading: loadAreas } = useQuery({
    queryKey: ['att-dash-areas'],
    queryFn: () => base44.entities.AreaProject.filter({ status: 'Aktif' })
  });

  const { data: allAttendances = [], isLoading: loadAtt } = useQuery({
    queryKey: ['att-dash-all', datePrefix],
    queryFn: () => base44.entities.Attendance.filter({}, '-tanggal', 5000),
    enabled: areas.length > 0
  });

  const { data: allEmployees = [], isLoading: loadEmp } = useQuery({
    queryKey: ['att-dash-employees'],
    queryFn: () => base44.entities.Employee.filter({ status_aktif: 'Aktif' }, 'nama_lengkap', 2000)
  });

  const isLoading = loadAreas || loadAtt || loadEmp;

  // Filter attendances for current period
  const periodAtt = useMemo(
    () => allAttendances.filter(a => a.tanggal?.startsWith(datePrefix)),
    [allAttendances, datePrefix]
  );

  const days = new Date(parseInt(filterTahun), parseInt(filterBulan), 0).getDate();

  // Build per-area stats
  const areaStats = useMemo(() => {
    return areas.map(area => {
      const areaEmp = allEmployees.filter(e => e.area_tugas === area.nama_area);
      const areaAtt = periodAtt.filter(a => a.area_tugas === area.nama_area);

      let hadir = 0, alfa = 0, sakit = 0, izin = 0, cuti = 0, backup = 0, lembur = 0;
      areaAtt.forEach(a => {
        if (a.status === 'Hadir') hadir++;
        else if (a.status === 'Alfa') alfa++;
        else if (a.status === 'Sakit') sakit++;
        else if (a.status === 'Izin') izin++;
        else if (a.status === 'Cuti') cuti++;
        else if (a.status === 'Backup') backup++;
        else if (a.status === 'Lembur') lembur++;
      });

      const totalRecords = areaAtt.length;
      const attendanceRate = totalRecords > 0 ? Math.round((hadir / totalRecords) * 100) : 0;

      // Estimate total jam kerja (avg 8 jam per hadir)
      let totalJamKerja = 0;
      areaAtt.filter(a => a.status === 'Hadir' || a.status === 'Backup').forEach(a => {
        if (a.jam_hadir && a.jam_pulang) {
          const [sh, sm] = a.jam_hadir.split(':').map(Number);
          const [eh, em] = a.jam_pulang.split(':').map(Number);
          let diff = (eh * 60 + em) - (sh * 60 + sm);
          if (diff < 0) diff += 24 * 60; // overnight
          totalJamKerja += diff / 60;
        } else {
          totalJamKerja += 8;
        }
      });

      return {
        area: area.nama_area,
        totalKaryawan: areaEmp.length,
        hadir, alfa, sakit, izin, cuti, backup, lembur,
        totalRecords,
        attendanceRate,
        totalJamKerja: Math.round(totalJamKerja),
      };
    });
  }, [areas, allEmployees, periodAtt]);

  // Grand totals
  const grand = useMemo(() => {
    return areaStats.reduce((acc, s) => ({
      totalKaryawan: acc.totalKaryawan + s.totalKaryawan,
      hadir: acc.hadir + s.hadir,
      alfa: acc.alfa + s.alfa,
      sakit: acc.sakit + s.sakit,
      izin: acc.izin + s.izin,
      cuti: acc.cuti + s.cuti,
      backup: acc.backup + s.backup,
      lembur: acc.lembur + s.lembur,
      totalJamKerja: acc.totalJamKerja + s.totalJamKerja,
    }), { totalKaryawan: 0, hadir: 0, alfa: 0, sakit: 0, izin: 0, cuti: 0, backup: 0, lembur: 0, totalJamKerja: 0 });
  }, [areaStats]);

  const avgAttendanceRate = useMemo(() => {
    const valid = areaStats.filter(s => s.totalRecords > 0);
    if (!valid.length) return 0;
    return Math.round(valid.reduce((acc, s) => acc + s.attendanceRate, 0) / valid.length);
  }, [areaStats]);

  // Chart data
  const chartData = areaStats.map(s => ({
    name: s.area.length > 12 ? s.area.slice(0, 12) + '…' : s.area,
    Hadir: s.hadir,
    Alfa: s.alfa,
    Sakit: s.sakit,
    Izin: s.izin,
    Cuti: s.cuti,
  }));

  const exportExcel = () => {
    const rows = [];
    rows.push([`LAPORAN ABSENSI BULANAN — ${bulanLabel} ${filterTahun}`]);
    rows.push([`Dicetak: ${new Date().toLocaleDateString('id-ID')}`]);
    rows.push([]);
    rows.push(['Area', 'Jml Karyawan', 'Hadir', 'Alfa', 'Sakit', 'Izin', 'Cuti', 'Backup', 'Lembur', 'Total Jam Kerja', 'Tingkat Kehadiran (%)']);

    areaStats.forEach(s => {
      rows.push([
        s.area, s.totalKaryawan, s.hadir, s.alfa, s.sakit, s.izin, s.cuti, s.backup, s.lembur,
        s.totalJamKerja, `${s.attendanceRate}%`
      ]);
    });

    rows.push([]);
    rows.push(['TOTAL', grand.totalKaryawan, grand.hadir, grand.alfa, grand.sakit, grand.izin, grand.cuti, grand.backup, grand.lembur, grand.totalJamKerja, `${avgAttendanceRate}%`]);

    const ws = XLSX.utils.aoa_to_sheet(rows);
    ws['!cols'] = [{ wch: 28 }, { wch: 14 }, ...Array(9).fill({ wch: 10 })];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Laporan Absensi');
    XLSX.writeFile(wb, `Laporan_Absensi_${bulanLabel}_${filterTahun}.xlsx`);
    toast.success('File Excel berhasil diunduh');
  };

  const exportPDF = async () => {
    setExportingPdf(true);
    toast.info('Menyiapkan PDF...');
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    const pw = doc.internal.pageSize.getWidth();

    // Header
    doc.setFillColor(100, 10, 20);
    doc.rect(0, 0, pw, 20, 'F');
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(13); doc.setFont('helvetica', 'bold');
    doc.text('LAPORAN ABSENSI BULANAN', 14, 13);
    doc.setFontSize(8);
    doc.text(`Periode: ${bulanLabel} ${filterTahun}   |   Dicetak: ${new Date().toLocaleDateString('id-ID')}`, pw / 2, 10, { align: 'center' });

    // Summary
    doc.setTextColor(0, 0, 0);
    doc.setFontSize(9); doc.setFont('helvetica', 'bold');
    doc.text('RINGKASAN SELURUH AREA', 14, 28);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.text(`Total Karyawan: ${grand.totalKaryawan}   Hadir: ${grand.hadir}   Alfa: ${grand.alfa}   Sakit: ${grand.sakit}   Izin: ${grand.izin}   Cuti: ${grand.cuti}   Tingkat Kehadiran: ${avgAttendanceRate}%   Total Jam Kerja: ${grand.totalJamKerja} jam`, 14, 34);

    // Table header
    let y = 42;
    const cols = ['Area', 'Karyawan', 'Hadir', 'Alfa', 'Sakit', 'Izin', 'Cuti', 'Backup', 'Lembur', 'Jam Kerja', 'Kehadiran'];
    const cws = [60, 18, 14, 14, 14, 14, 14, 14, 14, 18, 18];

    doc.setFillColor(150, 20, 30);
    doc.rect(10, y, pw - 20, 7, 'F');
    doc.setTextColor(255, 255, 255); doc.setFont('helvetica', 'bold'); doc.setFontSize(7);
    let cx = 12;
    cols.forEach((c, i) => { doc.text(c, cx, y + 4.5); cx += cws[i]; });
    y += 7;

    doc.setTextColor(30, 30, 30); doc.setFont('helvetica', 'normal');
    areaStats.forEach((s, idx) => {
      const bg = idx % 2 === 0 ? [255, 255, 255] : [248, 248, 248];
      doc.setFillColor(...bg);
      doc.rect(10, y, pw - 20, 7, 'F');
      const vals = [s.area, s.totalKaryawan, s.hadir, s.alfa, s.sakit, s.izin, s.cuti, s.backup, s.lembur, `${s.totalJamKerja}`, `${s.attendanceRate}%`];
      cx = 12;
      vals.forEach((v, i) => { doc.text(String(v).slice(0, 20), cx, y + 4.5); cx += cws[i]; });
      y += 7;
    });

    // Total row
    doc.setFillColor(220, 220, 220);
    doc.rect(10, y, pw - 20, 7, 'F');
    doc.setFont('helvetica', 'bold');
    const totals = ['TOTAL', grand.totalKaryawan, grand.hadir, grand.alfa, grand.sakit, grand.izin, grand.cuti, grand.backup, grand.lembur, `${grand.totalJamKerja}`, `${avgAttendanceRate}%`];
    cx = 12;
    totals.forEach((v, i) => { doc.text(String(v), cx, y + 4.5); cx += cws[i]; });

    doc.save(`Laporan_Absensi_${bulanLabel}_${filterTahun}.pdf`);
    toast.success('PDF berhasil diunduh');
    setExportingPdf(false);
  };

  return (
    <div className="space-y-4">
      {/* Header & Filters */}
      <div className="bg-white rounded-2xl shadow-sm p-4 flex flex-wrap gap-3 items-end justify-between">
        <div>
          <h1 className="text-lg font-bold text-gray-800">Dashboard Absensi Bulanan</h1>
          <p className="text-xs text-gray-500">Ringkasan kehadiran seluruh area per bulan</p>
        </div>
        <div className="flex flex-wrap gap-2 items-end">
          <div>
            <p className="text-xs text-gray-500 mb-1">Bulan</p>
            <Select value={filterBulan} onValueChange={setFilterBulan}>
              <SelectTrigger className="h-9 w-36 text-sm"><SelectValue /></SelectTrigger>
              <SelectContent>
                {BULAN_NAME.map((b, i) => <SelectItem key={i + 1} value={String(i + 1)}>{b}</SelectItem>)}
              </SelectContent>
            </Select>
          </div>
          <div>
            <p className="text-xs text-gray-500 mb-1">Tahun</p>
            <Input value={filterTahun} onChange={e => setFilterTahun(e.target.value)} className="h-9 w-24 text-sm" />
          </div>
          <Button onClick={exportExcel} variant="outline" className="border-green-300 text-green-700 hover:bg-green-50 h-9">
            <FileSpreadsheet className="w-4 h-4 mr-1" /> Excel
          </Button>
          <Button onClick={exportPDF} variant="outline" disabled={exportingPdf} className="border-red-200 text-red-700 hover:bg-red-50 h-9">
            <Download className="w-4 h-4 mr-1" /> {exportingPdf ? '...' : 'PDF'}
          </Button>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-100 flex items-center justify-center shrink-0">
            <Users className="w-5 h-5 text-blue-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-gray-800">{grand.totalKaryawan}</p>
            <p className="text-xs text-gray-500">Total Karyawan</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-100 flex items-center justify-center shrink-0">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-emerald-700">{grand.hadir}</p>
            <p className="text-xs text-gray-500">Total Hadir</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-red-100 flex items-center justify-center shrink-0">
            <AlertCircle className="w-5 h-5 text-red-500" />
          </div>
          <div>
            <p className="text-2xl font-bold text-red-700">{grand.alfa}</p>
            <p className="text-xs text-gray-500">Total Alfa</p>
          </div>
        </div>
        <div className="bg-white rounded-2xl shadow-sm p-4 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center shrink-0">
            <TrendingUp className="w-5 h-5 text-indigo-600" />
          </div>
          <div>
            <p className="text-2xl font-bold text-indigo-700">{grand.totalJamKerja.toLocaleString()}</p>
            <p className="text-xs text-gray-500">Total Jam Kerja</p>
          </div>
        </div>
      </div>

      {isLoading && <Skeleton className="h-64 rounded-2xl" />}

      {!isLoading && (
        <>
          {/* Bar Chart */}
          <div className="bg-white rounded-2xl shadow-sm p-4">
            <p className="text-sm font-semibold text-gray-700 mb-3">Perbandingan Kehadiran Per Area — {bulanLabel} {filterTahun}</p>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 10, left: 0, bottom: 40 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                <XAxis dataKey="name" tick={{ fontSize: 10 }} angle={-30} textAnchor="end" />
                <YAxis tick={{ fontSize: 10 }} />
                <Tooltip />
                <Legend wrapperStyle={{ fontSize: 11, paddingTop: 8 }} />
                <Bar dataKey="Hadir" fill="#10b981" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Alfa" fill="#ef4444" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Sakit" fill="#f97316" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Izin" fill="#f59e0b" radius={[3, 3, 0, 0]} />
                <Bar dataKey="Cuti" fill="#8b5cf6" radius={[3, 3, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Table Per Area */}
          <div className="bg-white rounded-2xl shadow-sm overflow-hidden">
            <div className="p-4 border-b bg-gray-50">
              <p className="text-sm font-semibold text-gray-700">Detail Per Area — {bulanLabel} {filterTahun}</p>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="bg-gray-50/80 text-xs text-gray-600 border-b">
                    <th className="text-left p-3 font-semibold">Area</th>
                    <th className="p-3 font-semibold text-center">Karyawan</th>
                    <th className="p-3 font-semibold text-center text-emerald-700">Hadir</th>
                    <th className="p-3 font-semibold text-center text-red-700">Alfa</th>
                    <th className="p-3 font-semibold text-center text-orange-700">Sakit</th>
                    <th className="p-3 font-semibold text-center text-amber-700">Izin</th>
                    <th className="p-3 font-semibold text-center text-purple-700">Cuti</th>
                    <th className="p-3 font-semibold text-center text-blue-700">Backup</th>
                    <th className="p-3 font-semibold text-center text-indigo-700">Lembur</th>
                    <th className="p-3 font-semibold text-center">Jam Kerja</th>
                    <th className="p-3 font-semibold text-center">Kehadiran</th>
                  </tr>
                </thead>
                <tbody>
                  {areaStats.map((s, i) => (
                    <tr key={s.area} className={`border-b hover:bg-gray-50/60 ${i % 2 === 0 ? '' : 'bg-gray-50/30'}`}>
                      <td className="p-3 font-medium text-gray-800">{s.area}</td>
                      <td className="p-3 text-center text-gray-700">{s.totalKaryawan}</td>
                      <td className="p-3 text-center font-semibold text-emerald-700">{s.hadir}</td>
                      <td className="p-3 text-center font-semibold text-red-700">{s.alfa}</td>
                      <td className="p-3 text-center font-semibold text-orange-700">{s.sakit}</td>
                      <td className="p-3 text-center font-semibold text-amber-700">{s.izin}</td>
                      <td className="p-3 text-center font-semibold text-purple-700">{s.cuti}</td>
                      <td className="p-3 text-center font-semibold text-blue-700">{s.backup}</td>
                      <td className="p-3 text-center font-semibold text-indigo-700">{s.lembur}</td>
                      <td className="p-3 text-center text-gray-700">{s.totalJamKerja.toLocaleString()} jam</td>
                      <td className="p-3 text-center">
                        <div className="flex items-center justify-center gap-2">
                          <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                            <div
                              className="h-full rounded-full"
                              style={{
                                width: `${s.attendanceRate}%`,
                                backgroundColor: s.attendanceRate >= 80 ? '#10b981' : s.attendanceRate >= 60 ? '#f59e0b' : '#ef4444'
                              }}
                            />
                          </div>
                          <span className={`text-xs font-semibold ${s.attendanceRate >= 80 ? 'text-emerald-700' : s.attendanceRate >= 60 ? 'text-amber-700' : 'text-red-700'}`}>
                            {s.attendanceRate}%
                          </span>
                        </div>
                      </td>
                    </tr>
                  ))}
                  {/* Total row */}
                  <tr className="bg-gray-100 font-semibold border-t-2 border-gray-300">
                    <td className="p-3 text-gray-800">TOTAL</td>
                    <td className="p-3 text-center">{grand.totalKaryawan}</td>
                    <td className="p-3 text-center text-emerald-700">{grand.hadir}</td>
                    <td className="p-3 text-center text-red-700">{grand.alfa}</td>
                    <td className="p-3 text-center text-orange-700">{grand.sakit}</td>
                    <td className="p-3 text-center text-amber-700">{grand.izin}</td>
                    <td className="p-3 text-center text-purple-700">{grand.cuti}</td>
                    <td className="p-3 text-center text-blue-700">{grand.backup}</td>
                    <td className="p-3 text-center text-indigo-700">{grand.lembur}</td>
                    <td className="p-3 text-center">{grand.totalJamKerja.toLocaleString()} jam</td>
                    <td className="p-3 text-center">
                      <Badge className={`text-xs border-0 ${avgAttendanceRate >= 80 ? 'bg-emerald-100 text-emerald-700' : avgAttendanceRate >= 60 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'}`}>
                        {avgAttendanceRate}%
                      </Badge>
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </>
      )}
    </div>
  );
}