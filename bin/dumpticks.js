#!/usr/bin/env node

require('node-date');
require(__dirname+'/../ExtraDate');
require(__dirname+'/../ExtraNumber');
TickStorage = require(__dirname+'/../TickStorage');

process.env.TZ='America/New_York';

argv = require('optimist')
	.options('symbol', {
		demand: true
	})
	.options('dbpath', {
		demand: true
	})
	.options('day', {
		demand: true
	})
	.options('market', {
		'boolean': true,
		describe: 'show only market ticks'
	})
	.options('seekmin', {
		describe: 'seek to HH:MM'
	})
	.argv;

if (!argv.dbpath || !argv.symbol || !argv.day) {
	console.log("Wrong usage. Ask --help ?")
	return;
} 

var tickStorage = new TickStorage(argv.dbpath, argv.symbol, argv.day);
tickStorage.load();

var hloc = tickStorage.getHloc();
console.log("High = %s Low = %s Open = %s Close = %s", 
	hloc.h.humanReadablePrice(),
	hloc.l.humanReadablePrice(),
	hloc.o.humanReadablePrice(),
	hloc.c.humanReadablePrice()
);

var seekUnixtime = 0;
if (argv.seekmin) {
	seekUnixtime = parseSeek(argv.day, argv.seekmin);
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
	
	if (entry.unixtime >= seekUnixtime) {
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
	var d = Date.parseDaystamp(daystamp);
	d.setHours(_seekmin[0], _seekmin[1], 0, 0);
	return d.unixtime();
}
