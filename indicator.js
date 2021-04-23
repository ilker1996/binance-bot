const { EMA, SMA, MACD, RSI, HeikinAshi } = require('technicalindicators');

const signal_type = {
	SHORT: -1,
	LONG: 1,
	NONE: 0
}

const zip = (a, b, c, d) => a.map((k, i) => [k, b[i], c[i], d[i]]);

const rsi = (values) => RSI.calculate({period: 14, values}).slice(-1)[0];

const macd_momentum = (values) => MACD.calculate({fastPeriod: 12, slowPeriod: 26, signalPeriod: 9, values}).slice(-1)[0].histogram;

class Indicator {
    constructor(indicator_names, precision) {
		this.precision = precision;

		this.indicator_map = {
			"ema_13_21" : this.ema_crossover_13_21,
			"ema_6_12" : this.ema_crossover_6_12,
			"sma_6_12" : this.sma_crossover_6_12,
			"candlestick_pattern" : this.candlestick_pattern,
			"heikin_ashi" : this.heikin_ashi,
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

	ema_crossover_13_21(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_ema13, curr_ema13] = EMA.calculate({period: 13, values: close_prices})
										.slice(-2).map(precise);
		const [prev_ema21, curr_ema21] = EMA.calculate({period: 21, values: open_prices})
										.slice(-2).map(precise);

		let signal = signal_type.NONE;

		if( curr_ema13 * 1.001 > curr_ema21 
			&& prev_ema13 <= prev_ema21 * 1.001
			&& rsi(close_prices) >= 50)
		{
			signal = signal_type.LONG;
		} 
		else if(curr_ema21 > curr_ema13
			&& prev_ema21 <= prev_ema13)
		{
			signal = signal_type.NONE;
		}
		
		return signal;
	}
	
	ema_crossover_6_12(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_ema6, curr_ema6] = EMA.calculate({period: 6, values: close_prices})
										.slice(-2).map(precise);

		const [prev_ema12, curr_ema12] = EMA.calculate({period: 12, values: open_prices})
										.slice(-2).map(precise);

		let signal = signal_type.NONE;

		if( curr_ema6 * 1.001 > curr_ema12
			&& prev_ema6 <= prev_ema12 * 1.001
			&& rsi(close_prices) >= 50)
		{
			signal = signal_type.LONG;
		} 
		else if(curr_ema12 > curr_ema6
			&& prev_ema12 <= prev_ema6) 
		{
			signal = signal_type.NONE;
		}
		
		return signal;
	}
	
	sma_crossover_6_12(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_sma6, curr_sma6] = SMA.calculate({period: 6, values: close_prices})
									.slice(-2).map(precise);
		const [prev_sma12, curr_sma12] = SMA.calculate({period: 12, values: open_prices})
									.slice(-2).map(precise);

		let signal = signal_type.NONE;

		if( curr_sma6 * 1.001 > curr_sma12
			&& prev_sma6 * 1.001 <= prev_sma12
			&& rsi(close_prices) >= 50)
		{
			signal = signal_type.LONG;
		} 
		else if(curr_sma12 > curr_sma6
			&& prev_sma12 <= prev_sma6)
		{
			signal = signal_type.NONE;
		}
		
		return signal;
	}
	
	candlestick_pattern(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		let signal = signal_type.NONE;

		const [prev_open, curr_open] = open_prices.slice(-2).map(precise);
		const [prev_close, curr_close] = close_prices.slice(-2).map(precise);
		const [prev_low, curr_low] = low_prices.slice(-2).map(precise);
		const [prev_high, curr_high] = high_prices.slice(-2).map(precise);

		if( curr_open > prev_close
			&& curr_close > prev_open
			&& curr_close > curr_open
			&& prev_open > prev_close
			&& curr_low > prev_low
			&& curr_high > prev_high)
		{
			signal = signal_type.LONG;
		}
		
		return signal;
	}

	heikin_ashi(open_prices, close_prices, low_prices, high_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const candle_list = HeikinAshi.calculate({open: open_prices, close: close_prices, low: low_prices, high: high_prices});

		const {open, high, low , close} = candle_list;

		const candles = zip(open.slice(-4), high.slice(-4), low.slice(-4), close.slice(-4)).map(subarray => subarray.map(precise));

		const isThin = (open, high, low, close) => (Math.abs(close - open) / Math.abs(high - low)) <= 0.3;
		const isThick = (open, high, low, close) => {
			const high_momentum = close > open * 1.005 || open > close * 1.005;
			return high_momentum && (Math.abs(close - open) / Math.abs(high - low)) >= 0.6;
		}

		const isGreen = (open, high, low, close) => close > open;
		const isRed = (open, high, low, close) => close < open;

		let signal = signal_type.NONE;

		const bullish_candles = candles.map((array) => isGreen(...array) && isThick(...array));
		const bearish_candles = candles.map((array) => isRed(...array) && isThin(...array));

		if( bearish_candles[2] && bullish_candles[3] && rsi(close_prices) >= 50)
		{
			signal = signal_type.LONG;
		}
		
		return signal;
	}

    test(open_prices, close_prices, low_prices, high_prices) {
		return this.indicator_function(open_prices, close_prices, low_prices, high_prices);
    }
}

exports.Indicator = Indicator;
exports.signal_type = signal_type;