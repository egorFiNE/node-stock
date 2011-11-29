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

module.exports = TimePeriod; 

TimePeriod.prototype._parse = function() {
	this.isValid=true;
	this._periods=[];

	this.firstMinute=null;
	this.lastMinute=null;

	var periods = this._periodString.split(',');
	var i=0;
	for(i=0;i<periods.length;i++) {
		this._parseSinglePeriod(periods[i]);
	}
	
	for(var m=0;m<1440;m++) {
		if (this._periods[m]) {
			if (this.firstMinute==null) {
				this.firstMinute=m;
			}
			this.lastMinute=m;
		}
	}
}

TimePeriod.prototype._setUnixtime  = function(unixtime) {
	var d = Date.parseUnixtime(unixtime);
	d.clearTime();
	this._baseUnixtime = d.unixtime();
}

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
}

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

	if (endMinute===NaN || startMinute===NaN) {
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
}

TimePeriod.prototype.isDateIn = function(date) {
	return this.isHourMinuteIn(date.getHours(), date.getMinutes());
}

TimePeriod.prototype.isHourMinuteIn = function(hour,minute) {
	return this.isMinuteIn(hour*60+minute*1);
}

TimePeriod.prototype.isMinuteIn = function(minute) {
	return this._periods[minute];
}


TimePeriod.prototype.getFirstMinute = function() {
	var i;
	for(i=0;i<=1440;i++) {
		if (this._periods[i]) {
			return i;
		}
	}
	
	return 0;
}

TimePeriod.prototype.getLastMinute = function() {
	var lastMinute=null;
	var i;
	for(i=0;i<=1440;i++) {
		if (this._periods[i]) {
			lastMinute = i;
		}
	}
	return lastMinute==null?1339:lastMinute
}

TimePeriod.prototype.setMinute = function(m, enabled) {
	this._periods[m] = enabled? true: false;
}

TimePeriod.prototype.normalize = function() {
	if (!this.isValid) {
		return '';
	}
	
	var firstMinute = this.getFirstMinute();
	var lastMinute = this.getLastMinute();
	
	var _periods=[];
	
	var currentPeriodOpen=undefined;
	var m;
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
	
	var _periodsStrings=[];
	_periods.forEach(function(period) {
		_periodsStrings.push(TimePeriod.minuteToTime(period[0])+"-"+TimePeriod.minuteToTime(period[1]+1));
	});
	return _periodsStrings.join(',').replace(/:00/g,'');
}

TimePeriod.timeToMinute = function(timeString) {
	if (timeString===undefined) {
		return undefined;
	}
	
	if (!timeString.match(/^(\d+):(\d+)$/) && !timeString.match(/^(\d+)$/)) {
		return undefined;
	}
	
	var times = timeString.split(':');
	
	times[0] = parseInt(times[0]);
	times[1] = parseInt(times[1] || 0);
	
	if (times[1]>59) { 
		return undefined;
	}
	
	return times[0]*60+times[1]*1;
}

TimePeriod.minuteToTime = function(m) {
	return parseInt(m/60) + ':' +parseInt(m%60).toDoubleZeroPaddedString();
}

