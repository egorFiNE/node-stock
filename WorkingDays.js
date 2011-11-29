/**

This static class holds date calculation functions needed to figure out working days and holidays for various
exchanges.

See source code for holidays array. 

*/

/*
function WorkingDays() {
}
*/

WorkingDays = {};

WorkingDays.nyseHolidays = {
	2010: {
		1:  [1, 18],
		2:  [15],
		4:  [2],
		5:  [31],
		7:  [5],
		9:  [6],
		11: [25],
		12: [24]
	},
	2011: {
		1:  [17],
		2:  [21],
		4:  [22],
		5:  [30],
		7:  [4],
		9:  [5],
		11: [24],
		12: [26]
	},
	2012: {
		1:  [2, 16],
		2:  [20],
		4:  [6],
		5:  [28],
		7:  [4],
		9:  [3],
		11: [22],
		12: [25]
	},
	2013: {
		1:  [1, 21],
		2:  [18],
		3:  [29],
		5:  [27],
		7:  [4],
		9:  [2],
		11: [28],
		12: [25]
	}
}

/** 

Check if given date is a holiday at NYSE.

@param {Date} day date to check.

@return {Boolean}

 */
WorkingDays.isNyseHoliday = function(day) {
	var entry = WorkingDays.nyseHolidays[day.getFullYear()];
	if (entry) {
		entry = entry[day.getMonth()+1];
		if (entry) {
			return entry.indexOf(day.getDate()) >= 0;
		}
	}
	return false;
}

/** 

Check if a given date is a Sunday or Saturday. 

@param {Date} day date to check.

@return {Boolean}

 */

WorkingDays.isWeekend = function(day) {
	var _d = day.getDay();
	return (_d == 6 || _d==0);
}

/* 

Check if the given date is a trading day at NYSE. 

@param {Date} day date to check.

@return {Boolean}

 */

WorkingDays.isNyseWorkingDay = function(day) {
	return (!WorkingDays.isNyseHoliday(day) && !WorkingDays.isWeekend(day));
}

/** 

Return previous trading day at NYSE for the given date. 

@param {Date} day date for which to find the previous trading day.

@return {Date} previous trading day.

 */

WorkingDays.prevNyseDay = function(day) {
	var nextDate = day.clone();
	nextDate.addDays(-1);
	while (!WorkingDays.isNyseWorkingDay(nextDate)) {
		nextDate.addDays(-1);
	}
	return nextDate;
}

/** 

Return next trading day at NYSE for the given date. 

@param {Date} day date for which to find the next trading day.

@return {Date} next trading day.

 */

WorkingDays.nextNyseDay = function(day) {
	var nextDate = day.clone();
	nextDate.addDays(1);
	while (!WorkingDays.isNyseWorkingDay(nextDate)) {
		nextDate.addDays(1);
	}
	return nextDate;
}

module.exports = WorkingDays;
