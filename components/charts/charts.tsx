"use client";

import {
  ResponsiveContainer, AreaChart, Area, XAxis, YAxis, Tooltip, CartesianGrid,
  BarChart, Bar, PieChart, Pie, Cell, Legend,
} from "recharts";

const fmt = new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR", maximumFractionDigits: 0 });
const fmtCompact = (v: number) => {
  if (Math.abs(v) >= 100000) return `₹${(v / 100000).toFixed(1)}L`;
  if (Math.abs(v) >= 1000) return `₹${(v / 1000).toFixed(0)}K`;
  return `₹${v}`;
};

const tooltipStyle = {
  background: "#fff",
  border: "1px solid #e8e8e6",
  borderRadius: 10,
  fontSize: 12,
  boxShadow: "0 4px 24px rgba(0,0,0,0.08)",
};

export function CollectionAreaChart({ data }: { data: { month: string; collected: number; billed: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <defs>
          <linearGradient id="gCollected" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.16} />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eeeeec" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string, name: string) => [fmt.format(Number(v)), name === "collected" ? "Collected" : "Billed"]} />
        <Area type="monotone" dataKey="billed" stroke="#a3a3a0" strokeWidth={1.5} fill="transparent" strokeDasharray="4 3" />
        <Area type="monotone" dataKey="collected" stroke="#0a0a0a" strokeWidth={2} fill="url(#gCollected)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}

export function ExpenseBarChart({ data }: { data: { category: string; amount: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} layout="vertical" margin={{ top: 4, right: 16, left: 8, bottom: 0 }}>
        <CartesianGrid stroke="#eeeeec" horizontal={false} />
        <XAxis type="number" tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} />
        <YAxis type="category" dataKey="category" tick={{ fontSize: 11, fill: "#525252" }} tickLine={false} axisLine={false} width={92} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string) => fmt.format(Number(v))} cursor={{ fill: "rgba(0,0,0,0.03)" }} />
        <Bar dataKey="amount" fill="#0a0a0a" radius={[0, 6, 6, 0]} barSize={16} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function BudgetVsActualChart({ data }: { data: { category: string; budget: number; actual: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={280}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#eeeeec" vertical={false} />
        <XAxis dataKey="category" tick={{ fontSize: 10, fill: "#737373" }} tickLine={false} axisLine={false} interval={0} angle={-18} dy={8} height={44} />
        <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string, name: string) => [fmt.format(Number(v)), name === "budget" ? "Budget" : "Actual"]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="budget" fill="#d4d4d1" radius={[4, 4, 0, 0]} barSize={14} />
        <Bar dataKey="actual" fill="#0a0a0a" radius={[4, 4, 0, 0]} barSize={14} />
      </BarChart>
    </ResponsiveContainer>
  );
}

const PIE_COLORS = ["#0a0a0a", "#525252", "#8a8a86", "#b8b8b4", "#d9d9d6", "#a8c5b5", "#c9a86a"];

export function DonutChart({ data }: { data: { name: string; value: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <PieChart>
        <Pie data={data} dataKey="value" nameKey="name" innerRadius={62} outerRadius={95} paddingAngle={2} strokeWidth={0}>
          {data.map((_, i) => (
            <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
          ))}
        </Pie>
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string, name: string) => [fmt.format(Number(v)), name]} />
        <Legend wrapperStyle={{ fontSize: 11 }} />
      </PieChart>
    </ResponsiveContainer>
  );
}

export function BuildingCollectionChart({ data }: { data: { building: string; collected: number; outstanding: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={260}>
      <BarChart data={data} margin={{ top: 8, right: 8, left: -12, bottom: 0 }}>
        <CartesianGrid stroke="#eeeeec" vertical={false} />
        <XAxis dataKey="building" tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={fmtCompact} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} width={56} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string, name: string) => [fmt.format(Number(v)), name === "collected" ? "Collected" : "Outstanding"]} />
        <Legend wrapperStyle={{ fontSize: 12 }} />
        <Bar dataKey="collected" fill="#0a0a0a" radius={[4, 4, 0, 0]} barSize={22} />
        <Bar dataKey="outstanding" fill="#d4d4d1" radius={[4, 4, 0, 0]} barSize={22} />
      </BarChart>
    </ResponsiveContainer>
  );
}

export function EngagementLineChart({ data }: { data: { month: string; participation: number }[] }) {
  return (
    <ResponsiveContainer width="100%" height={240}>
      <AreaChart data={data} margin={{ top: 8, right: 8, left: -18, bottom: 0 }}>
        <defs>
          <linearGradient id="gEng" x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#0a0a0a" stopOpacity={0.14} />
            <stop offset="100%" stopColor="#0a0a0a" stopOpacity={0.01} />
          </linearGradient>
        </defs>
        <CartesianGrid stroke="#eeeeec" vertical={false} />
        <XAxis dataKey="month" tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} />
        <YAxis tickFormatter={(v: number) => `${v}%`} tick={{ fontSize: 11, fill: "#737373" }} tickLine={false} axisLine={false} domain={[0, 100]} width={48} />
        <Tooltip contentStyle={tooltipStyle} formatter={(v: number | string) => [`${v}%`, "Participation"]} />
        <Area type="monotone" dataKey="participation" stroke="#0a0a0a" strokeWidth={2} fill="url(#gEng)" />
      </AreaChart>
    </ResponsiveContainer>
  );
}
