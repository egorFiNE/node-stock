require('date-utils');
ExtraLog = require('../ExtraLog');

exports['price format'] = function(test) {
	test.expect(4);
	
	var d = new Date();
	d.setHours(13,23,41,00);
	d.setMonth(11, 29);
	d.setYear(2011);
	
	test.equal(ExtraLog.format('%s %d', 'string', 1), 'string 1');
	test.equal(ExtraLog.format('%p', 10000), '1.00');
	test.equal(ExtraLog.format('%T', d.unixtime()), '13:23:41');
	test.equal(ExtraLog.format('%D', d.unixtime()), '20111229');
	
	test.done();
};

