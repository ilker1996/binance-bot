const api = require('./api')

class Buyer {
    constructor(trading_currency, balance_limit, filter, logger, test) {
        this.trading_currency = trading_currency;
        this.balance_limit = balance_limit;

        this.filter = filter;

        this.logger = logger;

        this.test = test;
    }

    buy(pair, buying_price, onSuccessfulBuy) {
        api.calculate_buy_quantity(buying_price, this.trading_currency, this.balance_limit, this.filter, this.test)
        .then(
            ({price, quantity}) => {
                if(!this.test) {
                    api.spot_market_buy(pair, price, quantity,
                        onSuccessfulBuy,
                        (error) => this.logger.error("Error occured during Market Buy for price : %d and quantity : %d , %s", price, quantity, error)
                    );
                } else {
                    onSuccessfulBuy(price, quantity);
                }    
            },
            (error) => this.logger.error(error)
        )
        .catch(this.logger.error);
    }
}

exports.Buyer = Buyer;