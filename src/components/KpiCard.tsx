import React from "react";
import { ArrowDownRight, ArrowUpRight } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

type KpiCardProps = {
  title: string;
  value: string;
  deltaPct?: number;
  trend?: Array<{ x: string; y: number }>;
  tone?: "default" | "positive" | "negative";
};

export function KpiCard({ title, value, deltaPct, trend, tone = "default" }: KpiCardProps) {
  const isUp = (deltaPct ?? 0) >= 0;
  const isInfinite = deltaPct === Infinity;

  let deltaContent;
  if (deltaPct != null && isFinite(deltaPct)) {
      const deltaColor = isUp ? "text-emerald-400" : "text-rose-400";
      deltaContent = (
          <>
              {isUp ? <ArrowUpRight size={14} className="text-emerald-400" /> : <ArrowDownRight size={14} className="text-rose-400" />}
              <span className={deltaColor}>{isUp ? "+" : ""}{deltaPct.toFixed(1)}%</span>
              <span className="text-gray-500"> vs período anterior</span>
          </>
      );
  } else if (isInfinite) {
    deltaContent = null;
  }

  const halo =
    tone === "positive" ? "ring-1 ring-emerald-500/20"
    : tone === "negative" ? "ring-1 ring-rose-500/20"
    : "ring-1 ring-white/5";

  return (
    <div className={`relative overflow-hidden rounded-2xl bg-gray-900/60 border border-white/5 ${halo}`}>
      <div className="p-4">
        <div className="text-xs text-gray-400">{title}</div>
        <div className="mt-1 text-2xl font-semibold tracking-tight text-gray-100">{value}</div>
        <div className="mt-1 flex items-center gap-1 text-xs h-4">{deltaContent}</div>
      </div>
      {trend && trend.length > 1 && (
        <div className="absolute bottom-0 left-0 right-0 h-10 opacity-70">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={trend}>
              <Line type="monotone" dataKey="y" dot={false} strokeWidth={2} stroke="currentColor" className={
                  tone === "positive" ? "text-emerald-400" : tone === "negative" ? "text-rose-400" : "text-sky-400"
                } />
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}