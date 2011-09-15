#!/usr/bin/env node

var program = require('commander');
require('node-date');
require(__dirname+'/../lib/ExtraDate.js');
TickStorage = require(__dirname+'/../lib/TickStorage').TickStorage;

function humanReadablePrice(price) {
	return (price/10000).toFixed(2);
}

program
	.option('-s, --symbol [symbol]', 'symbol')
	.option('-p, --dbpath [dbpath]', 'database path')
	.option('-d, --day [date]', 'day to dump')
	.option('-m, --market', 'only market')
	.parse(process.argv);

if (!program.dbpath || !program.symbol || !program.day) {
	console.log("Wrong usage. Ask --help ?")
	return;
} 

var tickStorage = new TickStorage(program.dbpath, program.symbol, program.day);
tickStorage.load();

var hloc = tickStorage.getHloc();
console.log("High = %s Low = %s Open = %s Close = %s", 
	humanReadablePrice(hloc.h),
	humanReadablePrice(hloc.l),
	humanReadablePrice(hloc.o),
	humanReadablePrice(hloc.c)
);

var totalVolume=0, totalPrice=0, count=0;
var entry;
while ((entry = tickStorage.nextTick())) {
	count++;
	if (program.market && !entry.isMarket) { 
		continue;
	}
	totalVolume+=entry.volume;
	totalPrice+=entry.price;
	var d = Date.parseUnixtime(entry.unixtime).toFormat('YYYYMMDD HH24:MI:SS');
	console.log("[%d] %s: %s @ %s %s",
		count, d, entry.volume, humanReadablePrice(entry.price), 
		entry.isMarket?"":"(aftermarket)"
	);
}

console.log("Total volume = %d, total price = %d", totalVolume, humanReadablePrice(totalPrice));
