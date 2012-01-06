var 
	util = require('util'),
	fs = require('fs'),
	Symbol = require('../Symbol');

exports['basic']= function(test) {
	test.expect(11);
	
	var symbol = new Symbol(__dirname+'/data/ticks', 'AAA');
	test.ok(symbol.load());
	
	test.ok(symbol.isActive());
	test.equal(symbol.count(), 20);
	test.equal(symbol.firstDay(), '20110201');
	test.equal(symbol.lastDay(), '20110228');
	test.ok(symbol.dayExists('20110228'));
	test.ok(!symbol.dayExists('20110231'));
	
	test.equal(symbol.nextDay(), '20110201');
	test.equal(symbol.nextDay(), '20110202');
	test.equal(symbol.nextDay(), '20110203');
	symbol.rewind();
	test.equal(symbol.nextDay(), '20110201');
	
	test.done();
};

exports['meta']= function(test) {
	test.expect(6);
	
	fs.mkdirSync('/tmp/DDDD', 0755);
	
	var symbol = new Symbol('/tmp', 'DDDD');
	test.ok(symbol.load());
	
	test.ok(symbol.isActive());
	symbol.meta.answer='42';
	test.equal(symbol.meta.answer, '42');
	symbol.setIsActive(false);
	symbol.save();
	
	symbol = new Symbol('/tmp/', 'DDDD');
	test.ok(symbol.load());
	
	test.ok(!symbol.isActive());
	test.equal(symbol.meta.answer, '42');
	
	fs.unlinkSync('/tmp/DDDD/meta.json');
	fs.rmdirSync('/tmp/DDDD/');
	test.done();
};


exports['nonexisting']= function(test) {
	test.expect(7);
	
	var symbol = new Symbol(__dirname+'/data/ticks', 'AAAA');
	test.ok(!symbol.load());
	
	test.ok(symbol.isActive());
	test.equal(symbol.count(), 0);
	test.equal(symbol.firstDay(), null);
	test.equal(symbol.lastDay(), null);
	test.equal(symbol.nextDay(), null);
	test.ok(!symbol.dayExists('20110201'));
	test.done();
};
