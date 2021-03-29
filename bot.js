const connectivity = require('connectivity');
const retry = require('async-retry');

const binance_api = require('./binance_api');
const { backtest } = require('./backtest');
const { global_logger, add_logger } = require('./logger');
const { Signaler } = require('./signaler');
const { Indicator } = require('./indicator');
const { Tracker } = require('./tracker');
const { Buyer } = require('./buyer');
const { Seller } = require('./seller');
const config = require("./config.json");

const trade_type = {
	SPOT: "spot",
	FUTURE: "future",
}

const session_type = {
	BACKTEST: "backtest",
	LIVETEST: "livetest",
	TRADE: "trade",
}

function start_spot_trade(pair, interval, logger, tracker, signaler) {
	let candles = null;

	const onStreamStart = async () => {
		candles = null; // Reset candles

		logger.info("Fetching candles for interval %s", interval);

		// Retry 10 times with 2 seconds intervals
		try {
			candles = await retry(async bail => await binance_api.fetch_candles(pair, interval), {maxTimeout : 2000, retries: 10});
			signaler.set_candles(candles);
		} catch(error) {
			logger.error(error);
		}

		logger.info("Subscribed to %s candle stream", pair);
	}

	binance_api.listen_candles_stream(pair, interval, (open, close, low, high, event_time, isFinal) => {
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
			const coins = config.coins;
			
			for(let coin of coins) 
			{	
				const pair_name = coin.name.concat(config.currency);

				global_logger.info("Starting the bot for %s...", pair_name);

				const filter = filters[pair_name];

				const pair_logger = add_logger(pair_name, config.log_dir);

				const buyer = new Buyer(config.currency, config.balance_limit, filter, pair_logger, test);
				const seller = new Seller(pair_logger, test);
	
				const tracker = new Tracker(pair_name, config.stop_loss_multiplier, coin.profit_multiplier, coin.profit_multiplier, seller, pair_logger);

				const indicator = new Indicator(coin.indicator_names, filter.price_digit, pair_logger.info);
				const signaler = new Signaler(pair_name, config.tick_round, buyer, tracker, indicator, pair_logger);
				
				if(config.trade_type === trade_type.SPOT) start_spot_trade(pair_name, config.interval, pair_logger, tracker, signaler);
			}
		},
		(error) => global_logger.error(error)
	)
	.catch((error) => global_logger.error(error));
}

connectivity((online) => {
	if (online) {
		if(config.session_type == session_type.BACKTEST) {
			const profits = [1.01, 1.015, 1.02, 1.025];

			const test = async (profit) => {
				const pairs = config.coins.map((coin) => coin.name.concat(config.currency));

				for(let pair of pairs){
					console.log(pair);
					await backtest(pair, config.interval, profit, profit, config.stop_loss_multiplier);
				}
			};

			profits.forEach(test);
		}
		else if(config.session_type == session_type.LIVETEST) run(true);
		else if(config.session_type == session_type.TRADE) run(false);
	} else {
		global_logger.error("Your internet connection is lost. Please connect to internet")
	}
})
