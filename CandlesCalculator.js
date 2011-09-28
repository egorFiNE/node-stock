util = require('util');
fs = require('fs');
events = require('events');

function CandlesCalculator(minutes) {
	events.EventEmitter.call(this);
	
	this.debug=false;
	
	this.startUnixtime = 0;
	this.lastPeriod=0;
	
	this.periodLength = minutes*60;
	
	this.lastUnixtime=0;
	
	this.clearPeriod();
}
util.inherits(CandlesCalculator, events.EventEmitter);
module.exports = CandlesCalculator;


CandlesCalculator.prototype.unserialize = function(data) { 
	var self=this;
	Object.keys(data).forEach(function(key) {
		self[key]=data[key];
	});
}

CandlesCalculator.prototype.serialize = function() { 
	var self=this;
	var result = {};
	Object.keys(this).forEach(function(key) {
		result[key] = self[key];
	});
	delete result._events;
	return result;
}

CandlesCalculator.prototype.clearPeriod = function() {
	this.currentVolume=0;
	this.currenTicksCount=0;
	this.currentHigh=Number.MIN_VALUE;
	this.currentLow=Number.MAX_VALUE;
	this.currentOpen=0;
	this.currentClose=0;
}
CandlesCalculator.prototype.tickTime = function(unixtime) {
	this.addTick(unixtime);
}

CandlesCalculator.prototype.finish = function() {
	this.emitCandle();
}

CandlesCalculator.prototype.calculateStartUnixtime = function(unixtime) {
	var q = Date.parseUnixtime(unixtime);
	q.clearTime();
	this.startUnixtime = q.unixtime();
	if (this.debug) {
		util.debug("I figured out start unixtime, it's at "+q.humanReadableDateTimeWithSeconds());
	}
}

CandlesCalculator.prototype.addTick = function(unixtime, price, volume) {
	if (this.startUnixtime==0) {
		this.calculateStartUnixtime(unixtime);
	}
	
	if (unixtime<this.lastUnixtime) {
		return; // blast from the past
	}
	this.lastUnixtime=unixtime;

	
	var second = unixtime - this.startUnixtime;
	var period = (second/this.periodLength) >> 0;
	
	if (this.debug) { 
		util.debug("in period "+period);
	}
	
	if (this.lastPeriod==0) {
		this.lastPeriod=period;
	}
	
	if (period>this.lastPeriod) {
		if (this.debug) {
			util.debug("Current period "+period+" is more than the last period "+this.lastPeriod);
		}
		this.emitCandle();
		this.clearPeriod();
		this.lastPeriod = period;
	}
	
	if (price && volume) {
		this.currentClose = price;
		this.currentHigh = Math.max(this.currentHigh, price);
		this.currentLow  = Math.min(this.currentLow, price);
		if (this.currentOpen==0) {
			this.currentOpen = price;
		}
		this.currentVolume+=volume;
		this.currenTicksCount++;
	}
}

CandlesCalculator.prototype.emitCandle = function() {
	if (this.currentVolume<=0) {
		return;
	}
	
	var seconds = this.startUnixtime + ((this.lastPeriod+1) * (this.periodLength));
	var da = Date.parseUnixtime(seconds);
	var HH = da.getHours();
	var MM = da.getMinutes();
	if (this.debug) {
		util.debug("Current period candle is not empty, so I emit at "+seconds+" which is "+HH+":"+MM);
	}

	this.emit('candle', HH, MM,
		this.currentHigh, this.currentLow, this.currentOpen, this.currentClose, this.currentVolume, this.currenTicksCount
	);
	return;
}

CandlesCalculator.getCandles = function(dbPath, symbol, daystamp, period) {
	var candles=[];

	var candlesCalculator = new CandlesCalculator(period);
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		candles.push({
			hour:hour,
			minute:minute,
			o:o,
			c:c,
			h:h,
			l:l,
			v:v
		});
	});

	var tickStorage;
	try { 
		tickStorage = new TickStorage(dbPath, symbol, daystamp);
		tickStorage.load();
	} catch(e) {
		return null;
	}

	var tick;
	while ((tick = tickStorage.nextTick())) {
		if (!tick.isMarket) {
			continue;
		}
		candlesCalculator.addTick(tick.unixtime, tick.price, tick.volume);
	}
	candlesCalculator.finish();
	return candles;
}
