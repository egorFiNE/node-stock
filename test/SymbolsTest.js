util = require('util');
fs = require('fs');
Symbols = require('../lib/Symbols');

exports['basic']= function(test) {
	test.expect(8);
	
	var symbols = new Symbols(__dirname+'/data/ticks');
	test.ok(symbols.load());
	
	test.equal(symbols.count(), 2);
	test.ok(symbols.exists('AAA'));
	test.ok(!symbols.exists('AAAA'));
	test.equal(symbols.next().symbol, 'AAA');
	test.equal(symbols.next().symbol, 'AAPL');
	test.equal(symbols.next(), null);
	symbols.rewind();
	test.equal(symbols.next().symbol, 'AAA');
	
	test.done();
}

exports['nonexisting']= function(test) {
	test.expect(1);
	
	var symbols = new Symbols(__dirname+'/data/doesntexists');
	test.ok(!symbols.load());
	test.done();
}
