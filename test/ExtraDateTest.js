require('../ExtraDate');

exports['check parse daystamp'] = function(test) {
	test.expect(6);
	
	var da = Date.parseDaystamp('20110301');
	test.equal(da.getFullYear(), 2011, "year");
	test.equal(da.getMonth(), 2, "month");
	test.equal(da.getDate(), 1, "day");
	test.equal(da.getHours(), 0, "hours");
	test.equal(da.getMinutes(), 0, "minutes");
	test.equal(da.getSeconds(), 0, "seconds");

	test.done();
};

exports['get current day minute'] = function(test) {
	test.expect(3);
	
	var day = new Date();
	
	day.setHours(10, 52, 46, 0);
	test.equal(day.getCurrentDayMinute(), 652);
	
	day.setHours(0,0,0,0);
	test.equal(day.getCurrentDayMinute(), 0);

	day.setHours(23,59,59,0);
	test.equal(day.getCurrentDayMinute(), 1440-1);

	test.done();
}

exports['nyse market time'] = function(test) {
	test.expect(7);
	
	var day = new Date();
	
	day.setHours(10, 52, 46, 0);
	test.ok(day.isNyseMarketTime());

	day.setHours(9, 30, 0, 0);
	test.ok(day.isNyseMarketTime());

	day.setHours(9, 29, 0, 0);
	test.ok(!day.isNyseMarketTime());

	day.setHours(9, 29, 59, 0);
	test.ok(!day.isNyseMarketTime());

	day.setHours(15, 59, 59, 0);
	test.ok(day.isNyseMarketTime());

	day.setHours(16, 0, 0, 0);
	test.ok(!day.isNyseMarketTime());

	day.setHours(0, 0, 0, 0);
	test.ok(!day.isNyseMarketTime());
	
	test.done();
}
