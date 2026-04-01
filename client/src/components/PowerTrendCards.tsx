import type { PowerTrendConditions } from "@shared/schema";
import { CheckCircle2, XCircle, Clock, TrendingUp, ArrowUpRight, Target } from "lucide-react";

interface Props {
  conditions: PowerTrendConditions;
}

export function PowerTrendCards({ conditions }: Props) {
  const { tenDayLowAbove21EMA, ema21AboveSma50, sma50TrendingUp, closeAbove21EMA } = conditions;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
      {/* 10-day low > 21 EMA */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">10d Low &gt; 21 EMA</h3>
          </div>
          {tenDayLowAbove21EMA.met ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className="text-2xl font-bold tabular-nums text-foreground">
          {tenDayLowAbove21EMA.consecutiveDays}
          <span className="text-sm font-normal text-muted-foreground ml-1">days</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          {tenDayLowAbove21EMA.met
            ? "Condition met — streak active"
            : `Need ${tenDayLowAbove21EMA.daysNeeded} more consecutive day${tenDayLowAbove21EMA.daysNeeded !== 1 ? "s" : ""}`}
        </p>
      </div>

      {/* 21 EMA > 50 SMA */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <ArrowUpRight className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">21 EMA &gt; 50 SMA</h3>
          </div>
          {ema21AboveSma50.met ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className={`text-2xl font-bold tabular-nums ${ema21AboveSma50.pointGap >= 0 ? "text-emerald-500" : "text-red-500"}`}>
          {ema21AboveSma50.pointGap >= 0 ? "+" : ""}{ema21AboveSma50.pointGap.toFixed(1)}
          <span className="text-sm font-normal text-muted-foreground ml-1">pts</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Point gap between 21 EMA and 50 SMA
        </p>
      </div>

      {/* 50 SMA Trending Up */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <TrendingUp className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">50 SMA Trend</h3>
          </div>
          {sma50TrendingUp.met ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className={`text-2xl font-bold tabular-nums ${sma50TrendingUp.dailySlope >= 0 ? "text-emerald-500" : "text-red-500"}`}>
          {sma50TrendingUp.dailySlope >= 0 ? "+" : ""}{sma50TrendingUp.dailySlope.toFixed(2)}
          <span className="text-sm font-normal text-muted-foreground ml-1">/day</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Daily slope of the 50 SMA
        </p>
      </div>

      {/* Close > 21 EMA */}
      <div className="rounded-xl border border-border bg-card p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Target className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Close &gt; 21 EMA</h3>
          </div>
          {closeAbove21EMA.met ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          ) : (
            <XCircle className="w-4 h-4 text-red-500" />
          )}
        </div>
        <div className={`text-2xl font-bold tabular-nums ${closeAbove21EMA.pointGap >= 0 ? "text-emerald-500" : "text-red-500"}`}>
          {closeAbove21EMA.pointGap >= 0 ? "+" : ""}{closeAbove21EMA.pointGap.toFixed(1)}
          <span className="text-sm font-normal text-muted-foreground ml-1">pts</span>
        </div>
        <p className="text-xs text-muted-foreground mt-1.5">
          Point gap between close and 21 EMA
        </p>
      </div>
    </div>
  );
}
