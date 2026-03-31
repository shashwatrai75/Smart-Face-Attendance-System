import { useMemo, useState } from 'react';
import DataTableCard from './DataTableCard';

const demoRows = [
  { id: 'S-1001', name: 'Aarav Sharma', email: 'aarav@school.com', roll: '1001', className: 'Class 10', section: 'A', date: '2026-03-31', status: 'Present' },
  { id: 'S-1002', name: 'Isha Verma', email: 'isha@school.com', roll: '1002', className: 'Class 10', section: 'A', date: '2026-03-31', status: 'Late' },
  { id: 'S-1003', name: 'Rohan Singh', email: 'rohan@school.com', roll: '1003', className: 'Class 10', section: 'B', date: '2026-03-31', status: 'Absent' },
  { id: 'S-1004', name: 'Meera Gupta', email: 'meera@school.com', roll: '1004', className: 'Class 9', section: 'C', date: '2026-03-31', status: 'Present' },
  { id: 'S-1005', name: 'Kabir Mehta', email: 'kabir@school.com', roll: '1005', className: 'Class 9', section: 'C', date: '2026-03-30', status: 'Present' },
  { id: 'S-1006', name: 'Anaya Patel', email: 'anaya@school.com', roll: '1006', className: 'Class 8', section: 'A', date: '2026-03-30', status: 'Absent' },
  { id: 'S-1007', name: 'Vihaan Kumar', email: 'vihaan@school.com', roll: '1007', className: 'Class 8', section: 'B', date: '2026-03-30', status: 'Late' },
  { id: 'S-1008', name: 'Saanvi Roy', email: 'saanvi@school.com', roll: '1008', className: 'Class 10', section: 'B', date: '2026-03-29', status: 'Present' },
  { id: 'S-1009', name: 'Arjun Das', email: 'arjun@school.com', roll: '1009', className: 'Class 9', section: 'A', date: '2026-03-29', status: 'Present' },
  { id: 'S-1010', name: 'Nisha Jain', email: 'nisha@school.com', roll: '1010', className: 'Class 8', section: 'A', date: '2026-03-29', status: 'Absent' },
];

const StudentsAttendanceTableDemo = () => {
  const [loading, setLoading] = useState(false);

  const classOptions = useMemo(() => Array.from(new Set(demoRows.map((r) => r.className))), []);
  const sectionOptions = useMemo(() => Array.from(new Set(demoRows.map((r) => r.section))), []);
  const dateOptions = useMemo(() => Array.from(new Set(demoRows.map((r) => r.date))), []);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="text-sm text-slate-600 dark:text-slate-300/70">
          Demo table component (wire to your API later).
        </div>
        <button
          type="button"
          onClick={() => {
            setLoading(true);
            window.setTimeout(() => setLoading(false), 900);
          }}
          className="rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-semibold text-slate-700 shadow-sm hover:bg-slate-50 transition-colors dark:border-white/10 dark:bg-slate-900/40 dark:text-slate-200 dark:hover:bg-white/5"
        >
          Simulate loading
        </button>
      </div>

      <DataTableCard
        title="Attendance Records"
        rows={demoRows}
        loading={loading}
        classOptions={classOptions}
        sectionOptions={sectionOptions}
        dateOptions={dateOptions}
        onRowClick={() => {}}
      />
    </div>
  );
};

export default StudentsAttendanceTableDemo;

