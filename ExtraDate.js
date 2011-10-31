require('date-utils');

function zeroStrip(s) {
	return s.toString().replace(/^0+/, '');
}

Date.parseDaystamp = function(daystamp) {
	daystamp = daystamp.toString();
	
	var y = parseInt(daystamp.substr(0,4));
	var m = parseInt(zeroStrip(daystamp.substr(4,2)));
	var d = parseInt(zeroStrip(daystamp.substr(6,2)));

	m--;
	return new Date(y,m,d);
}

Date.prototype.daystamp = function() {
	return this.toFormat('YYYYMMDD');
}

Date.parseUnixtime = function(unixtime) {
	return new Date(unixtime*1000);
}

Date.prototype.unixtime = function() {
	return this.getTime()/1000 >> 0;
}

Date.unixtime = function() {
	return new Date().unixtime();
}

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

Date.prototype.getDayName = function() {
	return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][this.getDay()];
}

Date.prototype.isNyseMarketTime = function() {
	var m = this.getCurrentDayMinute();
	return (m>=570 && m<960)
}

Date.prototype.setCurrentDayMinute = function(minute) {
	var hours = Math.floor(minute/60);
	var minutes = minute-hours*60;
	this.setHours(hours, minutes, 0, 0);
}

Date.prototype.getCurrentDayMinute = function() {
	return this.getHours()*60 + this.getMinutes();
}

Date.minuteToFormat = function(minute, format) {
	var d = new Date();
	d.setCurrentDayMinute(minute);
	return d.toFormat(format);
}

