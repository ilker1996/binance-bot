const binance_api = require('./binance_api');

const { test_logger, global_logger } = require('./logger')

const retry = require('async-retry');
const { Indicator } = require('./indicator');

const precise = (x) => parseFloat(x.toFixed(4));

const calculate_profit = (high_prices, low_prices, buying_price, buying_time, take_profit_multiplier, profit_multiplier, stop_loss_multipler, logger) => {

	let lower_price_limit = buying_price * stop_loss_multipler;
	let higher_price_limit = buying_price * profit_multiplier;

	const size = Math.min(high_prices.length, low_prices.length);

	let profit = 0;

	for(let i = 0; i < size; ++i) {
		const isProfit = high_prices[i] >= higher_price_limit;
		const isLoss = low_prices[i] <= lower_price_limit;
		const selling_time = buying_time + i * 60000;

		if(isProfit && isLoss) {
			profit = 0;
			logger.info("Risky selling at %s", new Date(selling_time).toLocaleString());
			break;
		} else if(isProfit) {
			if(higher_price_limit >= buying_price * take_profit_multiplier) {
				profit = precise(take_profit_multiplier - 1);
				logger.info("Sold for price %f, profit % %f at %s", high_prices[i], profit * 100 ,new Date(selling_time).toLocaleString());
				break;
			} else {
				lower_price_limit = higher_price_limit * stop_loss_multipler;
				higher_price_limit = higher_price_limit * ((1 + profit_multiplier) * 0.5);
				profit = precise((((lower_price_limit + higher_price_limit) * 0.5) / buying_price) - 1);
			}
		} else if(isLoss) {
			profit = precise((lower_price_limit / buying_price) - 1);
			logger.info("Sold for price %f, profit % %f at %s", low_prices[i], profit * 100, new Date(selling_time).toLocaleString());
			break;
		}
	}

	return profit;
}

const search_signal = async (pair, interval, prev_open_prices, prev_close_prices, start_time, indicator, onSignal) => {

	let candles = null;

	try{
		candles = await retry(async bail => await binance_api.fetch_candles(pair, "1m", { startTime : start_time }), {maxTimeout : 2000, retries: 10});
	} catch(error) {
		global_logger.error(pair + " " + error);
	}

	let length = parseInt(interval.replace("m", ""));

	if(!candles || candles.close_prices.length < length) return 0;

	const open_price = candles.open_prices[0];

	for(let i = 0; i < length; ++i) {
		const average_price = (candles.close_prices[i] + candles.open_prices[i] + candles.low_prices[i] + candles.high_prices[i]) * 0.25;

		const open_prices = prev_open_prices.concat(open_price).slice(1);
		const close_prices = prev_close_prices.concat(average_price).slice(1);

		const signal = indicator.test(open_prices, close_prices);

		if(signal) return onSignal(candles.high_prices.slice(i + 1), candles.low_prices.slice(i + 1), average_price, candles.close_times[i]);
	}

	return 0;
}

const backtest = async (pair, interval, indicator_names, take_profit_multiplier, profit_multiplier, stop_loss_multipler) => {
	const logger = test_logger(pair);

	const indicator = new Indicator(indicator_names, 6);

	let candles = null;

	try{
		candles = await retry(async bail => await binance_api.fetch_candles(pair, interval, {limit : 1000}), {maxTimeout : 2000, retries: 10});
	} catch(error) {
		global_logger.error(pair + " " + error);
	}
	
	let win = 0;
	let loss = 0;
	let total_profit = 0;
	let balance = 100;

	if(candles) {
		for(let i = 900; i < candles.open_prices.length - 1; ++i) {
			const prev_open_prices = candles.open_prices.slice(0, i);
			const prev_close_prices = candles.close_prices.slice(0, i);
			
			const profit = await search_signal(pair, interval, prev_open_prices, prev_close_prices, candles.open_times[i], indicator, 
				(high_prices, low_prices, buying_price, buying_time) => {

					logger.info("Buying price : %f at %s", buying_price, new Date(buying_time).toLocaleString());

					const profit = calculate_profit(high_prices, low_prices, buying_price, buying_time, take_profit_multiplier, profit_multiplier, stop_loss_multipler, logger);
	
					return profit;
			});
			
			if(profit > 0) win++;
			else if(profit < 0) loss++;
	
			total_profit += profit;
		}

		balance += balance * total_profit;
		logger.info("Win : %d , Loss : %d, Balance : %d, profit multiplier: %d, stop multiplier : %d", win, loss, precise(balance), take_profit_multiplier, stop_loss_multipler);
	}
}

exports.backtest = backtest