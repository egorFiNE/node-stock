#!/usr/bin/env node

process.env.TZ = process.argv.indexOf('--cme')>=0 ? 
	'America/Chicago' : 
	'America/New_York';

require('node-date');
require(__dirname+'/../ExtraDate');
require(__dirname+'/../ExtraNumber');
TickStorage = require(__dirname+'/../TickStorage');

var optimist = require('optimist')
	.options('dbpath', {
		demand: true
	})
	.options('market', {
		'boolean': true,
		describe: 'show only market ticks'
	})
	.options('cme', {
		'boolean': true,
		describe: 'use CME time zone'
	})
	.options('seek', {
		describe: 'seek to HH:MM[:SS]'
	})
	.usage("Run: dumpticks [args] <day symbol> or <symbol day> or <symbol/day> or <day/symbol>");
	
var argv=optimist.argv;

if (argv._.length<=0) {
	console.log("Wrong usage.\n");
	optimist.showHelp();
	return;
} 

var dayArg = argv._[0] + '';
if (argv._[1]) {
	dayArg+='/'+argv._[1];
}
dayArg = dayArg.replace('/', ' ');
dayArg = dayArg.replace(/\s+/, ' ');
dayArg = dayArg.split(' ');
if (dayArg.length<2) {
	console.log("Wrong usage.\n");
	optimist.showHelp();
	return;
}

if (parseInt(dayArg[0])>0) {
	argv.day = parseInt(dayArg[0]);
	argv.symbol = dayArg[1];
} else { 
	argv.day = parseInt(dayArg[1]);
	argv.symbol = dayArg[0];
}
argv.symbol = argv.symbol.toUpperCase();

var tickStorage = new TickStorage(argv.dbpath, argv.symbol, argv.day);
tickStorage.load();

var seekUnixtime = 0, didSeek=true;
if (argv.seek) {
	seekUnixtime = parseSeek(argv.day, argv.seek);
	didSeek=false;
}

var totalVolume=0, totalPrice=0, count=0;
var entry;
while ((entry = tickStorage.nextTick())) {
	count++;
	if (argv.market && !entry.isMarket) { 
		continue;
	}
	totalVolume+=entry.volume;
	totalPrice+=entry.price;
	
	if (didSeek || entry.unixtime >= seekUnixtime) {
		didSeek=true;
		var d = Date.parseUnixtime(entry.unixtime).toFormat('YYYYMMDD HH24:MI:SS');
		console.log("[%d] %s: %s @ %s %s",
			count, d, entry.volume, entry.price.humanReadablePrice(), 
			entry.isMarket?"":"(aftermarket)"
		);
	}
}

console.log("Total volume = %d, total price = %d", totalVolume, totalPrice.humanReadablePrice());

function parseSeek(daystamp, seekmin) {
	var _seekmin = seekmin.split(':');
	if (!_seekmin[2]) { 
		_seekmin[2] = 0;
	}
	var d = Date.parseDaystamp(daystamp);
	d.setHours(_seekmin[0], _seekmin[1], _seekmin[2], 0);
	return d.unixtime();
}
