/**
 * PayslipExcelInput - Input slip gaji dengan tampilan mirip Excel
 * - Nilai otomatis berdasarkan persentase dari Basic Salary
 * - Kolom tambahan / sisipan di Allowance dan Deduction
 * - GAJI DITERIMA menyesuaikan otomatis
 */

import { useState, useMemo } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2, Calculator, RefreshCw, ChevronDown, ChevronRight } from 'lucide-react';
import { toast } from 'sonner';

// ── Helpers ───────────────────────────────────────────
const fmt = (n) => Math.round(Number(n) || 0).toLocaleString('id-ID');
const parseNum = (s) => { const n = parseFloat(String(s).replace(/\./g, '').replace(',', '.')); return isNaN(n) ? 0 : n; };

function angkaTerbilang(n) {
  const sat = ['', 'Satu', 'Dua', 'Tiga', 'Empat', 'Lima', 'Enam', 'Tujuh', 'Delapan', 'Sembilan', 'Sepuluh', 'Sebelas'];
  if (n < 12) return sat[n];
  if (n < 20) return sat[n - 10] + ' Belas';
  if (n < 100) return sat[Math.floor(n / 10)] + ' Puluh' + (n % 10 ? ' ' + sat[n % 10] : '');
  if (n < 200) return 'Seratus' + (n % 100 ? ' ' + angkaTerbilang(n % 100) : '');
  if (n < 1000) return sat[Math.floor(n / 100)] + ' Ratus' + (n % 100 ? ' ' + angkaTerbilang(n % 100) : '');
  if (n < 2000) return 'Seribu' + (n % 1000 ? ' ' + angkaTerbilang(n % 1000) : '');
  if (n < 1_000_000) return angkaTerbilang(Math.floor(n / 1000)) + ' Ribu' + (n % 1000 ? ' ' + angkaTerbilang(n % 1000) : '');
  if (n < 1_000_000_000) return angkaTerbilang(Math.floor(n / 1_000_000)) + ' Juta' + (n % 1_000_000 ? ' ' + angkaTerbilang(n % 1_000_000) : '');
  return angkaTerbilang(Math.floor(n / 1_000_000_000)) + ' Miliar' + (n % 1_000_000_000 ? ' ' + angkaTerbilang(n % 1_000_000_000) : '');
}
function toTerbilang(n) {
  if (!n || n === 0) return 'Nol Rupiah';
  return angkaTerbilang(Math.floor(n)) + ' Rupiah';
}

// ── Preset kolom default ──────────────────────────────
const DEFAULT_ALLOWANCES = [
  { key: 'basic_salary', label: 'Basic Salary', pct: null, required: true },
  { key: 'adjustment_salary', label: 'Adjustment Salary', pct: null },
  { key: 'allowance_kehadiran', label: 'Allow. Kehadiran', pct: null },
  { key: 'adjustment_new_employee', label: 'Adj. New Employee', pct: null },
  { key: 'allowance_jabatan', label: 'Allow. Jabatan', pct: null },
  { key: 'allowance_transport', label: 'Allow. Transport', pct: null },
  { key: 'allowance_acting', label: 'Allow. Acting', pct: null },
  { key: 'allowance_pulsa', label: 'Allow. Pulsa', pct: null },
  { key: 'jht_company', label: 'JHT 3.7% (Perusahaan)', pct: 3.7 },
  { key: 'jkk_company', label: 'JKK 0.24%', pct: 0.24 },
  { key: 'jkm_company', label: 'JKM 0.3%', pct: 0.3 },
  { key: 'bpjs_kes_company', label: 'BPJS KES 4%', pct: 4 },
  { key: 'tunjangan_pensiun', label: 'Tunj. Pensiun 2%', pct: 2 },
  { key: 'long_shift', label: 'Long Shift', pct: null },
  { key: 'premi_in', label: 'Premi In', pct: null },
  { key: 'ins_produktifitas', label: 'Ins. Produktifitas', pct: null },
];

const DEFAULT_DEDUCTIONS = [
  { key: 'ded_ketidakhadiran', label: 'Ketidakhadiran', pct: null },
  { key: 'ded_pembayaran_lain', label: 'Pembayaran Lain', pct: null },
  { key: 'ded_jht_37', label: 'JHT 3.7%', pct: 3.7 },
  { key: 'ded_jht_employee', label: 'JHT Employee 2%', pct: 2 },
  { key: 'ded_jkk', label: 'JKK', pct: 0.24 },
  { key: 'ded_jkm', label: 'JKM', pct: 0.3 },
  { key: 'ded_bpjs_kes', label: 'BPJS KES 5%', pct: 5 },
  { key: 'ded_iuran_pensiun', label: 'Iuran Pensiun', pct: 2 },
  { key: 'ded_iuran_pensiun_karyawan', label: 'Iuran Pensiun Kar.', pct: 2 },
  { key: 'ded_premi_out', label: 'Premi Out', pct: null },
  { key: 'ded_tax', label: 'Tax / PPh 21', pct: null },
];

// ── Single Row Component ──────────────────────────────
function FieldRow({ col, value, basicSalary, onChange, onDelete, onInsertAfter, canDelete, showPct }) {
  const autoVal = col.pct != null ? Math.round((parseNum(basicSalary) * col.pct) / 100) : null;
  const isAutoApplied = col.pct != null && (value === 0 || value === autoVal);
  const displayVal = typeof value === 'number' ? value : 0;

  const applyAuto = () => {
    if (autoVal !== null) onChange(autoVal);
  };

  return (
    <tr className="group border-b border-gray-100 hover:bg-blue-50/30 transition-colors">
      <td className="py-1.5 pl-3 pr-2 text-xs text-gray-700 w-44 min-w-[160px]">
        <div className="flex items-center gap-1">
          {col.required && <span className="w-1.5 h-1.5 rounded-full bg-[var(--maroon)] shrink-0" />}
          {col.label}
          {col.pct != null && (
            <span className="text-[9px] text-blue-400 bg-blue-50 px-1 rounded ml-1">{col.pct}%</span>
          )}
        </div>
      </td>
      <td className="py-1 px-1 w-36">
        <div className="flex items-center gap-1">
          <Input
            type="number"
            value={displayVal || ''}
            onChange={e => onChange(Number(e.target.value) || 0)}
            className="h-7 text-xs text-right w-full"
            placeholder="0"
          />
          {col.pct != null && autoVal !== null && (
            <button
              type="button"
              onClick={applyAuto}
              className="shrink-0 text-blue-400 hover:text-blue-600 p-0.5 hover:bg-blue-100 rounded"
              title={`Isi otomatis ${col.pct}% dari Basic Salary = Rp ${fmt(autoVal)}`}
            >
              <Calculator className="w-3 h-3" />
            </button>
          )}
        </div>
        {col.pct != null && autoVal !== null && autoVal > 0 && (
          <p className="text-[9px] text-blue-400 text-right mt-0.5 cursor-pointer hover:text-blue-600" onClick={applyAuto}>
            = Rp {fmt(autoVal)}
          </p>
        )}
      </td>
      <td className="py-1 px-2 text-xs text-gray-400 text-right w-28">
        Rp {fmt(displayVal)}
      </td>
      <td className="py-1 px-1 w-14">
        <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
          <button
            type="button"
            onClick={onInsertAfter}
            className="text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5"
            title="Sisipkan kolom baru di bawah"
          >
            <Plus className="w-3 h-3" />
          </button>
          {canDelete && (
            <button
              type="button"
              onClick={onDelete}
              className="text-red-400 hover:text-red-700 hover:bg-red-50 rounded p-0.5"
              title="Hapus kolom"
            >
              <Trash2 className="w-3 h-3" />
            </button>
          )}
        </div>
      </td>
    </tr>
  );
}

// ── Main Component ────────────────────────────────────
export default function PayslipExcelInput({ value, onChange, onAutoCalc }) {
  const [showAllowance, setShowAllowance] = useState(true);
  const [showDeduction, setShowDeduction] = useState(true);
  const [allowanceCols, setAllowanceCols] = useState(DEFAULT_ALLOWANCES);
  const [deductionCols, setDeductionCols] = useState(DEFAULT_DEDUCTIONS);

  const basicSalary = value?.basic_salary || 0;

  const totalAllowance = useMemo(() =>
    allowanceCols.reduce((s, c) => s + (Number(value?.[c.key]) || 0), 0),
    [allowanceCols, value]
  );

  const totalDeduction = useMemo(() =>
    deductionCols.reduce((s, c) => s + (Number(value?.[c.key]) || 0), 0),
    [deductionCols, value]
  );

  const gajiDiterima = totalAllowance - totalDeduction;

  const updateField = (key, val) => {
    const updated = { ...value, [key]: val };
    updated.total_allowance = allowanceCols.reduce((s, c) => s + (Number(updated[c.key]) || 0), 0);
    updated.total_deduction = deductionCols.reduce((s, c) => s + (Number(updated[c.key]) || 0), 0);
    updated.gaji_bersih = updated.total_allowance - updated.total_deduction;
    updated.gaji_diterima = updated.gaji_bersih;
    updated.terbilang = toTerbilang(updated.gaji_diterima > 0 ? updated.gaji_diterima : 0);
    onChange(updated);
  };

  const applyAllAuto = () => {
    let updated = { ...value };
    [...allowanceCols, ...deductionCols].forEach(c => {
      if (c.pct != null) {
        updated[c.key] = Math.round((parseNum(basicSalary) * c.pct) / 100);
      }
    });
    updated.total_allowance = allowanceCols.reduce((s, c) => s + (Number(updated[c.key]) || 0), 0);
    updated.total_deduction = deductionCols.reduce((s, c) => s + (Number(updated[c.key]) || 0), 0);
    updated.gaji_bersih = updated.total_allowance - updated.total_deduction;
    updated.gaji_diterima = updated.gaji_bersih;
    updated.terbilang = toTerbilang(updated.gaji_diterima > 0 ? updated.gaji_diterima : 0);
    onChange(updated);
    toast.success('Nilai % dari Basic Salary diterapkan otomatis');
  };

  const addCustomCol = (type, afterIdx) => {
    const key = `custom_${type}_${Date.now()}`;
    const newCol = { key, label: 'Kolom Baru', pct: null, custom: true };
    if (type === 'allowance') {
      setAllowanceCols(prev => {
        const next = [...prev];
        next.splice(afterIdx + 1, 0, newCol);
        return next;
      });
    } else {
      setDeductionCols(prev => {
        const next = [...prev];
        next.splice(afterIdx + 1, 0, newCol);
        return next;
      });
    }
    updateField(key, 0);
  };

  const removeCustomCol = (type, key) => {
    if (type === 'allowance') {
      setAllowanceCols(prev => prev.filter(c => c.key !== key));
    } else {
      setDeductionCols(prev => prev.filter(c => c.key !== key));
    }
  };

  const updateColLabel = (type, key, label) => {
    if (type === 'allowance') {
      setAllowanceCols(prev => prev.map(c => c.key === key ? { ...c, label } : c));
    } else {
      setDeductionCols(prev => prev.map(c => c.key === key ? { ...c, label } : c));
    }
  };

  const updateColPct = (type, key, pct) => {
    const pctVal = pct === '' ? null : parseFloat(pct);
    if (type === 'allowance') {
      setAllowanceCols(prev => prev.map(c => c.key === key ? { ...c, pct: pctVal } : c));
    } else {
      setDeductionCols(prev => prev.map(c => c.key === key ? { ...c, pct: pctVal } : c));
    }
  };

  const colStyle = "border border-gray-200 bg-white rounded-xl overflow-hidden";

  const tableHeader = (label, color) => (
    <div className={`flex items-center justify-between px-3 py-2 ${color}`}>
      <span className="text-xs font-bold uppercase tracking-wide">{label}</span>
      <div className="flex items-center gap-1 text-xs">
        <span className="text-gray-400">Baris dengan</span>
        <Calculator className="w-3.5 h-3.5 text-blue-400" />
        <span className="text-gray-400">= bisa isi otomatis dari Basic Salary</span>
      </div>
    </div>
  );

  const tableHead = (
    <thead>
      <tr className="bg-gray-50 border-b border-gray-200">
        <th className="py-1.5 pl-3 pr-2 text-left text-xs font-semibold text-gray-500 w-44">Item</th>
        <th className="py-1.5 px-1 text-left text-xs font-semibold text-gray-500 w-36">Input Nilai</th>
        <th className="py-1.5 px-2 text-right text-xs font-semibold text-gray-500 w-28">Nominal (Rp)</th>
        <th className="py-1.5 px-1 w-14"></th>
      </tr>
    </thead>
  );

  return (
    <div className="space-y-4">
      {/* Quick Apply % button */}
      {basicSalary > 0 && (
        <div className="flex items-center justify-between bg-blue-50 border border-blue-200 rounded-xl px-3 py-2">
          <div>
            <p className="text-xs font-semibold text-blue-700">Basic Salary: Rp {fmt(basicSalary)}</p>
            <p className="text-[10px] text-blue-500">Klik untuk menerapkan semua nilai % secara otomatis</p>
          </div>
          <Button size="sm" variant="outline" className="border-blue-400 text-blue-700 hover:bg-blue-100 h-8 text-xs" onClick={applyAllAuto}>
            <RefreshCw className="w-3.5 h-3.5 mr-1" /> Terapkan Semua %
          </Button>
        </div>
      )}

      {/* ALLOWANCE TABLE */}
      <div className={colStyle}>
        <button
          type="button"
          onClick={() => setShowAllowance(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-green-50 hover:bg-green-100 transition"
        >
          <span className="text-xs font-bold text-green-700 uppercase tracking-wide">
            ✚ Allowance (Pendapatan)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-green-700">Total: Rp {fmt(totalAllowance)}</span>
            {showAllowance ? <ChevronDown className="w-4 h-4 text-green-600" /> : <ChevronRight className="w-4 h-4 text-green-600" />}
          </div>
        </button>
        {showAllowance && (
          <table className="w-full">
            {tableHead}
            <tbody>
              {allowanceCols.map((col, idx) => (
                <tr key={col.key} className="group border-b border-gray-100 hover:bg-green-50/30 transition-colors">
                  <td className="py-1.5 pl-3 pr-2 text-xs text-gray-700 min-w-[160px]">
                    {col.custom ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={col.label}
                          onChange={e => updateColLabel('allowance', col.key, e.target.value)}
                          className="h-6 text-xs border-dashed"
                          placeholder="Nama kolom..."
                        />
                        <Input
                          type="number"
                          value={col.pct ?? ''}
                          onChange={e => updateColPct('allowance', col.key, e.target.value)}
                          className="h-6 text-xs w-16"
                          placeholder="%"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {col.required && <span className="w-1.5 h-1.5 rounded-full bg-[var(--maroon)] shrink-0" />}
                        {col.label}
                        {col.pct != null && <span className="text-[9px] text-blue-400 bg-blue-50 px-1 rounded ml-1">{col.pct}%</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-1 px-1 w-36">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={Number(value?.[col.key]) || ''}
                        onChange={e => updateField(col.key, Number(e.target.value) || 0)}
                        className="h-7 text-xs text-right"
                        placeholder="0"
                      />
                      {col.pct != null && basicSalary > 0 && (
                        <button type="button" onClick={() => updateField(col.key, Math.round(basicSalary * col.pct / 100))}
                          className="shrink-0 text-blue-400 hover:text-blue-600 p-0.5 hover:bg-blue-100 rounded" title={`= Rp ${fmt(Math.round(basicSalary * col.pct / 100))}`}>
                          <Calculator className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {col.pct != null && basicSalary > 0 && (
                      <p className="text-[9px] text-blue-400 text-right cursor-pointer" onClick={() => updateField(col.key, Math.round(basicSalary * col.pct / 100))}>
                        = Rp {fmt(Math.round(basicSalary * col.pct / 100))}
                      </p>
                    )}
                  </td>
                  <td className="py-1 px-2 text-xs text-green-700 font-medium text-right w-28">
                    Rp {fmt(Number(value?.[col.key]) || 0)}
                  </td>
                  <td className="py-1 px-1 w-14">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => addCustomCol('allowance', idx)}
                        className="text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5" title="Sisip kolom baru di bawah">
                        <Plus className="w-3 h-3" />
                      </button>
                      {col.custom && (
                        <button type="button" onClick={() => removeCustomCol('allowance', col.key)}
                          className="text-red-400 hover:text-red-700 hover:bg-red-50 rounded p-0.5" title="Hapus kolom">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-green-50 border-t-2 border-green-200">
                <td colSpan={2} className="py-2 pl-3 text-xs font-bold text-green-700">Total Allowance</td>
                <td className="py-2 px-2 text-right text-sm font-black text-green-700">Rp {fmt(totalAllowance)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* DEDUCTION TABLE */}
      <div className={colStyle}>
        <button
          type="button"
          onClick={() => setShowDeduction(v => !v)}
          className="w-full flex items-center justify-between px-3 py-2 bg-red-50 hover:bg-red-100 transition"
        >
          <span className="text-xs font-bold text-red-700 uppercase tracking-wide">
            ✖ Deduction (Potongan)
          </span>
          <div className="flex items-center gap-2">
            <span className="text-xs font-bold text-red-700">Total: Rp {fmt(totalDeduction)}</span>
            {showDeduction ? <ChevronDown className="w-4 h-4 text-red-600" /> : <ChevronRight className="w-4 h-4 text-red-600" />}
          </div>
        </button>
        {showDeduction && (
          <table className="w-full">
            {tableHead}
            <tbody>
              {deductionCols.map((col, idx) => (
                <tr key={col.key} className="group border-b border-gray-100 hover:bg-red-50/30 transition-colors">
                  <td className="py-1.5 pl-3 pr-2 text-xs text-gray-700 min-w-[160px]">
                    {col.custom ? (
                      <div className="flex items-center gap-1">
                        <Input
                          value={col.label}
                          onChange={e => updateColLabel('deduction', col.key, e.target.value)}
                          className="h-6 text-xs border-dashed"
                          placeholder="Nama kolom..."
                        />
                        <Input
                          type="number"
                          value={col.pct ?? ''}
                          onChange={e => updateColPct('deduction', col.key, e.target.value)}
                          className="h-6 text-xs w-16"
                          placeholder="%"
                        />
                      </div>
                    ) : (
                      <div className="flex items-center gap-1">
                        {col.label}
                        {col.pct != null && <span className="text-[9px] text-blue-400 bg-blue-50 px-1 rounded ml-1">{col.pct}%</span>}
                      </div>
                    )}
                  </td>
                  <td className="py-1 px-1 w-36">
                    <div className="flex items-center gap-1">
                      <Input
                        type="number"
                        value={Number(value?.[col.key]) || ''}
                        onChange={e => updateField(col.key, Number(e.target.value) || 0)}
                        className="h-7 text-xs text-right"
                        placeholder="0"
                      />
                      {col.pct != null && basicSalary > 0 && (
                        <button type="button" onClick={() => updateField(col.key, Math.round(basicSalary * col.pct / 100))}
                          className="shrink-0 text-blue-400 hover:text-blue-600 p-0.5 hover:bg-blue-100 rounded" title={`= Rp ${fmt(Math.round(basicSalary * col.pct / 100))}`}>
                          <Calculator className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                    {col.pct != null && basicSalary > 0 && (
                      <p className="text-[9px] text-blue-400 text-right cursor-pointer" onClick={() => updateField(col.key, Math.round(basicSalary * col.pct / 100))}>
                        = Rp {fmt(Math.round(basicSalary * col.pct / 100))}
                      </p>
                    )}
                  </td>
                  <td className="py-1 px-2 text-xs text-red-600 font-medium text-right w-28">
                    Rp {fmt(Number(value?.[col.key]) || 0)}
                  </td>
                  <td className="py-1 px-1 w-14">
                    <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button type="button" onClick={() => addCustomCol('deduction', idx)}
                        className="text-blue-400 hover:text-blue-700 hover:bg-blue-50 rounded p-0.5" title="Sisip kolom baru di bawah">
                        <Plus className="w-3 h-3" />
                      </button>
                      {col.custom && (
                        <button type="button" onClick={() => removeCustomCol('deduction', col.key)}
                          className="text-red-400 hover:text-red-700 hover:bg-red-50 rounded p-0.5" title="Hapus kolom">
                          <Trash2 className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
            <tfoot>
              <tr className="bg-red-50 border-t-2 border-red-200">
                <td colSpan={2} className="py-2 pl-3 text-xs font-bold text-red-700">Total Deduction</td>
                <td className="py-2 px-2 text-right text-sm font-black text-red-700">Rp {fmt(totalDeduction)}</td>
                <td />
              </tr>
            </tfoot>
          </table>
        )}
      </div>

      {/* GAJI DITERIMA */}
      <div className="bg-[var(--maroon)] rounded-xl p-4 text-white">
        <div className="flex items-center justify-between">
          <div>
            <p className="text-xs opacity-80">Total Allowance</p>
            <p className="text-sm font-semibold">Rp {fmt(totalAllowance)}</p>
          </div>
          <div className="text-center opacity-70 text-lg">−</div>
          <div>
            <p className="text-xs opacity-80">Total Deduction</p>
            <p className="text-sm font-semibold">Rp {fmt(totalDeduction)}</p>
          </div>
          <div className="text-center opacity-70 text-lg">=</div>
          <div className="text-right">
            <p className="text-xs opacity-80">GAJI DITERIMA</p>
            <p className="text-xl font-black">Rp {fmt(gajiDiterima > 0 ? gajiDiterima : 0)}</p>
          </div>
        </div>
        {gajiDiterima > 0 && (
          <p className="text-xs opacity-70 italic mt-2 border-t border-white/20 pt-2">
            {toTerbilang(gajiDiterima)}
          </p>
        )}
      </div>
    </div>
  );
}