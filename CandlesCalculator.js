util = require('util');

/** 

Candles calculator from data supplied by TickStorage. 

Every candle is an <code>Object</code> (read - a hash array) like this: 

	{ h: 261000, l: 261000, o: 261000, c: 261000, v: 100, t: 1, hour: 10, minute: 0, m: 600 }

* <code>h</code> - High 
* <code>l</code> - Low
* <code>o</code> - Open
* <code>c</code> - Close
* <code>v</code> - Volume
* <code>t</code> - Ticks count
* <code>m</code> - Candle day minute (<code>575</code> for 9:35)
* <code>hour</code> - Candle hour
* <code>minute</code> - Candle minute

High, low, open, close and volume are calculated only on market ticks. Ticks count is calculated using all ticks, 
including aftermarket (doesn't matter, though - there are not so many aftermarket ticks during the trade session).

*Every candle is named after it's last minute time.* I.e. candle of minute 575 (9:35) is calculated over all the ticks
between 9:00:00 and 9:34:59 inclusive. 

Example: 

	var tickStorage = new TickStorage(dbPath, 'AAPL', 20111117);
	test.ok(tickStorage.load());
	
	candlesCalculator = new CandlesCalculator(tickStorage, 5);
	var candle = candlesCalculator.getCandle(600); // get candle for 9:55-10:00 

	console.log("Opened at %d", candle.o); // remember that prices are integer

@param {TickStorage} tickStorage TickStorage instance, must be already <code>load()</code>'ed. 
@param {Integer} periodSizeInMinutes obvious. By default it's 1. 

*/

function CandlesCalculator(tickStorage, periodSizeInMinutes) {
	this.periodSize = periodSizeInMinutes || 1;
	this._tickStorage = tickStorage;
	
	this._calculatedMinuteIndex=[];
	this.candles={}; 
	
	this._calculateMinutes();
	this._calculate();
}

CandlesCalculator.prototype._findOc = function(minute, openPos, closePos) {
	var i, tick;
	
	var open=null, close=null, _openPos=null;
	
	for (i=openPos;i<=closePos;i++) {
		tick = this._tickStorage.tickAtPosition(i);
		if (tick.isMarket) {
			open=tick.price;
			_openPos = i;
			break;
		}
	}
	
	if (!open) {
		return null;
	}

	for (i=closePos;i>=_openPos;i--) {
		tick = this._tickStorage.tickAtPosition(i);
		if (tick.isMarket) {
			close=tick.price;
			break;
		}
	}
	
	if (!close) {
		return null;
	}

	return {
		o: open,
		c: close
	}
}

/** 

Debug tool: dump one-minute sized candles.

@param {Integer} from dump since this minute
@param {Integer} to dump till this minute

 */

CandlesCalculator.prototype.dumpMinutes = function(from, to) {
	var i;
	for (i=from;i<=to;i++) {
		console.log("%d: %s", i, util.inspect(this._calculatedMinuteIndex[i]));
	}
}

/** 

Debug tool: dump calculated candles.

@param {Integer} from dump since this minute
@param {Integer} to dump till this minute

 */

CandlesCalculator.prototype.dumpCandles = function(from, to) {
	var i;
	for (i=from;i<=to;i+=this.periodSize) {
		console.log("%d: %s", i, util.inspect(this.candles[i]));
	}
}

/** 

Get calculated candle.

@param {Integer} minute candle minute to get to. Always the last minute of a candle, so ask for "575" to get data for 9:30-9:35.

@return candle structure (see above) or null if there is no candle for this minute.

*/

CandlesCalculator.prototype.getCandle = function(minute) {
	return this.candles[minute] || null;
}

CandlesCalculator.prototype._calculate = function() {
	var i;
	for(i=this.periodSize;i<=1440;i+=this.periodSize) {
		this.candles[i] = this._calculatePeriod(i);
		CandlesCalculator._setCandleHourMinute(this.candles[i], i);
	}
}

CandlesCalculator.prototype._calculatePeriod = function(period) {
	var open=0, close=0, high=Number.MIN_VALUE, low=Number.MAX_VALUE, volume=0, ticks=0;
	
	var m;
	for (m=period-this.periodSize;m<period;m++) {
		var _minute = this._calculatedMinuteIndex[m];
		if (!open) {
			open = _minute.o;
			close = _minute.c;
		}
		
		if (_minute.c) {
			close = _minute.c;
			high = Math.max(high, _minute.h);
			low = Math.min(low, _minute.l);
			volume+=_minute.v;
			ticks+=_minute.t;
		}
		
	}
	
	if (open) {
		return {
			h: high,
			l: low,
			o: open,
			c: close,
			v: volume,
			t: ticks
		}
	} else { 
		return null;
	}
}

CandlesCalculator.prototype._calculateMinutes = function() {
	var _newMinuteIndex=[];
	
	var m;
	for (m=0;m<1440;m++) {
		_newMinuteIndex[m]={
			h: 0,
			l: 0,
			o: 0,
			c: 0
		};
		
		var minute = this._tickStorage.minuteIndex.index[m];
		if (minute) {
			var oc = this._findOc(m, minute.o, minute.c);
			if (oc) {
				_newMinuteIndex[m].h=minute.h;
				_newMinuteIndex[m].l=minute.l;
				_newMinuteIndex[m].o=oc.o;
				_newMinuteIndex[m].c=oc.c;
				_newMinuteIndex[m].v=minute.v;
				_newMinuteIndex[m].t=minute.c-minute.o+1;
			}
		}
	}
	
	this._calculatedMinuteIndex = _newMinuteIndex;
}

CandlesCalculator._setCandleHourMinute = function(candle, minute) { 
	if (candle) {
		var d = new Date();
		d.clearTime();
		d.setCurrentDayMinute(minute);
		candle.hour = d.getHours();
		candle.minute = d.getMinutes();
		candle.m = minute;
	}
}

/** 

Utility method: all of the above in a single call.abstract

@param {String} dbPath Path to database (see TickStorage).
@param {String} symbol Symbol to load.
@param {Integer} daystamp Daystamp to load.
@param {Integer} period Period size in minutes.
@param {Integer} from Get candles starting from this minute.
@param {Integer} to Get candles till this minute.

@return {Array} List of candles, zero-based, guaranteed to have each period. 

For periods that have no data (there was no ticks in that period) the entry will only contain <code>hour</code>, 
<code>minute</code> and <code>m</code> keys.

Example data: 

	[
		{ h: 261000, l: 261000, o: 261000, c: 261000, v: 100, t: 1, hour: 10, minute: 0, m: 600 },
		{ h: 261000, l: 261000, o: 261000, c: 261000, v: 200, t: 2, hour: 10, minute: 1, m: 601 },
		{ hour: 10, minute: 2, m: 602 }, // no data for 602
		{ h: 265000, l: 260000, o: 260000, c: 264100, v: 500, t: 3, hour: 10, minute: 3, m: 603 },
		...
	];

*/

CandlesCalculator.getCandles = function(dbPath, symbol, daystamp, period, from, to) {
	var tickStorage = new TickStorage(dbPath, symbol, daystamp);
	if (!tickStorage.load()) {
		return null;
	}
	
	var _result=[];
	
	from = from||0;
	to = to||1440;
	
	var candles = new CandlesCalculator(tickStorage, period);
	var i;
	for(i=from+period;i<=to;i+=period) {
		var candle = candles.getCandle(i) || {};
		CandlesCalculator._setCandleHourMinute(candle, i);
		_result.push(candle);
	}
	
	return _result;
}

module.exports = CandlesCalculator;
