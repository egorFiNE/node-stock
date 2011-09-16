require('../lib/ExtraDate');

/*
exports['check parse mm_dd_yyyy'] = function(test) {
	test.expect(6);
	var da = Date.parse_mm_dd_yyyy("01/30/2010");
	da.set_hh_mm_ss("14:53:02");
	test.equal(da.getFullYear(), 2010, "year");
	test.equal(da.getMonth(), 0, "month");
	test.equal(da.getDate(), 30, "day");
	test.equal(da.getHours(), 14, "hours");
	test.equal(da.getMinutes(), 53, "minutes");
	test.equal(da.getSeconds(), 2, "seconds");
	test.done();
};
*/

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

