fs = require('fs');
path = require('path');

Symbol = function(dbPath, symbol) {
	this.dbPath = dbPath;
	this.symbol = symbol;
	this.days = [];
	this.dayPosition=0;
	
	this.dirPath = this.dbPath+'/'+this.symbol+'/';
	
	this._metaFilename = this.dirPath+'meta.json';
	this.meta={};
	
	this._loadMeta();
}

Symbol.prototype.setIsActive = function(isActive) {
	if (isActive) {
		delete this.meta.isInactive;
	} else { 
		this.meta.isInactive = true;
	}
}

Symbol.prototype.isActive = function() {
	return this.meta.isInactive ? false : true;
}

Symbol.prototype._loadMeta = function() {
	if (path.existsSync(this._metaFilename)) {
		try {
			var data = fs.readFileSync(this._metaFilename);
			data = data.toString();
			data = JSON.parse(data);
			this.meta = data;
		} catch (e) {
			this.meta = {};
		}
	}
}

Symbol.prototype.save = function() {
	this._saveMeta();
}

Symbol.prototype._saveMeta = function() {
	if (Object.keys(this.meta).length <= 0) {
		return;
	}
	
	var data = JSON.stringify(this.meta);
	fs.writeFileSync(this._metaFilename+'.tmp', data);
	if (path.existsSync(this._metaFilename)) {
		fs.unlinkSync(this._metaFilename);
	}
	fs.renameSync(this._metaFilename+'.tmp', this._metaFilename);
}

Symbol.prototype.load = function() {
	this._loadMeta();
	
	this.days=[];
	this.dayPosition=0;
	
	if (!path.existsSync(this.dirPath)) {
		return false;
	}
	
	var files = fs.readdirSync(this.dirPath);
	files = files.sort();
	files = files.filter(function(filename) {
		return (filename.substr(0,1)!='.' && filename.substr(filename.length-5,5)=="ticks");
	}, this);
	
	this.days = files.map(function(filename) {
		return filename.substr(0,8)
	}, this);
	
	return true;
}

Symbol.prototype.forEachDay = function(cb, context) {
	this.days.forEach(cb, context);
}

Symbol.prototype.rewind = function() {
	this.dayPosition=0;
}

Symbol.prototype.nextDay = function() {
	return this.days[this.dayPosition++];
}

Symbol.prototype.firstDay = function() {
	return this.days[0];
}

Symbol.prototype.lastDay = function() {
	return this.days[this.days.length-1];
}

Symbol.prototype.count = function() {
	return this.days.length;
}

Symbol.prototype.dayExists = function(daystamp) {
	return this.days.indexOf(daystamp)>=0;
}

Symbol.prototype.getLastXDays = function(x) {
	var result = [];
	var i=this.days.length;
	for(i=this.days.length-1;i>=0;i--) {
		result.push(this.days[i]);
		if (result.length==x) {
			return result;
		}
	}
	return result;
}

module.exports = Symbol;
