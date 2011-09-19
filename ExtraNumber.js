Number.prototype.humanReadablePrice = function() {
	return (this/10000).toFixed(2);
}

Number.prototype.toDoubleZeroPaddedString = function() {
	if (this<10) {
		return '0' + this;
	}
	return ''+this;
}
