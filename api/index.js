const config = require("../config.json");

platforms = {
  "Binance" : require('./binance_api'),
};

module.exports = platforms[config.platform];