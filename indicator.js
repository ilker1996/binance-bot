const { EMA, SMA, RSI } = require('technicalindicators');

const signal_type = {
	SHORT: -1,
	LONG: 1,
	NONE: 0
}

const rsi = (period, values) => RSI.calculate({period, values}).slice(-1)[0];

class Indicator {
    constructor(indicator_names, precision) {
		this.precision = precision;

		this.indicator_map = {
			"ema_13_21" : this.ema_crossover_13_21,
			"ema_6_12" : this.ema_crossover_6_12,
			"sma_6_12" : this.sma_crossover_6_12,
		}

		this.indicator_function = (open_prices, close_prices) => {
			for(let name of indicator_names) {
 				if(this.indicator_map[name]) {
					const signal = this.indicator_map[name](open_prices, close_prices, this.precision);
					if(signal == signal_type.LONG || signal == signal_type.SHORT) return signal;
				}
			}

			return signal_type.NONE;
		}	
    }

	ema_crossover_13_21(open_prices, close_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_ema13, curr_ema13] = EMA.calculate({period: 13, values: close_prices})
										.slice(-2).map(precise);
		const [prev_ema21, curr_ema21] = EMA.calculate({period: 21, values: open_prices})
										.slice(-2).map(precise);
		
		let signal = signal_type.NONE;

		if(curr_ema13 * 1.001 > curr_ema21 
			&& prev_ema13 <= prev_ema21 * 1.001 
			&& rsi(14, close_prices) >= 50) 
		{
			signal = signal_type.LONG;
		} 
		else if(curr_ema21 > curr_ema13 
			&& prev_ema21 <= prev_ema13) 
		{
			signal = signal_type.SHORT;
		}
		
		return signal;
	}
	
	ema_crossover_6_12(open_prices, close_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_ema12, curr_ema12] = EMA.calculate({period: 12, values: close_prices})
										.slice(-2).map(precise);
		const [prev_ema6, curr_ema6] = EMA.calculate({period: 6, values: close_prices})
										.slice(-2).map(precise);
		
		let signal = signal_type.NONE;

		if(curr_ema6 * 1.001 > curr_ema12
			&& prev_ema6 <= prev_ema12 * 1.001
			&& rsi(14, close_prices) >= 50) 
		{
			signal = signal_type.LONG;
		} 
		else if(curr_ema12 > curr_ema6 
			&& prev_ema12 <= prev_ema6) 
		{
			signal = signal_type.SHORT;
		}
		
		return signal;
	}
	
	sma_crossover_6_12(open_prices, close_prices, price_digit) {
		const precise = (number) => parseFloat(number.toFixed(price_digit));

		const [prev_sma6, curr_sma6] = SMA.calculate({period: 6, values: close_prices})
									.slice(-2).map(precise);
		const [prev_sma12, curr_sma12] = SMA.calculate({period: 12, values: close_prices})
									.slice(-2).map(precise);

		let signal = signal_type.NONE;

		if(curr_sma6 * 1.001 > curr_sma12
			&& prev_sma6 * 1.001 <= prev_sma12
			&& rsi(14, close_prices) >= 50) 
		{
			signal = signal_type.LONG;
		} 
		else if(curr_sma12 > curr_sma6 
			&& prev_sma12 <= prev_sma6) 
		{
			signal = signal_type.SHORT;
		}
		
		return signal;
	}
	
    test(open_prices, close_prices) {
		return this.indicator_function(open_prices, close_prices);
    }
}

exports.Indicator = Indicator;
exports.signal_type = signal_type;