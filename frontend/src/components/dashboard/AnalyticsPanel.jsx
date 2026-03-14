import React, { useState, useContext, useEffect } from 'react';
import { Context } from '../../js/store/appContext';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer,
  PieChart, Pie, Cell, Sector,
} from 'recharts';

// ── Helpers ──────────────────────────────────────────────────────────────────

const today = () => new Date().toISOString().slice(0, 10);
const firstOfMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-01`;
};
const currentYearMonth = () => {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
};
const monthToRange = (ym) => {
  const [y, m] = ym.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return {
    start: `${ym}-01`,
    end: `${ym}-${String(last).padStart(2, '0')}`,
  };
};
const fmtEur = (v) => `${Number(v).toFixed(2)}€`;

// ── Colores para el pie ───────────────────────────────────────────────────────
const PIE_COLORS = [
  '#10b981', '#14b8a6', '#3b82f6', '#8b5cf6',
  '#f43f5e', '#f97316', '#eab308', '#6b7280',
  '#06b6d4', '#a855f7', '#ec4899', '#84cc16',
];

// ── Tooltip personalizado ─────────────────────────────────────────────────────
const BarTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300 mb-1">{label}</p>
      {payload.map((p) => (
        <p key={p.name} style={{ color: p.color }}>
          {p.name === 'income' ? 'Ingresos' : 'Gastos'}: <span className="font-mono">{fmtEur(p.value)}</span>
        </p>
      ))}
    </div>
  );
};

const PieTooltip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { name, value, payload: p } = payload[0];
  return (
    <div className="bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700 rounded-xl px-4 py-3 shadow-lg text-xs">
      <p className="font-medium text-gray-700 dark:text-gray-300">{name}</p>
      <p className="font-mono text-rose-500">{fmtEur(value)}</p>
      <p className="text-gray-400">{p.count} transacciones</p>
    </div>
  );
};

// ── Componente principal ──────────────────────────────────────────────────────
export default function AnalyticsPanel() {
  const { store, actions } = useContext(Context);

  const [filterMode, setFilterMode] = useState('month'); // 'month' | 'range'
  const [selectedMonth, setSelectedMonth] = useState(currentYearMonth());
  const [rangeStart, setRangeStart] = useState(firstOfMonth());
  const [rangeEnd, setRangeEnd] = useState(today());
  const [activeIndex, setActiveIndex] = useState(null);

  const fetchAnalytics = (start, end) => actions.getAnalytics(start, end);

  // Carga inicial: mes actual
  useEffect(() => {
    const { start, end } = monthToRange(selectedMonth);
    fetchAnalytics(start, end);
  }, []);

  const handleApply = () => {
    if (filterMode === 'month') {
      const { start, end } = monthToRange(selectedMonth);
      fetchAnalytics(start, end);
    } else {
      if (rangeStart && rangeEnd) fetchAnalytics(rangeStart, rangeEnd);
    }
  };

  const { analytics, analytics_loaded } = store;

  return (
    <div className="space-y-8">
      <p className="text-xs font-medium text-gray-400 dark:text-gray-500 uppercase tracking-widest">
        Analíticas
      </p>

      {/* ── Filtros ── */}
      <div className="flex flex-wrap items-end gap-3">
        {/* Toggle modo */}
        <div className="flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-800 text-xs">
          {['month', 'range'].map((mode) => (
            <button
              key={mode}
              onClick={() => setFilterMode(mode)}
              className={`px-4 py-2 transition-colors ${
                filterMode === mode
                  ? 'bg-emerald-500 dark:bg-teal-500 text-white'
                  : 'text-gray-500 dark:text-gray-400 hover:bg-gray-50 dark:hover:bg-gray-800'
              }`}
            >
              {mode === 'month' ? 'Por mes' : 'Rango'}
            </button>
          ))}
        </div>

        {filterMode === 'month' ? (
          <input
            type="month"
            value={selectedMonth}
            onChange={(e) => setSelectedMonth(e.target.value)}
            className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-50 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
          />
        ) : (
          <div className="flex items-center gap-2">
            <input
              type="date"
              value={rangeStart}
              onChange={(e) => setRangeStart(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-50 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
            />
            <span className="text-xs text-gray-400">—</span>
            <input
              type="date"
              value={rangeEnd}
              onChange={(e) => setRangeEnd(e.target.value)}
              className="bg-gray-50 dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-xl px-3 py-2 text-xs text-gray-900 dark:text-gray-50 focus:outline-none focus:border-emerald-500 dark:focus:border-teal-400 transition-colors"
            />
          </div>
        )}

        <button
          onClick={handleApply}
          className="bg-emerald-500 hover:bg-emerald-600 dark:bg-teal-500 dark:hover:bg-teal-600 text-white text-xs font-medium px-4 py-2 rounded-xl transition-colors"
        >
          Aplicar
        </button>
      </div>

      {/* ── Loading ── */}
      {!analytics_loaded && (
        <div className="flex items-center justify-center py-24">
          <div className="w-5 h-5 border-2 border-emerald-500 dark:border-teal-500 border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {analytics_loaded && analytics && (
        <>
          {/* ── Summary chips ── */}
          <div className="flex flex-wrap gap-3">
            {[
              { label: 'Ingresos', value: analytics.summary.total_income, color: 'text-emerald-600 dark:text-teal-400' },
              { label: 'Gastos', value: analytics.summary.total_expenses, color: 'text-rose-500' },
              { label: 'Balance', value: analytics.summary.balance, color: analytics.summary.balance >= 0 ? 'text-emerald-600 dark:text-teal-400' : 'text-rose-500' },
            ].map(({ label, value, color }) => (
              <div key={label} className="px-4 py-2 rounded-xl bg-gray-50 dark:bg-gray-900 border border-gray-100 dark:border-gray-800">
                <p className="text-xs text-gray-400 dark:text-gray-500">{label}</p>
                <p className={`text-sm font-mono font-medium ${color}`}>
                  {value >= 0 ? '+' : ''}{fmtEur(value)}
                </p>
              </div>
            ))}
          </div>

          {/* ── Gráfico 1: Ingresos vs Gastos por período ── */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-4">
              Ingresos vs Gastos · por {analytics.group_by === 'day' ? 'día' : 'mes'}
            </p>
            {analytics.by_date.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 py-8 text-center">Sin datos en este período</p>
            ) : (
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={analytics.by_date} barCategoryGap="30%">
                  <CartesianGrid strokeDasharray="3 3" stroke="currentColor" className="text-gray-100 dark:text-gray-800" vertical={false} />
                  <XAxis
                    dataKey="date"
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-400 dark:text-gray-600"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => analytics.group_by === 'day' ? v.slice(5) : v}
                  />
                  <YAxis
                    tick={{ fontSize: 10, fill: 'currentColor' }}
                    className="text-gray-400 dark:text-gray-600"
                    tickLine={false}
                    axisLine={false}
                    tickFormatter={(v) => `${v}€`}
                    width={55}
                  />
                  <Tooltip content={<BarTooltip />} cursor={{ fill: 'transparent' }} />
                  <Legend
                    formatter={(v) => <span className="text-xs text-gray-500 dark:text-gray-400">{v === 'income' ? 'Ingresos' : 'Gastos'}</span>}
                    iconType="square"
                    iconSize={8}
                  />
                  <Bar dataKey="income" fill="#10b981" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expenses" fill="#f43f5e" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          {/* ── Gráfico 2: Gastos por categoría ── */}
          <div>
            <p className="text-xs font-medium text-gray-400 dark:text-gray-500 mb-4">
              Gastos por categoría
            </p>
            {analytics.by_category.length === 0 ? (
              <p className="text-sm text-gray-400 dark:text-gray-600 py-8 text-center">Sin gastos en este período</p>
            ) : (
              <div className="flex flex-col lg:flex-row items-center gap-6">
                <ResponsiveContainer width="100%" height={220}>
                  <PieChart>
                    <Pie
                      data={analytics.by_category}
                      dataKey="total"
                      nameKey="category"
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={90}
                      paddingAngle={2}
                      onMouseEnter={(_, index) => setActiveIndex(index)}
                      onMouseLeave={() => setActiveIndex(null)}
                    >
                      {analytics.by_category.map((_, index) => (
                        <Cell
                          key={index}
                          fill={PIE_COLORS[index % PIE_COLORS.length]}
                          opacity={activeIndex === null || activeIndex === index ? 1 : 0.5}
                          style={{ cursor: 'pointer', transition: 'opacity 0.2s' }}
                        />
                      ))}
                    </Pie>
                    <Tooltip content={<PieTooltip />} />
                  </PieChart>
                </ResponsiveContainer>

                {/* Leyenda manual */}
                <ul className="space-y-2 min-w-[160px] w-full lg:w-auto">
                  {analytics.by_category.map((item, index) => (
                    <li key={item.category} className="flex items-center justify-between gap-3 text-xs">
                      <div className="flex items-center gap-2 truncate">
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: PIE_COLORS[index % PIE_COLORS.length] }}
                        />
                        <span className="text-gray-700 dark:text-gray-300 truncate">{item.category}</span>
                      </div>
                      <span className="font-mono text-gray-500 dark:text-gray-400 flex-shrink-0">{fmtEur(item.total)}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
}
