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
	this._symbol = symbol.toUpperCase();

	this._daystamp = daystamp;

	var day = Date.parseDaystamp(this._daystamp);
	this._startUnixtime = day.unixtime();
	this._endUnixtime = this._startUnixtime+86400;
	
	this._path = dbPath+'/'+symbol+'/';
	this._filename = this._path+this._daystamp+'.ticks';
	
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

TickStorage.prototype.filterMarketTime = function() {
	this.marketTimeOnly = true;
	if (this.position < this.marketOpenPos) {
		this.position = this.marketOpenPos;
	}
	
	this.nextTick = this._nextTickMarket;
}

TickStorage.prototype.getSymbol = function() {
	return this._symbol;
}

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

TickStorage.prototype.tellMinute = function() {
	for (var m=0;m<1440;m++) {
		if (this.minuteIndex.index[m] && this.position>=this.minuteIndex.index[m].o && this.position<=this.minuteIndex.index[m].c) {
			return m;
		}
	}
	return null;
}

TickStorage.prototype.seekToMinute = function(minute) {
	var m = this.minuteIndex.index[minute];
	if (m) {
		this.position = m.o;
		return true;
	} else { 
		return false;
	}
}

TickStorage.prototype.rewind = function(ticks) {
	if (!ticks) {
		this.position=0;
	} else { 
		this.position -= ticks;
		if (this.position<0) {
			this.position=0;
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

TickStorage.prototype.save = function(quick) {
	if (!quick) { 
		this._orphanTicks.forEach(function(tick) {
			if (tick) {
				this.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket, true);
			}
		}, this);

		this._orphanTicks=[];

		this.generateMinuteIndex();
	}
	
	var minuteIndexBuffer = this.minuteIndex.toGzip();
	
	var header = {
		version: TickStorage.CURRENT_VERSION,
		symbol: this._symbol,
		daystamp: this._daystamp.toString(),
		countOfEntries: this.count || 0,
		marketOpenPos: this.marketOpenPos,
		marketClosePos: this.marketClosePos,
		additionalData: this.additionalData,
		minuteIndexSize: minuteIndexBuffer.length
	};
	
	if (this._bufferData) {
		if (!this._possiblyCreatePath()) {
			return false;
		}
		
		var fd = fs.openSync(this._filename+".tmp", "w");
		
		if (this.count>0) {
			var bytesLength = this.count*TickStorage.ENTRY_SIZE;
			
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
	this.position=0;
	this.count=0;
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
	
	this._lastUnixtime=0;
	
	this.position = 0;
	this.count=0;
	this.marketOpenPos = null;
	this.marketClosePos = null;
	
	this.additionalData={};
	
	this._orphanTicks=[];
}

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
		var found = this._findPositionOfPreviousTickWithCloseUnixtime(unixtime);
		
		if (found!=null) {
			for(var z=found+1;z<this.position;z++) {
				this._orphanTicks.push(this.tickAtPosition(z));
			}
			
			this.dumpAdditionalTicks();
			
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
	this._int2buf(offset, unixtime);
	this._int2buf(offset+4, volume);
	this._int2buf(offset+8, price);
	this._bufferData[offset+12] = isMarket?1:0;

	if (isMarket) { 
		if (this.marketOpenPos===null) {
			this.marketOpenPos = this.position;
		}
		this.marketClosePos = this.position;
	}

	this.position++;
	this.count++;
}

TickStorage.prototype._possiblyAppendAdditionalTicks = function() {
	for (var p=0;p<this._orphanTicks.length;p++) {
		var tick = this._orphanTicks[p];
		if (tick && tick.unixtime<this._lastUnixtime) {
			this.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket, true);
			this._orphanTicks[p] = null;
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
	for (var pos=0;pos<this.count;pos++) {
		var tick = this.tickAtPosition(pos);
		this.minuteIndex.addTick(pos, tick.unixtime, tick.volume, tick.price, tick.isMarket);
	}
}

TickStorage.prototype.dumpAdditionalTicks = function() {
	this._orphanTicks.forEach(function(entry) {
		if (entry) { 
			console.log(
				"%s, %d @ %s is out of order", 
				Date.parseUnixtime(entry.unixtime).toFormat('HH24:MI:SS'), entry.volume, entry.price
			);
		}
	}, this);
}

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
}


TickStorage.prototype.tickAtPosition = function(position) { 
	if (position>=this.count) {
		return null;
	}
	
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

TickStorage.prototype._nextTickAll = function() { 
	return this._tickAtOffset(this.position++*TickStorage.ENTRY_SIZE);
}

TickStorage.prototype._nextTickMarket = function() { 
	var tick;
	do {
		tick = this._nextTickAll();
	} while (tick && !tick.isMarket && this.position<=this.marketClosePos);
	
	if (tick && !tick.isMarket) {
		return null;
	}
	return tick;
}

module.exports = TickStorage;
