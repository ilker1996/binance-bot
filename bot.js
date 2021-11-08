const connectivity = require('connectivity');
const retry = require('async-retry');

const api = require('./binance_api');

const { backtest } = require('./backtest');
const { add_logger } = require('./logger');
const { Signaler } = require('./signaler');
const { Tracker } = require('./tracker');
const { Buyer } = require('./buyer');
const { Seller } = require('./seller');

const config = require("./config.json");

const session_type = {
	BACKTEST: "backtest",
	LIVETEST: "livetest",
	TRADE: "trade",
}

const global_logger = add_logger("GLOBAL", config.log_dir + "_" + config.indicator_names.join('-'));

function start_trade(pair, interval, logger, tracker, signaler, market_type) {
	let candles = null;

	const onStreamStart = async () => {
		candles = null; // Reset candles

		logger.info("Fetching candles for interval %s", interval);

		// Retry 10 times with 2 seconds intervals
		try {
			candles = await retry(async bail => await api.fetch_candles(pair, interval), {maxTimeout : 2000, retries: 10});
			signaler.set_candles(candles);
		} catch(error) {
			logger.error(error);
		}

		logger.info("Subscribed to %s candle stream", pair);
	}

	api.listen_candles_stream(pair, interval, market_type, (open, close, low, high, event_time, isFinal) => {
		if(candles) {
			signaler.feed(open, close, low, high, event_time, isFinal);
			tracker.feed(close);
		}
	}, onStreamStart);
};

function run(test=true) {
	let allocated_balance = 0;
	let trading_fee = 0;
	let total_profit = 0;

	if(!test) {
		global_logger.info("Authenticating to Binance...");
		api.authenticate_user();
	}
	
	global_logger.info("Fetching exchange info from Binance...");
	api.fetch_exchange_info()
	.then(
		(filters) => {
			for(let coin of config.coins)
			{
				const pair_name = coin.concat(config.currency);

				const filter = filters[pair_name];

				const pair_logger = add_logger(pair_name, config.log_dir + "_" + config.indicator_names.join('-'));

				const buyer = new Buyer(config.currency, config.balance_limit, filter, pair_logger, test);
				const seller = new Seller(pair_logger, test);
				
				const buy_callback = (price, quantity) => {
					allocated_balance += price * quantity;
					trading_fee += price * quantity * 0.001;

					pair_logger.info("Market Buy - price : %f , quantity : %f", price, quantity);
					
					global_logger.info("Allocated balance : %d", allocated_balance);
					global_logger.info("Trading Fee : %d", trading_fee);
				}

				const sell_callback = (price, quantity, profit) => {
					allocated_balance -= price * quantity - profit;
					trading_fee += price * quantity * 0.001;
					total_profit += profit;

					pair_logger.info("Market Sell - price : %f , quantity : %f", price, quantity);

					global_logger.info("Allocated balance : %d", allocated_balance);
					global_logger.info("Trading Fee : %d", trading_fee);
					global_logger.info("Total profit : %d", total_profit);
				}

				const tracker = new Tracker(pair_name, buyer, seller, pair_logger, buy_callback, sell_callback);

				const signaler = new Signaler(pair_name, config.tick_round, config.indicator_names, filter.price_digit, tracker, pair_logger);
				
				start_trade(pair_name, config.interval, pair_logger, tracker, signaler, config.market_type);
			}
		},
		(error) => global_logger.error(error)
	)
	.catch((error) => global_logger.error(error));
}

connectivity((online) => {
	if (online) {
		if(config.session_type == session_type.BACKTEST) {

			let total_profit = 0;
			let signal_count = 0;

			const onProfit = (profit) =>  {
				total_profit += profit;
				signal_count++;
			}

			const test = async () => {
				const coins = config.coins;

				for(let coin of coins) 
				{
					const pair_name = coin.concat(config.currency);
					console.log(pair_name);

					const day_in_ms = 86400000 * 3; // 3 day in between

					let start_time = new Date("01/08/2020 03:00:00").getTime();
					let current_time = new Date("05/01/2021 03:00:00").getTime();

					while(start_time < current_time) {
						const end_time = start_time + day_in_ms;
						await backtest(pair_name, config.interval, config.market_type, config.indicator_names, start_time, end_time, onProfit);
						start_time = end_time;
					}
				}

				global_logger.info("Total Profit : % %d , Signal Count : %d, Average Profit : % %d", 100 * total_profit, signal_count, 100 * total_profit / signal_count);
			};
			
			test();
		}
		else if(config.session_type == session_type.LIVETEST) run(true);
		else if(config.session_type == session_type.TRADE) run(false);
	} else {
		global_logger.error("Your internet connection is lost. Please connect to internet")
	}
})
