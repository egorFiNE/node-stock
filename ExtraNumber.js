/** 

This module exports only a single additional method for built-in <code>Number</code> object. 

 */

// trick doc.js into thinking that we have declared the class. 
/*
function Number() {
}
*/


/**

Will return human-readable price for given integer. 

@return {String} human-readable price. 

Example: 

	var price = 233700;
	price.humanReadablePrice(); // "23.37"

 */
Number.prototype.humanReadablePrice = function() {
	return (this/10000).toFixed(2);
}

/**

Will return zero-padded number.

@param {Integer} length pad length.

@return {String} human-readable zero-padded number.

Example: 

	var something = 9;
	something.pad(2); // "09";

 */
Number.prototype.pad = function(length) {
	var _num = this.toString();
	if (_num.length > length) { 
		return _num;
	}
	
  return (Array(length).join('0') + this).slice(-length);
}
