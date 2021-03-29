const { EMA, SMA } = require('technicalindicators');

const noop = () => {};

const ema_crossover_13_21 = (open_prices, close_prices, price_digit=4, onLog=()=>{}) => {
	const precise = (x) => parseFloat(x.toFixed(price_digit));

	const [prev_ema13, curr_ema13] = EMA.calculate({period: 13, values: close_prices}).slice(-2).map(precise);
	const [prev_ema21, curr_ema21] = EMA.calculate({period: 21, values: open_prices}).slice(-2).map(precise);

	const signal = curr_ema13 * 1.00025 > curr_ema21 && prev_ema13 <= prev_ema21 * 1.00025;
	
	if(signal) {
		onLog("current ema21 : %f and current ema13 : %f", curr_ema21, curr_ema13);
		onLog("previous ema21 : %f and previous ema13 : %f", prev_ema21, prev_ema13);
	}
	
	return signal;
}

const ema_crossover_6_12 = (open_prices, close_prices, price_digit=4, onLog=()=>{}) => {
	const precise = (x) => parseFloat(x.toFixed(price_digit));

	const [prev_ema12, curr_ema12] = EMA.calculate({period: 12, values: close_prices}).slice(-2).map(precise);
	const [prev_ema6, curr_ema6] = EMA.calculate({period: 6, values: close_prices}).slice(-2).map(precise);

	const signal = curr_ema6 > curr_ema12 * 1.00075 && prev_ema6 <= prev_ema12 * 1.00075;
	
	if(signal) {
		onLog("current ema12 : %f and current ema6 : %f", curr_ema12, curr_ema6);
		onLog("previous ema12 : %f and previous ema6 : %f", prev_ema12, prev_ema6);
	}
	
	return signal;
}

const sma_crossover_6_12 = (open_prices, close_prices, price_digit=4, onLog=()=>{}) => {
	const precise = (x) => parseFloat(x.toFixed(price_digit));

	const [prev_sma6, curr_sma6] = SMA.calculate({period: 6, values: close_prices}).slice(-2).map(precise);
	const [prev_sma12, curr_sma12] = SMA.calculate({period: 12, values: close_prices}).slice(-2).map(precise);

	const signal = curr_sma6 > curr_sma12 * 1.00075 && prev_sma6 * 1.00075 <= prev_sma12;
	
	if(signal) {
		onLog("current sma12 : %f and current sma6 : %f", curr_sma12, curr_sma6);
		onLog("previous sma12 : %f and previous sma6 : %f", prev_sma12, prev_sma6);
	}
	
	return signal;
}

const indicator_map = {
	"ema_13_21" : ema_crossover_13_21,
	"ema_6_12" : ema_crossover_6_12,
	"sma_6_12" : sma_crossover_6_12,
}

class Indicator {
    constructor(indicator_names, precision, onLog=noop) {
		this.precision = precision;
		this.onLog = onLog;

		this.indicator_function = (open_prices, close_prices) => {
			for(let name of indicator_names) {
				if(indicator_map[name] && indicator_map[name](open_prices, close_prices, this.precision, this.onLog)) return true;
			}

			return false;
		}
    }

    test(open_prices, close_prices) {
		return this.indicator_function(open_prices, close_prices);
    }
}

exports.Indicator = Indicator;