import type { PrimarySignals as PrimarySignalsType, WebsterEMA21Indicator } from "@shared/schema";
import { SignalCard } from "./SignalCard";
import { EMA21Card } from "./EMA21Card";
import { AlertTriangle } from "lucide-react";

interface Props {
  signals: PrimarySignalsType;
  ema21Indicator: WebsterEMA21Indicator;
}

export function PrimarySignals({ signals, ema21Indicator }: Props) {
  const { maAlignment, vixSignal, followThroughDay, powerTrend } = signals;

  const timingGradeColor: Record<string, string> = {
    A: "bg-emerald-500/15 text-emerald-500",
    B: "bg-amber-500/15 text-amber-500",
    C: "bg-red-500/15 text-red-500",
  };

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3">
      {/* MA Alignment */}
      <SignalCard title="MA Alignment" met={maAlignment.aligned}>
        <p className="font-medium text-foreground/80">10 EMA &gt; 21 EMA &gt; 50 SMA</p>
        <div className="flex flex-col gap-0.5 mt-1.5">
          <div className="flex justify-between tabular-nums">
            <span>10 EMA</span>
            <span className="text-foreground font-medium">{maAlignment.ema10.toFixed(2)}</span>
          </div>
          <div className="flex justify-between tabular-nums">
            <span>21 EMA</span>
            <span className="text-foreground font-medium">{maAlignment.ema21.toFixed(2)}</span>
          </div>
          <div className="flex justify-between tabular-nums">
            <span>50 SMA</span>
            <span className="text-foreground font-medium">{maAlignment.sma50.toFixed(2)}</span>
          </div>
        </div>
      </SignalCard>

      {/* VIX Signal */}
      <SignalCard title="VIX > 16" met={vixSignal.elevated}>
        <div className="flex items-baseline gap-2">
          <span className="text-lg font-bold text-foreground tabular-nums">{vixSignal.value.toFixed(2)}</span>
          <span className={`text-xs font-semibold uppercase px-1.5 py-0.5 rounded ${
            vixSignal.context === "fear"
              ? "bg-red-500/15 text-red-500"
              : vixSignal.context === "elevated"
              ? "bg-amber-500/15 text-amber-500"
              : vixSignal.context === "low"
              ? "bg-emerald-500/15 text-emerald-500"
              : "bg-blue-500/15 text-blue-500"
          }`}>
            {vixSignal.context}
          </span>
        </div>
        <p className="mt-1">
          {vixSignal.context === "fear"
            ? "Extreme fear in the market — high volatility"
            : vixSignal.context === "elevated"
            ? "Elevated uncertainty — proceed with caution"
            : vixSignal.context === "low"
            ? "Low volatility environment — favorable"
            : "Complacent market conditions"}
        </p>
      </SignalCard>

      {/* Follow-Through Day */}
      <SignalCard title="Follow-Through Day" met={followThroughDay.active}>
        {followThroughDay.status === "confirmed" ? (
          <>
            <div className="flex justify-between tabular-nums">
              <span>FTD Date</span>
              <span className="text-foreground font-medium">{followThroughDay.date}</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Day 1</span>
              <span className="text-foreground font-medium">{followThroughDay.dayOneDate}</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>% Gain</span>
              <span className="text-emerald-500 font-medium">+{followThroughDay.percentGain?.toFixed(2)}%</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Vol vs Prior</span>
              <span className="text-foreground font-medium">+{followThroughDay.volumeVsPrior?.toFixed(1)}%</span>
            </div>
            <div className="flex justify-between items-center tabular-nums">
              <span>Rally Day</span>
              <div className="flex items-center gap-1.5">
                <span className="text-foreground font-medium">{followThroughDay.rallyDay}</span>
                {followThroughDay.ftdTimingGrade && (
                  <span className={`text-xs font-bold px-1 py-0.5 rounded ${timingGradeColor[followThroughDay.ftdTimingGrade] ?? ""}`}>
                    {followThroughDay.ftdTimingGrade}
                  </span>
                )}
              </div>
            </div>
            {followThroughDay.ftdDayLow != null && (
              <div className="flex justify-between tabular-nums">
                <span>Exit Level</span>
                <span className="text-foreground font-medium">{followThroughDay.ftdDayLow.toFixed(2)}</span>
              </div>
            )}
            {followThroughDay.dayOneLow != null && (
              <div className="flex justify-between tabular-nums">
                <span>Line in Sand</span>
                <span className="text-foreground font-medium">{followThroughDay.dayOneLow.toFixed(2)}</span>
              </div>
            )}
            {followThroughDay.drawdownFromPeak != null && (
              <div className="flex justify-between tabular-nums">
                <span>Drawdown</span>
                <span className={`font-medium ${followThroughDay.drawdownFromPeak < -5 ? "text-red-500" : "text-muted-foreground"}`}>
                  {followThroughDay.drawdownFromPeak.toFixed(1)}%
                </span>
              </div>
            )}
            {followThroughDay.below200SMA && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="text-red-500 font-semibold text-xs uppercase tracking-wide">
                  Danger Zone
                </span>
              </div>
            )}
          </>
        ) : followThroughDay.status === "negated" ? (
          <>
            <p className="text-red-500 font-medium">FTD Negated</p>
            <div className="flex justify-between tabular-nums mt-1">
              <span>FTD was</span>
              <span className="text-foreground font-medium">{followThroughDay.date}</span>
            </div>
            {followThroughDay.dayOneLow != null && (
              <div className="flex justify-between tabular-nums">
                <span>Day 1 Low</span>
                <span className="text-foreground font-medium">{followThroughDay.dayOneLow.toFixed(2)}</span>
              </div>
            )}
            {followThroughDay.drawdownFromPeak != null && (
              <div className="flex justify-between tabular-nums">
                <span>Drawdown</span>
                <span className="text-red-500 font-medium">{followThroughDay.drawdownFromPeak.toFixed(1)}%</span>
              </div>
            )}
            <p className="mt-1">Index closed below FTD low — signal invalidated</p>
          </>
        ) : followThroughDay.status === "waiting" ? (
          <>
            <p className="text-amber-500 font-medium">Rally Attempt in Progress</p>
            <div className="flex justify-between tabular-nums mt-1">
              <span>Day 1</span>
              <span className="text-foreground font-medium">{followThroughDay.dayOneDate}</span>
            </div>
            <div className="flex justify-between tabular-nums">
              <span>Rally Day</span>
              <span className="text-foreground font-medium">{followThroughDay.rallyDay}</span>
            </div>
            {followThroughDay.dayOneLow != null && (
              <div className="flex justify-between tabular-nums">
                <span>Line in Sand</span>
                <span className="text-foreground font-medium">{followThroughDay.dayOneLow.toFixed(2)}</span>
              </div>
            )}
            {followThroughDay.drawdownFromPeak != null && (
              <div className="flex justify-between tabular-nums">
                <span>Drawdown</span>
                <span className={`font-medium ${followThroughDay.drawdownFromPeak < -10 ? "text-red-500" : "text-amber-500"}`}>
                  {followThroughDay.drawdownFromPeak.toFixed(1)}%
                </span>
              </div>
            )}
            {followThroughDay.below200SMA && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="text-red-500 font-semibold text-xs uppercase tracking-wide">
                  Danger Zone
                </span>
              </div>
            )}
            <p className="mt-1">Waiting for Day 4+ confirmation</p>
          </>
        ) : (
          <>
            <p className="text-red-400 font-medium">Market in Correction</p>
            {followThroughDay.drawdownFromPeak != null && (
              <div className="flex justify-between tabular-nums mt-1">
                <span>Drawdown</span>
                <span className="text-red-500 font-medium">{followThroughDay.drawdownFromPeak.toFixed(1)}%</span>
              </div>
            )}
            {followThroughDay.below200SMA && (
              <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
                <span className="text-red-500 font-semibold text-xs uppercase tracking-wide">
                  Danger Zone
                </span>
              </div>
            )}
            <p className="mt-1">Waiting for Day 1 rally attempt</p>
          </>
        )}
      </SignalCard>

      {/* 21 EMA Indicator (Webster) */}
      <EMA21Card indicator={ema21Indicator} />

      {/* Power Trend */}
      <SignalCard title="Power Trend Active" met={powerTrend.active}>
        <div className="flex flex-col gap-1">
          <ConditionLine
            label="10d Low > 21 EMA"
            met={powerTrend.conditions.tenDayLowAbove21EMA.met}
            detail={`${powerTrend.conditions.tenDayLowAbove21EMA.consecutiveDays} days`}
          />
          <ConditionLine
            label="21 EMA > 50 SMA"
            met={powerTrend.conditions.ema21AboveSma50.met}
            detail={`${powerTrend.conditions.ema21AboveSma50.pointGap > 0 ? "+" : ""}${powerTrend.conditions.ema21AboveSma50.pointGap.toFixed(1)} pts`}
          />
          <ConditionLine
            label="50 SMA Trending Up"
            met={powerTrend.conditions.sma50TrendingUp.met}
            detail={`${powerTrend.conditions.sma50TrendingUp.dailySlope > 0 ? "+" : ""}${powerTrend.conditions.sma50TrendingUp.dailySlope.toFixed(2)}/day`}
          />
          <ConditionLine
            label="Close > 21 EMA"
            met={powerTrend.conditions.closeAbove21EMA.met}
            detail={`${powerTrend.conditions.closeAbove21EMA.pointGap > 0 ? "+" : ""}${powerTrend.conditions.closeAbove21EMA.pointGap.toFixed(1)} pts`}
          />
        </div>
      </SignalCard>
    </div>
  );
}

function ConditionLine({ label, met, detail }: { label: string; met: boolean; detail: string }) {
  return (
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-1.5">
        <div className={`w-1.5 h-1.5 rounded-full ${met ? "bg-emerald-500" : "bg-red-500"}`} />
        <span>{label}</span>
      </div>
      <span className="text-foreground tabular-nums font-medium">{detail}</span>
    </div>
  );
}
