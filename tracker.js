class Tracker {
    constructor(pair, stop_loss_multiplier, profit_multiplier, take_profit_multiplier, buyer, seller, logger, buy_callback, sell_callback){
        this.pair = pair;

        this.stop_loss_multiplier = stop_loss_multiplier;
        this.profit_multiplier = profit_multiplier;
        this.take_profit_multiplier = take_profit_multiplier;

        this.seller = seller;
        this.buyer = buyer;
        this.logger = logger;

        this.buy_callback = buy_callback;
        this.sell_callback = sell_callback;
        
        this.track_list = [];
        this.total_profit = 0;
    }

    feed(current_price) {
        for (let i = this.track_list.length - 1; i >= 0; --i) {
            const track = this.track_list[i];

            if(current_price <= track.lower_price_limit || current_price >= track.buying_price * this.take_profit_multiplier || track.sell) {
                this.seller.sell(this.pair, current_price, track.buying_quantity, 
                    (price, quantity) => {
                        this.remove_track(i);
                                                
                        const profit = price * quantity - track.buying_price * track.buying_quantity;
                        this.sell_callback(price, quantity, profit);

                        this.logger.info("Profit : %f", profit);

                        this.total_profit += profit;
                        this.logger.info("Total profit : %f", this.total_profit);

                    }
                );
            } else if(current_price >= track.higher_price_limit) {
                track.lower_price_limit = track.higher_price_limit * ((1 + this.stop_loss_multiplier) * 0.5),
                track.higher_price_limit = track.higher_price_limit * ((1 + this.profit_multiplier) * 0.5),

                this.logger.info("Lower limit increased to : %f for quantity : %f", track.lower_price_limit, track.buying_quantity);
                this.logger.info("Higher limit increased to : %f for quantity : %f", track.higher_price_limit, track.buying_quantity);

            }
        }
    }

    long_signal() {
        this.buyer.buy(this.pair, (price, quantity) => {
            this.add_track(price, quantity);
            this.buy_callback(price, quantity);
        });
    }

    short_signal() {
        this.track_list.forEach((track) => track.sell = true);
    }

    add_track(price, quantity) {
        this.track_list.push({
            buying_price : price,
            buying_quantity : quantity,
            lower_price_limit : price * this.stop_loss_multiplier,
            higher_price_limit : price * this.profit_multiplier,
            sell: false
        });
    }

    remove_track(index) {
        this.track_list.splice(index, 1);
    }
}

exports.Tracker = Tracker;