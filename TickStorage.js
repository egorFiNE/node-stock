var 
	util = require('util'),
	fs = require('fs'),
	path = require('path'),
	events = require('events'),
	compress = require('compress-buffer').compress,
	uncompress = require('compress-buffer').uncompress,
	MinuteIndex = require('./MinuteIndex');
	
require('./ExtraDate');

/** 

Raw ticks storage. 

Ticks are stored on disk and in memory in a highly-efficient, extremely compact and fast format. Each trading 
day is stored in a separate file named with a plain daystamp and ".ticks" extension. 

Each file starts with a single line JSON header, which is handy to lookup in shell:

	head -1 20110801.ticks

The file path is composed of all three parameters: dbPath/symbol/daystamp.ticks. 

@param {String} dbPath path to ticks database;
@param {String} symbol symbol to load;
@param {String} daystamp day to load or create.

Typical read example: 

	var tickStorage = new TickStorage('/home/tickers', 'AAPL', 20111019);
	if (!tickStorage.load()) {
		console.log("Oops?");
	}

	var tick;
	while ((tick=tickStorage.nextTick())) {
		if (!tick.isMarket) {  
			continue;
		}

		ExtraLog.log("%T: %d @ %p", 
			tick.unixtime,  // integer trade unixtime 
			tick.volume,    // integer trade volume
			tick.price      // integer tick price
		);
	}

Typical create/write example: 
	
	var tickStorage = new TickStorage('/home/tickers', 'AAPL', 20111019);
	tickStorage.prepareForNew();

	tickStorage.addTick(unixtime, 100, 233700, true);
	tickStorage.addTick(unixtime, 100, 233700, true);
	...

	if (!tickStorage.save()) {
		console.log("Oops?!");
	}

**Note:** you cannot reuse TickStorage that was just created and stored. TickStorage instance is not 
read/write so if you have just created a tick file, you will have to reload it from disk in order to read
it. Something like that: 

	...
	if (!tickStorage.save()) {
		console.log("Oops?!");
	}

	tickStorage = new TickStorage('/home/tickers', 'AAPL', 20111019);
	if (!tickStorage.load()) {
		console.log("Oops?!");
	}

	// now you can read! 


Each **tick entry** is a hash that consists of: 

* **isMarket** boolean, true for market ticks and false for aftermarket;
* **unixtime** integer, cannot be zero or null;
* **volume** integer, can be zero in rare cases the stock exchange sent us such a tick;
* **price** integer, can be zero in rare cases the stock exchange sent us such a tick;

 */

function TickStorage(dbPath, symbol, daystamp) { 
	this._dbPath = dbPath;
	this._symbol = symbol.toUpperCase();

	this._daystamp = (daystamp || '');

	var day = Date.parseDaystamp(this._daystamp);
	this._startUnixtime = day.unixtime();
	this._endUnixtime = this._startUnixtime+86400;
	
	this._path = dbPath+'/'+symbol+'/';
	this._filename = this._daystamp+'.ticks';
	
	this._bufferData = null; 
	this.minuteIndex = null;
	
	this._lastUnixtime=null;
	
	this.position=0;
	this.count=0;
	
	this.additionalData={};
	this._orphanTicks=[];
	
	this.marketTimeOnly = false;
	this.nextTick = this._nextTickAll;
}

TickStorage.HEADER_SIZE=1024;
TickStorage.ENTRY_SIZE=13;
TickStorage.CURRENT_VERSION=1;

TickStorage.SEEK_SET = 1;
TickStorage.SEEK_CUR = 2;
TickStorage.SEEK_END = 3;

/**

Filter out aftermarket time. After this call <code>TickStorage.nextTick()</code> will only return market ticks. 

 */
TickStorage.prototype.filterMarketTime = function() {
	this.marketTimeOnly = true;
	if (this.position < this.marketOpenPos) {
		this.position = this.marketOpenPos;
	}
	
	this.nextTick = this._nextTickMarket;
};

/**

Returns symbol name.

@return {String}

 */
TickStorage.prototype.getSymbol = function() {
	return this._symbol;
};

/**

Return true if this file exists in tick database.

@return {Boolean}

 */
TickStorage.prototype.exists = function() {
	return fs.existsSync(this._path+this._filename);
};

/** 

Will return the day minute to which the current position points to. 

@return {Integer} day minute.

 */
TickStorage.prototype.tellMinute = function() {
	var _m=null,m;
	for (m=0;m<1440;m++) {
		if (this.minuteIndex.index[m] && this.position>=this.minuteIndex.index[m].o	) {
			_m = m;
		}
	}
	return _m;
};

/**

Seek to the first tick of that day minute.

@param {Integer} minute day minute to seek to. 

@return {Boolean} true if we could successfully seek to that minute (i.e. if it exists in tick data); false otherwise

 */
TickStorage.prototype.seekToMinute = function(minute) {
	var m = this.minuteIndex.index[minute];
	if (m) {
		this.position = m.o;
		return true;
	} else { 
		return false;
	}
};


/** 

Seek to the first tick.

@return {Integer} <code>null</code> if we couldn't seek to it; new position otherwise. 

 */

TickStorage.prototype.rewind = function() {
	return this.seek(0, TickStorage.SEEK_SET);
};

/** 

Seek to the position in ticks. 

@param {Integer} ticks ticks to seek to, can be negative depending on <code>whence</code>;
@param whence how to seek to. Think unix's <code>fseek()</code> call. Whence can be one of: <code>TickStorage.SEEK\_SET</code>, <code>TickStorage.SEEK\_CUR</code>, <code>TickStorage.SEEK\_END</code>.

If <code>whence</code> is <code>TickStorage.SEEK\_SET</code>, then the <code>ticks</code> parameter is relative to the 
beginning of file (and should not be negative). If <code>whence</code> is <code>TickStorage.SEEK\_CUR</code>, 
then the <code>ticks</code> parameter is relative to the current position. If <code>whence</code> is 
<code>TickStorage.SEEK\_END</code>, then the <code>ticks</code> parameter is relative to the last position (and should not
be positive).

This method is smart, it won't let you seek past the beginning or the end of file. 

@return {Integer} new position or <code>null</code> if we couldn't seek. 

 */
TickStorage.prototype.seek = function(ticks, whence) {
	if (ticks===undefined || !whence) {
		return null;
	}
	
	var newPosition=null;
	switch (whence) {
		case TickStorage.SEEK_SET: 
			newPosition=ticks;
			break;
		case TickStorage.SEEK_CUR: 
			newPosition=this.position+ticks;
			break;
		case TickStorage.SEEK_END:
			newPosition=this.count-1+ticks;
			break;
		default:
			return null;
			break;
	}
	
	if (newPosition<0) {
		newPosition=0;
	}
	if (newPosition>=this.count) {
		newPosition = this.count-1;
	}
	
	this.position = newPosition;
	
	return this.position;
};

TickStorage.prototype._possiblyCreatePath = function() {
	if (!fs.existsSync(this._path)) { 
		try {
			fs.mkdirSync(this._path, 0755);
		} catch (e) {
			return false;
		}
	}
	return true;
};

/**

Save newly created tick file. 

@param {Boolean} quick if set then no index will be regenerated. **Use with care.** It's actually only needed in certain cases if you are rebuilding already existing ticks file. 

@return {Boolean} true if save was successful, guess what otherwise. 

**Note:** you cannot reuse newly saved TickStorage, you have to reload it. 

 */
TickStorage.prototype.save = function(quick) {
	if (!quick) { 
		this._orphanTicks.forEach(function(tick) {
			if (tick) {
				this.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket, true);
			}
		}, this);

		this._orphanTicks=[];

		this._generateMinuteIndex();
	}
	
	var bufferMinuteIndex = this.minuteIndex.toGzip();
	
	var header = {
		version: TickStorage.CURRENT_VERSION,
		symbol: this._symbol,
		daystamp: this._daystamp.toString(),
		countOfEntries: this.count || 0,
		marketOpenPos: this.marketOpenPos,
		marketClosePos: this.marketClosePos,
		additionalData: this.additionalData,
		minuteIndexSize: bufferMinuteIndex.length
	};
	
	if (this._bufferData) {
		if (!this._possiblyCreatePath()) {
			return false;
		}
		
		var fd = fs.openSync(this._path+this._filename+".tmp", "w");
		
		var bufferHeader;
		
		if (this.count>0) {
			var bytesLength = this.count*TickStorage.ENTRY_SIZE;
			
			var bufferCompressed = compress(this._bufferData.slice(0, bytesLength));
			bufferHeader = this._generateHeader(header);
			
			var targetBuffer = new Buffer(bufferHeader.length + bufferMinuteIndex.length + bufferCompressed.length);
			bufferHeader.copy(targetBuffer);
			bufferMinuteIndex.copy(targetBuffer, bufferHeader.length);
			bufferCompressed.copy(targetBuffer, bufferHeader.length + bufferMinuteIndex.length);
			
			fs.writeSync(fd, targetBuffer, 0, targetBuffer.length);
		} else { 
			// despite that it exists it's not stored, so do not confuse
			// any software with it's fake size
			header.minuteIndexSize = 0; 
			bufferHeader = this._generateHeader(header);
			fs.writeSync(fd, bufferHeader, 0, bufferHeader.length);
		}
		fs.closeSync(fd);

		if (fs.existsSync(this._path+this._filename)) {
			try {
				fs.unlinkSync(this._path+this._filename);
			} catch (e) {
				return false;
			}
		}

		try { 
			fs.renameSync(this._path+this._filename+".tmp", this._path+this._filename);
		} catch (ee) {
			return false;
		}
	}
	
	return true;
};

TickStorage.prototype._generateHeader = function(header) {
	var bufHeader = new Buffer(TickStorage.HEADER_SIZE);
	bufHeader.fill(0);
	bufHeader.write(JSON.stringify(header)+"\n",0,'ascii');
	return bufHeader; 
};

/**

Remove ticks file. Will not return anything and won't complain on errors.

 */

TickStorage.prototype.remove = function() {
	try { 
		fs.unlinkSync(this._path+this._filename);
	} catch(e) {
	}
};

/**

Load ticks file. 

@return {Boolean} true in case of success, false otherwise. 

 */
TickStorage.prototype.load = function() {
	this.position=0;
	this.count=0;
	this._bufferData=null;
	this.minuteIndex = new MinuteIndex();

	var fd;
	try { 
		fd = fs.openSync(this._path+this._filename, "r");
	} catch (e) {
		return false;
	}
	var stats = fs.fstatSync(fd);

	var headerValues = this._loadHeader(fd);
	if (!headerValues) {
		return false;
	}
	
	var headerAndMinuteIndexLength = TickStorage.HEADER_SIZE + headerValues.minuteIndexSize;
	
	if (this.count==0) {
		return true;
	}

	var minuteIndexBuffer = this._loadMinuteIndex(fd, headerValues.minuteIndexSize);
	if (!this.minuteIndex.fromGzip(minuteIndexBuffer)) {
		return false;
	}
	
	var bufferLength = stats.size - headerAndMinuteIndexLength;
	
	var buffer = new Buffer(bufferLength);
	buffer.fill(0);
	fs.readSync(fd, buffer, 0, buffer.length, headerAndMinuteIndexLength);
	fs.closeSync(fd);
	
	try { 
		this._bufferData = uncompress(buffer);
	} catch (ee) { 
		return false;
	}
	
	delete buffer;
	
	return this._bufferData ? true : false;
};

TickStorage.prototype._loadMinuteIndex = function(fd, minuteIndexSize) {
	var compressedMinuteIndex = new Buffer(minuteIndexSize); 
	fs.readSync(fd, compressedMinuteIndex, 0, minuteIndexSize, TickStorage.HEADER_SIZE);
	return compressedMinuteIndex;
};

TickStorage.prototype._loadHeader = function(fd) {
	try {
		var headerString = fs.readSync(fd, TickStorage.HEADER_SIZE, 0, 'ascii');
		headerString = headerString.toString().split("\n")[0];
	
		var headerData = JSON.parse(headerString);
		
		if (parseInt(headerData.version)>TickStorage.CURRENT_VERSION) {
			return null;
		}
		
		this.count = headerData.countOfEntries;
		this.marketOpenPos = headerData.marketOpenPos;
		this.marketClosePos = headerData.marketClosePos;
		this.additionalData = headerData.additionalData;
		
		return {
			uncompressed: headerData.uncompressed || false,
			minuteIndexSize: headerData.minuteIndexSize
		};
		
	} catch (e) {
		return null;
	}
};

/** 

Prepare TickStorage for creation of a new ticks file. You must only call this method on a fresh TickStorage instance. 

@params {Integer} megs how many megabytes of RAM to preallocate for tick storage. Each tick takes 13 bytes, so allocate wisely. By default it's 100MB which should be enough for everyone. 

 */

TickStorage.prototype.prepareForNew = function(megs) {
	megs = parseInt(megs) || 100;
	this._bufferData = new Buffer(1024*1024*megs);
	
	// we explicitly don't fill because of two reasons: 
	// a) when we save, we splice() only the part with real data
	// b) it slows down this method considerably.
	// this._bufferData.fill(0);
	
	this.minuteIndex = new MinuteIndex();
	this.minuteIndex.setStartUnixtime(this._startUnixtime);
	
	this._lastUnixtime=0;
	
	this.position = 0;
	this.count=0;
	this.marketOpenPos = null;
	this.marketClosePos = null;
	
	this.additionalData={};
	
	this._orphanTicks=[];
};

/** 

Add another brick in the wall. 

@param {Integer} unixtime unixtime;
@param {Integer} volume volume;
@param {Integer} price price;
@param {Boolean} isMarket true for market ticks, false or undefined for aftermarket;
@param {Boolean} disableOrphanLogic only set to true in case of terrorist attack.

"Orphan logic" is prevention against weird ticks from the distant past or distant future. It also filters out
duplicate ticks from the distant past or future. Orphan ticks are moved into their respective positions in ticks
history, making it consistent. Actually never disable this logic unless you are doing conversion
of ticks database from one format to another. 

 */

TickStorage.prototype.addTick = function(unixtime, volume, price, isMarket, disableOrphanLogic) {
	if (unixtime<this._startUnixtime || unixtime>=this._endUnixtime) {
		return;
	}
	
	// zero price is fine (volume correction ticks), but negative is not.
	if (volume<=0 || price<0) {
		return;
	}
	
	if (!this._lastUnixtime) { 
		this._lastUnixtime = unixtime;
	}
	
	if (!disableOrphanLogic && unixtime < this._lastUnixtime-600) {
		var found = this._findPositionOfPreviousTickWithCloseUnixtime(unixtime), z;
		
		if (found!=null) {
			for(z=found+1;z<this.position;z++) {
				this._orphanTicks.push(this.tickAtPosition(z));
			}
			
			// this.dumpOrphanTicks();
			
			this._compressAdditionalTicks();

			this.position = found+1;
			this.count = this.position;
		}
	}
	
	this._lastUnixtime = unixtime;

	if (!disableOrphanLogic) { 
		this._possiblyAppendAdditionalTicks();
	}

	var offset = this.position * TickStorage.ENTRY_SIZE;
	this._bufferData.writeUInt32LE(unixtime, offset);
	this._bufferData.writeUInt32LE(volume, offset+4);
	this._bufferData.writeUInt32LE(price, offset+8);
	this._bufferData.writeUInt8(isMarket?1:0, offset+12);

	if (isMarket) { 
		if (this.marketOpenPos===null) {
			this.marketOpenPos = this.position;
		}
		this.marketClosePos = this.position;
	}

	this.position++;
	this.count++;
};

TickStorage.prototype._possiblyAppendAdditionalTicks = function() {
	var tick, p;
	for (p=0;p<this._orphanTicks.length;p++) {
		tick = this._orphanTicks[p];
		if (tick && tick.unixtime<this._lastUnixtime) {
			this.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket, true);
			this._orphanTicks[p] = null;
		}
	}
};

TickStorage.prototype._findPositionOfPreviousTickWithCloseUnixtime = function(unixtime) {
	var _tick, pos;
	for (pos=this.position-1;pos>=this.position-5;pos--) {
		_tick = this.tickAtPosition(pos);
		if (_tick && Math.abs(_tick.unixtime - unixtime) < 10) { 
			return pos;
		}
	}
	return null;
};

TickStorage.prototype._generateMinuteIndex = function() {
	var tick, pos;
	this.minuteIndex.resetIndex();
	for (pos=0;pos<this.count;pos++) {
		tick = this.tickAtPosition(pos);
		this.minuteIndex.addTick(pos, tick.unixtime, tick.volume, tick.price, tick.isMarket);
	}
};

/**

Internal development tool: dumps current orphan ticks in buffer. 

@private

 */

TickStorage.prototype.dumpOrphanTicks = function() {
	this._orphanTicks.forEach(function(entry) {
		if (entry) { 
			console.log(
				"%s, %d @ %s is out of order", 
				Date.parseUnixtime(entry.unixtime).toFormat('HH24:MI:SS'), entry.volume, entry.price
			);
		}
	}, this);
};

TickStorage.prototype._compressAdditionalTicks = function() {
	var lastEntry = JSON.stringify(this._orphanTicks[0]);
	var clearPool=[this._orphanTicks[0]];
	
	this._orphanTicks.forEach(function(entry) {
		if (JSON.stringify(entry) != lastEntry) {
			clearPool.push(entry);
		}
		lastEntry = JSON.stringify(entry);
	}, this);
	
	this._orphanTicks = clearPool;
};

/** 

Return tick entry at position. 

@param {Integer} position position.

@return Tick entry or null.

 */

TickStorage.prototype.tickAtPosition = function(position) { 
	if (position>=this.count) {
		return null;
	}
	
	return this._tickAtOffset(position*TickStorage.ENTRY_SIZE);
};

TickStorage.prototype._tickAtOffset = function(offset) { 
	if (!this._bufferData || offset>=this._bufferData.length || offset < 0) { 
		return null;
	}
	
	return {
		unixtime: this._bufferData.readUInt32LE(offset),
		volume: this._bufferData.readUInt32LE(offset+4),
		price: this._bufferData.readUInt32LE(offset+8), 
		isMarket: this._bufferData.readUInt8(offset+12) == 1 
	};
};

TickStorage.prototype._nextTickAll = function() { 
	return this._tickAtOffset(this.position++*TickStorage.ENTRY_SIZE);
};

TickStorage.prototype._nextTickMarket = function() { 
	var tick;
	do {
		tick = this._nextTickAll();
	} while (tick && !tick.isMarket && this.position<=this.marketClosePos);
	
	if (tick && !tick.isMarket) {
		return null;
	}
	return tick;
};

/**

An iterator. Get next tick entry or null. 

@return tick entry or null.

 */ 

// trick doc.js: 
/* 
TickStorage.prototype.nextTick = function() { 
 */

module.exports = TickStorage;
