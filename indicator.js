const { EMA, SMA, MACD, RSI, HeikinAshi } = require('technicalindicators');

const signal_type = {
	SHORT: -1,
	LONG: 1,
	NONE: 0
}

if (!Array.prototype.last){
    Array.prototype.last = function(){
        return this[this.length - 1];
    };
};

const clamp = (number, min, max) => {
	const tmp_min = min ? min : number;
	const tmp_max = max ? max : number;
	return Math.max(tmp_min, Math.min(number, tmp_max));
}

const zip = (a, b, c, d) => a.map((k, i) => [k, b[i], c[i], d[i]]);

const rsi = (values) => RSI.calculate({period: 14, values}).slice(-1)[0];

class Indicator {
    constructor(indicator_names, precision) {
		this.precision = precision;

		this.indicator_map = {
			"ema_6_12" : this.ema_crossover_6_12,
			"sma_6_12" : this.sma_crossover_6_12,
			"heikinashi" : this.heikinashi,
		}

		this.indicator_function = (open_prices, close_prices, low_prices, high_prices) => {
			for(let name of indicator_names) {
 				if(this.indicator_map[name]) {
					const signal = this.indicator_map[name](open_prices, close_prices, low_prices, high_prices, this.precision);
					if(signal != signal_type.NONE) return signal;
				}
			}

			return signal_type.NONE;
		}	
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

		if( isRed(open, close) && isThick(open, high, low, close) && rsi(candle_list.close) <= 15 )
		{	
			const buying_price = close_prices.last();
			const low_price = low_prices.last();

			const stop_loss_multiplier = clamp(low_price / buying_price, 0.96, 0.99);
			const take_profit_multiplier = 1 + 2 * Math.abs(1 - stop_loss_multiplier);

			signal = signal_type.LONG;
			stop_loss_price = buying_price * stop_loss_multiplier;
			take_profit_price = buying_price * take_profit_multiplier;
		}
		
		return {
			signal,
			stop_loss_price,
			take_profit_price
		};
	}

    test(open_prices, close_prices, low_prices, high_prices) {
		return this.indicator_function(open_prices, close_prices, low_prices, high_prices);
    }
}

exports.Indicator = Indicator;
exports.signal_type = signal_type;