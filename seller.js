const binance_api = require('./binance_api')

class Seller {
    constructor(logger, test, sell_callback) {
        this.logger = logger;
        this.test = test;

        this.sell_callback = sell_callback;
    }

    sell(pair, price, quantity, onSuccessfulSell) {
        const onSell = (price, quantity) => {
            onSuccessfulSell(price, quantity);
            this.sell_callback(price, quantity);
        }

        if(!this.test) {
            binance_api.spot_market_sell(pair, price, quantity,
                onSell,
                (error) => this.logger.error("Error occured during market sell : %s", error)
            );
        } else {
            onSell(price, quantity);
        }
        
    }
}

exports.Seller = Seller;