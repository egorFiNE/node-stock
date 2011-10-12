TimePeriod = require('../TimePeriod');
require('../ExtraDate');
require('../ExtraNumber');

exports['basic']= function(test) {
	test.expect(30);
	var t;
	
	t = new TimePeriod('9:30-10:00');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(9, 35));
	test.ok(t.isHourMinuteIn(9, 30));
	test.ok(t.isHourMinuteIn(9, 59));
	test.ok(!t.isHourMinuteIn(10, 00));
	test.ok(!t.isHourMinuteIn(9, 29));
	
	test.equal(t.firstMinute, 9*60+30);
	test.equal(t.lastMinute,  9*60+59);
	
	t = new TimePeriod('9:30-10:00,11:00-12:00,13:35-13:43');
	test.ok(t.isValid);
	test.ok(!t.isHourMinuteIn(9, 29));
	test.ok(t.isHourMinuteIn(9, 35));
	test.ok(t.isHourMinuteIn(9, 30));
	test.ok(t.isHourMinuteIn(9, 59));
	test.ok(!t.isHourMinuteIn(10, 00));
	test.ok(!t.isHourMinuteIn(10, 30));
	test.ok(!t.isHourMinuteIn(9, 29));
	test.ok(t.isHourMinuteIn(11, 00));
	test.ok(t.isHourMinuteIn(11, 59));
	test.ok(!t.isHourMinuteIn(12, 00));
	test.ok(!t.isHourMinuteIn(10, 59));
	test.ok(t.isHourMinuteIn(13, 35));
	test.ok(!t.isHourMinuteIn(13, 43));

	test.equal(t.firstMinute, 9*60+30);
	test.equal(t.lastMinute,  13*60+42);

	t = new TimePeriod('0-24');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(0,0));
	test.ok(t.isHourMinuteIn(10,30));
	test.ok(t.isHourMinuteIn(23,59));

	test.equal(t.firstMinute, 0);
	test.equal(t.lastMinute,  23*60+59);

	test.done();
}

exports['empty']= function(test) {
	test.expect(13);
	
	var t = new TimePeriod('');
	test.ok(t.isValid);
	test.ok(!t.isHourMinuteIn(0, 0));
	test.ok(!t.isHourMinuteIn(9, 35));
	test.ok(!t.isHourMinuteIn(9, 29));
	test.ok(!t.isHourMinuteIn(15, 59));
	test.ok(!t.isHourMinuteIn(16, 00));
	
	t = new TimePeriod();
	test.ok(t.isValid);
	test.ok(!t.isHourMinuteIn(9, 35));
	test.ok(!t.isHourMinuteIn(9, 29));
	test.ok(!t.isHourMinuteIn(15, 59));
	test.ok(!t.isHourMinuteIn(16, 00));
	
	test.ok(!t.isHourMinuteIn(16, 00));
	test.ok(!t.isUnixtimeIn(Date.unixtime()));
	test.done();
}

exports['hours']= function(test) {
	test.expect(18);
	var t = new TimePeriod('9-13');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(9, 0));
	test.ok(t.isHourMinuteIn(12, 59));
	test.ok(t.isHourMinuteIn(11, 23));
	test.ok(!t.isHourMinuteIn(8, 59));
	test.ok(!t.isHourMinuteIn(13, 0));
	
	t = new TimePeriod('9:30-13');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(9, 30));
	test.ok(t.isHourMinuteIn(12, 59));
	test.ok(t.isHourMinuteIn(11, 23));
	test.ok(!t.isHourMinuteIn(9, 29));
	test.ok(!t.isHourMinuteIn(13, 0));
	
	t = new TimePeriod('9-13:30');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(9, 00));
	test.ok(t.isHourMinuteIn(13, 29));
	test.ok(t.isHourMinuteIn(11, 23));
	test.ok(!t.isHourMinuteIn(8, 59));
	test.ok(!t.isHourMinuteIn(13, 30));
	
	test.done();
}

exports['single hours']= function(test) {
	test.expect(12);
	var t; 
	
	t = new TimePeriod('9');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(9, 0));
	test.ok(t.isHourMinuteIn(9, 59));
	test.ok(!t.isHourMinuteIn(10, 00));
	
	t = new TimePeriod('9,13,16');
	test.ok(t.isValid);
	test.ok(t.isHourMinuteIn(9, 0));
	test.ok(t.isHourMinuteIn(9, 59));
	test.ok(!t.isHourMinuteIn(10, 00));
	test.ok(!t.isHourMinuteIn(12, 59));
	test.ok(t.isHourMinuteIn(13, 23));
	test.ok(!t.isHourMinuteIn(14, 00));
	test.ok(!t.isHourMinuteIn(17, 0));
	
	test.done();
}

exports['first and last minutes']= function(test) {
	test.expect(6);
	var t;
	
	t = new TimePeriod('9-10');
	test.ok(t.isValid);
	test.equal(t.getFirstLastMinutes()[0], 9*60);
	test.equal(t.getFirstLastMinutes()[1], 10*60-1);
	
	t = new TimePeriod('9-10,13:00-16:30');
	test.ok(t.isValid);
	test.equal(t.getFirstLastMinutes()[0], 9*60);
	test.equal(t.getFirstLastMinutes()[1], 16*60+30-1);
	
	test.done();
}

exports['invalid']= function(test) {
	test.expect(4);
	var t;
	
	t = new TimePeriod('9-');
	test.ok(!t.isValid);
	
	t = new TimePeriod('9:89-10:00');
	test.ok(!t.isValid);
	
	t = new TimePeriod('10-9');
	test.ok(!t.isValid);
	
	t = new TimePeriod('1sdfsdfsdf');
	test.ok(!t.isValid);
	
	test.done();
}

exports['normalize']= function(test) {
	test.expect(18);
	var t;

	t = new TimePeriod('9');
	test.ok(t.isValid);
	test.equal(t.normalize(), "9-10");

	t = new TimePeriod('9,13');
	test.ok(t.isValid);
	test.equal(t.normalize(), "9-10,13-14");
	
	t = new TimePeriod('9-10');
	test.ok(t.isValid);
	test.equal(t.normalize(), "9-10");
	
	t = new TimePeriod('9:31-10:14');
	test.ok(t.isValid);
	test.equal(t.normalize(), "9:31-10:14");
	
	t = new TimePeriod('9:31-10:14,13:33-17');
	test.ok(t.isValid);
	test.equal(t.normalize(), "9:31-10:14,13:33-17");
	
	t = new TimePeriod('9:31-10:14,13:33-17,17:15-17:16');
	test.ok(t.isValid);
	test.equal(t.normalize(), "9:31-10:14,13:33-17,17:15-17:16");
	
	t = new TimePeriod('9:31-10:14,17:15-17:16,13:33-17:00'); // order
	test.ok(t.isValid);
	test.equal(t.normalize(), "9:31-10:14,13:33-17,17:15-17:16");

	t = new TimePeriod('9:30-15:00,10:15-11:00');  // inner overlap
	test.ok(t.isValid);
	test.equal(t.normalize(), "9:30-15");

	t = new TimePeriod('9:30-15,10:15-17:00');  // outer overlap
	test.ok(t.isValid);
	test.equal(t.normalize(), "9:30-17");

	test.done();
}


exports['unixtime']= function(test) {
	test.expect(6);
	
	var today = new Date();
	today.clearTime();
	
	var baseUnixtime = today.unixtime();
	
	var t = new TimePeriod('9:30-10:00');
	test.ok(t.isValid);
	
	test.ok(t.isUnixtimeIn(baseUnixtime+9*60*60+30*60));
	test.ok(t.isUnixtimeIn(baseUnixtime+9*60*60+36*60));
	test.ok(t.isUnixtimeIn(baseUnixtime+9*60*60+59*60+59));
	test.ok(!t.isUnixtimeIn(baseUnixtime+10*60*60+36*60));
	test.ok(!t.isUnixtimeIn(baseUnixtime+10*60*60));
	
	test.done();
}
