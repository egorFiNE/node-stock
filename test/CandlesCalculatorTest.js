var 
	fs = require('fs'),
	util = require('util'),
	TickStorage = require('../TickStorage'),
	CandlesCalculator = require('../CandlesCalculator');
	
require('../ExtraDate');
require('../ExtraNumber');

process.env.TZ='America/New_York';

var dbPath = __dirname+'/data/candles-calculator/';

exports['holes'] = function(test) {
	test.expect(7);
	
	var candles;
	
	var tickStorage = new TickStorage(dbPath, 'IMPV', 20111117);
	test.ok(tickStorage.load());
	
	candles = new CandlesCalculator(tickStorage, 1);
	test.deepEqual(candles.getCandle(600), {h: 261000, l: 261000, o: 261000, c: 261000, v: 100, t: 1, hour: 10, minute: 0, m: 600});
	test.deepEqual(candles.getCandle(601), null);
	test.deepEqual(candles.getCandle(611), {h: 259180, l: 257040, o: 259000, c: 257500, v: 1200, t: 5, hour: 10, minute: 11, m: 611});

	candles = new CandlesCalculator(tickStorage, 5);

	test.deepEqual(candles.getCandle(600), { h: 261000, l: 261000, o: 261000, c: 261000, v: 100, t: 1, hour: 10, minute: 0, m: 600 });
	test.deepEqual(candles.getCandle(610), null);
	test.deepEqual(candles.getCandle(615), { h: 260240, l: 257040, o: 259000, c: 260240, v: 1300, t: 6, hour: 10, minute: 15, m: 615 });
	
//	candles.dumpMinutes(600, 620);
//	console.log("");
//	candles.dumpCandles(600, 620);
	
	test.done();
};

