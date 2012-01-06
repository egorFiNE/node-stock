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

exports['current day minute'] = function(test) {
	test.expect(6);
	
	var day = new Date();
	
	day.setHours(10, 52, 46, 0);
	test.equal(day.getCurrentDayMinute(), 652);
	
	day.setHours(0,0,0,0);
	test.equal(day.getCurrentDayMinute(), 0);

	day.setHours(23,59,59,0);
	test.equal(day.getCurrentDayMinute(), 1440-1);

	day.setCurrentDayMinute(400);
	test.equal(day.toFormat('HH24:MI'), '06:40');

	day.setCurrentDayMinute(0);
	test.equal(day.toFormat('HH24:MI'), '00:00');

	day.setCurrentDayMinute(1439);
	test.equal(day.toFormat('HH24:MI'), '23:59');

	test.done();
};

exports['minutes helper'] = function(test) {
	test.expect(1);
	test.equal(Date.minuteToFormat(400,  'HH24:MI'), '06:40');
	test.done();
};

exports['fill empty days'] = function(test) {
	test.expect(4);
	
	function _between(f, t) {
		var days = Date.fillEmptyDays(Date.parseDaystamp(f), Date.parseDaystamp(t));

		return days.map(function(d) {
			return d.daystamp();
		});
	}
	
	var days;
	
	days = _between(20110615, 20110618);
	test.deepEqual(days, ['20110615', '20110616', '20110617', '20110618']);
	
	days = _between(20110615, 20110616);
	test.deepEqual(days, ['20110615', '20110616']);

	days = _between(20110615, 20110617);
	test.deepEqual(days, ['20110615', '20110616', '20110617']);

	days = _between(20110615, 20110615);
	test.deepEqual(days, ['20110615']);
	
	test.done();
};
