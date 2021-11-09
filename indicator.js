const { EMA, SMA, MACD, RSI, HeikinAshi } = require('technicalindicators');

const { signal_type, clamp } = require('./utils');

if (!Array.prototype.last){
	Array.prototype.last = function(){
		return this[this.length - 1];
	};
};

const zip = (a, b, c, d) => a.map((k, i) => [k, b[i], c[i], d[i]]);

const rsi = (values) => RSI.calculate({period: 14, values}).slice(-1)[0];

class Indicator {
	constructor(precision) {
		this.precision = precision;
	}

	ema_crossover_6_12(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_ema6, curr_ema6] = EMA.calculate({period: 6, values: close_prices})
										.slice(-2).map(precise);

		const [prev_ema12, curr_ema12] = EMA.calculate({period: 12, values: open_prices})
										.slice(-2).map(precise);

		let signal = signal_type.NONE;
		let stop_loss_price = 0;
		let take_profit_price = 0;

		if( curr_ema6 * 1.001 > curr_ema12
			&& prev_ema6 <= prev_ema12 * 1.001
			&& rsi(close_prices) >= 50)
		{
			const buying_price = close_prices.last();

			signal = signal_type.LONG;
			stop_loss_price = buying_price * 0.99;
			take_profit_price = buying_price * 1.015;
		} 
		else if(curr_ema12 > curr_ema6
			&& prev_ema12 <= prev_ema6) 
		{
			signal = signal_type.NONE;
		}
		
		return {
			signal,
			stop_loss_price,
			take_profit_price
		};
	}
	
	sma_crossover_6_12(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_sma6, curr_sma6] = SMA.calculate({period: 6, values: close_prices})
									.slice(-2).map(precise);
		const [prev_sma12, curr_sma12] = SMA.calculate({period: 12, values: open_prices})
									.slice(-2).map(precise);

		let signal = signal_type.NONE;
		let stop_loss_price = 0;
		let take_profit_price = 0;

		if( curr_sma6 * 1.001 > curr_sma12
			&& prev_sma6 * 1.001 <= prev_sma12
			&& rsi(close_prices) >= 50)
		{
			const buying_price = close_prices.last();
			
			signal = signal_type.LONG;
			stop_loss_price = buying_price * 0.99;
			take_profit_price = buying_price * 1.015;
		} 
		else if(curr_sma12 > curr_sma6
			&& prev_sma12 <= prev_sma6)
		{
			signal = signal_type.NONE;
		}
		
		return {
			signal,
			stop_loss_price,
			take_profit_price
		};
	}

	heikinashi(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const candle_list = HeikinAshi.calculate({open: open_prices, close: close_prices, low: low_prices, high: high_prices});

		const open = candle_list.open.last();
		const high = candle_list.high.last();
		const low = candle_list.low.last();
		const close = candle_list.close.last();

		const isThick = (open, high, low, close) => (close > open * 1.005 || open > close * 1.005) && (Math.abs(close - open) / Math.abs(high - low)) >= 0.5;
		const isRed = (open, close) => close < open;
		const isGreen = (open, close) => open < close;

		let signal = signal_type.NONE;
		let stop_loss_price = 0;
		let take_profit_price = 0;

		if( isRed(open, close) && isThick(open, high, low, close) && rsi(candle_list.close) <= 10 )
		{	
			const buying_price = close_prices.last();
			const low_price = low_prices.last();
			const high_price = high_prices.last();

			const stop_loss_multiplier = clamp(low_price / buying_price, 0.96, 0.99);
			const take_profit_multiplier = 1 + 2 * Math.abs(1 - stop_loss_multiplier);

			signal = signal_type.LONG;
			take_profit_price = clamp(high_price, buying_price * 1.01, buying_price * 1.04);
			stop_loss_price = clamp(low_price, buying_price * 0.96, buying_price * 0.99);
		}
		
		return {
			signal,
			stop_loss_price,
			take_profit_price
		};
	}

	test(open_prices, close_prices, low_prices, high_prices) {
		const result = this.heikinashi(open_prices, close_prices, low_prices, high_prices);
		return result;
	}
}

exports.Indicator = Indicator;
exports.signal_type = signal_type;