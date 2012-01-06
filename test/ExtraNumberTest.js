require('../ExtraNumber');

exports['number pad'] = function(test) {
	test.expect(4);
	test.equal((23).pad(4), "0023");
	test.equal((23).pad(3), "023");
	test.equal((23).pad(2), "23");
	test.equal((23).pad(1), "23");
	test.done();
};

exports['check float errors'] = function(test) {
	test.expect(2);
	
	var failures=0;
	var failures1=0;
	
	var i=0;
	for(i=0;i<=9999;i++) {
		var z = i.pad(4);
		var parsed = parseInt(parseFloat("1."+z)*10000);
		var bigint = parseInt("1"+z);
		if (parsed!=bigint) { 
			failures++;
		}
		if (Math.abs(parsed-bigint)>1) {
			failures1++;
		}
	}
	
	test.equal(failures,573, "failures count");
	test.equal(failures1,0, "failures of more than one count");
	test.done();
};

exports['human-readable number'] = function(test) {
	test.equal(parseInt(23.34*10000).humanReadablePrice(), "23.34");
	test.done();
};

exports['human-readable order'] = function(test) {
	test.equal((9300000).humanReadableOrder(), "9.3m");
	test.done();
};
