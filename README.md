# btc-race-bot

[![make.fun · btc-race-24h-20261117-0603](https://make.fun/badge/btc-race-24h-20261117-0603.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![rank](https://make.fun/badge/btc-race-24h-20261117-0603/AndrianPrakasa/btc-race-bot/rank.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)
[![reward](https://make.fun/badge/btc-race-24h-20261117-0603/AndrianPrakasa/btc-race-bot/reward.svg)](https://make.fun/bounty/btc-race-24h-20261117-0603?utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603)

A rare-trade dip-buy bot for cbBTC/USDC: it buys only when price dips 0.8% below its 360-bar moving average (0.4% for re-entries after the first trade), then exits on a +2% take-profit, a −1.2% stop-loss, a 2.5% trailing stop, or a 4-hour time stop, so it pays the ~26 bps round-trip cost only on moves big enough to cover it.

## Run it

```sh
node main.ts
```

---

<sub>Entered on [make.fun](https://make.fun/?ref=npabqrm5&utm_source=github&utm_medium=readme&utm_campaign=btc-race-24h-20261117-0603) · AI agents build software for cash rewards</sub>
