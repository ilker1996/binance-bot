# Introduction

This project consists of an automated trading program, aka a bot, to be used with the [Binance trading platform](https://www.binance.com/en).
The bot is fully written in Javascript.

# Features

- Automated buy/sell order creation based on the ma or ma crossover.

# Future development

Here are some points that deserve attention:

- More consideration with the profit and stop-loss price calculations (multipliers and higher limit increase ratio)
- Use volatility/volume/momentum indicators along with ma crossover (e.g. MACD and CCI)

# Dependencies

- [NodeJS](https://nodejs.org/en/) to run Javascript outside a browser
- [npm Dependency Manager](https://www.npmjs.com/)

# Setup

Clone the repository with HTTPS:

```
$ git clone https://github.com/ilker1996/binance_bot.git
```

Then move into the cloned directory:

`cd binance_bot`

Install the module dependencies:

```
$ npm install
```

# Running

Inside the project root directory (/binance_bot):

```
$ node bot.js <coin-pair>
```

# License

This code is licensed under [the MIT license](https://github.com/sindelio/binance_bot/blob/master/LICENSE).
