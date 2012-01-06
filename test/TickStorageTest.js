var 
	util = require('util'),
	fs = require('fs'),
	TickStorage = require('../TickStorage');

exports['timezone test']= function(test) {
	test.equal(process.env.TZ, 'America/New_York');
	test.done();
};

exports['basic read']= function(test) {
	test.expect(6);
	
	var tickStorage = new TickStorage(__dirname+ '/data/ticks-correct', 'LVS', '20110104');
	test.ok(tickStorage.load());
	test.equal(tickStorage.getSymbol(), 'LVS');
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		totalVolume+=tick.volume;
		totalPrice+=tick.price;
		totalCount++;
	}
	
	test.equal(totalVolume, 39222254, 'total volume');
	test.equal(totalPrice, 55302035684, 'total price');
	test.equal(totalCount, 118003, 'total count');
	test.equal(tickStorage.count, totalCount, 'tickstorage.count');
	test.done();
};

exports['basic create'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	tickStorage.additionalData.answer="42";
	
	tickStorage.addTick(unixtime-10, 100, 1000000, false);
	tickStorage.addTick(unixtime-9,  100, 1000000, true);
	tickStorage.addTick(unixtime-8,  100, 1010000, true);
	tickStorage.addTick(unixtime-7,  100, 1020000, true);
	tickStorage.addTick(unixtime-6,  500, 990000, true);
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	test.equal(tickStorage.additionalData.answer, "42");
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		totalVolume+=tick.volume;
		totalPrice+=tick.price;
		totalCount++;
	}
	
	test.equal(totalVolume, 900, 'total volume');
	test.equal(totalPrice, 5020000, 'total price');
	test.equal(totalCount, 5, 'total count');
	test.equal(tickStorage.count, totalCount, 'tickStorage.count');
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['set incorrect unixtime'] = function(test) {
	test.expect(5);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime-1, 100, 1000000, true);
	tickStorage.addTick(unixtime,   100, 1000000, true);
	tickStorage.addTick(123, 100, 1000000, true); // incorrect unixtime
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		totalVolume+=tick.volume;
		totalPrice+=tick.price;
		totalCount++;
	}
	
	test.equal(totalVolume, 200, 'total volume');
	test.equal(totalPrice, 2000000, 'total price');
	test.equal(totalCount, 2, 'total count');
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['non-sequential unixtime'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime+1, 100, 1000000, true);
	tickStorage.addTick(unixtime-1, 100, 1000000, true);
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		totalVolume+=tick.volume;
		totalPrice+=tick.price;
		totalCount++;
	}
	
	test.equal(totalVolume, 200, 'total volume');
	test.equal(totalPrice, 2000000, 'total price');
	test.equal(totalCount, 2, 'total count');
	
	tickStorage.rewind();
	tick = tickStorage.nextTick();
	test.equal(tick.unixtime, unixtime+1);
	tick = tickStorage.nextTick();
	test.equal(tick.unixtime, unixtime-1);
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['create huge'] = function(test) {
	if (process.env.SKIP_HUGE) {
		test.done();return;
	}
	
	test.expect(5);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	var i=0;
	for(i=0;i<1000000;i++) {
		tickStorage.addTick(unixtime-10, 100, parseInt(Math.random()*100)+1, true);
	}
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	var totalVolume=0, totalPrice=0, totalCount=0;

	var tick;
	while ((tick = tickStorage.nextTick())) {
		totalVolume+=tick.volume;
		totalPrice+=tick.price;
		totalCount++;
	}
	
	test.equal(totalVolume, 100*1000000, 'total volume');
	test.equal(totalCount, 1000000, 'total count');
	test.equal(tickStorage.count, totalCount, 'total count');
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['rewind and position'] = function(test) {
	test.expect(13);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime-10, 100, 1, false);
	tickStorage.addTick(unixtime-9,  100, 2, true);
	tickStorage.addTick(unixtime-8,  100, 3, true);
	tickStorage.addTick(unixtime-7,  100, 4, true);
	tickStorage.addTick(unixtime-6,  500, 5, true);
	
	test.ok(tickStorage.save());
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	test.ok(tickStorage.load());
	
	var tick;
	tick = tickStorage.nextTick();
	test.equal(tick.price, 1);
	
	tick = tickStorage.nextTick();
	test.equal(tick.price, 2);

	tick = tickStorage.nextTick();
	test.equal(tick.price, 3);
	
	tickStorage.seek(-1, TickStorage.SEEK_CUR);
	tick = tickStorage.nextTick();
	test.equal(tick.price, 3);

	tickStorage.seek(-2, TickStorage.SEEK_CUR);
	tick = tickStorage.nextTick();
	test.equal(tick.price, 2);

	tick = tickStorage.nextTick(); // 3
	tick = tickStorage.nextTick(); // 4
	tick = tickStorage.nextTick(); // 5

	tickStorage.rewind();
	tick = tickStorage.nextTick();
	test.equal(tick.price, 1);

	tick = tickStorage.nextTick(); // 2
	tick = tickStorage.nextTick(); // 3
	tick = tickStorage.nextTick(); // 4
	tick = tickStorage.nextTick(); // 5

	tickStorage.seek(-100, TickStorage.SEEK_CUR);
	tick = tickStorage.nextTick();
	test.equal(tick.price, 1);
	
	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime-10, volume: 100, price: 1, isMarket: false});
	test.deepEqual(tickStorage.tickAtPosition(1), {unixtime: unixtime-9,  volume: 100, price: 2, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime-10, volume: 100, price: 1, isMarket: false});
	test.deepEqual(tickStorage.tickAtPosition(5), null);

	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');

	test.done();
};

exports['create zero tick'] = function(test) {
	test.expect(4);
	
	var day = new Date();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.save();
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.load();
	
	test.ok(!tickStorage.nextTick());
	test.equal(tickStorage.count, 0);
	test.equal(tickStorage.marketOpenPos, null);
	test.equal(tickStorage.marketClosePos, null);
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['non-existing'] = function(test) {
	test.expect(2);
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', '20110101');
	test.ok(!tickStorage.load());
	
	tickStorage = new TickStorage('/tmp/nothinghereyet', 'DDDD', '20110101');
	tickStorage.prepareForNew();
	test.ok(!tickStorage.save());
	
	test.done();
};

exports['zero data'] = function(test) {
	test.expect(6);

	var day = new Date();
	var unixtime = day.unixtime();

	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();

	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 0, 1, true);
	tickStorage.addTick(unixtime, 100, 2, true);
	tickStorage.addTick(unixtime, 200, 3, true);
	tickStorage.addTick(unixtime, 100, -123, true);
	tickStorage.addTick(unixtime, 100, 0, true);
	
	tickStorage.save();
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.load();
	test.deepEqual(tickStorage.nextTick(), {unixtime: unixtime, price: 1, volume: 100, isMarket: true});
	test.deepEqual(tickStorage.nextTick(), {unixtime: unixtime, price: 2, volume: 100, isMarket: true});
	test.deepEqual(tickStorage.nextTick(), {unixtime: unixtime, price: 3, volume: 200, isMarket: true});
	test.deepEqual(tickStorage.nextTick(), {unixtime: unixtime, price: 0, volume: 100, isMarket: true});
	test.ok(!tickStorage.nextTick());
	test.ok(!tickStorage.nextTick());
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['market open/close pos'] = function(test) {
	test.expect(4);

	var day = new Date();
	var unixtime = day.unixtime();
	
	var tickStorage;
	
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();

	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 100, 1, false);
	
	test.equal(tickStorage.marketOpenPos, 2);
	test.equal(tickStorage.marketClosePos, 4);

	// test if market open/close are correct in case there is an aftermarket tick in between
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();

	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 100, 1, true);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, false);
	
	test.equal(tickStorage.marketOpenPos, 2);
	test.equal(tickStorage.marketClosePos, 5);

	test.done();
};

exports['market only'] = function(test) {
	//test.expect(4);

	var day = new Date();
	var unixtime = day.unixtime();
	
	var tickStorage;

	// test if market open/close are correct in case there is an aftermarket tick in between
	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();

	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 2, true);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 3, true);
	tickStorage.addTick(unixtime, 100, 4, true);
	tickStorage.addTick(unixtime, 100, 1, false);
	tickStorage.addTick(unixtime, 100, 1, false);
	
	tickStorage.save();
	tickStorage.load();
	tickStorage.filterMarketTime();
	
	test.deepEqual(tickStorage.nextTick(), { unixtime: unixtime, volume: 100, price: 2, isMarket: true});
	test.deepEqual(tickStorage.nextTick(), { unixtime: unixtime, volume: 100, price: 3, isMarket: true});
	test.deepEqual(tickStorage.nextTick(), { unixtime: unixtime, volume: 100, price: 4, isMarket: true});
	test.deepEqual(tickStorage.nextTick(), null);
	
	tickStorage.remove();

	test.done();
};

exports['invalid data'] = function(test) {
	test.expect(5);

	var tickStorage; 
	
	// too new version
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100614');
	test.ok(!tickStorage.load());

	// invalid compressed data
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100615');
	test.ok(!tickStorage.load());

	// invalid minute index data
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100616');
	test.ok(!tickStorage.load());

	// invalid JSON header but larger than headersize
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100617');
	test.ok(!tickStorage.load());

	// invalid JSON header smaller than headersize
	tickStorage = new TickStorage(__dirname+ '/data/ticks-invalid', 'LVS', '20100618');
	test.ok(!tickStorage.load());

	test.done();
};

exports['minute index'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	var tickStorage, minute;

	minute = Date.parseUnixtime(unixtime).getCurrentDayMinute();

	tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	// basic test
	tickStorage.addTick(unixtime,   100, 1, true);
	tickStorage.addTick(unixtime+1, 100, 2, true);
	tickStorage.addTick(unixtime+2, 100, 3, true);

	tickStorage._generateMinuteIndex();
	test.deepEqual(tickStorage.minuteIndex.index[minute], {o: 0, c: 2, v: 300, h: 3, l: 1});

	// next minute
	tickStorage.addTick(unixtime+62, 100, 4, true);
	tickStorage.addTick(unixtime+63, 100, 3, true);
	tickStorage.addTick(unixtime+64, 400, 2, true);

	tickStorage._generateMinuteIndex();
	test.deepEqual(tickStorage.minuteIndex.index[minute+1], {o: 3, c: 5, v: 600, h: 4, l: 2});

	// blast from the past
	tickStorage.addTick(unixtime+1, 100, 8, true); 

	tickStorage._generateMinuteIndex();
	test.deepEqual(tickStorage.minuteIndex.index[minute], {o: 0, c: 6, v: 400, h: 8, l: 1});
	test.deepEqual(tickStorage.minuteIndex.index[minute+1], {o: 3, c: 5, v: 600, h: 4, l: 2}); // the same

	// minute with aftermarket data
	tickStorage.addTick(unixtime+121, 100, 3, false);
	tickStorage.addTick(unixtime+122, 100, 5, true);
	tickStorage.addTick(unixtime+123, 100, 7, true);
	tickStorage.addTick(unixtime+123, 100, 8, false);
	tickStorage.addTick(unixtime+124, 100, 4, true);
	tickStorage.addTick(unixtime+125, 100, 9, false);

	tickStorage._generateMinuteIndex();
	test.deepEqual(tickStorage.minuteIndex.index[minute+2], {o: 7, c: 12, v: 300, h: 7, l: 4});

	// minute with no market data
	tickStorage.addTick(unixtime+181, 100, 3, false);
	tickStorage.addTick(unixtime+182, 100, 3, false);
	tickStorage.addTick(unixtime+183, 100, 3, false);

	tickStorage._generateMinuteIndex();
	test.deepEqual(tickStorage.minuteIndex.index[minute+3], {o: 13, c: 15, v: 0, h: null, l: null});

	// check that position is correct after a minute full of aftermarket data
	tickStorage.addTick(unixtime+240, 100, 200, true);
	tickStorage.addTick(unixtime+240, 100, 100, true);
	tickStorage.addTick(unixtime+299, 100, 300, true);

	tickStorage._generateMinuteIndex();
	test.deepEqual(tickStorage.minuteIndex.index[minute+4], {o: 16, c: 18, v: 300, h: 300, l: 100});

	test.done();
};

exports['seek to minute']= function(test) {
	//test.expect(9);
	
	var tickStorage = new TickStorage(__dirname+ '/data/ticks-correct', 'LVS', '20110104');
	test.ok(tickStorage.load());
	
	var tick;
	
	test.ok(tickStorage.seekToMinute(9*60+34));
	test.ok(tick=tickStorage.nextTick());
	test.equal(Date.parseUnixtime(tick.unixtime).toFormat('YYYYMMDD HH24:MI:SS'), '20110104 09:34:00');
	test.equal(tickStorage.tellMinute(), 9*60+34);

	test.ok(!tickStorage.seekToMinute(1));
	test.equal(tickStorage.tellMinute(), 9*60+34);
	test.ok(!tickStorage.seekToMinute(1339));
	test.equal(tickStorage.tellMinute(), 9*60+34);

	var day = Date.parseDaystamp(20110922);
	day.setHours(9, 35, 0, 0);
	var baseUnixtime = day.unixtime();
	
	tickStorage = new TickStorage('/tmp', 'DDDD', '20110922');
	tickStorage.prepareForNew();
	
	tickStorage.addTick(baseUnixtime,    100, 200, true);
	tickStorage.addTick(baseUnixtime+1,  100, 200, true);
	
	tickStorage.addTick(baseUnixtime+60, 102, 400, true);
	tickStorage.addTick(baseUnixtime+62, 102, 500, true);
	tickStorage.addTick(baseUnixtime+63, 102, 600, true);
	tickStorage.addTick(baseUnixtime+65, 102, 100, true);
	
	test.ok(tickStorage.save());
	test.ok(tickStorage.load());
	
	tickStorage.filterMarketTime();
	
	test.equal(tickStorage.tellMinute(), 9*60+35);
	
	test.ok(tickStorage.nextTick());
	test.ok(tickStorage.nextTick());
	
	test.equal(tickStorage.tellMinute(), 9*60+36);
	test.ok(tickStorage.nextTick());
	test.ok(tickStorage.nextTick());
	test.ok(tickStorage.nextTick());
	test.equal(tickStorage.tellMinute(), 9*60+36);
	test.ok(tickStorage.nextTick());
	test.equal(tickStorage.tellMinute(), 9*60+36);
	
	test.ok(!tickStorage.nextTick());
	test.equal(tickStorage.tellMinute(), 9*60+36);

	test.ok(!tickStorage.nextTick());
	test.equal(tickStorage.tellMinute(), 9*60+36);
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['ignore out of day ticks'] = function(test) {
	test.expect(9);
	
	var day = new Date();
	day.clearTime();
	var unixtime = day.unixtime();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime-1, 101, 10, true); // must not save
	tickStorage.addTick(unixtime, 101, 20, true);
	tickStorage.addTick(unixtime+86400-1, 101, 30, true);
	tickStorage.addTick(unixtime+86400, 101, 40, true); // must not save
	
	test.ok(tickStorage.save());

	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime, price: 20, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(1), {unixtime: unixtime+86400-1, price: 30, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(2), null);
	
	test.equal(tickStorage.count, 2);
	test.equal(tickStorage.marketClosePos, 1);
	
	test.deepEqual(tickStorage.minuteIndex.index[0],      {o: 0,  c: 0,  v: 101,  h: 20, l: 20});
	test.deepEqual(tickStorage.minuteIndex.index[1440-1], {o: 1,  c: 1,  v: 101,  h: 30, l: 30});
	test.deepEqual(tickStorage.minuteIndex.index[1440], null);
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['blast from the future'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	var minute = Date.parseUnixtime(unixtime).getCurrentDayMinute();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime+1, 101, 10, true);
	tickStorage.addTick(unixtime+100000, 102, 20, true);
	tickStorage.addTick(unixtime+3, 101, 30, true);
	
	test.ok(tickStorage.save());

	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime+1, price: 10, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(1), {unixtime: unixtime+3, price: 30, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(2), null);
	
	test.equal(tickStorage.count, 2);
	test.equal(tickStorage.marketClosePos, 1);
	
	test.deepEqual(tickStorage.minuteIndex.index[minute],    {o: 0,  c: 1,  v: 202,  h: 30, l: 10});
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['blast from the past'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	var minute = Date.parseUnixtime(unixtime).getCurrentDayMinute();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime+1, 101, 10, true);
	tickStorage.addTick(unixtime-100000, 102, 20, true);
	tickStorage.addTick(unixtime+3, 101, 30, true);
	
	test.ok(tickStorage.save());

	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime+1, price: 10, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(1), {unixtime: unixtime+3, price: 30, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(2), null);
	
	test.equal(tickStorage.count, 2);
	test.equal(tickStorage.marketClosePos, 1);
	
	test.deepEqual(tickStorage.minuteIndex.index[minute],    {o: 0,  c: 1,  v: 202,  h: 30, l: 10});
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};


exports['out of order data small'] = function(test) {
	test.expect(6);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	var minute = Date.parseUnixtime(unixtime).getCurrentDayMinute();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime+1, 101, 10, true);
	tickStorage.addTick(unixtime+960, 102, 20, true);
	tickStorage.addTick(unixtime+3, 101, 30, true);
	
	test.ok(tickStorage.save());
	
	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime+1, price: 10, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(1), {unixtime: unixtime+3, price: 30, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(2), {unixtime: unixtime+960, price: 20, volume: 102, isMarket: true});
	
	test.deepEqual(tickStorage.minuteIndex.index[minute],    {o: 0,  c: 1,  v: 202,  h: 30, l: 10});
	test.deepEqual(tickStorage.minuteIndex.index[minute+16], {o: 2,  c: 2,  v: 102,  h: 20, l: 20});
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['out of order data larger'] = function(test) {
	// basically it is the same as previous test but we add two ticks before and after and two future ticks in between
	// instead of just one tick. 
	test.expect(10);
	
	var day = new Date();
	var unixtime = parseInt(day.unixtime()/60)*60; // minute round
	var minute = Date.parseUnixtime(unixtime).getCurrentDayMinute();
	
	var tickStorage = new TickStorage('/tmp/', 'DDDD', day.daystamp());
	tickStorage.prepareForNew();
	
	tickStorage.addTick(unixtime+1, 101, 1, true);
	tickStorage.addTick(unixtime+2, 101, 2, true);
	tickStorage.addTick(unixtime+960, 102, 3, true);
	tickStorage.addTick(unixtime+961, 102, 4, true);
	tickStorage.addTick(unixtime+962, 102, 5, true);
	tickStorage.addTick(unixtime+3, 101, 6, true);
	tickStorage.addTick(unixtime+4, 101, 7, true);
	
	test.ok(tickStorage.save());
	
	test.deepEqual(tickStorage.tickAtPosition(0), {unixtime: unixtime+1, price: 1, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(1), {unixtime: unixtime+2, price: 2, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(2), {unixtime: unixtime+3, price: 6, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(3), {unixtime: unixtime+4, price: 7, volume: 101, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(4), {unixtime: unixtime+960, price: 3, volume: 102, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(5), {unixtime: unixtime+961, price: 4, volume: 102, isMarket: true});
	test.deepEqual(tickStorage.tickAtPosition(6), {unixtime: unixtime+962, price: 5, volume: 102, isMarket: true});
	
	test.deepEqual(tickStorage.minuteIndex.index[minute],    {o: 0,  c: 3,  v: 404,  h: 7, l: 1});
	test.deepEqual(tickStorage.minuteIndex.index[minute+16], {o: 4,  c: 6,  v: 306,  h: 5, l: 3});
	
	tickStorage.remove();
	fs.rmdirSync('/tmp/DDDD/');
	
	test.done();
};

exports['minute index with huge out of order data'] = function(test) {
	test.expect(7);
	
	// this day contains TWO equal ticks that are way out of order, in the future
	var tickStorage = new TickStorage(__dirname+ '/data/ticks-minuteindex-outoforder', 'MSFT', '20110620');
	test.ok(tickStorage.load());

	var tmpStorage = new TickStorage('/tmp/', 'DDDD', '20110620');
	tmpStorage.prepareForNew();

	var tick, count=0;
	while ((tick = tickStorage.nextTick())) {
		tmpStorage.addTick(tick.unixtime, tick.volume, tick.price, tick.isMarket);
		count++;
	}
	
	test.deepEqual(tmpStorage.tickAtPosition(93715), {unixtime: 1308591713, price: 245690, volume: 5302, isMarket: true});
	test.deepEqual(tmpStorage.tickAtPosition(93716), {unixtime: 1308591714, price: 245650, volume: 100, isMarket: true});
	// here our broken ticks would lay down
	test.deepEqual(tmpStorage.tickAtPosition(93717), {unixtime: 1308591714, price: 245600, volume: 100, isMarket: true});
	test.deepEqual(tmpStorage.tickAtPosition(93718), {unixtime: 1308591714, price: 245600, volume: 312, isMarket: true});

	tmpStorage._generateMinuteIndex();
	
	test.deepEqual(tmpStorage.minuteIndex.index[13*60+41], {o: 93627,  c: 93726,  v: 31444,  h: 245700, l: 245600});
	test.deepEqual(tmpStorage.minuteIndex.index[15*60+30], {o: 125290, c: 125590, v: 337992, h: 245600, l: 245200});

	test.done();
};

