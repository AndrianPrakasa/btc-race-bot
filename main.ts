// Dip-buy trend bot for btc-race-24h-20261117-0603 (cbBTC/USDC, 1m bars, long only).
//
// Idea: the dev window is flat and choppy (+0.49% over 24h, 1m vol ~6 bps) while a
// full round trip costs ~26-34 bps, so frequent trading loses (ema-cross: 68 trades,
// -$106 on dev). This bot trades rarely: it buys a dip and holds for a real move.
//
//   - Entry: close at least 0.8% below its 240-bar simple moving average (a deep dip
//     against the 4h trend), full cash, one position at a time.
//   - Exit: take profit +2.0% from the entry close, stop loss -1.2%, or a 2.5%
//     trailing stop from the peak close since entry. Whichever hits first.
//   - Fallbacks (only if it has never traded yet): if the window never dips, buy
//     on a strong uptrend (close > SMA x 1.005 from bar 480), on any dip below the
//     SMA (from bar 720), or at the market (from bar 1200). These never fire on the
//     dev window (first trade is at bar ~386); they only keep the bot from sitting
//     in cash for a whole race window that never dips, which would fail the
//     >=1-trade guardrail.
//
// All comparisons are exact bigint cross-multiplications on the integer prices
// the harness sends (price_scale 5); no floats, no clock, no randomness, no
// network, no files. Deterministic: the same bars always give the same orders.
//
// Dev-window behaviour (local grade, see README): 1 round trip + 1 final hold,
// net PnL about +$17.9 in simulation, max drawdown about -0.7%.

import { runBars, type BarsState, type OrderInput } from './vendor/makefun-bars.ts';

const SYMBOL = 'CBBTC';
const SMA_BARS = 240;
/** Entry: close < SMA * (1 - DIP_BPS/10000). */
const DIP_BPS = 80; // 0.8%
/** Take profit: close >= entry * (1 + TP_BPS/10000). */
const TP_BPS = 200; // 2.0%
/** Stop loss: close <= entry * (1 - SL_BPS/10000). */
const SL_BPS = 120; // 1.2%
/** Trailing stop: close <= peak * (1 - TRAIL_BPS/10000). */
const TRAIL_BPS = 250; // 2.5%
const MAX_SLIPPAGE_BPS = 300; // 3%: far above the ~13 bps a fill normally moves

/** Latest close per batch seq (null before the first bar / on a missing bar). */
const closes: (bigint | null)[] = [];
/** Close at the bar the current position was decided on; 0n when flat. */
let entryClose = 0n;
/** Highest close seen while the current position is open; 0n when flat. */
let peakClose = 0n;
/** True once a buy order has been sent (so the fallbacks only fire pre-trade). */
let everTraded = false;

/** Sum of the last SMA_BARS closes ending at seq, or null if any is missing. */
function smaSum(seq: number): bigint | null {
  if (seq < SMA_BARS - 1) return null;
  let sum = 0n;
  for (let i = seq - SMA_BARS + 1; i <= seq; i++) {
    const c = closes[i];
    if (c === null || c === undefined) return null;
    sum += c;
  }
  return sum;
}

await runBars({
  onBatch(state: BarsState, batch) {
    closes.push(state.close(SYMBOL));
    if (state.warmingUp) return [];

    const close = state.close(SYMBOL);
    if (close === null) return [];
    const pos = state.positions.get(SYMBOL);
    const heldQty = pos?.qty ?? 0n;

    // --- Flat: look for an entry -------------------------------------------
    if (heldQty === 0n) {
      const sum = smaSum(batch.seq);
      if (sum === null) return [];
      // close < SMA * (1 - DIP_BPS/10000)
      //   <=> close * SMA_BARS * 10000 < sum * (10000 - DIP_BPS)
      const dip =
        close * BigInt(SMA_BARS) * 10000n < sum * BigInt(10000 - DIP_BPS);
      let buy = dip;
      if (!buy && !everTraded) {
        // Fallbacks: only before any trade, so they are inert on the dev window.
        const aboveTrend =
          close * BigInt(SMA_BARS) * 10000n > sum * 10050n; // close > SMA*1.005
        const belowSma = close * BigInt(SMA_BARS) < sum;
        if ((batch.seq >= 480 && aboveTrend) || (batch.seq >= 720 && belowSma) || batch.seq >= 1200) buy = true;
      }
      if (!buy) return [];
      const room = state.weightRoom(SYMBOL);
      const notional = state.cash < room ? state.cash : room;
      if (notional < BigInt(state.hello.fees.min_notional_quote_units)) return [];
      everTraded = true;
      entryClose = close;
      peakClose = close;
      return [{ side: 'buy', symbol: SYMBOL, notional_quote_units: notional, max_slippage_bps: MAX_SLIPPAGE_BPS }];
    }

    // --- Holding: exits ------------------------------------------------------
    if (close > peakClose) peakClose = close;
    // close >= entry * (1 + TP_BPS/10000)
    const takeProfit = close * 10000n >= entryClose * BigInt(10000 + TP_BPS);
    // close <= entry * (1 - SL_BPS/10000)
    const stopLoss = close * 10000n <= entryClose * BigInt(10000 - SL_BPS);
    // close <= peak * (1 - TRAIL_BPS/10000)
    const trailing = close * 10000n <= peakClose * BigInt(10000 - TRAIL_BPS);
    if (!takeProfit && !stopLoss && !trailing) return [];
    entryClose = 0n;
    peakClose = 0n;
    const sell: OrderInput = { side: 'sell', symbol: SYMBOL, qty: heldQty, max_slippage_bps: MAX_SLIPPAGE_BPS };
    return [sell];
  },
});
