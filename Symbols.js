fs = require('fs');
path = require('path');
symbol = require('./Symbol');

Symbols = function(dbPath) {
	this.dbPath = dbPath;
	this.symbols = [];
	this.load();
}

Symbols.prototype.load = function() {
	if (!path.existsSync(this.dbPath)) {
		return false;
	}
	
	var files = fs.readdirSync(this.dbPath);
	files = files.sort();
	var i=0;
	var symbolsUnsorted = [];
	files.forEach(function(name) {
		if (name.substr(0,1)!=='.' && name.toUpperCase()===name) {
			symbolsUnsorted.push(name);
		}
	});

	this.symbols = symbolsUnsorted.sort();
	this.position=0;
	
	return true;
}

Symbols.prototype.exists = function(symbol) {
	var i=0;
	for(i=0;i<this.symbols.length;i++) {
		if (this.symbols[i]==symbol) {
			return true;
		}
	}
	return false;
}

Symbols.prototype.rewind = function() {
	this.position=0;
}

Symbols.prototype.next = function() {
	if (this.symbols[this.position]) {
		return new Symbol(this.dbPath, this.symbols[this.position++]);
	}
	return null;
}

Symbols.prototype.count = function() {
	return this.symbols.length;
}

module.exports = Symbols;

