require('../lib/ExtraNumber');

function zeroP(number) { 
	if (number<10) { 
		return '000'+number;
	}
	if (number<100) {
		return '00'+number;
	}
	if (number<1000) {
		return '0'+number;
	}
	return number;
}

exports['check float errors'] = function(test) {
	test.expect(2);
	
	var failures=0;
	var failures1=0;
	
	var i=0;
	for(i=0;i<=9999;i++) {
		var z = zeroP(i);
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

