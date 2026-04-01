import { useQuery } from "@tanstack/react-query";

import type { DashboardData } from "@shared/schema";
import { TickerStrip } from "@/components/TickerStrip";
import { PrimarySignals } from "@/components/PrimarySignals";
import { PowerTrendCards } from "@/components/PowerTrendCards";
import { MovingAveragesCards } from "@/components/MovingAveragesCards";
import { MarketHealthCards } from "@/components/MarketHealthCards";
import { RefreshCw, TrendingUp, Moon, Sun } from "lucide-react";
import { useState, useEffect } from "react";

export default function Dashboard() {
  const [dark, setDark] = useState(true);

  useEffect(() => {
    document.documentElement.classList.toggle("dark", dark);
  }, [dark]);

  const { data, isLoading, error, refetch, isFetching } = useQuery<DashboardData>({
    queryKey: ["/api/dashboard"],
    refetchInterval: 60000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <RefreshCw className="w-8 h-8 animate-spin text-muted-foreground" />
          <p className="text-sm text-muted-foreground">Loading market data...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <p className="text-destructive font-medium">Failed to load market data</p>
          <button
            onClick={() => refetch()}
            className="mt-3 text-sm text-primary hover:underline"
          >
            Try again
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-50">
        <div className="max-w-[1600px] mx-auto px-4 py-3 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <TrendingUp className="w-4 h-4 text-primary-foreground" />
            </div>
            <h1 className="text-base font-semibold tracking-tight">Alta88 Market Dashboard</h1>
          </div>
          <div className="flex items-center gap-3">
            <span className="text-xs text-muted-foreground tabular-nums">
              {new Date(data.lastUpdated).toLocaleString()}
            </span>
            <button
              onClick={() => refetch()}
              disabled={isFetching}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              data-testid="button-refresh"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-muted-foreground ${isFetching ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={() => setDark(!dark)}
              className="p-1.5 rounded-md hover:bg-muted transition-colors"
              data-testid="button-theme"
            >
              {dark ? <Sun className="w-3.5 h-3.5 text-muted-foreground" /> : <Moon className="w-3.5 h-3.5 text-muted-foreground" />}
            </button>
          </div>
        </div>
      </header>

      {/* Ticker Strip */}
      <TickerStrip quotes={data.quotes} />

      {/* Main Content */}
      <main className="max-w-[1600px] mx-auto px-4 pb-8">
        {/* Primary Signals */}
        <section className="mt-5">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Primary Signals</h2>
          <PrimarySignals signals={data.primarySignals} ema21Indicator={data.ema21Indicator} />
        </section>

        {/* Power Trend Conditions */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Power Trend Conditions</h2>
          <PowerTrendCards conditions={data.powerTrendConditions} />
        </section>

        {/* Moving Averages */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Moving Averages</h2>
          <MovingAveragesCards
            ma={data.movingAverages}
            pctAbove21EMA={data.nasdaqPctAbove21EMA}
            pctAbove50SMA={data.nasdaqPctAbove50SMA}
          />
        </section>

        {/* Market Health & Breadth */}
        <section className="mt-6">
          <h2 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider mb-3">Market Health & Breadth</h2>
          <MarketHealthCards health={data.marketHealth} volumeVs50DayAvg={data.marketHealth.volumeVs50DayAvg} />
        </section>
      </main>

      {/* Disclaimer */}
      <footer className="max-w-[1600px] mx-auto px-4 pb-6 pt-2">
        <p className="text-xs text-muted-foreground/60 text-center">
          Alta88 Market Dashboard is beta software. Data delayed and not guaranteed to be accurate. Verify all data before trading.
        </p>
      </footer>
    </div>
  );
}
