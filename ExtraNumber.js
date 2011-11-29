Number.prototype.humanReadablePrice = function() {
	return (this/10000).toFixed(2);
}
