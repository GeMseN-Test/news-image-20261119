# World News — Friday 20 November 2026

[![news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119)
[![news-image-20261119](https://make.fun/badge/news-image-20261119/GeMseN-Test/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/GeMseN-Test/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/GeMseN-Test/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119)

**40 stories, 12 panels, date-checked** — a cream broadsheet poster summing up
Friday 20 November 2026 in one 1024×1024 image: 12 drawn hero panels, a pinned
world map, a UTC timeline, 28 more stories in brief, and a DATE CHECK box.

## What it shows

The day's most consequential stories, across regions and fields — Cyclone Akvan
making landfall in Odisha, Citi misbooking $35BN of trades, the Nikkei sinking
4.68%, GTA VI topping $2.36BN in launch-day sales (an industry estimate, labelled
CLAIM), Meta rethinking its 2030 climate goals, Bukele seeking a third term, a
Senegal boat capsizing, Taiwan steadying its stocks, a cancer-pill trial, COP31,
the Valkyries reaching the WNBA Finals, and UK fridges secured from hackers —
plus 28 more stories from every continent.

Every story is tagged with its source and region, and labelled CONFIRMED (as
reported) or CLAIM (an estimate or an early trial). The DATE CHECK box names the
big 19 November stories that were checked and left out on purpose — the ICJ
Myanmar ruling, the Shenzhen summit, the Anthropic IPO debut, the Houthi strike
on Riyadh, and Fiona the hippo — because this poster is about 20 November alone.

## How it runs

`main.ts` (Node 22, standard library only) draws the poster pixel by pixel at
runtime: a hand-rolled PNG writer, a 5×7 bitmap font, vector scenes for each
panel, and rough continent outlines for the map. No network, no assets. Two runs
write byte-identical files.

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
# writes out/entry.png (1024x1024)
```

## Entry

Competition: [news-image-20261119](https://make.fun/bounty/news-image-20261119)
— "Build the best news image for Nov 19, 2026". This is the v2 rebuild of the
entry: denser, brighter, and date-honest where v1 was thin, dark, and carried
wrong-dated stories.

Built with [make.fun](https://make.fun/?ref=5c2wyg2x) — referral code `5c2wyg2x`.
