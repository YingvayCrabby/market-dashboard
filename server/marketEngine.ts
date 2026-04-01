import type {
  QuoteData,
  MovingAverages,
  PrimarySignals,
  PowerTrendConditions,
  MarketHealth,
  DashboardData,
  WebsterEMA21Indicator,
} from "../shared/schema";

import fs from "fs";
import path from "path";

// yahoo-finance2 v3 uses class-based API
let yf: any = null;
async function getYF() {
  if (!yf) {
    const YahooFinance = (await import("yahoo-finance2")).default;
    // v3 exports a class, v2 exports an object
    if (typeof YahooFinance === "function") {
      yf = new (YahooFinance as any)();
    } else {
      yf = YahooFinance;
    }
    // Suppress validation warnings
    try {
      yf.setGlobalConfig?.({ validation: { logErrors: false } });
    } catch {}
  }
  return yf;
}

interface OHLCVRow {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

function computeEMA(data: number[], period: number): number[] {
  const ema: number[] = [];
  const multiplier = 2 / (period + 1);
  let sum = 0;
  for (let i = 0; i < period && i < data.length; i++) {
    sum += data[i];
  }
  ema[period - 1] = sum / period;
  for (let i = period; i < data.length; i++) {
    ema[i] = (data[i] - ema[i - 1]) * multiplier + ema[i - 1];
  }
  return ema;
}

function computeSMA(data: number[], period: number): number[] {
  const sma: number[] = [];
  for (let i = period - 1; i < data.length; i++) {
    let sum = 0;
    for (let j = i - period + 1; j <= i; j++) {
      sum += data[j];
    }
    sma[i] = sum / period;
  }
  return sma;
}

function get10DayLow(data: OHLCVRow[], endIndex: number): number {
  let low = Infinity;
  for (let i = Math.max(0, endIndex - 9); i <= endIndex; i++) {
    if (data[i].low < low) low = data[i].low;
  }
  return low;
}

// Webster's enhanced distribution day count with stall detection
function countDistributionDaysWebster(
  data: OHLCVRow[],
  endIdx: number
): { count: number; details: { date: string; pctChange: number; type: string }[] } {
  const details: { date: string; pctChange: number; type: string }[] = [];
  const lookback = Math.min(25, endIdx);

  for (let i = endIdx; i > endIdx - lookback && i > 0; i--) {
    const pctChange = ((data[i].close - data[i - 1].close) / data[i - 1].close) * 100;

    // Classic distribution: -0.2% or more loss on higher volume
    if (pctChange <= -0.2 && data[i].volume > data[i - 1].volume) {
      // 5% gain negation: if index gained 5%+ from this day's close to current close
      const gainSinceDistDay = ((data[endIdx].close - data[i].close) / data[i].close) * 100;
      if (gainSinceDistDay < 5) {
        details.push({
          date: data[i].date,
          pctChange: Math.round(pctChange * 100) / 100,
          type: "distribution",
        });
      }
    }

    // Stall/Churning: flat or slightly up close (+0 to +0.4%) on volume 50%+ above average
    // Approximate: volume > 1.5x the average of the 5 prior days
    if (pctChange >= -0.05 && pctChange <= 0.4 && i >= 6) {
      const avgVol5 = data.slice(i - 5, i).reduce((s, d) => s + d.volume, 0) / 5;
      if (data[i].volume > avgVol5 * 1.5) {
        const gainSinceDistDay = ((data[endIdx].close - data[i].close) / data[i].close) * 100;
        if (gainSinceDistDay < 5) {
          details.push({
            date: data[i].date,
            pctChange: Math.round(pctChange * 100) / 100,
            type: "stall",
          });
        }
      }
    }
  }

  return { count: details.length, details };
}

// Ticker config
const TICKER_STRIP = [
  { symbol: "^IXIC", name: "Nasdaq" },
  { symbol: "^GSPC", name: "S&P 500" },
  { symbol: "^VIX", name: "VIX" },
  { symbol: "DX-Y.NYB", name: "DXY" },
  { symbol: "TLT", name: "TLT" },
  { symbol: "JNK", name: "JNK" },
  { symbol: "USO", name: "USO" },
  { symbol: "DBA", name: "DBA" },
  { symbol: "GLD", name: "GLD" },
];

// Cache to avoid hammering Yahoo on every request
let cache: { data: DashboardData; timestamp: number } | null = null;
const CACHE_TTL = 60_000; // 1 minute

// Persistent disk-backed cache for net highs/lows (Barchart returns 0 on weekends)
const CACHE_FILE = path.join(process.cwd(), "net-highs-lows-cache.json");

interface NetHighsLowsCache {
  value: number;
  highs: number;
  lows: number;
  asOf: string;
}

let netHighsLowsCache: NetHighsLowsCache | null = null;

// Load cache from disk on startup
try {
  if (fs.existsSync(CACHE_FILE)) {
    const raw = fs.readFileSync(CACHE_FILE, "utf-8");
    netHighsLowsCache = JSON.parse(raw);
    console.log("Loaded net highs/lows cache from disk:", netHighsLowsCache);
  }
} catch (err: any) {
  console.warn("Failed to load net highs/lows cache:", err.message);
}

function saveNetHighsLowsCache(data: NetHighsLowsCache) {
  netHighsLowsCache = data;
  try {
    fs.writeFileSync(CACHE_FILE, JSON.stringify(data), "utf-8");
  } catch (err: any) {
    console.warn("Failed to save net highs/lows cache:", err.message);
  }
}

async function fetchQuotes(): Promise<QuoteData[]> {
  const yahooFinance = await getYF();
  const symbols = TICKER_STRIP.map((t) => t.symbol);
  const quotes: QuoteData[] = [];

  // Fetch quotes one at a time to handle errors gracefully
  for (const ticker of TICKER_STRIP) {
    try {
      const q = await yahooFinance.quote(ticker.symbol);
      quotes.push({
        symbol: ticker.symbol,
        name: ticker.name,
        price: q.regularMarketPrice ?? 0,
        change: q.regularMarketChange ?? 0,
        changePercent: q.regularMarketChangePercent ?? 0,
        previousClose: q.regularMarketPreviousClose ?? 0,
      });
    } catch (err: any) {
      console.warn(`Quote fetch failed for ${ticker.symbol}:`, err.message);
      quotes.push({
        symbol: ticker.symbol,
        name: ticker.name,
        price: 0,
        change: 0,
        changePercent: 0,
        previousClose: 0,
      });
    }
  }
  return quotes;
}

async function fetchHistory(symbol: string, days: number = 300): Promise<OHLCVRow[]> {
  const yahooFinance = await getYF();
  const endDate = new Date();
  const startDate = new Date();
  startDate.setDate(startDate.getDate() - days);

  try {
    const result = await yahooFinance.chart(symbol, {
      period1: startDate.toISOString().split("T")[0],
      period2: endDate.toISOString().split("T")[0],
      interval: "1d",
    });

    if (!result || !result.quotes || result.quotes.length === 0) {
      throw new Error("No data returned from chart");
    }

    return result.quotes
      .filter((q: any) => q.close != null && q.volume != null)
      .map((q: any) => ({
        date: new Date(q.date).toISOString().split("T")[0],
        open: q.open ?? 0,
        high: q.high ?? 0,
        low: q.low ?? 0,
        close: q.close ?? 0,
        volume: q.volume ?? 0,
      }));
  } catch (err: any) {
    console.warn(`History fetch failed for ${symbol}:`, err.message);
    // Fallback: try historical module
    try {
      const result = await yahooFinance.historical(symbol, {
        period1: startDate.toISOString().split("T")[0],
        period2: endDate.toISOString().split("T")[0],
        interval: "1d",
      });

      return result
        .filter((q: any) => q.close != null)
        .map((q: any) => ({
          date: new Date(q.date).toISOString().split("T")[0],
          open: q.open ?? 0,
          high: q.high ?? 0,
          low: q.low ?? 0,
          close: q.close ?? 0,
          volume: q.volume ?? 0,
        }));
    } catch (err2: any) {
      console.error(`Historical fallback also failed for ${symbol}:`, err2.message);
      return [];
    }
  }
}

export async function computeDashboardData(): Promise<DashboardData> {
  // Check cache
  if (cache && Date.now() - cache.timestamp < CACHE_TTL) {
    return cache.data;
  }

  console.log("Fetching fresh data from Yahoo Finance...");

  // Fetch all data in parallel
  const [quotesData, nasdaqHistoryRaw, sp500HistoryRaw] = await Promise.all([
    fetchQuotes(),
    fetchHistory("^IXIC", 300),
    fetchHistory("^GSPC", 300),
  ]);

  // Yahoo's daily chart API excludes the current trading day until after close.
  // Synthesize today's bar from the real-time quote and append it to history
  // so that FTD rally day counts, MA calculations, and all signals stay current.
  const nasdaqHistory = [...nasdaqHistoryRaw];
  const sp500History = [...sp500HistoryRaw];

  try {
    const yahooFinance = await getYF();
    const [nasdaqQuote, sp500Quote] = await Promise.all([
      yahooFinance.quote("^IXIC").catch(() => null),
      yahooFinance.quote("^GSPC").catch(() => null),
    ]);

    const todayStr = new Date().toISOString().split("T")[0];

    // Append live Nasdaq bar if history is stale
    if (nasdaqHistory.length > 0 && nasdaqQuote) {
      const lastDate = nasdaqHistory[nasdaqHistory.length - 1].date;
      if (lastDate < todayStr && nasdaqQuote.regularMarketPrice > 0) {
        nasdaqHistory.push({
          date: todayStr,
          open: nasdaqQuote.regularMarketOpen || nasdaqQuote.regularMarketPrice,
          high: nasdaqQuote.regularMarketDayHigh || nasdaqQuote.regularMarketPrice,
          low: nasdaqQuote.regularMarketDayLow || nasdaqQuote.regularMarketPrice,
          close: nasdaqQuote.regularMarketPrice,
          volume: nasdaqQuote.regularMarketVolume || 0,
        });
        console.log(`Appended live Nasdaq bar for ${todayStr}: close=${nasdaqQuote.regularMarketPrice}`);
      }
    }

    // Append live S&P 500 bar if history is stale
    if (sp500History.length > 0 && sp500Quote) {
      const lastDate = sp500History[sp500History.length - 1].date;
      if (lastDate < todayStr && sp500Quote.regularMarketPrice > 0) {
        sp500History.push({
          date: todayStr,
          open: sp500Quote.regularMarketOpen || sp500Quote.regularMarketPrice,
          high: sp500Quote.regularMarketDayHigh || sp500Quote.regularMarketPrice,
          low: sp500Quote.regularMarketDayLow || sp500Quote.regularMarketPrice,
          close: sp500Quote.regularMarketPrice,
          volume: sp500Quote.regularMarketVolume || 0,
        });
        console.log(`Appended live S&P 500 bar for ${todayStr}: close=${sp500Quote.regularMarketPrice}`);
      }
    }
  } catch (err: any) {
    console.warn("Failed to append live bars:", err.message);
  }

  // If we got no historical data, return a minimal response
  if (nasdaqHistory.length < 50 || sp500History.length < 50) {
    const defaultEma21Indicator: WebsterEMA21Indicator = {
      isPinkBar: false,
      threeDayRule: { confirmed: false, consecutiveDaysAbove: 0, closedUpOnThird: false },
      below200SMA: false,
      ema21Value: 0,
      status: "neutral",
    };
    const fallback: DashboardData = {
      quotes: quotesData,
      movingAverages: { ema10: 0, ema21: 0, sma50: 0, sma200: 0, currentPrice: 0 },
      primarySignals: {
        maAlignment: { aligned: false, ema10: 0, ema21: 0, sma50: 0 },
        vixSignal: { elevated: false, value: 0, context: "N/A" },
        followThroughDay: {
          active: false,
          date: null,
          percentGain: null,
          volumeVsPrior: null,
          dayOneDate: null,
          rallyDay: null,
          negated: false,
          status: "no_rally",
          dayOneLow: null,
          ftdDayLow: null,
          ftdTimingGrade: null,
          below200SMA: false,
          drawdownFromPeak: null,
        },
        powerTrend: {
          active: false,
          conditions: {
            tenDayLowAbove21EMA: { met: false, consecutiveDays: 0, daysNeeded: 5 },
            ema21AboveSma50: { met: false, pointGap: 0 },
            sma50TrendingUp: { met: false, dailySlope: 0 },
            closeAbove21EMA: { met: false, pointGap: 0 },
          },
        },
      },
      powerTrendConditions: {
        tenDayLowAbove21EMA: { met: false, consecutiveDays: 0, daysNeeded: 5 },
        ema21AboveSma50: { met: false, pointGap: 0 },
        sma50TrendingUp: { met: false, dailySlope: 0 },
        closeAbove21EMA: { met: false, pointGap: 0 },
      },
      marketHealth: {
        nasdaqDistributionDays: 0,
        sp500DistributionDays: 0,
        nasdaqDistributionDetails: [],
        sp500DistributionDetails: [],
        nyseADRatio: { ratio: 0, advancing: 0, declining: 0 },
        nyseNetNewHighsLows: 0,
        netHighsLowsAsOf: null,
        volumeVs50DayAvg: 0,
        marketSchool: { score: 0, maxScore: 4, status: "N/A", signals: [] },
      },
      nasdaqPctAbove21EMA: 0,
      nasdaqPctAbove50SMA: 0,
      ema21Indicator: defaultEma21Indicator,
      lastUpdated: new Date().toISOString(),
    };
    return fallback;
  }

  const closes = nasdaqHistory.map((d) => d.close);
  const sp500Closes = sp500History.map((d) => d.close);

  // Compute moving averages
  const ema10 = computeEMA(closes, 10);
  const ema21 = computeEMA(closes, 21);
  const sma50 = computeSMA(closes, 50);
  const sma200 = computeSMA(closes, 200);

  const lastIdx = closes.length - 1;
  const currentPrice = closes[lastIdx];
  const currentEMA10 = ema10[lastIdx] || 0;
  const currentEMA21 = ema21[lastIdx] || 0;
  const currentSMA50 = sma50[lastIdx] || 0;
  const currentSMA200 = sma200[lastIdx] || 0;

  const movingAverages: MovingAverages = {
    ema10: currentEMA10,
    ema21: currentEMA21,
    sma50: currentSMA50,
    sma200: currentSMA200,
    currentPrice,
  };

  const nasdaqPctAbove21EMA = currentEMA21 ? ((currentPrice - currentEMA21) / currentEMA21) * 100 : 0;
  const nasdaqPctAbove50SMA = currentSMA50 ? ((currentPrice - currentSMA50) / currentSMA50) * 100 : 0;

  // MA Alignment
  const maAligned = currentEMA10 > currentEMA21 && currentEMA21 > currentSMA50;

  // VIX
  const vixQuote = quotesData.find((q) => q.symbol === "^VIX");
  const vixPrice = vixQuote?.price || 0;
  let vixContext = "complacent";
  if (vixPrice < 14) vixContext = "complacent";
  else if (vixPrice < 18) vixContext = "low";
  else if (vixPrice < 25) vixContext = "elevated";
  else vixContext = "fear";

  // ── IBD Follow-Through Day ─────────────────────────────────────────
  //
  // RULE 1 — Prior downtrend required
  //   Market must be in a recognized correction: ~10%+ decline from a
  //   recent high (IBD standard). We use the highest close in the prior
  //   100 trading days as the swing high.
  //
  // RULE 2 — Day 1 (Webster): Day 1 triggers when the index makes a new
  //   low in the correction (low < previous low) but closes with a gain
  //   OR closes in the upper 50% of its range.
  //
  // RULE 3 — Day 1 low = "invalidation floor"
  //   If ANY subsequent day (before a confirmed FTD) trades below that
  //   low intraday, the entire rally attempt is cancelled and resets.
  //
  // RULE 4 — Day 1 can repeat
  //   After an undercut, wait for the next Day 1. The new Day 1 low
  //   becomes the new invalidation floor. No limit on resets.
  //
  // FTD CONFIRMATION — Day 4+:
  //   Index closes up ≥ 1.25% AND volume higher than the prior session.
  //
  // NEGATION:
  //   FTD is invalidated when the index CLOSES below the FTD day's
  //   intraday low (not just touches it intraday).
  //
  // The scanner walks forward through history. After a negated FTD the
  // market is back in correction and we look for a new rally attempt.

  let ftdActive = false;
  let ftdDate: string | null = null;
  let ftdPercentGain: number | null = null;
  let ftdVolumeVsPrior: number | null = null;
  let ftdDayOneDate: string | null = null;
  let ftdRallyDay: number | null = null;
  let ftdNegated = false;
  let ftdStatus: string = "no_rally";

  // New Webster FTD fields
  let ftdDayOneLow: number | null = null;
  let ftdDayLow: number | null = null;
  let ftdTimingGrade: string | null = null;
  let ftdBelow200SMA = false;
  let ftdDrawdownFromPeak: number | null = null;

  // Helper: highest close in a lookback window
  function highestClose(data: OHLCVRow[], endIdx: number, lookback: number): number {
    let peak = 0;
    for (let k = Math.max(0, endIdx - lookback); k <= endIdx; k++) {
      if (data[k].close > peak) peak = data[k].close;
    }
    return peak;
  }

  // State machine
  const enum Phase { CORRECTION, RALLY, CONFIRMED }
  let phase: Phase = Phase.CORRECTION;
  let dayOneIdx = -1;
  let invalidationFloor = 0;
  let confirmedFtdIdx = -1;
  let confirmedFtdLow = 0;
  let confirmedDayOneIdx = -1;
  let confirmedPctGain = 0;
  let confirmedVolPct = 0;
  let confirmedDayOneLow = 0;

  // Scan window: last ~120 trading days to give room for the 100-day
  // swing-high lookback plus rally attempts.
  const ftdScanStart = Math.max(1, lastIdx - 120);

  for (let i = ftdScanStart; i <= lastIdx; i++) {
    const row = nasdaqHistory[i];
    const prevRow = nasdaqHistory[i - 1];
    if (!prevRow) continue;

    // ── Phase: CONFIRMED ──────────────────────────────────────────
    // We have a live FTD. Check for negation.
    if (phase === Phase.CONFIRMED) {
      if (row.close < confirmedFtdLow) {
        // Negated — back to correction, look for new Day 1
        phase = Phase.CORRECTION;
        dayOneIdx = -1;
        // Don't clear confirmed* vars yet; we may not find a newer one
      }
      // Even if still confirmed, keep scanning — a newer FTD supersedes
    }

    // ── Phase: RALLY ──────────────────────────────────────────────
    // We have a Day 1, waiting for FTD or undercut.
    if (phase === Phase.RALLY) {
      // Check invalidation floor: did today's LOW go below Day 1 low?
      if (row.low < invalidationFloor) {
        // Rally attempt killed — reset to correction
        phase = Phase.CORRECTION;
        dayOneIdx = -1;
        // Fall through to correction check below (this same bar could
        // start a new Day 1 if conditions met)
      } else {
        const rallyDay = i - dayOneIdx + 1; // Day 1 = 1, Day 2 = 2, …
        if (rallyDay >= 4) {
          // Check FTD conditions
          const pctGain = ((row.close - prevRow.close) / prevRow.close) * 100;
          if (pctGain >= 1.25 && row.volume > prevRow.volume) {
            // FTD confirmed!
            phase = Phase.CONFIRMED;
            confirmedFtdIdx = i;
            confirmedFtdLow = row.low;
            confirmedDayOneIdx = dayOneIdx;
            confirmedPctGain = pctGain;
            confirmedVolPct = ((row.volume - prevRow.volume) / prevRow.volume) * 100;
            confirmedDayOneLow = invalidationFloor;
          }
        }
        continue; // stay in rally phase, move to next bar
      }
    }

    // ── Phase: CORRECTION ─────────────────────────────────────────
    // Look for a new Day 1.
    if (phase === Phase.CORRECTION) {
      // Check correction context: ≥ 10% decline from the highest close
      // in the prior 100 trading days
      const peak = highestClose(nasdaqHistory, i - 1, 100);
      const drawdown = ((prevRow.close - peak) / peak) * 100;
      const inCorrection = drawdown <= -10;

      if (inCorrection) {
        // Webster Day 1 definition:
        // Triggers when index closes with a gain OR
        // makes a new low (low < prev low) AND closes in upper 50% of range
        const madeNewLow = row.low < prevRow.low;
        const closedWithGain = row.close > prevRow.close;
        const range = row.high - row.low;
        const closeRange = range > 0 ? (row.close - row.low) / range : 0;
        const closedInUpperHalf = closeRange >= 0.5;

        if (closedWithGain || (madeNewLow && closedInUpperHalf)) {
          // Day 1!
          phase = Phase.RALLY;
          dayOneIdx = i;
          invalidationFloor = row.low;
        }
      }
    }
  }

  // ── Evaluate final state ─────────────────────────────────────────
  // Compute current drawdown from peak for display
  const currentPeak = highestClose(nasdaqHistory, lastIdx, 100);
  const currentDrawdown = currentPeak > 0 ? ((currentPrice - currentPeak) / currentPeak) * 100 : null;

  if (phase === Phase.CONFIRMED) {
    ftdActive = true;
    ftdStatus = "confirmed";
    ftdNegated = false;
    ftdDate = nasdaqHistory[confirmedFtdIdx].date;
    ftdPercentGain = confirmedPctGain;
    ftdVolumeVsPrior = confirmedVolPct;
    ftdDayOneDate = nasdaqHistory[confirmedDayOneIdx].date;
    ftdRallyDay = confirmedFtdIdx - confirmedDayOneIdx + 1;

    // Webster enhancements
    ftdDayOneLow = confirmedDayOneLow;
    ftdDayLow = confirmedFtdLow;
    // Timing grade
    if (ftdRallyDay >= 4 && ftdRallyDay <= 7) ftdTimingGrade = "A";
    else if (ftdRallyDay <= 12) ftdTimingGrade = "B";
    else ftdTimingGrade = "C";
    // below200SMA: check FTD day close vs 200 SMA at that point
    const ftdSma200 = sma200[confirmedFtdIdx];
    ftdBelow200SMA = ftdSma200 !== undefined && nasdaqHistory[confirmedFtdIdx].close < ftdSma200;
    ftdDrawdownFromPeak = currentDrawdown;
  } else if (phase === Phase.RALLY) {
    // Active rally attempt but no FTD yet
    ftdActive = false;
    ftdStatus = "waiting";
    ftdDayOneDate = nasdaqHistory[dayOneIdx].date;
    ftdRallyDay = lastIdx - dayOneIdx + 1;
    ftdDayOneLow = invalidationFloor;
    ftdDrawdownFromPeak = currentDrawdown;
    ftdBelow200SMA = currentSMA200 > 0 && currentPrice < currentSMA200;
    // If there was a prior confirmed FTD that got negated, show it
    if (confirmedFtdIdx >= 0) {
      ftdNegated = true;
      ftdDate = nasdaqHistory[confirmedFtdIdx].date;
      ftdPercentGain = confirmedPctGain;
      ftdVolumeVsPrior = confirmedVolPct;
    }
  } else {
    // Still in correction, no active rally attempt
    ftdActive = false;
    ftdDrawdownFromPeak = currentDrawdown;
    ftdBelow200SMA = currentSMA200 > 0 && currentPrice < currentSMA200;
    if (confirmedFtdIdx >= 0) {
      // There was a FTD that got negated
      ftdNegated = true;
      ftdStatus = "negated";
      ftdDate = nasdaqHistory[confirmedFtdIdx].date;
      ftdPercentGain = confirmedPctGain;
      ftdVolumeVsPrior = confirmedVolPct;
      ftdDayOneDate = nasdaqHistory[confirmedDayOneIdx].date;
      ftdRallyDay = confirmedFtdIdx - confirmedDayOneIdx + 1;
      ftdDayOneLow = confirmedDayOneLow;
      ftdDayLow = confirmedFtdLow;
    } else {
      ftdStatus = "no_rally";
    }
  }

  // Power Trend
  let consecutiveDays10DayLow = 0;
  for (let i = lastIdx; i >= Math.max(21, lastIdx - 60); i--) {
    const tenDayLow = get10DayLow(nasdaqHistory, i);
    const ema21Val = ema21[i];
    if (ema21Val && tenDayLow > ema21Val) {
      consecutiveDays10DayLow++;
    } else {
      break;
    }
  }

  const tenDayLowCondition = {
    met: consecutiveDays10DayLow >= 5,
    consecutiveDays: consecutiveDays10DayLow,
    daysNeeded: Math.max(0, 5 - consecutiveDays10DayLow),
  };

  const ema21AboveSma50 = {
    met: currentEMA21 > currentSMA50,
    pointGap: currentEMA21 - currentSMA50,
  };

  const prevSMA50 = sma50[lastIdx - 1] || 0;
  const sma50Slope = currentSMA50 - prevSMA50;
  const sma50TrendingUp = {
    met: sma50Slope > 0,
    dailySlope: sma50Slope,
  };

  const closeAbove21EMA = {
    met: currentPrice > currentEMA21,
    pointGap: currentPrice - currentEMA21,
  };

  const powerTrendConditions: PowerTrendConditions = {
    tenDayLowAbove21EMA: tenDayLowCondition,
    ema21AboveSma50,
    sma50TrendingUp,
    closeAbove21EMA,
  };

  const powerTrendActive =
    tenDayLowCondition.met && ema21AboveSma50.met && sma50TrendingUp.met && closeAbove21EMA.met;

  // Webster 21 EMA Indicator
  const isPinkBar = nasdaqHistory[lastIdx].high < currentEMA21;
  let consecutiveDaysLowAbove21 = 0;
  for (let i = lastIdx; i >= 21 && i >= lastIdx - 30; i--) {
    if (nasdaqHistory[i].low > (ema21[i] || 0)) {
      consecutiveDaysLowAbove21++;
    } else {
      break;
    }
  }
  // Check if the 3rd consecutive day closed up
  let closedUpOnThird = false;
  if (consecutiveDaysLowAbove21 >= 3) {
    // The "3rd day" is 3 bars back from the current streak start
    const thirdDayIdx = lastIdx - consecutiveDaysLowAbove21 + 3;
    if (thirdDayIdx <= lastIdx && thirdDayIdx > 0) {
      closedUpOnThird = nasdaqHistory[thirdDayIdx].close > nasdaqHistory[thirdDayIdx - 1].close;
    }
  }
  const threeDayConfirmed = consecutiveDaysLowAbove21 >= 3 && closedUpOnThird;

  let ema21Status = "neutral";
  if (isPinkBar) ema21Status = "pink_bar";
  else if (threeDayConfirmed) ema21Status = "green_light";
  else if (consecutiveDaysLowAbove21 >= 1) ema21Status = "confirming";

  const ema21Indicator: WebsterEMA21Indicator = {
    isPinkBar,
    threeDayRule: {
      confirmed: threeDayConfirmed,
      consecutiveDaysAbove: consecutiveDaysLowAbove21,
      closedUpOnThird,
    },
    below200SMA: currentPrice < currentSMA200,
    ema21Value: currentEMA21,
    status: ema21Status,
  };

  const primarySignals: PrimarySignals = {
    maAlignment: { aligned: maAligned, ema10: currentEMA10, ema21: currentEMA21, sma50: currentSMA50 },
    vixSignal: { elevated: vixPrice > 16, value: vixPrice, context: vixContext },
    followThroughDay: {
      active: ftdActive,
      date: ftdDate,
      percentGain: ftdPercentGain,
      volumeVsPrior: ftdVolumeVsPrior,
      dayOneDate: ftdDayOneDate,
      rallyDay: ftdRallyDay,
      negated: ftdNegated,
      status: ftdStatus,
      dayOneLow: ftdDayOneLow,
      ftdDayLow: ftdDayLow,
      ftdTimingGrade: ftdTimingGrade,
      below200SMA: ftdBelow200SMA,
      drawdownFromPeak: ftdDrawdownFromPeak,
    },
    powerTrend: { active: powerTrendActive, conditions: powerTrendConditions },
  };

  // Distribution Days — Webster enhanced version
  const nasdaqDist = countDistributionDaysWebster(nasdaqHistory, nasdaqHistory.length - 1);
  const sp500Dist = countDistributionDaysWebster(sp500History, sp500History.length - 1);

  const nasdaqDistDays = nasdaqDist.count;
  const sp500DistDays = sp500Dist.count;
  const nasdaqDistDetails = nasdaqDist.details;
  const sp500DistDetails = sp500Dist.details;

  // Volume vs 50-day average
  const recentVolumes = nasdaqHistory.slice(Math.max(0, lastIdx - 49), lastIdx + 1).map((d) => d.volume);
  const avgVolume50 = recentVolumes.reduce((a, b) => a + b, 0) / recentVolumes.length;
  const currentVolume = nasdaqHistory[lastIdx].volume;
  const volumeVs50DayAvg = avgVolume50 ? ((currentVolume - avgVolume50) / avgVolume50) * 100 : 0;

  // Nasdaq breadth data
  let nyseADRatio = { ratio: 0, advancing: 0, declining: 0 };
  let nyseNetNewHighsLows = 0;
  let netHighsLowsAsOf: string | null = null;

  // Nasdaq A/D: Use C:ISSQ — dayHigh = advancing issues, dayLow = declining issues
  try {
    const yahooFinance = await getYF();
    const issuQ = await yahooFinance.quote("C:ISSQ").catch(() => null);
    if (issuQ) {
      const adv = issuQ.regularMarketDayHigh || 0;
      const dec = issuQ.regularMarketDayLow || 0;
      if (adv > 0 || dec > 0) {
        nyseADRatio = {
          ratio: dec > 0 ? Math.round((adv / dec) * 100) / 100 : 0,
          advancing: Math.round(adv),
          declining: Math.round(dec),
        };
      }
    }
  } catch {}

  // Nasdaq Net New Highs/Lows: fetch from Barchart API
  // Barchart returns 0 on weekends/after-hours; fall back to cached value
  try {
    // Step 1: Get session cookies from the page
    const initResp = await fetch("https://www.barchart.com/stocks/highs-lows/summary", {
      headers: {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
        "Accept": "text/html",
      },
    });
    const setCookies = initResp.headers.getSetCookie ? initResp.headers.getSetCookie() : [];
    const cookies = setCookies.map((c: string) => c.split(";")[0]).join("; ");
    const xsrfMatch = cookies.match(/XSRF-TOKEN=([^;]+)/);
    const xsrf = xsrfMatch ? decodeURIComponent(xsrfMatch[1]) : "";

    if (xsrf) {
      const apiHeaders = {
        "User-Agent": "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
        "Accept": "application/json",
        "X-XSRF-TOKEN": xsrf,
        "Cookie": cookies,
        "Referer": "https://www.barchart.com/stocks/highs-lows/summary",
      };

      // Step 2: Fetch Nasdaq 52-week highs and lows counts
      const [highsResp, lowsResp] = await Promise.all([
        fetch("https://www.barchart.com/proxies/core-api/v1/quotes/get?lists=stocks.highs.nasdaq.1y&fields=symbol&meta=headers.count&raw=1&limit=1", { headers: apiHeaders }),
        fetch("https://www.barchart.com/proxies/core-api/v1/quotes/get?lists=stocks.lows.nasdaq.1y&fields=symbol&meta=headers.count&raw=1&limit=1", { headers: apiHeaders }),
      ]);

      const highsData = await highsResp.json() as any;
      const lowsData = await lowsResp.json() as any;
      const highs = highsData.total || 0;
      const lows = lowsData.total || 0;
      if (highs > 0 || lows > 0) {
        nyseNetNewHighsLows = highs - lows;
        const now = new Date().toISOString();
        // Update the persistent disk cache with fresh data
        saveNetHighsLowsCache({ value: nyseNetNewHighsLows, highs, lows, asOf: now });
        netHighsLowsAsOf = now;
      } else if (netHighsLowsCache) {
        // Barchart returned 0 (weekend/after-hours) — use disk-cached value
        nyseNetNewHighsLows = netHighsLowsCache.value;
        netHighsLowsAsOf = netHighsLowsCache.asOf;
      }
    }
  } catch (err: any) {
    console.warn("Barchart fetch failed:", err.message);
    // Fall back to disk cache on fetch failure too
    if (netHighsLowsCache) {
      nyseNetNewHighsLows = netHighsLowsCache.value;
      netHighsLowsAsOf = netHighsLowsCache.asOf;
    }
  }

  // If still no data after Barchart + cache, show the last trading date for context
  if (nyseNetNewHighsLows === 0 && !netHighsLowsCache) {
    netHighsLowsAsOf = nasdaqHistory[lastIdx]?.date || null;
  }

  // Market School
  const signals = [
    { name: "MA Alignment", rule: "10 EMA > 21 EMA > 50 SMA", met: maAligned },
    { name: "VIX Regime", rule: "VIX < 25 (not in fear)", met: vixPrice < 25 },
    { name: "Follow-Through Day", rule: "FTD confirmed on rally attempt", met: ftdActive },
    { name: "Power Trend", rule: "All 4 sub-conditions met", met: powerTrendActive },
  ];
  const score = signals.filter((s) => s.met).length;
  let status = "CAUTION";
  if (score >= 3) status = "BULLISH";
  else if (score >= 2) status = "NEUTRAL";

  const marketHealth: MarketHealth = {
    nasdaqDistributionDays: nasdaqDistDays,
    sp500DistributionDays: sp500DistDays,
    nasdaqDistributionDetails: nasdaqDistDetails,
    sp500DistributionDetails: sp500DistDetails,
    nyseADRatio,
    nyseNetNewHighsLows,
    netHighsLowsAsOf,
    volumeVs50DayAvg,
    marketSchool: { score, maxScore: 4, status, signals },
  };

  const result: DashboardData = {
    quotes: quotesData,
    movingAverages,
    primarySignals,
    powerTrendConditions,
    marketHealth,
    nasdaqPctAbove21EMA,
    nasdaqPctAbove50SMA,
    ema21Indicator,
    lastUpdated: new Date().toISOString(),
  };

  // Cache result
  cache = { data: result, timestamp: Date.now() };
  console.log("Data refreshed from Yahoo Finance at", new Date().toISOString());

  return result;
}
