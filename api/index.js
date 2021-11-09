const config = require("../config.json");

platforms = {
  "Binance" : require('./binance_api'),
  "Gate.io" : require('./gateio_api'),
};

module.exports = platforms[config.platform];