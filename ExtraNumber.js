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
