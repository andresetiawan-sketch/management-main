import { useState, useEffect } from 'react';
import { base44 } from '@/api/cloudflareClient';
import { createPageUrl } from '@/utils';

/**
 * Hook untuk mendapatkan data employee yang selalu sinkron dengan database.
 * - Tampilkan data cache (localStorage) langsung agar UI tidak kosong
 * - Lalu refresh dari DB di background
 * - Jika tidak ada session, redirect ke halaman login
 */
export function useEmployee({ redirectIfNotFound = true, publicPage = false } = {}) {
  const getCache = () => {
    try { return JSON.parse(localStorage.getItem('pis_employee') || 'null'); } catch { return null; }
  };

  const [employee, setEmployee] = useState(getCache);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const cached = getCache();

    if (!cached) {
      setLoading(false);
      if (!publicPage && redirectIfNotFound) {
        window.location.href = createPageUrl('EmployeeLogin');
      }
      return;
    }

    // Langsung set cache dulu agar UI langsung render
    setEmployee(cached);

    // Fetch fresh data dari DB di background
    const fetchFresh = async () => {
      try {
        const resp = await base44.functions.invoke('getEmployeeByNik', { nik: cached.nik_karyawan });
        if (resp?.data?.employee) {
          const fresh = resp.data.employee;
          const merged = { ...cached, ...fresh };
          localStorage.setItem('pis_employee', JSON.stringify(merged));
          setEmployee(merged);
        }
      } catch (err) {
        // Tetap pakai cache jika gagal — app tetap berjalan
        console.warn('useEmployee: menggunakan data cache', err?.message);
      } finally {
        setLoading(false);
      }
    };

    fetchFresh();
  }, []);

  const logout = () => {
    localStorage.removeItem('pis_employee');
    window.location.href = createPageUrl('EmployeeLogin');
  };

  const updateLocal = (updates) => {
    setEmployee(prev => {
      const updated = { ...prev, ...updates };
      localStorage.setItem('pis_employee', JSON.stringify(updated));
      return updated;
    });
  };

  return { employee, loading, logout, updateLocal };
}

export default useEmployee;