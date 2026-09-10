"use client";

import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import type { WeightPoint } from "@/lib/progressData";

export function WeightChart({ points }: { points: WeightPoint[] }) {
  if (points.length === 0) {
    return (
      <div className="flex h-[260px] items-center justify-center rounded-lg border border-border bg-surface text-sm text-muted">
        Pas encore de poids enregistré pour cet exercice.
      </div>
    );
  }

  return (
    <div className="h-[260px] rounded-lg border border-border bg-surface p-4">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={points} margin={{ top: 10, right: 16, left: 0, bottom: 0 }}>
          <CartesianGrid stroke="#222" strokeDasharray="3 3" />
          <XAxis dataKey="label" stroke="#666" fontSize={11} tickLine={false} />
          <YAxis stroke="#666" fontSize={11} tickLine={false} width={36} />
          <Tooltip
            contentStyle={{ background: "#111111", border: "1px solid #222", borderRadius: 8 }}
            labelStyle={{ color: "#f0f0f0" }}
          />
          <Line
            type="monotone"
            dataKey="maxWeight"
            name="Poids max (kg)"
            stroke="#e8ff3c"
            strokeWidth={2}
            dot={{ r: 3, fill: "#e8ff3c" }}
          />
          <Line
            type="monotone"
            dataKey="avgWeight"
            name="Poids moyen (kg)"
            stroke="#ff4d1c"
            strokeWidth={2}
            dot={{ r: 3, fill: "#ff4d1c" }}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
