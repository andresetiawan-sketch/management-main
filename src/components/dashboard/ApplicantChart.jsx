import { useMemo } from 'react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, PieChart, Pie, Cell, Legend } from 'recharts';

const COLORS = ['#7B1A2C', '#C73A50', '#E05A6E', '#F49DAB', '#F9C2CA'];

export default function ApplicantChart({ applicants = [] }) {
  const statusData = useMemo(() => {
    const counts = { Pending: 0, Approved: 0, Rejected: 0 };
    applicants.forEach(a => { counts[a.status || 'Pending']++; });
    return Object.entries(counts).map(([name, value]) => ({ name, value }));
  }, [applicants]);

  const areaData = useMemo(() => {
    const map = {};
    applicants.forEach(a => {
      const area = a.area_client || 'Lainnya';
      map[area] = (map[area] || 0) + 1;
    });
    return Object.entries(map).slice(0, 8).map(([name, total]) => ({ name, total }));
  }, [applicants]);

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      <div className="bg-white rounded-2xl p-6 shadow-sm border-0">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Status Pelamar</h3>
        <ResponsiveContainer width="100%" height={250}>
          <PieChart>
            <Pie data={statusData} cx="50%" cy="50%" innerRadius={60} outerRadius={90} dataKey="value" paddingAngle={5}>
              {statusData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
            </Pie>
            <Tooltip />
            <Legend />
          </PieChart>
        </ResponsiveContainer>
      </div>
      <div className="bg-white rounded-2xl p-6 shadow-sm border-0">
        <h3 className="text-sm font-semibold text-gray-700 mb-4 uppercase tracking-wider">Pelamar per Area</h3>
        <ResponsiveContainer width="100%" height={250}>
          <BarChart data={areaData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            <XAxis dataKey="name" fontSize={11} tick={{ fill: '#666' }} />
            <YAxis fontSize={11} tick={{ fill: '#666' }} />
            <Tooltip />
            <Bar dataKey="total" fill="#7B1A2C" radius={[6, 6, 0, 0]} />
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}