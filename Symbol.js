fs = require('fs');
path = require('path');

Symbol = function(dbPath, symbol) {
	this.dbPath = dbPath;
	this.symbol = symbol;
	this.days = [];
	this.dayPosition=0;
	
	this.dirPath = this.dbPath+'/'+this.symbol+'/';
}

Symbol.prototype.isActive = function() {
	return !path.existsSync(this.dirPath+"/inactive");
}

Symbol.prototype.load = function() {
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
