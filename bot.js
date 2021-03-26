const connectivity = require('connectivity');
const retry = require('async-retry');

const binance_api = require('./binance_api');
const indicators = require('./indicators');

const { backtest } = require('./backtest');
const { global_logger, add_logger } = require('./logger');
const { Signaler } = require('./signaler');
const { Tracker } = require('./tracker');
const { Buyer } = require('./buyer');
const { Seller } = require('./seller');

const trade_type = {
	SPOT: "spot",
	FUTURE: "future",
}

const session_type = {
	BACKTEST: "backtest",
	LIVETEST: "livetest",
	TRADE: "trade",
}

const SESSION_TYPE = session_type.BACKTEST;
const TRADE_TYPE = trade_type.SPOT;

const LOG_DIR = "logs/normal";

const BALANCE_LIMIT = (SESSION_TYPE == session_type.LIVETEST) ? 1000 : 15;
const TRADING_CURRENCY = "USDT";

const COIN_PAIR = process.argv[2] || "BANDUSDT";
const TICK_ROUND = 30;
const CANDLE_INTERVAL = "15m";

const TAKE_PROFIT_MULTIPLIER = 1.025;
const PROFIT_MULTIPLIER = 1.025;
const STOP_LOSS_MULTIPLIER = 0.99;

function start_spot_trade(symbol, interval, logger, tracker, signaler) {
	let candles = null;

	const onStreamStart = async () => {
		candles = null; // Reset candles

		logger.info("Fetching candles for interval %s", interval);

		// Retry 10 times with 2 seconds intervals
		try{
			candles = await retry(async bail => await binance_api.fetch_candles(symbol, interval), {maxTimeout : 2000, retries: 10});
			signaler.set_candles(candles);
		} catch(error) {
			logger.error(error);
		}

		logger.info("Subscribed to %s candle stream", symbol);
	}
	
	binance_api.listen_candles_stream(symbol, interval, (open, close, low, high, event_time, isFinal) => {
		if(candles) {		
			signaler.feed(open, close, low, high, event_time, isFinal);
			tracker.feed(close);
		}
	}, onStreamStart);
};

function run(test=true) {
	if(!test) {
		global_logger.info("Authenticating to Binance...");
		binance_api.authenticate_user();
	}
	
	global_logger.info("Fetching exchange info from Binance...");
	binance_api.fetch_exchange_info()
	.then(
		(filters) => {
			const filter = filters[COIN_PAIR];

			global_logger.info("Starting the bot for %s...", COIN_PAIR);
	
			const pair_logger = add_logger(COIN_PAIR, LOG_DIR);
			const indicator = (open_prices, close_prices) => {
				const sma_indicator = indicators.sma_scalper_6_12(close_prices, filter.price_digit, pair_logger.info);
				const ema_indicator = indicators.ema_scalper_13_21(open_prices, close_prices, filter.price_digit, pair_logger.info);

				return sma_indicator || ema_indicator;
			}

			const buyer = new Buyer(TRADING_CURRENCY, BALANCE_LIMIT, filter, pair_logger, test);
			const seller = new Seller(pair_logger, test);

			const tracker = new Tracker(COIN_PAIR, STOP_LOSS_MULTIPLIER, PROFIT_MULTIPLIER, TAKE_PROFIT_MULTIPLIER, seller, pair_logger);
			const signaler = new Signaler(COIN_PAIR, TICK_ROUND, buyer, tracker, indicator, pair_logger);
			
			start_spot_trade(COIN_PAIR, CANDLE_INTERVAL, pair_logger, tracker, signaler);
		},
		(error) => global_logger.error(error)
	)
	.catch((error) => global_logger.error(error));
}

connectivity((online) => {
	if (online) {
		if(SESSION_TYPE == session_type.BACKTEST) {
			const profits = [1.015];
			const stops = [0.99];
			const pairs = ["BANDUSDT", "REEFUSDT", "LUNAUSDT", "MATICUSDT"];
			pairs.forEach((pair) => profits.forEach((profit) => stops.forEach((stop) => backtest(pair, CANDLE_INTERVAL, profit, profit, stop))));
			
		}
		else if(SESSION_TYPE == session_type.LIVETEST) run(true);
		else if(SESSION_TYPE == session_type.TRADE) run(false);
	} else {
		global_logger.error("Your internet connection is lost. Please connect to internet")
	}
})
