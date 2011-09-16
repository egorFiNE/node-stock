util = require('util');
fs = require('fs');
path = require('path');
events = require('events');
require('./ExtraDate');
compress = require('compress-buffer').compress;
uncompress = require('compress-buffer').uncompress;

function MinuteIndex() {
	this.index = [];
	var m=0;
	for(m=0;m<=1440;m++) {
		this.index[m]=null;
	}
	
	this.ticksCount=0;
	this.startUnixtime = null;
	
	this.lastMinute=-1;
}

MinuteIndex.prototype.setStartUnixtime = function(unixtime) {
	this.startUnixtime = unixtime;
}

MinuteIndex.prototype.addTick = function(unixtime, price) {
	var minute = Math.floor((unixtime-this.startUnixtime)/60);
	if (minute>=1440) {
		/*
		console.log("Cannot add minute %d, which is at %s with starting unixtime %s", minute, 
			Date.parseUnixtime(unixtime), Date.parseUnixtime(this.startUnixtime));
		*/
		return;  // FIXME or what else?
	}
	if (this.index[minute]===null) {
		this.index[minute]={
			p: this.ticksCount,
			h: Number.MIN_VALUE,
			l: Number.MAX_VALUE
		};
	}
	
	this.index[minute].h = Math.max(this.index[minute].h, price);
	this.index[minute].l = Math.min(this.index[minute].l, price);
	
	this.lastMinute = minute;
	this.ticksCount++;
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
	this.dbPath = dbPath;
	this.symbol = symbol;

	this.daystamp = daystamp;

	var day = Date.parseDaystamp(this.daystamp);
	this.startUnixtime = day.unixtime();
	
	this.path = dbPath+'/'+symbol+'/';
	this.filename = this.path+this.daystamp+'.ticks';
	
	this.bufferData = null; 
	this.minuteIndex = null;
	
	this.offset=0;
	this.countOfEntries=0;
	
	this.additionalData={};
}

TickStorage.HEADER_SIZE=1024;
TickStorage.ENTRY_SIZE=13;
TickStorage.CURRENT_VERSION=1;

TickStorage.prototype._buf2int = function(offset) {
	return this.bufferData[0+offset] +
		(this.bufferData[1+offset] << 8) +
		(this.bufferData[2+offset] << 16) +
		(this.bufferData[3+offset] << 24);
}

TickStorage.prototype._int2buf = function(offset, num) {
	this.bufferData[0+offset] = num;
	this.bufferData[1+offset] = num >> 8;
	this.bufferData[2+offset] = num >> 16;
	this.bufferData[3+offset] = num >> 24;
}

TickStorage.prototype.exists = function() {
	return path.existsSync(this.filename);
}

TickStorage.prototype.rewind = function(ticks) {
	if (!ticks) {
		this.offset=0;
	} else { 
		this.offset-=TickStorage.ENTRY_SIZE*ticks;
		if (this.offset<0) {
			this.offset=0;
		}
	}
}

TickStorage.prototype._possiblyCreatePath = function() {
	if (!path.existsSync(this.path)) { 
		try {
			fs.mkdirSync(this.path, 0755);
		} catch (e) {
			return false;
		}
	}
	return true;
}

TickStorage.prototype.save = function() {
	var minuteIndexBuffer = this.minuteIndex.toGzip();
	
	var header = {
		version: TickStorage.CURRENT_VERSION,
		symbol: this.symbol,
		daystamp: this.daystamp.toString(),
		countOfEntries: this.countOfEntries || 0,
		marketOpenPos: this.marketOpenPos,
		marketClosePos: this.marketClosePos,
		marketHigh: this._getMarketHigh(),
		marketLow: this._getMarketLow(),
		marketOpen: this.marketOpen,
		marketClose: this.marketClose,
		additionalData: this.additionalData,
		minuteIndexSize: minuteIndexBuffer.length
	};
	
	if (this.bufferData) {
		if (!this._possiblyCreatePath()) {
			return false;
		}
		
		var fd = fs.openSync(this.filename+".tmp", "w");
		
		if (this.countOfEntries>0) {
			var bytesLength = this.countOfEntries*TickStorage.ENTRY_SIZE;
			
			var bufferWithData = this.bufferData.slice(0, bytesLength);
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

		if (path.existsSync(this.filename)) {
			try {
				fs.unlinkSync(this.filename);
			} catch (e) {
				return false;
			}
		}

		try { 
			fs.renameSync(this.filename+".tmp", this.filename);
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
		fs.unlinkSync(this.filename);
	} catch(e) {
	}
}

TickStorage.prototype.load = function() {
	this.offset=0;
	this.bufferData=null;
	this.minuteIndex = new MinuteIndex();

	var fd;
	try { 
		fd = fs.openSync(this.filename, "r");
	} catch (e) {
		return false;
	}
	var stats = fs.fstatSync(fd);

	var headerValues = this._loadHeader(fd);
	if (!headerValues) {
		return false;
	}
	
	var headerAndMinuteIndexLength = TickStorage.HEADER_SIZE + headerValues.minuteIndexSize;
	
	if (this.countOfEntries==0) {
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
	
	this.bufferData = uncompress(buffer);
	delete buffer;
	
	return this.bufferData ? true : false;
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
		
		this.countOfEntries = headerData.countOfEntries;
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
	this.bufferData = new Buffer(1024*1024*megs);
	
	this.minuteIndex = new MinuteIndex();
	this.minuteIndex.setStartUnixtime(this.startUnixtime);
	
	this.offset=0;
	
	this.countOfEntries = 0;
	this.marketOpenPos = null;
	this.marketClosePos = null;
	
	this.marketHigh = Number.MIN_VALUE;
	this.marketLow = Number.MAX_VALUE;
	this.marketOpen = null;
	this.marketClose = null;
	
	this.additionalData={};
}

TickStorage.prototype.addTick = function(unixtime, volume, price, isMarket) {
	this._int2buf(this.offset, unixtime);
	this._int2buf(this.offset+4, volume);
	this._int2buf(this.offset+8, price);
	this.bufferData[this.offset+12] = isMarket?1:0;
	this.offset+=TickStorage.ENTRY_SIZE;
	
	this.minuteIndex.addTick(unixtime, price);
	
	if (isMarket) { 
		if (this.marketOpenPos===null) {
			this.marketOpenPos = this.countOfEntries;
			this.marketOpen = price;
			this.marketHigh = price;
			this.marketLow = price;
		}
		this.marketClosePos = this.countOfEntries;
		this.marketClose = price;
		
		this.marketHigh = Math.max(this.marketHigh, price);
		this.marketLow = Math.min(this.marketLow, price);
	}
	
	this.countOfEntries++;
}

TickStorage.prototype.nextTick = function() { 
	if (!this.bufferData || this.offset>=this.bufferData.length) { 
		return null;
	}
	
	var result = {
		unixtime: this._buf2int(this.offset),
		volume: this._buf2int(this.offset+4),
		price: this._buf2int(this.offset+8),
		isMarket: this.bufferData[this.offset+12] == 1
	};

	this.offset+=TickStorage.ENTRY_SIZE;
	return result;
}

TickStorage.prototype.getHloc = function() {
	if (this.countOfEntries==0 || !this.bufferData) {
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

