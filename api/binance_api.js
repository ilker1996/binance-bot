// ************* Functions for Binance API ******************* 
const Binance = require('node-binance-api');

const {market_type, clamp} = require('../utils');

let client = new Binance();

const authenticate_user = () => {
	const BINANCE_API_KEY = require("../binance_secrets.json");

	client = new Binance({
		APIKEY: BINANCE_API_KEY.api_key,
		APISECRET: BINANCE_API_KEY.api_secret
	});
}

const fetch_exchange_info = () => {
	return new Promise((resolve, reject) => {
		client.exchangeInfo((error, response) => {
			if (error) {
				return reject("Error occured fetching exchange info " + error);
			} else {
				let minimums = {};

				for (let obj of response.symbols) {
					let filters = { status: obj.status }
					for (let filter of obj.filters) {
						if (filter.filterType == "MIN_NOTIONAL") {
							filters.min_notional = Number(filter.minNotional);
						} else if (filter.filterType == "PRICE_FILTER") {
							filters.min_price = Number(filter.minPrice);
							filters.max_price = Number(filter.maxPrice);
							filters.price_digit = -1 * Math.log10(Number(filter.tickSize));			
						} else if (filter.filterType == "LOT_SIZE") {
							filters.quantity_digit = -Math.log10(Number(filter.stepSize));
							filters.min_quantity = Number(filter.minQty);
							filters.max_quantity = Number(filter.maxQty);
						}
					}
					
					filters.orderTypes = obj.orderTypes;
					filters.icebergAllowed = obj.icebergAllowed;
					minimums[obj.symbol] = filters;
				}

				return resolve(minimums);
			}
		})
	});
}

const get_available_coins = (currency="USDT") => {
	return new Promise((resolve, reject) => {
		client.prevDay(false, (error, prev_stats) => {
			if(error) {
				return reject("Error occured fetching previous day statistics " + error);
			} else {
				const pairs = prev_stats
							.filter(o => Number(o.quoteVolume) > 1000000)
							.map(o => o.symbol)
							.filter(s => s.endsWith(currency))
							.map(s => s.replace(currency, ""));
	
				return resolve(pairs);
			}	
		});
	});
}

const fetch_candles = (symbol, interval, market=market_type.SPOT, options={}) => {
	if(market == market_type.SPOT) {
		return new Promise((resolve, reject) => {
			client.candlesticks(symbol, interval, (error, candles, symbol) => {
				if (error) {
					return reject("Error occured fetching candles " + error);
				} else {
					const new_candles = {
						open_prices : [],
						close_prices : [],
						low_prices : [],
						high_prices : [],
						open_times : [],
						close_times : [],
					}
					
					const current_time = Date.now();
					const latest_close_time = candles[candles.length - 1][6];
				
					// See if latest candle is closed already or not
					const size = (current_time < latest_close_time) ? candles.length - 1 : candles.length;
				
					for(let i = 0; i < size; ++i) {
						const [open_time, open, high, low, close, volume, close_time, asset_volume, trades, buy_base_volume, buy_asset_volume, ignored] = candles[i];
						
						new_candles.open_prices[i] = Number(open);
						new_candles.close_prices[i] = Number(close);
						new_candles.low_prices[i] = Number(low);
						new_candles.high_prices[i] = Number(high);
						new_candles.open_times[i] = open_time;
						new_candles.close_times[i] = close_time;
					}

					return resolve(new_candles);
				}
			}, options);
		});
	}
	else if(market == market_type.FUTURES) {
		return new Promise((resolve, reject) => {
			client.futuresCandles(symbol, interval, options)
			.then(
				(candles) => {
					const new_candles = {
						open_prices : [],
						close_prices : [],
						low_prices : [],
						high_prices : [],
						open_times : [],
						close_times : [],
					}
					
					const current_time = Date.now();
					const latest_close_time = candles[candles.length - 1][6];
				
					// See if latest candle is closed already or not
					const size = (current_time < latest_close_time) ? candles.length - 1 : candles.length;
				
					for(let i = 0; i < size; ++i) {
						const [open_time, open, high, low, close, volume, close_time, asset_volume, trades, buy_base_volume, buy_asset_volume, ignored] = candles[i];
						
						new_candles.open_prices[i] = Number(open);
						new_candles.close_prices[i] = Number(close);
						new_candles.low_prices[i] = Number(low);
						new_candles.high_prices[i] = Number(high);
						new_candles.open_times[i] = open_time;
						new_candles.close_times[i] = close_time;
					}
	
					return resolve(new_candles);
				},
				(error) => {
					return reject("Error occured fetching candles : " + error);
				}
			).catch((error) => {
				return reject("Error occured fetching candles : " + error);
			});
		});
	}
	else {
		return reject("Error recognizing the market " + market);
	}
}

const listen_candles_stream = (symbol, interval, market=market_type.SPOT, onUpdate=()=>{}, onStreamStart=()=>{}) => {
	const ticker = (tick) => {
		const { 
			E: event_time,
			e: event_type,
			s: symbol,
			k: { 
				o: open,
				c: close,
				l: low,
				h: high,
				x: isFinal,
				v: volume,
				n: trades,
				i: interval,
				q: quoteVolume,
				V: buyVolume,
				Q: quoteBuyVolume,
			}
		} = tick;

		onUpdate(parseFloat(open), parseFloat(close), parseFloat(low), parseFloat(high), event_time, isFinal);
	};

	if(market == market_type.SPOT) {
		client.websockets.candlesticks(symbol, interval, ticker, onStreamStart);
	} 
	else if(market == market_type.FUTURES) {
		client.futuresCandlesticks(symbol, interval, ticker, onStreamStart);
	}
}

const listen_mini_ticker = (symbol, onUpdate=()=>{}, onStreamStart=()=>{}) => {
	client.websockets.miniTicker(markets => {
		const mini_tick = markets[symbol];
		if(mini_tick) onUpdate(mini_tick);
		
	}, onStreamStart);
}

const get_price = (symbol) => {
	return new Promise((resolve, reject) => {
		client.prices(symbol, (error, prices) => {
			if (error) {
				return reject(error);
			} else {
				const result = parseFloat(prices[symbol]);
				return resolve(result);
			}
		});
	});
}

const get_available_balance = (currency="USDT") => {
	return new Promise((resolve, reject) => {
		client.balance((error, balances) => {
			if (error) {
				return reject(error);
			} else {
				const result = parseFloat(balances[currency].available);
				return resolve(result);
			}
		});
	});
}

// Calculates how much of the asset(coin) the user's balance can buy within the balance limit.
const calculate_buy_quantity = (buying_price, trading_currency="USDT", balance_limit=20, filter={}, test=true) => {
	// ****** FILTERS *******
	// 	status: 'TRADING',
	// 	min_price: 0.01,
	// 	max_price: 1000000,
	// 	price_digit: 2,
	// 	quantity_digit: 6,
	// 	min_quantity: 0.000001,
	// 	max_quantity: 9000,
	// 	min_notional: 10,
	// 	orderTypes: [
	// 	  'LIMIT',
	// 	  'LIMIT_MAKER',
	// 	  'MARKET',
	// 	  'STOP_LOSS_LIMIT',
	// 	  'TAKE_PROFIT_LIMIT'
	// 	],
	// 	icebergAllowed: true
	// }

	return new Promise((resolve, reject) => {
		let buying_balance = balance_limit;

		if(!test) {
			get_available_balance(trading_currency).then(
				(value) => {
					buying_balance = clamp(value, 0, balance_limit);
				},
				(error) => {
					return reject("Error occured fetching the available balance " + error);
				}
			).catch((error) => {
				return reject("Error occured fetching the available balance " + error);
			});
		}
		
		const min_balance = (filter?.min_notional != undefined) ? Number(filter.min_notional) : balance_limit;
		if(buying_balance >= min_balance) {
			const coin_price = clamp(buying_price, Number(filter.min_price), Number(filter.max_price));
			const quantity = clamp(buying_balance / coin_price, Number(filter.min_quantity), Number(filter.max_quantity));
			
			console.log(buying_balance / coin_price, Number(filter.min_quantity), Number(filter.max_quantity));
			const price_digit = (filter?.price_digit != undefined) ? Number(filter.price_digit) : 8;
			const quantity_digit = (filter?.quantity_digit != undefined) ? Number(filter.quantity_digit) : 8;

			console.log("Balance : %d, Price : %d, Quantity : %d ", buying_balance, coin_price, quantity);
			console.log("Calculated price : %d, calculated quantity : %d ", parseFloat(coin_price.toFixed(price_digit)), parseFloat(quantity.toFixed(quantity_digit)));

			return resolve({
				price : parseFloat(coin_price.toFixed(price_digit)),
				quantity : parseFloat(quantity.toFixed(quantity_digit))
			});
		} else {
			return reject(buying_balance + " " + trading_currency + " " + "is below minimum balance to purchase");
		}
	});	
}

// Spot market buy
const spot_market_buy = (symbol, price, quantity, onSuccess, onError) => {
	client.marketBuy(symbol, quantity, (error, response) => {
		if(error) {
			onError(error.body);
		} else if(response) {
			// Sample response
			// {
			// 	symbol: 'OCEANUSDT',
			// 	orderId: 1,
			// 	orderListId: -1,
			// 	clientOrderId: 'asg7asg9ag9',
			// 	transactTime: 1,
			// 	price: '0.00000000',
			// 	origQty: '8.00000000',
			// 	executedQty: '8.00000000',
			// 	cummulativeQuoteQty: '10.69200000',
			// 	status: 'FILLED',
			// 	timeInForce: 'GTC',
			// 	type: 'MARKET',
			// 	side: 'BUY',
			// 	fills: [
			// 	  {
			// 		price: '1.33650000',
			// 		qty: '8.00000000',
			// 		commission: '0.00800000',
			// 		commissionAsset: 'OCEAN',
			// 		tradeId: 1
			// 	  }
			// 	]
			// }

			let actual_buying_price = Number(price);
			let actual_quantity = Number(quantity);

			if(response?.status === "FILLED" && Number(response?.fills[0]?.qty) >= Number(quantity)) {
				actual_buying_price = Number(response?.fills[0]?.price) || Number(price);
				actual_quantity = Number(response?.fills[0]?.qty) || Number(quantity);
			}

			onSuccess(actual_buying_price, actual_quantity);
		}
	});
}

// Spot market sell
const spot_market_sell = (symbol, price, quantity, onSuccess, onError) => {
	client.marketSell(symbol, quantity, (error, response) => {
		if(error) {
			onError(error);
		} else if(response) {
			// Sample response
			// {
			// 	symbol: 'WINUSDT',
			// 	orderId: 16632,
			// 	orderListId: -1,
			// 	clientOrderId: '125512sgdgfs',
			// 	transactTime: 153gsd,
			// 	price: '0.00000000',
			// 	origQty: '7500.00000000',
			// 	executedQty: '7500.00000000',
			// 	cummulativeQuoteQty: '10.13700000',
			// 	status: 'FILLED',
			// 	timeInForce: 'GTC',
			// 	type: 'MARKET',
			// 	side: 'SELL',
			// 	fills: [
			// 	  [Object: null prototype] {
			// 		price: '0.00135160',
			// 		qty: '7500.00000000',
			// 		commission: '0.01013700',
			// 		commissionAsset: 'USDT',
			// 		tradeId: 215125
			// 	  }
			// 	]
			//}

			let actual_selling_price = Number(price);
			let actual_quantity = Number(quantity);

			if(response?.status === "FILLED" && Number(response?.fills[0]?.qty) >= Number(quantity)) {
				actual_selling_price = Number(response?.fills[0]?.price) || Number(price);
				actual_quantity = Number(response?.fills[0]?.qty) || Number(quantity);
			}

			onSuccess(actual_selling_price, actual_quantity);	
		}
	});
}

exports.market_type = market_type;

exports.authenticate_user = authenticate_user;

exports.get_available_coins = get_available_coins;
exports.fetch_exchange_info = fetch_exchange_info;
exports.fetch_candles = fetch_candles;

exports.spot_market_buy = spot_market_buy;
exports.spot_market_sell = spot_market_sell;

exports.listen_candles_stream = listen_candles_stream;
exports.listen_mini_ticker = listen_mini_ticker;

exports.calculate_buy_quantity = calculate_buy_quantity;
