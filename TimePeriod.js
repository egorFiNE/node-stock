function TimePeriod(str) {
	this.periodString = (str || '').replace(/ +/g,'');
	if (!str || str==='') {
		this.periods=[];
		this.isValid=true;
	} else { 
		this.parse();
	}
}

module.exports = TimePeriod; 

TimePeriod.prototype.parse = function() {
	this.isValid=true;
	this.periods=[];
	
	var periods = this.periodString.split(',');
	var i=0;
	for(i=0;i<periods.length;i++) {
		this.parseSinglePeriod(periods[i]);
	}
}


TimePeriod.prototype.setUnixtime  = function(unixtime) {
	var d = Date.parseUnixtime(unixtime);
	d.clearTime();
	this.baseUnixtime = d.unixtime();
}

TimePeriod.prototype.isUnixtimeIn = function(unixtime) {
	var seconds = unixtime - this.baseUnixtime;
	var minute = parseInt(seconds/60);
	return this.isMinuteIn(minute);
}

TimePeriod.prototype.timeToMinute = function(timeString) {
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

TimePeriod.prototype.parseSinglePeriod = function(periodString) {
	if (periodString.match(/-$/)) {
		this.isValid=false;
		return;
	}
	
	var times = periodString.split('-');
	
	var startMinute=this.timeToMinute(times[0]);
	
	if (startMinute && times.length<=1) { //single hours
		var _times = times[0].split(':');
		times[1]=(parseInt(_times[0])+1)+":00";
	}
	
	var endMinute = this.timeToMinute(times[1]);
	
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
		this.periods[i]=true;
	}
}

TimePeriod.prototype.isDateIn = function(date) {
	return this.isHourMinuteIn(date.getHours(), date.getMinutes());
}

TimePeriod.prototype.isHourMinuteIn = function(hour,minute) {
	return this.isMinuteIn(hour*60+minute*1);
}

TimePeriod.prototype.isMinuteIn = function(minute) {
	return this.periods[minute];
}

TimePeriod.prototype.getFirstLastMinutes = function() {
	var i;
	var firstMinute=Number.MAX_VALUE;
	var lastMinute=Number.MIN_VALUE;
	for(i=0;i<=1440;i++) {
		if (this.periods[i]) {
			firstMinute = Math.min(firstMinute,i);
			lastMinute = Math.max(lastMinute,i);
		}
	}
	return [
		firstMinute==Number.MAX_VALUE?0:firstMinute,
		lastMinute==Number.MIN_VALUE?1339:lastMinute
	];
}

TimePeriod.prototype.minuteToTime = function(m) {
	return parseInt(m/60) + ':' +parseInt(m%60).toDoubleZeroPaddedString();
}

TimePeriod.prototype.normalize = function() {
	var self=this;
	if (!this.isValid) {
		return '';
	}
	
	var minutes = this.getFirstLastMinutes();
	
	var _periods=[];
	
	var m;var currentPeriodOpen=undefined;
	for(m=minutes[0];m<=minutes[1];m++) {
		if (this.periods[m]) {
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
		_periods.push([currentPeriodOpen, minutes[1]]);
	}
	
	var _periodsStrings=[];
	_periods.forEach(function(period) {
		_periodsStrings.push(self.minuteToTime(period[0])+"-"+self.minuteToTime(period[1]+1));
	});
	return _periodsStrings.join(',').replace(/:00/g,'');
}
