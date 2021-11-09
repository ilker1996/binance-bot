const { Indicator } = require("./indicator");
const { signal_type } = require('./utils');


if(!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    }
}
class Signaler {
    constructor(pair, tick_round, price_digit, tracker, logger) {
        this.pair = pair;

        this.tracker = tracker;
        this.logger = logger;

        this.indicator = new Indicator(price_digit);
       
        this.tick_round = tick_round;
        this.tick_count = 0;
        this.tick_sum = 0;

        this.skip_long_signal = false;
        this.skip_short_signal = false;
        
        this.candles = {};
    }

    set_candles(candles) {
        this.candles = candles;
    }

    add_candle(open, close, low, high, event_time) {
        this.candles.open_prices.shift();
        this.candles.close_prices.shift();
        this.candles.low_prices.shift();
        this.candles.high_prices.shift();
        this.candles.open_times.shift();
        this.candles.close_times.shift();
        
        this.candles.open_prices.push(Number(open));
        this.candles.close_prices.push(Number(close));
        this.candles.low_prices.push(Number(low));
        this.candles.high_prices.push(Number(high));
        this.candles.open_times.push(this.candles.close_times.last() + 1);
        this.candles.close_times.push(event_time);
    }

    reset() {
        this.tick_count = 0;
        this.tick_sum = 0;
        this.skip_long_signal = false;
        this.skip_short_signal = false;
    }

    feed(open, close, low, high, event_time, isFinal) {
        this.tick_count += 1;
        this.tick_sum += close;

        if(this.tick_count == this.tick_round) {
            const average = this.tick_sum / this.tick_count;

            this.tick_count = 0;
            this.tick_sum = 0;

            const open_prices = this.candles.open_prices.concat(open).slice(1);
            const close_prices = this.candles.close_prices.concat(average).slice(1);
            const low_prices = this.candles.low_prices.concat(low).slice(1);
            const high_prices = this.candles.high_prices.concat(high).slice(1);

            const {
                signal,
                stop_loss_price,
                take_profit_price
            } = this.indicator.test(open_prices, close_prices, low_prices, high_prices);

            if(!this.skip_long_signal && signal == signal_type.LONG) {
                this.tracker.long_signal(close, stop_loss_price, take_profit_price);
                this.skip_long_signal = true;
            } else if(!this.skip_short_signal && signal == signal_type.SHORT) {
                this.tracker.short_signal(close);
                this.skip_short_signal = true;
            }
        }

        if(isFinal) {
            this.add_candle(open, close, low, high, event_time);
            this.reset();
        }
    }
}

exports.Signaler = Signaler;