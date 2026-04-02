import type { WebsterEMA21Indicator } from "@shared/schema";
import { SignalCard } from "./SignalCard";
import { AlertTriangle } from "lucide-react";

interface Props {
  indicator: WebsterEMA21Indicator;
}

export function EMA21Card({ indicator }: Props) {
  const { isPinkBar, threeDayRule, below200SMA, ema21Value, status } = indicator;

  const statusLabel = {
    green_light: "GREEN LIGHT",
    pink_bar: "PINK BAR",
    confirming: "CONFIRMING",
    neutral: "NEUTRAL",
  }[status] ?? "NEUTRAL";

  const statusColors: Record<string, string> = {
    green_light: "bg-emerald-500/15 text-emerald-500",
    pink_bar: "bg-pink-500/15 text-pink-500",
    confirming: "bg-amber-500/15 text-amber-500",
    neutral: "bg-muted text-muted-foreground",
  };

  const isGreenLight = status === "green_light";

  return (
    <SignalCard title="21 EMA Indicator" met={isGreenLight}>
      {/* Status badge */}
      <div className="flex items-center gap-2 mb-1.5">
        <span
          className={`text-xs font-bold uppercase px-1.5 py-0.5 rounded tabular-nums ${
            statusColors[status] ?? statusColors.neutral
          }`}
        >
          {statusLabel}
        </span>
      </div>

      {/* Pink Bar */}
      <div className="flex justify-between items-center">
        <span>Pink Bar (High &lt; 21 EMA)</span>
        <span
          className={`font-semibold ${isPinkBar ? "text-red-500" : "text-emerald-500"}`}
        >
          {isPinkBar ? "YES" : "NO"}
        </span>
      </div>

      {/* 3-Day Low Rule */}
      <div className="flex flex-col gap-0.5 mt-1">
        <div className="flex justify-between items-center">
          <span>Days Low &gt; 21 EMA</span>
          <span className="text-foreground font-medium tabular-nums">
            {threeDayRule.consecutiveDaysAbove}
            <span className="text-muted-foreground font-normal"> / 3</span>
          </span>
        </div>
        {/* Progress bar */}
        <div className="w-full h-1 rounded-full bg-border overflow-hidden">
          <div
            className={`h-full rounded-full transition-all ${
              threeDayRule.confirmed ? "bg-emerald-500" : "bg-amber-500"
            }`}
            style={{
              width: `${Math.min(100, (threeDayRule.consecutiveDaysAbove / 3) * 100)}%`,
            }}
          />
        </div>
        {threeDayRule.consecutiveDaysAbove >= 3 && (
          <div className="flex justify-between items-center">
            <span>Up Close on 3rd Day</span>
            <span
              className={`font-semibold ${
                threeDayRule.closedUpOnThird ? "text-emerald-500" : "text-red-500"
              }`}
            >
              {threeDayRule.closedUpOnThird ? "YES" : "NO"}
            </span>
          </div>
        )}
      </div>

      {/* 21 EMA Value */}
      <div className="flex justify-between tabular-nums mt-1">
        <span>21 EMA</span>
        <span className="text-foreground font-medium">{ema21Value.toFixed(2)}</span>
      </div>

      {/* Danger zone warning */}
      {below200SMA && (
        <div className="flex items-center gap-1.5 mt-1.5 px-2 py-1 rounded bg-red-500/10 border border-red-500/20">
          <AlertTriangle className="w-3 h-3 text-red-500 flex-shrink-0" />
          <span className="text-red-500 font-semibold text-xs uppercase tracking-wide">
            Danger Zone — Below 200 SMA
          </span>
        </div>
      )}
    </SignalCard>
  );
}
