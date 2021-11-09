const market_type = {
	SPOT: "spot",
	FUTURES: "futures",
}

const signal_type = {
	SHORT: -1,
	LONG: 1,
	NONE: 0
}

const session_type = {
	BACKTEST: "backtest",
	LIVETEST: "livetest",
	TRADE: "trade",
}

const clamp = (number, min, max) => {
	const tmp_min = min ? min : number;
	const tmp_max = max ? max : number;
	return Math.max(tmp_min, Math.min(number, tmp_max));
}

exports.market_type = market_type;
exports.signal_type = signal_type;
exports.session_type = session_type;
exports.clamp = clamp;