var 
	util = require('util'),
	compress = require('compress-buffer').compress,
	uncompress = require('compress-buffer').uncompress;

/** 

Internal class used by TickStorage to index minute data within a single ticks file. 

About the only thing you may be interested in here is the <code>.index[]</code> array 
which contains an array of minutes, from 0 to 1440-1. Each entry is a hash with the 
following keys: 

* **o**: position of the first tick in this minute (see <code>TickStorage.position</code>);
* **c**: position of the last tick in this minute;
* **v**: total volume in this minute;
* **h**: high for this minute;
* **l**: low for this minute;

For aftermarket minutes only the <code>o</code> and <code>c</code> are stored with <code>v</code> set to <code>0</code>
and <code>h</code> and <code>l</code> set to <code>null</code>.

If there were no data at all for a certain minute within the day, then <code>index[minute]</code> will be <code>null</code>. 

You can access the instance of Minute Index as <code>TickStorage.minuteIndex[]</code>. So use 
<code>TickStorage.minuteIndex.index[minute]</code> to get to the minute data. 

 */

function MinuteIndex() {
	this.index = [];
	
	this.resetIndex();
	
	this._startUnixtime = null;
}


/**
@private
 */
MinuteIndex.prototype.resetIndex = function() {
	var m;
	for(m=0;m<=1440;m++) {
		this.index[m]=null;
	}
};

/**
@private
 */
MinuteIndex.prototype.setStartUnixtime = function(unixtime) {
	this._startUnixtime = unixtime;
};

/**

Handy developer tool: dump minute index in human-readable format. 

@param {Integer} fromMinute begin dump since this minute, default = 0;
@param {Integer} toMinute end the dump with this minue, default = 1440-1.

 */

MinuteIndex.prototype.dump = function(fromMinute, toMinute) {
	fromMinute = fromMinute || 0;
	toMinute = toMinute || 1440-1;
	var i;
	for(i=fromMinute;i<=toMinute;i++) {
		util.debug(util.format("%d: %s", i, util.inspect(this.index[i])));
	}
};

/**
@private
 */
MinuteIndex.prototype.addTick = function(position, unixtime, volume, price, isMarket) {
	var minute = Math.floor((unixtime-this._startUnixtime)/60);
	
	if (minute>=1440 || minute<0) {
		throw new Error(util.format("Cannot add minute %d", minute));
	}
	
	if (position==null) {
		return;
	}
	
	if (this.index[minute]===null) {
		this.index[minute]={
			o: position, 
			c: position,
			v: 0,
			h: null,
			l: null
		};

	// set ending position
	} else { 
		this.index[minute].c = position;
	}

	// we shall ignore aftermarket prices for the price index.
	if (!isMarket) {
		return; 
	}
	
	this.index[minute].v+=volume;

	if (this.index[minute].h === null) {
		this.index[minute].h = price;
	} else { 
		this.index[minute].h = Math.max(this.index[minute].h, price);
	}
	
	if (this.index[minute].l === null) {
		this.index[minute].l = price;
	} else { 
		this.index[minute].l = Math.min(this.index[minute].l, price);
	}
};

/**
@private
 */
MinuteIndex.prototype.toGzip = function() {
	return compress(new Buffer(JSON.stringify(this.index))); 
};

/**
@private
 */
MinuteIndex.prototype.fromGzip = function(buffer) {
	var uncompressed;
	try { 
		uncompressed = uncompress(buffer);
	} catch (e) { 
		return false;
	}
	
	if (!uncompressed) {
		return false;
	}
	
	try { 
		this.index = JSON.parse(uncompressed.toString());
	} catch (ee) {
		return false;
	}
	
	return true;
};

module.exports = MinuteIndex;
