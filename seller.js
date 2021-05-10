const binance_api = require('./binance_api')

class Seller {
    constructor(logger, test) {
        this.logger = logger;
        this.test = test;
    }

    sell(pair, price, quantity, onSuccessfulSell) {
        if(!this.test) {
            binance_api.spot_market_sell(pair, price, quantity,
                onSuccessfulSell,
                (error) => this.logger.error("Error occured during market sell for price : %d and quantity : %d , %s", price, quantity, error)
            );
        } else {
            onSuccessfulSell(price, quantity);
        }
        
    }
}

exports.Seller = Seller;