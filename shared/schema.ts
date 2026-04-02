// No database tables needed - this is a read-only dashboard
// All data comes from CSV files and API calculations

export interface QuoteData {
  symbol: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  previousClose: number;
}

export interface MovingAverages {
  ema10: number;
  ema21: number;
  sma50: number;
  sma200: number;
  currentPrice: number;
}

export interface WebsterEMA21Indicator {
  // Pink Bar: daily high below 21 EMA (brakes are on)
  isPinkBar: boolean;
  // 3-Day Low Rule: index low above 21 EMA for 3 consecutive days + up close on 3rd day
  threeDayRule: {
    confirmed: boolean;
    consecutiveDaysAbove: number; // how many consecutive days low > 21 EMA
    closedUpOnThird: boolean;
  };
  // Consecutive days Nasdaq CLOSED below 21 EMA
  daysClosedBelow21EMA: number;
  // % the Nasdaq is below the 21 EMA
  pctBelow21EMA: number;
  // 200-day context
  below200SMA: boolean;
  // Current 21 EMA value
  ema21Value: number;
  // Overall status: 'green_light' | 'pink_bar' | 'neutral' | 'confirming'
  status: string;
}

export interface PrimarySignals {
  maAlignment: {
    aligned: boolean;
    ema10: number;
    ema21: number;
    sma50: number;
    ema10vs21Pct: number;  // % 10 EMA is above/below 21 EMA
    ema21vs50Pct: number;  // % 21 EMA is above/below 50 SMA
  };
  vixSignal: {
    elevated: boolean;
    value: number;
    context: string;
    contango: boolean;     // VIX futures in contango (VIX3M > VIX)
    vix3m: number;         // 3-month VIX value
    // M1 vs M2 futures term structure
    m1Price: number;       // Front-month VIX future (^VW1VX)
    m2Price: number;       // Second-month VIX future (^VW2VX)
    m1m2Spread: number;    // (M2 - M1) / M1 * 100 — positive = contango
    m1m2Status: string;    // 'RISK OFF Contango' | 'RISK ON Backwardation' | 'Neutral'
    // VIX vs VIX3M ratio
    vixVsVix3mRatio: number;  // VIX / VIX3M — >1.0 = confirmed stress
    vixVsVix3mStatus: string; // 'Stress' | 'Normal'
    // VIX vs VIX6M
    vix6m: number;            // 6-month VIX value (^VIX6M)
    vixVsVix6mRatio: number;  // VIX / VIX6M — >1.0 = sustained turbulence
    vixVsVix6mStatus: string; // 'Turbulence' | 'Normal'
  };
  followThroughDay: {
    active: boolean;
    date: string | null;
    percentGain: number | null;
    volumeVsPrior: number | null;
    dayOneDate: string | null;
    rallyDay: number | null;
    negated: boolean;
    status: string; // 'confirmed' | 'waiting' | 'no_rally' | 'negated'
    dayOneLow: number | null;      // The "Line in the Sand"
    ftdDayLow: number | null;       // FTD day's intraday low (exit level)
    ftdTimingGrade: string | null;  // 'A' (Day 4-7) | 'B' (Day 8-12) | 'C' (Day 13+)
    below200SMA: boolean;           // Danger zone flag — FTDs below 200 SMA have ~50% failure
    drawdownFromPeak: number | null; // Current % drawdown from peak
  };
  powerTrend: {
    active: boolean;
    conditions: PowerTrendConditions;
  };
}

export interface PowerTrendConditions {
  tenDayLowAbove21EMA: {
    met: boolean;
    consecutiveDays: number;
    daysNeeded: number;
  };
  ema21AboveSma50: {
    met: boolean;
    pointGap: number;
  };
  sma50TrendingUp: {
    met: boolean;
    dailySlope: number;
  };
  closeAbove21EMA: {
    met: boolean;
    pointGap: number;
  };
}

export interface MarketHealth {
  nasdaqDistributionDays: number;
  sp500DistributionDays: number;
  nasdaqDistributionDetails: { date: string; pctChange: number; type: string }[]; // type: 'distribution' | 'stall'
  sp500DistributionDetails: { date: string; pctChange: number; type: string }[];
  nyseADRatio: {
    ratio: number;
    advancing: number;
    declining: number;
  };
  nyseNetNewHighsLows: number;
  netHighsLowsAsOf: string | null;
  volumeVs50DayAvg: number;
  marketSchool: {
    score: number;
    maxScore: number;
    status: string;
    signals: {
      name: string;
      rule: string;
      met: boolean;
    }[];
  };
}

export interface DashboardData {
  quotes: QuoteData[];
  movingAverages: MovingAverages;
  primarySignals: PrimarySignals;
  powerTrendConditions: PowerTrendConditions;
  marketHealth: MarketHealth;
  nasdaqPctAbove21EMA: number;
  nasdaqPctAbove50SMA: number;
  ema21Indicator: WebsterEMA21Indicator;
  lastUpdated: string;
}
