const binance_api = require('./binance_api');

const { test_logger } = require('./logger')

const retry = require('async-retry');
const { Indicator, signal_type } = require('./indicator');

const precise = (x) => parseFloat(x.toFixed(4));

const calculate_profit = (high_prices, low_prices, buying_price, buying_time, stop_loss_price, take_profit_price, logger) => {
	const size = Math.min(high_prices.length, low_prices.length);

	let profit = precise((stop_loss_price - buying_price) / buying_price);

	for(let i = 0; i < size; ++i) {
		const isProfit = high_prices[i] >= take_profit_price;
		const isLoss = low_prices[i] <= stop_loss_price;
		const selling_time = buying_time + i * 60000;

		if(isProfit && isLoss) {
			profit = precise((stop_loss_price - buying_price) / buying_price);
			break;
		} else if(isProfit) {
			profit = precise((take_profit_price - buying_price) / buying_price);
			// logger.info("Sold for price %f, profit % %f at %s", high_prices[i], profit * 100 ,new Date(selling_time).toLocaleString());
			break;
		} else if(isLoss) {
			profit = precise((stop_loss_price - buying_price) / buying_price);
			// logger.info("Sold for price %f, profit % %f at %s", low_prices[i], profit * 100, new Date(selling_time).toLocaleString());
			break;
		}
	}

	return profit;
}

const backtest = async (pair, interval, market, indicator_names, start_time, end_time, onProfit) => {
	const logger = test_logger(pair);

	const indicator = new Indicator(indicator_names, 6);
	
	const time = new Date(start_time).toLocaleDateString();
	console.log(time)
	let candles = null;

	await retry(async bail => await binance_api.fetch_candles(pair, interval, market, { limit : 1000, startTime: start_time }), { maxTimeout : 2000, retries: 10 })
	.then(
		(data) => candles = data,
		(error) => console.error(error)
	).catch((error) => console.error(error));

	let total_profit = 0;

	if(candles) {
		for(let i = 50; i < candles.open_prices.length - 1; ++i) {	
			const open_prices = candles.open_prices.slice(0, i + 1);
			const close_prices = candles.close_prices.slice(0, i + 1);
			const low_prices = candles.low_prices.slice(0, i + 1);
			const high_prices = candles.high_prices.slice(0, i + 1);
			const close_times = candles.close_times.slice(0, i + 1);

			const { signal, stop_loss_price, take_profit_price } = indicator.test(open_prices, close_prices, low_prices, high_prices);

			if(signal == signal_type.LONG) {
				const buying_price = close_prices.slice(-1)[0];
				const buying_time = close_times.slice(-1)[0] + 1;

				if(buying_time < end_time) {
					// logger.info("Long signal : price: %f time: %s", buying_price, new Date(buying_time).toLocaleString());

					let candles_1m = null;

					try{
						candles_1m = await retry(async bail => await binance_api.fetch_candles(pair, "1m", market, { limit : 1000, startTime : buying_time }), { maxTimeout : 2000, retries: 10 });
					} catch(error) {
						logger.error(pair + " " + error);
					}

					const profit = calculate_profit(candles_1m.high_prices, candles_1m.low_prices, buying_price, buying_time, stop_loss_price, take_profit_price, logger) + 0.002; // minus trading fee
					
					total_profit += profit;
					onProfit(profit);
				}
			}
		}

		(total_profit != 0) && logger.info("Total Profit : % %d", precise(100 * total_profit));
	}
}

exports.backtest = backtest