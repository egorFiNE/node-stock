require('./ExtraNumber');
require('./ExtraDate');

var formatRegExp = /%[sdjpTD%]/g;


function format(f) {
	if (typeof f !== 'string') {
		var objects = [];
		for (var i = 0; i < arguments.length; i++) {
			objects.push(inspect(arguments[i]));
		}
		return objects.join(' ');
	}

	var i = 1;
	var args = arguments;
	var len = args.length;
	var str = String(f).replace(formatRegExp, function(x) {
		if (i >= len) return x;
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
	for (var x = args[i]; i < len; x = args[++i]) {
		if (x === null || typeof x !== 'object') {
			str += ' ' + x;
		} else {
			str += ' ' + inspect(x);
		}
	}
	return str;
}

	
module.exports = {
	format: format,
	
	log: function() {
		process.stdout.write(format.apply(this, arguments) + '\n');
	}
};
