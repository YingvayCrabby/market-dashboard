import type { MovingAverages } from "@shared/schema";
import { TrendingUp, TrendingDown } from "lucide-react";

interface Props {
  ma: MovingAverages;
}

function MACard({ label, value, price }: { label: string; value: number; price: number }) {
  const pctDiff = ((price - value) / value) * 100;
  const isAbove = pctDiff >= 0;

  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-muted-foreground">{label}</h3>
        {isAbove ? (
          <TrendingUp className="w-3.5 h-3.5 text-emerald-500" />
        ) : (
          <TrendingDown className="w-3.5 h-3.5 text-red-500" />
        )}
      </div>
      <div className="text-xl font-bold tabular-nums">{value.toFixed(2)}</div>
      <div className={`text-xs font-medium tabular-nums mt-1 ${isAbove ? "text-emerald-500" : "text-red-500"}`}>
        {isAbove ? "+" : ""}{pctDiff.toFixed(2)}% {isAbove ? "above" : "below"}
      </div>
    </div>
  );
}

function PctCard({ label, value, description }: { label: string; value: number; description: string }) {
  const isPositive = value >= 0;
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <h3 className="text-sm font-semibold text-muted-foreground mb-2">{label}</h3>
      <div className={`text-xl font-bold tabular-nums ${isPositive ? "text-emerald-500" : "text-red-500"}`}>
        {isPositive ? "+" : ""}{value.toFixed(2)}%
      </div>
      <p className="text-xs text-muted-foreground mt-1">{description}</p>
    </div>
  );
}

export function MovingAveragesCards({ ma }: Props) {
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
      <div className="rounded-xl border border-border bg-card p-4">
        <h3 className="text-sm font-semibold text-muted-foreground mb-2">Nasdaq Price</h3>
        <div className="text-xl font-bold tabular-nums">{ma.currentPrice.toFixed(2)}</div>
        <p className="text-xs text-muted-foreground mt-1">Current close</p>
      </div>
      <MACard label="10 EMA" value={ma.ema10} price={ma.currentPrice} />
      <MACard label="21 EMA" value={ma.ema21} price={ma.currentPrice} />
      <MACard label="50 SMA" value={ma.sma50} price={ma.currentPrice} />
      <MACard label="200 SMA" value={ma.sma200} price={ma.currentPrice} />
    </div>
  );
}
