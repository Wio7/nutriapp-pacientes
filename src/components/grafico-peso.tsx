'use client';

import { useState, useEffect } from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from 'recharts';

interface PuntoPeso {
  fecha: string;
  peso_kg: number;
}

export function GraficoPeso({ datos }: { datos: PuntoPeso[] }) {
  const [montado, setMontado] = useState(false);

  useEffect(() => {
    setMontado(true);
  }, []);

  if (!datos || datos.length === 0) {
    return (
      <div className="py-8 text-center text-sm text-slate-400">
        Aún no hay registros de peso. Anota tu peso arriba para ver tu evolución.
      </div>
    );
  }

  if (!montado) {
    return <div className="h-48 w-full animate-pulse rounded-xl bg-slate-100" />;
  }

  const formatoFecha = (iso: string) => {
    try {
      const d = new Date(`${iso}T12:00:00`);
      return d.toLocaleDateString('es-PE', { day: 'numeric', month: 'short' });
    } catch {
      return iso;
    }
  };

  return (
    <div className="h-56 w-full pt-2">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={datos} margin={{ top: 10, right: 12, bottom: 0, left: -16 }}>
          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0" vertical={false} />
          <XAxis
            dataKey="fecha"
            tickFormatter={formatoFecha}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={{ stroke: '#cbd5e1' }}
          />
          <YAxis
            domain={['dataMin - 1', 'dataMax + 1']}
            tick={{ fontSize: 11, fill: '#64748b' }}
            tickLine={false}
            axisLine={false}
            unit=" kg"
          />
          <Tooltip
            formatter={(valor: number) => [`${valor} kg`, 'Peso']}
            labelFormatter={formatoFecha}
            contentStyle={{
              backgroundColor: '#ffffff',
              borderRadius: '0.75rem',
              border: '1px solid #e2e8f0',
              boxShadow: '0 4px 6px -1px rgb(0 0 0 / 0.1)',
              fontSize: '12px',
            }}
          />
          <Line
            type="monotone"
            dataKey="peso_kg"
            stroke="#047857"
            strokeWidth={2.5}
            dot={{ fill: '#047857', r: 4 }}
            activeDot={{ r: 6, fill: '#065f46' }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
