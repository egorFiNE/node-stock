util = require('util');
require('../ExtraDate');
require('../WorkingDays');

exports['check nyse working days'] = function(test) {
	process.env.TZ='America/New_York';
	
	test.expect(7);
	
	var day;

	day = Date.parseDaystamp('20110903'); // saturday
	test.ok(!WorkingDays.isNyseHoliday(day));
	test.ok(WorkingDays.isWeekend(day));

	day = Date.parseDaystamp('20110904'); // sunday
	test.ok(!WorkingDays.isNyseHoliday(day));
	test.ok(WorkingDays.isWeekend(day));

	day = Date.parseDaystamp('20110905'); // holiday
	test.ok(WorkingDays.isNyseHoliday(day));

	day = Date.parseDaystamp('20110906'); // working day
	test.ok(!WorkingDays.isNyseHoliday(day));

	day = Date.parseDaystamp('20100118'); // holiday
	test.ok(WorkingDays.isNyseHoliday(day));

	test.done();
}

exports['check nyse short days'] = function(test) {
	process.env.TZ='America/New_York';
	
	test.expect(2);
	
	var day;

	day = Date.parseDaystamp('20110903'); 
	test.ok(!WorkingDays.isNyseShortDay(day));

	day = Date.parseDaystamp('20111125'); 
	test.ok(WorkingDays.isNyseShortDay(day));
	test.done();
}


exports['check nyse prev/next day'] = function(test) {
	process.env.TZ='America/New_York';
	
	test.expect(6);
	
	var day;

	// next
	day = Date.parseDaystamp('20110906'); // 20110905 is a holiday, 4 and 3 is weekend
	test.equal(WorkingDays.prevNyseDay(day).daystamp(), '20110902');
	
	day = Date.parseDaystamp('20110902'); 
	test.equal(WorkingDays.prevNyseDay(day).daystamp(), '20110901');

	day = Date.parseDaystamp('20110919'); 
	test.equal(WorkingDays.prevNyseDay(day).daystamp(), '20110916');

	// prev
	day = Date.parseDaystamp('20110902'); // 20110905 is a holiday, 4 and 3 is weekend
	test.equal(WorkingDays.nextNyseDay(day).daystamp(), '20110906');
	
	day = Date.parseDaystamp('20110901'); 
	test.equal(WorkingDays.nextNyseDay(day).daystamp(), '20110902');

	day = Date.parseDaystamp('20110916'); 
	test.equal(WorkingDays.nextNyseDay(day).daystamp(), '20110919');
	
	test.done();
}
