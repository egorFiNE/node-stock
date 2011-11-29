require('date-utils');

/** 

Various date methods useful for stock trading. 

Yes, I know that it is not good to augment built-in types, but I have considered all pros and cons and 
decided to pick this solution anyway.

A **daystamp** is a date format in form of "YYYYMMDD". It's used through all the node-stock package. It could
be specified both in string or integer and all the methods and functions must accept either type 
(mind <code>.toString()</code> and <code>parseInt()</code> for easy implementation). 

 */

// trick doc.js into thinking that we have declared the Date class. 
/*
function Date() {
}
*/


function _zeroStrip(s) {
	return s.toString().replace(/^0+/, '');
}

/** 

Parse daystamp into Date. It's a factory method. 

@param daystamp daystamp to parse

@return {Date} date parsed from daystamp, time set to 00:00:00

 */

Date.parseDaystamp = function(daystamp) {
	daystamp = daystamp.toString();
	
	var y = parseInt(daystamp.substr(0,4));
	var m = parseInt(_zeroStrip(daystamp.substr(4,2)));
	var d = parseInt(_zeroStrip(daystamp.substr(6,2)));

	m--;
	return new Date(y,m,d);
}

/** 

Return daystamp representation of a Date.

@return {String} daystamp

 */

Date.prototype.daystamp = function() {
	return this.toFormat('YYYYMMDD');
}

/** 

Parse unixtime into Date. It's a factory method. 

@param {Integer} unixtime unixtime to parse.

@return {Date} parsed date object with correct time set. 

 */

Date.parseUnixtime = function(unixtime) {
	return new Date(unixtime*1000);
}

/** 

Return unixtime representation of a Date. 

@return {Integer} unixtime.

 */

Date.prototype.unixtime = function() {
	return this.getTime()/1000 >> 0;
}

/** 

Return current unixtime. 

@return {Integer} current unixtime. 

 */

Date.unixtime = function() {
	return new Date().unixtime();
}

/**

Return an array of Dates between two days, not inclusive. 

@param {Date} from starting day
@param {Date} to ending day

@return {Array} array of Dates between those. 

Example: 

	var from = new Date('2011-06-15');
	var to   = new Date('2011-06-18');
	var days = Date.fillEmptyDays(from, to);
	// days == [new Date('2011-06-16'), new Date('2011-06-17')]; 

 */

Date.fillEmptyDays = function(from, to) {
	var result=[];
	
	var nextDate = new Date(from);
	nextDate.clearTime();
	
	nextDate = Date.parseUnixtime(nextDate.unixtime()+86400);
	
	to = new Date(to);
	to.clearTime();

	while (nextDate < to) {
		result.push(nextDate);
		nextDate = Date.parseUnixtime(nextDate.unixtime()+86400);
	}

	return result;
}

/** 

Get short human readable day name for given Date, like "Sun", "Mon", ...

@return {String} day name. 

 */

Date.prototype.getDayName = function() {
	return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][this.getDay()];
}

/** 

Set given Date's time to a day minute specified. A day minute is zero-based number of minute in a day, 
e.g. 570 for 9:30. 

@param {Integer} minute day minute to set as time. 

 */

Date.prototype.setCurrentDayMinute = function(minute) {
	var hours = Math.floor(minute/60);
	var minutes = minute-hours*60;
	this.setHours(hours, minutes, 0, 0);
}

/** 

Get current day minute of a given Date. A day minute is zero-based number of minute in a day, 
e.g. 570 for 9:30. 

@return {Integer} day minute

*/

Date.prototype.getCurrentDayMinute = function() {
	return this.getHours()*60 + this.getMinutes();
}

/** 

A helper function. Format given day minute according to format (see date-utils format specifiers). 

@param {Integer} minute day minute 
@param {String} format date-utils format specifier

@return {String} formatted time

Example: 

	Date.minuteToFormat(571, 'H24:MI:SS'); // "9:31"
 
 */

Date.minuteToFormat = function(minute, format) {
	var d = new Date();
	d.setCurrentDayMinute(minute);
	return d.toFormat(format);
}

