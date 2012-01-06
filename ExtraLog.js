require('./ExtraNumber');
require('./ExtraDate');
var util = require('util');

/** 

Actually it's a printf substitute with support for prices and unixtimes. Contains two functions. 

*/

function ExtraLog() {}

var formatRegExp = /%[sdjpTD%]/g;

/** 

Similar to <code>util.format()</code> but also supports the following tokens: 

* **%p** human readable price;
* **%D** the argument is a unixtime, print the daystamp of it;
* **%T** the argument is a unixtime, print the time of it;

Example: 
	
	var s = ExtraLog.format("%D %T sold at %p", 1322590084, 1322590084, 233700);
	// 20111129 20:08:04 sold at 23.37

 */

ExtraLog.format = function(f) {
	var i=1, x;
	var args = arguments;
	var len = args.length;
	var str = String(f).replace(formatRegExp, function(x) {
		if (i >= len) { return x; }
		switch (x) {
			case '%D':return Date.parseUnixtime(args[i++]).toFormat('YYYYMMDD');
			case '%T':return Date.parseUnixtime(args[i++]).toFormat('HH24:MI:SS');
			case '%s':return String(args[i++]);
			case '%d':return Number(args[i++]);
			case '%p':return parseInt(args[i++]).humanReadablePrice();
			case '%j':return JSON.stringify(args[i++]);
			case '%%':return '%';
			default:
				return x;
		}
	});
	for (x = args[i]; i < len; x = args[++i]) {
		if (x === null || typeof x !== 'object') {
			str += ' ' + x;
		} else {
			str += ' ' + util.inspect(x);
		}
	}
	return str;
};

/**

Similar to <code>console.log</code> but uses <code>ExtraLog.format()</code>.

 */

ExtraLog.log = function() {
	process.stdout.write(ExtraLog.format.apply(this, arguments) + '\n');
};
	
module.exports = {
	format: ExtraLog.format,
	log: ExtraLog.log
};
