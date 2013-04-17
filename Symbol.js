var 
	fs = require('fs'),
	path = require('path');

/**

Represents one particular symbol storage in the ticks database. Essentially this is just a wrapper around a 
list of *.ticks files with handy access methods. 

@param {String} dbPath path to ticks database.
@param {String} symbol symbol name, must be uppercase.

Tick files list is generated from <code>*.ticks</code> in <code>dbPath/SYMBOL/</code>.

Example: 

	var symbol = new Symbol('/home/tickers', 'AAPL');
	if (!symbol.load()) {
		console.log("Oops?");
		return;
	}

	var daystamp;
	while ((daystamp=symbol.next())) {
		console.log("Day: %s", daystamp);
	}
*/

function Symbol(dbPath, symbol) {
	this.dbPath = dbPath;
	this.symbol = symbol;
	this.days = [];
	this.dayPosition=0;
	
	this.dirPath = this.dbPath+'/'+this.symbol+'/';
	
	this._metaFilename = this.dirPath+'meta.json';
	this.meta={};
	
	this._loadMeta();
}

/**

Set active flag for the ticker. This flag is used by downloader to skip download this ticker from 
IQFeed if the flag is set. Defaults to false, of course. Don't forget to call <code>.save()</code> after
setting the flag.

 */

Symbol.prototype.setIsActive = function(isActive) {
	if (isActive) {
		delete this.meta.isInactive;
	} else { 
		this.meta.isInactive = true;
	}
};

/**

Get active flag for the ticker. 

*/

Symbol.prototype.isActive = function() {
	return this.meta.isInactive ? false : true;
};

/**

Load meta information from <code>dbPath/symbol/meta.json</code>.

*/


Symbol.prototype._loadMeta = function() {
	if (fs.existsSync(this._metaFilename)) {
		try {
			var data = fs.readFileSync(this._metaFilename);
			data = data.toString();
			data = JSON.parse(data);
			this.meta = data;
		} catch (e) {
			this.meta = {};
		}
	}
};

/**

Save updated information for the ticker. Now this is just the meta information that contains active flag.

*/

Symbol.prototype.save = function() {
	this._saveMeta();
};

/**

Save meta information to <code>dbPath/symbol/meta.json</code>.

*/

Symbol.prototype._saveMeta = function() {
	if (Object.keys(this.meta).length <= 0) {
		return;
	}
	
	var data = JSON.stringify(this.meta);
	fs.writeFileSync(this._metaFilename+'.tmp', data);
	if (fs.existsSync(this._metaFilename)) {
		fs.unlinkSync(this._metaFilename);
	}
	fs.renameSync(this._metaFilename+'.tmp', this._metaFilename);
};

/** 

Load the ticker from dbpath. Essentially does load the list of all days available for the ticker and 
the meta information.

@return {Boolean} if loaded successfully.

 */

Symbol.prototype.load = function() {
	this._loadMeta();
	
	this.days=[];
	this.dayPosition=0;
	
	if (!fs.existsSync(this.dirPath)) {
		return false;
	}
	
	var files = fs.readdirSync(this.dirPath);
	files = files.sort();
	files = files.filter(function(filename) {
		return (filename.substr(0,1)!='.' && filename.substr(filename.length-5,5)=="ticks");
	}, this);
	
	this.days = files.map(function(filename) {
		return filename.substr(0,8);
	}, this);
	
	return true;
};

/** 

Single-step iterator over all days. 

@param {Function} cb callback.
@param context set <code>this</code> to this.

Callback function will receive one argument: the daystamp, string.

*/

Symbol.prototype.forEachDay = function(cb, context) {
	this.days.forEach(cb, context);
};

/** 

Rewind current iterator position to the beginning.

*/

Symbol.prototype.rewind = function() {
	this.dayPosition=0;
};

/** 

Get the next day from list of days. 

@return {String} daystamp.

*/

Symbol.prototype.nextDay = function() {
	return this.days[this.dayPosition++];
};

/** 

Get the first day from list of days. 

@return {String} daystamp.

*/

Symbol.prototype.firstDay = function() {
	return this.days[0];
};

/** 

Get the last day from list of days. 

@return {String} daystamp.

*/

Symbol.prototype.lastDay = function() {
	return this.days[this.days.length-1];
};

/** 

Get the count of available days.

@return {String} count of days.

*/

Symbol.prototype.count = function() {
	return this.days.length;
};

/** 

Check if this daystamp exists for this ticker.

@param {String} daystamp day to look for.

@return {Boolean} 

*/

Symbol.prototype.dayExists = function(daystamp) {
	return this.days.indexOf(daystamp)>=0;
};

module.exports = Symbol;
