const { EMA, SMA, MACD, RSI, HeikinAshi } = require('technicalindicators');

const signal_type = {
	SHORT: -1,
	LONG: 1,
	NONE: 0
}

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

		const { 
			open, high, low, close 
		} = {
			open: candle_list.open.map(precise),
			high: candle_list.high.map(precise),
			low: candle_list.low.map(precise),
			close: candle_list.close.map(precise)
		};

		const [prev_open, curr_open] = open.slice(-2);
		const [prev_high, curr_high] = high.slice(-2);
		const [prev_low, curr_low] = low.slice(-2);
		const [prev_close, curr_close] = close.slice(-2);

		const curr_open_to_close = Math.abs(curr_close - curr_open);
		const curr_low_to_high = Math.abs(curr_high - curr_low);
		const is_curr_thick = (curr_open_to_close / curr_low_to_high) >= 0.5;
		
		const prev_open_to_close =  Math.abs(prev_open - prev_close);
		const prev_low_to_high = Math.abs(prev_high - prev_low);
		const is_prev_thin = (prev_open_to_close / prev_low_to_high) <= 0.25;

		let signal = signal_type.NONE;

		if( curr_close > curr_open 
			&& prev_close < prev_open
			&& is_curr_thick
			&& is_prev_thin)
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