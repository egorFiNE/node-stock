require('node-date');

function zeroStrip(s) {
	return s.toString().replace(/^0+/, '');
}


Date.parseDaystamp = function(daystamp) {
	daystamp = daystamp.toString();
	var da;

/*
	if (daystamp == 'yesterday') {
		da = new Date();
		da.zeroTime();
		return da.prevWorkingDay();
	}*/
	
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

// FIXME
Date.prototype.isHoliday = function() {
	var _d = this.getDay();
	if (_d == 6 || _d==0) {
		return true;
	}

	return false;
}

// FIXME
Date.prototype.prevWorkingDay = function() {
	function n(d) {
		return Date.parseUnixtime(d.unixtime()-86400);
	}

	var nextDate = n(this);
	while (nextDate.isHoliday()) {
		nextDate = n(nextDate);
	}
	return nextDate;
}

// FIXME
Date.prototype.nextWorkingDay = function() {
	function n(d) {
		return Date.parseUnixtime(d.unixtime()+86400);
	}

	var nextDate = n(this);
	while (nextDate.isHoliday()) {
		nextDate = n(nextDate);
	}
	return nextDate;
}

Date.prototype.getDayName = function() {
	return ['Sun','Mon','Tue','Wed','Thu','Fri','Sat','Sun'][this.getDay()];
}
