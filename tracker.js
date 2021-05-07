class Tracker {
    constructor(pair, buyer, seller, logger, buy_callback, sell_callback){
        this.pair = pair;

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

            if(current_price <= track.stop_loss_price || current_price >= track.take_profit_price || track.sell) {
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
            }
        }
    }

    long_signal(stop_loss_price, take_profit_price) {
        this.buyer.buy(this.pair, (price, quantity) => {
            this.add_track(price, quantity, stop_loss_price, take_profit_price);
            this.buy_callback(price, quantity);
        });
    }

    short_signal() {
        this.track_list.forEach((track) => track.sell = true);
    }

    add_track(price, quantity, stop_loss_price, take_profit_price) {
        this.track_list.push({
            buying_price : price,
            buying_quantity : quantity,
            stop_loss_price : stop_loss_price,
            take_profit_price : take_profit_price,
            sell: false
        });
    }

    remove_track(index) {
        this.track_list.splice(index, 1);
    }
}

exports.Tracker = Tracker;