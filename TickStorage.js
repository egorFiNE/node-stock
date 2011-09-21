util = require('util');
fs = require('fs');
path = require('path');
events = require('events');
require('./ExtraDate');
compress = require('compress-buffer').compress;
uncompress = require('compress-buffer').uncompress;

function MinuteIndex() {
	this.index = [];
	
	this.resetIndex();
	
	this._startUnixtime = null;
}

MinuteIndex.prototype.resetIndex = function() {
	for(var m=0;m<=1440;m++) {
		this.index[m]=null;
	}
}

MinuteIndex.prototype.setStartUnixtime = function(unixtime) {
	this._startUnixtime = unixtime;
}

MinuteIndex.prototype.dump = function(fromMinute, toMinute) {
	fromMinute = fromMinute || 0;
	toMinute = toMinute || 1440-1;
	var i;
	for(i=fromMinute;i<=toMinute;i++) {
		util.debug(util.format("%d: %s", i, util.inspect(this.index[i])));
	}
}

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
	// util.debug(minute+ " = " + util.inspect(this.index[minute]));

}

MinuteIndex.prototype.toGzip = function() {
	return compress(new Buffer(JSON.stringify(this.index))); 
}

MinuteIndex.prototype.fromGzip = function(buffer) {
	var uncompressed = uncompress(buffer);
	if (!uncompressed) {
		return false;
	}
	
	try { 
		this.index = JSON.parse(uncompressed.toString());
	} catch (e) {
		return false;
	}
	
	return true;
}


function TickStorage(dbPath, symbol, daystamp) { 
	this._dbPath = dbPath;
	this._symbol = symbol;

	this._daystamp = daystamp;

	var day = Date.parseDaystamp(this._daystamp);
	this._startUnixtime = day.unixtime();
	
	this._path = dbPath+'/'+symbol+'/';
	this._filename = this._path+this._daystamp+'.ticks';
	
	this._bufferData = null; 
	this.minuteIndex = null;
	
	this._offset=0;
	
	this._lastUnixtime=null;
	
	this.position=0;
	
	this.additionalData={};
}

TickStorage.HEADER_SIZE=1024;
TickStorage.ENTRY_SIZE=13;
TickStorage.CURRENT_VERSION=1;

TickStorage.prototype._buf2int = function(offset) {
	return this._bufferData[0+offset] +
		(this._bufferData[1+offset] << 8) +
		(this._bufferData[2+offset] << 16) +
		(this._bufferData[3+offset] << 24);
}

TickStorage.prototype._int2buf = function(offset, num) {
	this._bufferData[0+offset] = num;
	this._bufferData[1+offset] = num >> 8;
	this._bufferData[2+offset] = num >> 16;
	this._bufferData[3+offset] = num >> 24;
}

TickStorage.prototype.exists = function() {
	return path.existsSync(this._filename);
}

TickStorage.prototype.rewind = function(ticks) {
	if (!ticks) {
		this._offset=0;
	} else { 
		this._offset-=TickStorage.ENTRY_SIZE*ticks;
		if (this._offset<0) {
			this._offset=0;
		}
	}
}

TickStorage.prototype._possiblyCreatePath = function() {
	if (!path.existsSync(this._path)) { 
		try {
			fs.mkdirSync(this._path, 0755);
		} catch (e) {
			return false;
		}
	}
	return true;
}

TickStorage.prototype.save = function() {
	for(var p=0;p<this._additionalTicks.length;p++) {
		var tick = this._additionalTicks[p];
		if (tick.unixtime<Number.MAX_VALUE) {
			// console.log("adding %d before end", tick.price);
			this.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket, true);
		}
	}
	
	this._additionalTicks=[];
	
	this.generateMinuteIndex();
	
	var minuteIndexBuffer = this.minuteIndex.toGzip();
	
	var header = {
		version: TickStorage.CURRENT_VERSION,
		symbol: this._symbol,
		daystamp: this._daystamp.toString(),
		countOfEntries: this.position || 0,
		marketOpenPos: this.marketOpenPos,
		marketClosePos: this.marketClosePos,
		marketHigh: this._getMarketHigh(),
		marketLow: this._getMarketLow(),
		marketOpen: this.marketOpen,
		marketClose: this.marketClose,
		additionalData: this.additionalData,
		minuteIndexSize: minuteIndexBuffer.length
	};
	
	if (this._bufferData) {
		if (!this._possiblyCreatePath()) {
			return false;
		}
		
		var fd = fs.openSync(this._filename+".tmp", "w");
		
		if (this.position>0) {
			var bytesLength = this.position*TickStorage.ENTRY_SIZE;
			
			var bufferWithData = this._bufferData.slice(0, bytesLength);
			var bufferToWrite = compress(bufferWithData);

			this._saveHeader(fd, header);
			
			fs.writeSync(fd, minuteIndexBuffer, 0, minuteIndexBuffer.length);
			fs.writeSync(fd, bufferToWrite, 0, bufferToWrite.length);
		} else { 
			// despite that it exists it's not stored, so do not confuse
			// any software with it's fake size
			header.minuteIndexSize = 0; 
			this._saveHeader(fd, header);
		}
		fs.closeSync(fd);

		if (path.existsSync(this._filename)) {
			try {
				fs.unlinkSync(this._filename);
			} catch (e) {
				return false;
			}
		}

		try { 
			fs.renameSync(this._filename+".tmp", this._filename);
		} catch (e) {
			return false;
		}
	}
	
	return true;
}

TickStorage.prototype._saveHeader = function(fd, header) {
	var bufHeader = new Buffer(TickStorage.HEADER_SIZE);
	bufHeader.fill(0);
	bufHeader.write(JSON.stringify(header)+"\n",0,'ascii');
	fs.writeSync(fd, bufHeader, 0, bufHeader.length);
}

TickStorage.prototype.remove = function() {
	try { 
		fs.unlinkSync(this._filename);
	} catch(e) {
	}
}

TickStorage.prototype.load = function() {
	this._offset=0;
	this._bufferData=null;
	this.minuteIndex = new MinuteIndex();

	var fd;
	try { 
		fd = fs.openSync(this._filename, "r");
	} catch (e) {
		return false;
	}
	var stats = fs.fstatSync(fd);

	var headerValues = this._loadHeader(fd);
	if (!headerValues) {
		return false;
	}
	
	var headerAndMinuteIndexLength = TickStorage.HEADER_SIZE + headerValues.minuteIndexSize;
	
	if (this.position==0) {
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
	
	this._bufferData = uncompress(buffer);
	delete buffer;
	
	return this._bufferData ? true : false;
}

TickStorage.prototype._loadMinuteIndex = function(fd, minuteIndexSize) {
	var compressedMinuteIndex = new Buffer(minuteIndexSize); 
	fs.readSync(fd, compressedMinuteIndex, 0, minuteIndexSize, TickStorage.HEADER_SIZE);
	return compressedMinuteIndex;
}

TickStorage.prototype._loadHeader = function(fd) {
	try {
		var headerString = fs.readSync(fd, TickStorage.HEADER_SIZE, 0, 'ascii');
		headerString = headerString.toString().split("\n")[0];
	
		var headerData = JSON.parse(headerString);
		
		if (parseInt(headerData.version)>TickStorage.CURRENT_VERSION) {
			return null;
		}
		
		this.position = headerData.countOfEntries;
		this.marketOpenPos = headerData.marketOpenPos;
		this.marketClosePos = headerData.marketClosePos;
		this.marketHigh = headerData.marketHigh;
		this.marketLow = headerData.marketLow;
		this.marketOpen = headerData.marketOpen;
		this.marketClose = headerData.marketClose;
		this.additionalData = headerData.additionalData;
		
		return {
			uncompressed: headerData.uncompressed || false,
			minuteIndexSize: headerData.minuteIndexSize
		};
		
	} catch (e) {
		return null;
	}
}

TickStorage.prototype.prepareForNew = function(megs) {
	megs = parseInt(megs) || 100;
	this._bufferData = new Buffer(1024*1024*megs);
	
	// we explicitly don't fill because of two reasons: 
	// a) when we save, we splice() only the part with real data
	// b) it slows down this method considerably.
	// this._bufferData.fill(0);
	
	this.minuteIndex = new MinuteIndex();
	this.minuteIndex.setStartUnixtime(this._startUnixtime);
	
	this._offset=0;
	this._lastUnixtime=0;
	
	this.position = 0;
	this.marketOpenPos = null;
	this.marketClosePos = null;
	
	this.marketHigh = Number.MIN_VALUE;
	this.marketLow = Number.MAX_VALUE;
	this.marketOpen = null;
	this.marketClose = null;
	
	this.additionalData={};
	
	this._additionalTicks=[];
}

TickStorage.prototype.addTick = function(unixtime, volume, price, isMarket, disableLogic) {
	if (unixtime<this._startUnixtime) {
		return;
	}
	
	if (volume<=0) {
		return;
	}
	
	if (!this._lastUnixtime) { 
		this._lastUnixtime = unixtime;
	}
	
	if (!disableLogic && unixtime < this._lastUnixtime-600) {
		var found = this._findPositionOfPreviousTickWithCloseUnixtime(unixtime);
		
		if (found!=null) {
			for(var z=found+1;z<this.position;z++) {
				this._additionalTicks.push(this.tickAtPosition(z));
			}
			
			this.dumpAdditionalTicksPool();
			
			this._compressAdditionalTicksPool();

			this.position = found+1;
			this._offset=(TickStorage.ENTRY_SIZE * this.position);
		}
	}
	
	this._lastUnixtime = unixtime;

	if (!disableLogic) { 
		this._possiblyAppendAdditionalTicks();
	}
	
	this._int2buf(this._offset, unixtime);
	this._int2buf(this._offset+4, volume);
	this._int2buf(this._offset+8, price);
	this._bufferData[this._offset+12] = isMarket?1:0;
	this._offset+=TickStorage.ENTRY_SIZE;

	if (isMarket) { 
		if (this.marketOpenPos===null) {
			this.marketOpenPos = this.position;
			this.marketOpen = price;
			this.marketHigh = price;
			this.marketLow = price;
		}
		this.marketClosePos = this.position;
		this.marketClose = price;

		this.marketHigh = Math.max(this.marketHigh, price);
		this.marketLow = Math.min(this.marketLow, price);
	}

	this.position++;
}

TickStorage.prototype._possiblyAppendAdditionalTicks = function() {
	for(var p=0;p<this._additionalTicks.length;p++) {
		var tick = this._additionalTicks[p];
		if (tick.unixtime<this._lastUnixtime) {
			this.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket, true);
			tick.unixtime = Number.MAX_VALUE; // quick way to eliminate from archive
		}
	}
}

TickStorage.prototype._findPositionOfPreviousTickWithCloseUnixtime = function(unixtime) {
	for (var pos=this.position-1;pos>=this.position-5;pos--) {
		var _tick = this.tickAtPosition(pos);
		if (_tick && Math.abs(_tick.unixtime - unixtime) < 10) { 
			return pos;
		}
	}
	return null;
}

TickStorage.prototype.generateMinuteIndex = function() {
	this.minuteIndex.resetIndex();
	for (var pos=0;pos<this.position;pos++) {
		var tick = this.tickAtPosition(pos);
		this.minuteIndex.addTick(pos, tick.unixtime, tick.volume, tick.price, tick.isMarket);
	}
}

TickStorage.prototype.dumpAdditionalTicksPool = function() {
	this._additionalTicks.forEach(function(entry) {
		console.log(
			"%s, %d @ %s is out of order", 
			Date.parseUnixtime(entry.unixtime).toFormat('HH24:MI:SS'), entry.volume, entry.price
		);
	}, this);
}

TickStorage.prototype._compressAdditionalTicksPool = function() {
	var lastEntry = JSON.stringify(this._additionalTicks[0]);
	var clearPool=[this._additionalTicks[0]];
	
	this._additionalTicks.forEach(function(entry) {
		if (JSON.stringify(entry) != lastEntry) {
			clearPool.push(entry);
		}
		lastEntry = JSON.stringify(entry);
	}, this);
	
	this._additionalTicks = clearPool;
}


TickStorage.prototype.tickAtPosition = function(position) { 
	return this._tickAtOffset(position*TickStorage.ENTRY_SIZE);
}

TickStorage.prototype._tickAtOffset = function(offset) { 
	if (!this._bufferData || offset>=this._bufferData.length || offset < 0) { 
		return null;
	}
	
	return {
		unixtime: this._buf2int(offset),
		volume: this._buf2int(offset+4),
		price: this._buf2int(offset+8),
		isMarket: this._bufferData[offset+12] == 1
	}
}

TickStorage.prototype.nextTick = function() { 
	var result = this._tickAtOffset(this._offset);
	this._offset+=TickStorage.ENTRY_SIZE;
	return result;
}

TickStorage.prototype.getHloc = function() {
	if (this.position==0 || !this._bufferData) {
		return {
			h: null,
			l: null,
			o: null,
			c: null
		}
	}
	
	return {
		h: this._getMarketHigh(),
		l: this._getMarketLow(),
		o: this.marketOpen,
		c: this.marketClose
	}
}

TickStorage.prototype._getMarketHigh = function() {
	return this.marketHigh==Number.MIN_VALUE?null:this.marketHigh;
}

TickStorage.prototype._getMarketLow = function() {
	return this.marketLow==Number.MAX_VALUE?null:this.marketLow;
}

module.exports = TickStorage;
