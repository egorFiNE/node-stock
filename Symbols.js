fs = require('fs');
path = require('path');
Symbol = require('./Symbol');

/**

Represents ticks database. Essentially this is just a wrapper around a 
list of folders whose names are uppercase symbol names.

@param {String} dbPath - path to the ticks database.

Example: 

	var symbols = new Symbols('/home/tickers');
	if (!symbols.load()) {
		console.log("Oops?");
		return;
	}

	var symbol;
	while ((symbol=symbols.next())) {
		console.log("Symbol: %s", symbol.symbol);
	}
 */

function Symbols(dbPath) {
	this.dbPath = dbPath;
	this.symbols = [];
}

/**

Load list of tickers from the database. Essentially will load all directory names from dbpath, skipping some specials.

@return {Boolean} true if successfully loaded.
 */

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

/**

Checks if the symbol exists in the database. Essentially checks if the folder with such a name (uppercased)
exists in dbpath. 

@param {String} symbol - the symbol name to check.

@return {Boolean}

 */

Symbols.prototype.exists = function(symbol) {
	return this.symbols.indexOf((symbol || '').toUpperCase()) >= 0;
}

/** 

Rewind the iterator position back to zero. 

 */

Symbols.prototype.rewind = function() {
	this.position=0;
}

/** 

Get the next symbol from iterator. 

@return {Symbol} the Symbol object created. It's your duty to call <code>load()</code> on it.

 */

Symbols.prototype.next = function() {
	if (this.symbols[this.position]) {
		return new Symbol(this.dbPath, this.symbols[this.position++]);
	}
	return null;
}

/** 

Will return the count of symbols in tickers database.

@return {Integer}

 */

Symbols.prototype.count = function() {
	return this.symbols.length;
}

module.exports = Symbols;

