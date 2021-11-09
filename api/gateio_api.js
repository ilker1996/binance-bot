// ************* Functions for Binance API ******************* 
const Binance = require('node-binance-api');

const {market_type} = require('../utils');

let client = new Binance();

const authenticate_user = () => {}

const fetch_exchange_info = () => {}

const get_available_coins = (currency="USDT") => {}

const fetch_candles = (symbol, interval, market=market_type.SPOT, options={}) => {}

const listen_candles_stream = (symbol, interval, market=market_type.SPOT, onUpdate=()=>{}, onStreamStart=()=>{}) => {}

const listen_mini_ticker = (symbol, onUpdate=()=>{}, onStreamStart=()=>{}) => {}

const get_price = (symbol) => {}

const get_available_balance = (currency="USDT") => {}

// Calculates how much of the asset(coin) the user's balance can buy within the balance limit.
const calculate_buy_quantity = (buying_price, trading_currency="USDT", balance_limit=20, filter={}, test=true) => {}

// Spot market buy
const spot_market_buy = (symbol, price, quantity, onSuccess, onError) => {}

// Spot market sell
const spot_market_sell = (symbol, price, quantity, onSuccess, onError) => {}


exports.authenticate_user = authenticate_user;
exports.get_available_coins = get_available_coins;
exports.fetch_exchange_info = fetch_exchange_info;
exports.fetch_candles = fetch_candles;
exports.spot_market_buy = spot_market_buy;
exports.spot_market_sell = spot_market_sell;
exports.listen_candles_stream = listen_candles_stream;
exports.listen_mini_ticker = listen_mini_ticker;
exports.calculate_buy_quantity = calculate_buy_quantity;
