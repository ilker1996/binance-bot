# Introduction

This project consists of an automated trading program, aka a bot, to be used with the [Binance trading platform](https://www.binance.com/en).
The bot is fully written in Javascript.

# Features

- Automated buy/sell order creation based on the EMA indicator.

The bot relies only in scalping indicator, so it's quite simple.

# Future development

Here are some points that deserve attention:

- More consideration with the proft and stop-loss price calculations (multipliers and higher limit increase ratio)

# Dependencies

- [NodeJS](https://nodejs.org/en/) to run Javascript outside a browser
- [npm Dependency Manager](https://www.npmjs.com/)

The bot depends on the following Node modules:

- "binance-api-node": "^0.8.10",
- "node-binance-api": "^0.12.5",
- "technicalindicators": "^2.0.5",
- "ttab": "^0.7.0"

# Setup

Clone the repository with HTTPS:

```
$ git clone https://github.com/sindelio/binance_bot.git
```

Or with SSH:

`$ git clone git@github.com:sindelio/binance_bot.git`

Then move into the cloned directory:

`cd binance_bot`

Install the module dependencies:

```
$ npm i
```

# Running

Inside the project root directory (/bot_binance):

```
$ node bot_public.js <coin-pair> <candle-interval>
```

or

Running for list of coin pairs :

```
$ ./trade.sh
```

# Contributions

All contributions and comments are welcome!

# License

This code is licensed under [the MIT license](https://github.com/sindelio/binance_bot/blob/master/LICENSE).
