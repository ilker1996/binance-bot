const { Indicator, signal_type } = require("./indicator");

class Signaler {
    constructor(pair, tick_round, indicator_names, price_digit, tracker, logger) {
        this.pair = pair;

        this.tracker = tracker;
        this.logger = logger;

        this.indicator = new Indicator(indicator_names, price_digit, this.logger.info);
       
        this.tick_round = tick_round;
        this.tick_count = 0;
        this.tick_sum = 0;

        this.wait_for_next_candle = false;
        
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
        this.wait_for_next_candle = false;
    }

    feed(open, close, low, high, event_time, isFinal) {
        this.tick_count += 1;
        this.tick_sum += close;

        if(!this.wait_for_next_candle && this.tick_count == this.tick_round) {
            const average = this.tick_sum / this.tick_count;

            this.tick_count = 0;
            this.tick_sum = 0;

            const open_prices = this.candles.open_prices.concat(open).slice(1);
            const close_prices = this.candles.close_prices.concat(average).slice(1);

            const signal = this.indicator.test(open_prices, close_prices);
            
            if(signal == signal_type.LONG) {
                this.tracker.long_signal();
                this.wait_for_next_candle = true;
            } else if(signal == signal_type.SHORT) {
                this.tracker.short_signal(close);
                this.wait_for_next_candle = true;
            }
        }

        if(isFinal) {
            this.add_candle(open, close, low, high, event_time);
            this.reset();
        }
    }
}

if(!Array.prototype.last) {
    Array.prototype.last = function() {
        return this[this.length - 1];
    }
}

exports.Signaler = Signaler;