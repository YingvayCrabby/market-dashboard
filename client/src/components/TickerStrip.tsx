import type { QuoteData } from "@shared/schema";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";

interface TickerStripProps {
  quotes: QuoteData[];
}

export function TickerStrip({ quotes }: TickerStripProps) {
  return (
    <div className="border-b border-border bg-card/80 backdrop-blur-sm overflow-x-auto">
      <div className="max-w-[1600px] mx-auto px-4 py-2 flex items-center gap-0">
        {quotes.map((q, i) => {
          const isPositive = q.change > 0;
          const isNegative = q.change < 0;
          const colorClass = isPositive
            ? "text-emerald-500"
            : isNegative
            ? "text-red-500"
            : "text-muted-foreground";

          return (
            <div
              key={q.symbol}
              className={`flex items-center gap-2 px-3 py-1 ${
                i < quotes.length - 1 ? "border-r border-border" : ""
              }`}
              data-testid={`ticker-${q.symbol}`}
            >
              <span className="text-xs font-medium text-muted-foreground whitespace-nowrap">
                {q.name}
              </span>
              <span className="text-sm font-semibold tabular-nums whitespace-nowrap">
                {q.price.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
              <div className={`flex items-center gap-0.5 ${colorClass}`}>
                {isPositive ? (
                  <TrendingUp className="w-3 h-3" />
                ) : isNegative ? (
                  <TrendingDown className="w-3 h-3" />
                ) : (
                  <Minus className="w-3 h-3" />
                )}
                <span className="text-xs font-medium tabular-nums whitespace-nowrap">
                  {isPositive ? "+" : ""}
                  {q.changePercent.toFixed(2)}%
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
