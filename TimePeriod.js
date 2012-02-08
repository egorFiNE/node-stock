
/** 

This class is used to parse time period strings and check various date variables if they are within the time period. 

A time period is a comma-separated list of starting and ending time pairs. Each pair is dash-separated. 
Spaces don't matter.

For example, those are valid time periods:

* 10:00-15:00
* 11:00-23:30
* 10:00-15:00
* 10:00-12:00,12:30-14:00
* 10:15-10:45, 11:00-11:30, 12:00-12:30

You can omit minutes if you want to: 

* 10-15
* 10-12,12:30-14

The time period pair is not considered inclusive: the beginning minute matches the time period while 
the ending **does not.**  In other words, for time period "10:00-12:00", the "10:00" and "10:59" will
match, while "12:00" is not.

Example: 

	var t = new TimePeriod('9:30-10:00,15-17');
	if (!t.isValid) {
		console.log("oops?");
		return;
	}

	t.isHourMinuteIn(9,30);  // true
	t.isHourMinuteIn(9,23);  // false
	t.isHourMinuteIn(9,33);  // true
	t.isHourMinuteIn(9,59);  // true
	t.isHourMinuteIn(10,00); // false
	t.isHourMinuteIn(15,10); // true
	t.isHourMinuteIn(16,30); // true
	t.isHourMinuteIn(23,00); // false

	t.isUnixtimeIn(1322575298); // 16:01, true

	t.isMinuteIn(9*60+30); // 9:30, true

 */

function TimePeriod(str) {
	this.firstMinute=null;
	this.lastMinute=null;
	
	this._periodString = (str || '').replace(/ +/g,'');
	if (!str || str==='') {
		this._periods=[];
		this.isValid=true;
	} else { 
		this._parse();
	}
	
	this._baseUnixtime=0;
}

TimePeriod.prototype._parse = function() {
	var i, m;
	
	this.isValid=true;
	this._periods=[];

	this.firstMinute=null;
	this.lastMinute=null;

	var periods = this._periodString.split(',');
	for(i=0;i<periods.length;i++) {
		this._parseSinglePeriod(periods[i]);
	}
	
	for(m=0;m<1440;m++) {
		if (this._periods[m]) {
			if (this.firstMinute==null) {
				this.firstMinute=m;
			}
			this.lastMinute=m;
		}
	}
};

TimePeriod.prototype._setUnixtime  = function(unixtime) {
	var d = Date.parseUnixtime(unixtime);
	d.clearTime();
	this._baseUnixtime = d.unixtime();
};

/** 

Check if the given unixtime matches the period. 

@param {Integer} unixtime unixtime to check

@return {Boolean} true if it matches

 */

TimePeriod.prototype.isUnixtimeIn = function(unixtime) {
	if (!this._baseUnixtime) {
		this._setUnixtime(unixtime);
	}
	
	if (unixtime - this._baseUnixtime > 86400) {
		this._setUnixtime(unixtime);
	}
	
	var seconds = unixtime - this._baseUnixtime;
	var minute = parseInt(seconds/60);
	return this.isMinuteIn(minute);
};

TimePeriod.prototype._parseSinglePeriod = function(periodString) {
	if (periodString.match(/-$/)) {
		this.isValid=false;
		return;
	}
	
	var times = periodString.split('-');
	
	var startMinute=TimePeriod.timeToMinute(times[0]);
	
	if (startMinute && times.length<=1) { //single hours
		var _times = times[0].split(':');
		times[1]=(parseInt(_times[0])+1)+":00";
	}
	
	var endMinute = TimePeriod.timeToMinute(times[1]);
	
	if (endMinute===undefined || startMinute===undefined) {
		this.isValid=false;
		return;
	}

	if (isNaN(endMinute) || isNaN(startMinute)) {
		this.isValid=false;
		return;
	}

	if (endMinute<=startMinute) {
		this.isValid=false;
		return;
	}
	
	var i=0;
	for(i=startMinute;i<endMinute;i++) {
		this._periods[i]=true;
	}
};

/** 

Check if given date matches the period. 

@param {Date} date date to check

@return {Boolean} true if it matches

 */

TimePeriod.prototype.isDateIn = function(date) {
	return this.isHourMinuteIn(date.getHours(), date.getMinutes());
};

/** 

Check if given hour and minute matches the period. 

@param {Integer} hour hour to match
@param {Integer} minute minute to match

@return {Boolean} true if it matches

 */

TimePeriod.prototype.isHourMinuteIn = function(hour,minute) {
	return this.isMinuteIn(hour*60+minute);
};

/** 

Check if given day minute matches the period. Minutes are zero-based and calculated since 00:00, 
so 9:45 becomes 9*60+45=585.

@param {Integer} minute minute to check

@return {Boolean} true if it matches

*/

TimePeriod.prototype.isMinuteIn = function(minute) {
	return this._periods[minute];
};

/** 

Returns first minute of the whole time period or 0 if none found. 

@return {Integer} 

 */

TimePeriod.prototype.getFirstMinute = function() {
	var i;
	for(i=0;i<=1440;i++) {
		if (this._periods[i]) {
			return i;
		}
	}
	
	return 0;
};

/** 

Returns last minute of the whole time period or 1440-1 if none found. 

@return {Integer} 

 */

TimePeriod.prototype.getLastMinute = function() {
	var lastMinute=null;
	var i;
	for(i=0;i<=1440;i++) {
		if (this._periods[i]) {
			lastMinute = i;
		}
	}
	return lastMinute==null?1339:lastMinute;
};

/**

Manually enable or disable a certain minute in the time period. 

@param {Integer} m minute to set.
@param {Boolean} enabled true of this minute must be enabled, false if this minute must be disabled.

Example: 

	var t = new TimePeriod('10:00-10:30');
	t.setMinute(10*60+20, false);
	t.normalize(); // 10-10:19, 10:21-10:30

 */

TimePeriod.prototype.setMinute = function(m, enabled) {
	this._periods[m] = enabled? true: false;
};

/** 

Return the clean, canonical string for the time period.

@return {String}

 */

TimePeriod.prototype.normalize = function() {
	if (!this.isValid) {
		return '';
	}
	
	var 
		firstMinute = this.getFirstMinute(),
		lastMinute = this.getLastMinute(),
		_periods=[],
		_periodsStrings=[],
		currentPeriodOpen, m;
	
	for(m=firstMinute;m<=lastMinute;m++) {
		if (this._periods[m]) {
			if (!currentPeriodOpen) {
				currentPeriodOpen=m;
			}
		} else { 
			if (currentPeriodOpen) {
				_periods.push([currentPeriodOpen,m-1]);
				currentPeriodOpen=undefined;
			}
		}
	}
	if (currentPeriodOpen) {
		_periods.push([currentPeriodOpen, lastMinute]);
	}
	
	_periods.forEach(function(period) {
		_periodsStrings.push(TimePeriod.minuteToTime(period[0])+"-"+TimePeriod.minuteToTime(period[1]+1));
	});
	return _periodsStrings.join(',').replace(/:00/g,'');
};

/**

Helper function. Will return day minute for time string supplied. 

@param {String} timeString time, like "11:30"

@return {Integer} the day minute; for example, 570 for "9:30".

 */

TimePeriod.timeToMinute = function(timeString) {
	if (timeString===undefined) {
		return undefined;
	}
	
	if (!timeString.match(/^(\d+):(\d+)$/) && !timeString.match(/^(\d+)$/)) {
		return undefined;
	}
	
	var times = timeString.split(':');

	// make sure it is not an octal number
	times[0] = times[0].replace(/^\0+/, '');
	if (times[1]) {
		times[1] = times[1].replace(/^\0+/, '');
	}

	times[0] = parseInt(times[0]);
	times[1] = parseInt(times[1] || 0);

	if (times[1]>59) { 
		return undefined;
	}
	
	return times[0]*60+times[1];
};

/**

Helper function. Will return time string for day minute.

@param {Integer} m day minute.

@return {String} time string; for example, "9:30" for 570. 

*/

TimePeriod.minuteToTime = function(m) {
	// just to make sure it is not an octal number
	m = parseInt(m.toString().replace(/^\0+/, ''));
	return parseInt(m/60) + ':' +(parseInt(m%60)).pad(2);
};

module.exports = TimePeriod; 
