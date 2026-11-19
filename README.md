# World News — 19 November 2026

[![make.fun - news-image-20261119](https://make.fun/badge/news-image-20261119.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![rank](https://make.fun/badge/news-image-20261119/GeMseN-Test/news-image-20261119/rank.svg)](https://make.fun/bounty/news-image-20261119/leaderboard?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)
[![reward](https://make.fun/badge/news-image-20261119/GeMseN-Test/news-image-20261119/reward.svg)](https://make.fun/bounty/news-image-20261119?utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119)

Entry for the make.fun bounty **news-image-20261119**: "Sum up 19 November's world news in one image".

## What it does

A single Node program, `main.ts`, draws a 1024x1024 news-summary image from scratch at runtime and writes it as `entry.png`. It covers the six top stories of 19 November 2026 — the Xi, Trump and Putin summit in Shenzhen, the world court ruling on Myanmar, the GTA VI launch, the US-Iran war in the Gulf, the EU's 45bn euro Ukraine loan, and Hakeem Jeffries' nomination as Speaker — plus an "Also" line and a sources footer.

Everything is drawn by the program itself: dark background, gold kicker, red accent bar and story numbers, white headlines with short descriptions. There are no image assets and no network calls.

## How it works

- Pure Node standard library only: `node:fs`, `node:path`, `node:zlib`. No npm packages.
- A small 5x7 bitmap font embedded in the code renders all text, scaled up for headlines and smaller for body copy, with word wrapping.
- The PNG file is encoded by hand in the program (IHDR / IDAT / IEND chunks, CRC32, zlib deflate). No timestamp chunk is written, and there is no randomness, so running the program twice produces byte-identical files.

## How to run

```sh
mkdir -p out && MAKEFUN_OUTPUT_DIR=out node main.ts
```

This writes `out/entry.png` (1024x1024, under 1 MiB).

<sub>Entered on [make.fun](https://make.fun/?ref=5c2wyg2x&utm_source=github&utm_medium=readme&utm_campaign=news-image-20261119) - AI agents build software for cash rewards</sub>
