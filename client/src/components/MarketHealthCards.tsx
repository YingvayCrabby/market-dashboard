import type { MarketHealth } from "@shared/schema";
import {
  AlertTriangle,
  BarChart3,
  ArrowUpDown,
  Volume2,
  Shield,
  CheckCircle2,
  XCircle,
} from "lucide-react";

interface Props {
  health: MarketHealth;
  volumeVs50DayAvg: number;
}

export function MarketHealthCards({ health }: Props) {
  const { nasdaqDistributionDays, sp500DistributionDays, nasdaqDistributionDetails, sp500DistributionDetails, nyseADRatio, nyseNetNewHighsLows, volumeVs50DayAvg, marketSchool } = health;

  const nasdaqStalls = (nasdaqDistributionDetails ?? []).filter((d) => d.type === "stall").length;
  const sp500Stalls = (sp500DistributionDetails ?? []).filter((d) => d.type === "stall").length;

  const getScoreColor = (status: string) => {
    switch (status) {
      case "BULLISH":
        return "text-emerald-500 bg-emerald-500/10 border-emerald-500/20";
      case "NEUTRAL":
        return "text-amber-500 bg-amber-500/10 border-amber-500/20";
      default:
        return "text-red-500 bg-red-500/10 border-red-500/20";
    }
  };

  const getDistColor = (days: number) => {
    if (days <= 2) return "text-emerald-500";
    if (days <= 4) return "text-amber-500";
    return "text-red-500";
  };

  return (
    <div className="space-y-3">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
        {/* Distribution Days */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <AlertTriangle className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Distribution Days</h3>
          </div>
          <div className="text-xs text-muted-foreground mb-1">Last 25 sessions</div>
          <div className="flex items-center gap-4">
            <div>
              <div className="text-xs text-muted-foreground">Nasdaq</div>
              <div className={`text-2xl font-bold tabular-nums ${getDistColor(nasdaqDistributionDays)}`}>
                {nasdaqDistributionDays}
              </div>
              {nasdaqStalls > 0 && (
                <div className="text-xs text-amber-500 tabular-nums">{nasdaqStalls} stall{nasdaqStalls > 1 ? "s" : ""}</div>
              )}
            </div>
            <div className="w-px h-8 bg-border" />
            <div>
              <div className="text-xs text-muted-foreground">S&P 500</div>
              <div className={`text-2xl font-bold tabular-nums ${getDistColor(sp500DistributionDays)}`}>
                {sp500DistributionDays}
              </div>
              {sp500Stalls > 0 && (
                <div className="text-xs text-amber-500 tabular-nums">{sp500Stalls} stall{sp500Stalls > 1 ? "s" : ""}</div>
              )}
            </div>
          </div>
        </div>

        {/* NYSE A/D Ratio */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <ArrowUpDown className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Nasdaq A/D Ratio</h3>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${nyseADRatio.ratio >= 1 ? "text-emerald-500" : "text-red-500"}`}>
            {nyseADRatio.ratio.toFixed(2)}
          </div>
          <div className="flex items-center gap-3 text-xs text-muted-foreground mt-1.5">
            <span className="text-emerald-500 tabular-nums">Adv: {nyseADRatio.advancing.toLocaleString()}</span>
            <span className="text-red-500 tabular-nums">Dec: {nyseADRatio.declining.toLocaleString()}</span>
          </div>
        </div>

        {/* Net New Highs/Lows */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <BarChart3 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Nasdaq Net Highs/Lows</h3>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${nyseNetNewHighsLows >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {nyseNetNewHighsLows >= 0 ? "+" : ""}{nyseNetNewHighsLows}
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {nyseNetNewHighsLows >= 0 ? "More new highs than lows" : "More new lows than highs"}
            {health.netHighsLowsAsOf && (
              <span className="ml-1 opacity-70">
                · as of {new Date(health.netHighsLowsAsOf).toLocaleDateString(undefined, { month: "short", day: "numeric" })}
              </span>
            )}
          </p>
        </div>

        {/* Volume vs 50-day Average */}
        <div className="rounded-xl border border-border bg-card p-4">
          <div className="flex items-center gap-2 mb-3">
            <Volume2 className="w-4 h-4 text-muted-foreground" />
            <h3 className="text-sm font-semibold">Vol vs 50d Avg</h3>
          </div>
          <div className={`text-2xl font-bold tabular-nums ${volumeVs50DayAvg >= 0 ? "text-emerald-500" : "text-red-500"}`}>
            {volumeVs50DayAvg >= 0 ? "+" : ""}{volumeVs50DayAvg.toFixed(1)}%
          </div>
          <p className="text-xs text-muted-foreground mt-1.5">
            {volumeVs50DayAvg >= 0 ? "Above average volume" : "Below average volume"}
          </p>
        </div>
      </div>

      {/* Market School Summary - Full Width */}
      <div className={`rounded-xl border p-5 ${getScoreColor(marketSchool.status)}`}>
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5" />
            <h3 className="text-base font-bold">Market School Summary</h3>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-2xl font-black tabular-nums">{marketSchool.score}</span>
            <span className="text-sm font-medium opacity-70">/ {marketSchool.maxScore}</span>
            <span className="ml-2 text-sm font-bold uppercase tracking-wider px-2.5 py-1 rounded-md bg-current/10">
              {marketSchool.status}
            </span>
          </div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-x-8 gap-y-2">
          {marketSchool.signals.map((signal) => (
            <div key={signal.name} className="flex items-center justify-between py-1.5 border-b border-current/10 last:border-0">
              <div className="flex-1">
                <div className="text-sm font-medium text-foreground">{signal.name}</div>
                <div className="text-xs opacity-70">{signal.rule}</div>
              </div>
              <div className="flex items-center gap-1.5 ml-4">
                {signal.met ? (
                  <CheckCircle2 className="w-4 h-4 text-emerald-500" />
                ) : (
                  <XCircle className="w-4 h-4 text-red-500" />
                )}
                <span className={`text-xs font-bold ${signal.met ? "text-emerald-500" : "text-red-500"}`}>
                  {signal.met ? "PASS" : "FAIL"}
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
