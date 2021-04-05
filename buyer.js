const binance_api = require('./binance_api')

class Buyer {
    constructor(trading_currency, balance_limit, filter, logger, test, buy_callback) {
        this.trading_currency = trading_currency;
        this.balance_limit = balance_limit;

        this.filter = filter;

        this.logger = logger;

        this.test = test;

        this.buy_callback = buy_callback;
    }

    buy(pair, onSuccessfulBuy) {
        const onBuy = (price, quantity) => {
            onSuccessfulBuy(price, quantity);
            this.buy_callback(price, quantity);
        }

        binance_api.calculate_buy_quantity(pair, this.trading_currency, this.balance_limit, this.filter, this.test)
        .then( 
            ({price, quantity}) => {
                if(!this.test) {
                    binance_api.spot_market_buy(pair, price, quantity,
                        onBuy,
                        (error) => this.logger.error("Error occured during Market Buy : %s", error)
                    );
                } else {
                    onBuy(price, quantity);
                }    
            },
            (error) => this.logger.error(error)
        )
        .catch(this.logger.error);
    }
}

exports.Buyer = Buyer;