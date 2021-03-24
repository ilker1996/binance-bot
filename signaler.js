
class Signaler {
    constructor(pair, tick_round, buyer, tracker, indicator, logger) {
        this.pair = pair;

        this.buyer = buyer;
        this.tracker = tracker;
        this.indicator = indicator;
        this.logger = logger;

        this.tick_round = tick_round;
        this.tick_count = 0;
        this.tick_sum = 0;

        this.wait_for_next_candle = false;
        
        this.candles = {};
    }

    set_candles(candles) {
        this.candles = candles;
    }

    add_candle(latest_candle) {
        this.candles.open_prices.shift();
        this.candles.close_prices.shift();
        this.candles.low_prices.shift();
        this.candles.high_prices.shift();
        this.candles.open_times.shift();
        this.candles.close_times.shift();
        
        this.candles.open_prices.push(Number(latest_candle.open));
        this.candles.close_prices.push(Number(latest_candle.close));
        this.candles.low_prices.push(Number(latest_candle.low));
        this.candles.high_prices.push(Number(latest_candle.high));
        this.candles.open_times.push(this.candles.close_times.last() + 1);
        this.candles.close_times.push(latest_candle.event_time);
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

            const buy_signal = this.indicator(open_prices, close_prices);
            
            if(buy_signal) this.buyer.buy(this.pair, (price, quantity) => {
                this.logger.info("Market Buy - price : %f , quantity : %f", price, quantity);
                this.tracker.add_track(price, quantity);
            });
        }

        if(isFinal) {
            this.add_candle({open, close, low, high, event_time});
            this.reset();
        }
    }
}

if(!Array.prototype.last) {
    Array.prototype.last = () => this[this.length - 1];
}

exports.Signaler = Signaler;