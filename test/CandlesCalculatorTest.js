fs = require('fs');
util = require('util');
require('../ExtraDate');
require('../ExtraNumber');
TickStorage = require('../TickStorage');
CandlesCalculator = require('../CandlesCalculator');

process.env.TZ='America/New_York';

//FIXME commented

var dbPath = __dirname+'/data/candles-calculator/';

exports['candles 5 min emit immediately']= function(test) {
	//test.expect(11)
	
	var candleCount=0;
	
	var candlesCalculator = new CandlesCalculator(5);
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		candleCount++;
		/*
		if (candleCount++==0) { 
			test.equals(hour,13,"inner candle hour");
			test.equals(minute,21,"inner candle minute");
			test.equals(v,10,"inner candle volume");
			test.equals(h,11,"inner candle h");
			test.equals(l,10,"inner candle l");
			test.equals(o,10,"inner candle o");
			test.equals(c,10,"inner candle c");
		}*/
	});
	
	//1299781240 = Thu Mar 10 20:20:40 EET 2011

	candlesCalculator.addTick(1299781240, 10, 1);
	candlesCalculator.addTick(1299781241, 10, 1);
	candlesCalculator.addTick(1299781243, 10, 1);
	candlesCalculator.addTick(1299781244, 10, 1);
	candlesCalculator.addTick(1299781245, 10, 1);
	candlesCalculator.addTick(1299781246, 10, 1);
	candlesCalculator.addTick(1299781247, 11, 1);
	candlesCalculator.addTick(1299781248, 10, 1);
	candlesCalculator.addTick(1299781249, 10, 1);
	candlesCalculator.addTick(1299781259, 10, 1);
	candlesCalculator.addTick(1299781260, 10, 1);
	test.equal(candleCount, 0);
	candlesCalculator.addTick(1299781261, 10, 1);
	test.equal(candleCount, 0);
	candlesCalculator.addTick(1299781259+(4*60), 13, 1);
	test.equal(candleCount, 0);
	candlesCalculator.addTick(1299781259+(4*60)+1, 14, 1);
	test.equal(candleCount, 1);
	candlesCalculator.addTick(1299781259+(5*60)+1, 14, 1);
	test.equal(candleCount, 1);
	
	process.nextTick(function() {test.done()});
}


exports['candles emit immediately']= function(test) {
	test.expect(11)
	
	var candleCount=0;
	
	var candlesCalculator = new CandlesCalculator(1);
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		if (candleCount++==0) { 
			test.equals(hour,13,"inner candle hour");
			test.equals(minute,21,"inner candle minute");
			test.equals(v,10,"inner candle volume");
			test.equals(h,11,"inner candle h");
			test.equals(l,10,"inner candle l");
			test.equals(o,10,"inner candle o");
			test.equals(c,10,"inner candle c");
		}
	});
	
	//1299781240 = Thu Mar 10 20:20:40 EET 2011

	candlesCalculator.addTick(1299781240, 10, 1);
	candlesCalculator.addTick(1299781241, 10, 1);
	candlesCalculator.addTick(1299781243, 10, 1);
	candlesCalculator.addTick(1299781244, 10, 1);
	candlesCalculator.addTick(1299781245, 10, 1);
	candlesCalculator.addTick(1299781246, 10, 1);
	candlesCalculator.addTick(1299781247, 11, 1);
	candlesCalculator.addTick(1299781248, 10, 1);
	candlesCalculator.addTick(1299781249, 10, 1);
	test.equal(candleCount, 0);
	candlesCalculator.addTick(1299781259, 10, 1);
	test.equal(candleCount, 0);
	candlesCalculator.addTick(1299781260, 10, 1);
	test.equal(candleCount, 1);
	candlesCalculator.addTick(1299781261, 10, 1);
	test.equal(candleCount, 1);
	
	process.nextTick(function() {test.done()});
}


exports['candles time alignment']= function(test) {
	test.expect(8)
	
	var candleCount=0;
	
	var candlesCalculator = new CandlesCalculator(5);
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		if (candleCount++==0) { 
			test.equals(hour,4,"inner candle hour");
			test.equals(minute,55,"inner candle minute");
			test.equals(v,100,"inner candle volume");
			test.equals(h,465000,"inner candle h");
			test.equals(l,465000,"inner candle l");
			test.equals(o,465000,"inner candle o");
			test.equals(c,465000,"inner candle c");
		}
	});
	
	var tickStorage = new TickStorage(dbPath, "LVS", 20110104);
	tickStorage.load();
	
	var tick; 
	while ((tick = tickStorage.nextTick())) {
		candlesCalculator.addTick(tick.unixtime, tick.price, tick.volume);
	}
	
	candlesCalculator.finish();
	
	test.equals(candleCount, 151, "count");
	process.nextTick(function() {
		test.done();
	});
}

exports['candles 5 min']= function(test) {
	test.expect(8)
	
	var candleCount=0;
	
	var candlesCalculator = new CandlesCalculator(5);
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		if (candleCount++==15) {
			test.equals(hour,8,"inner candle hour");
			test.equals(minute,15,"inner candle minute");
			test.equals(v,25832,"inner candle volume");
			test.equals(h,3531900,"inner candle h");
			test.equals(l,3527000,"inner candle l");
			test.equals(o,3528600,"inner candle o");
			test.equals(c,3529900,"inner candle c");

		}
		if (0) {
			util.debug(candleCount+" @ "+hour+":"+minute+
				" h="+h.humanReadablePrice()+" "+
				" l="+l.humanReadablePrice()+" "+
				" o="+o.humanReadablePrice()+" "+
				" c="+c.humanReadablePrice()+" "+
				" volume="+v
			);
		}
	});
	
	var tickStorage = new TickStorage(dbPath, "AAPL", 20110208);
	tickStorage.load();
	
	var tick; 
	while ((tick = tickStorage.nextTick())) {
		candlesCalculator.addTick(tick.unixtime, tick.price, tick.volume);
	}
	candlesCalculator.finish();
	
	test.equals(candleCount, 150, "count");
	test.done();
}

exports['candles']= function(test) {
	test.expect(22)
	
	var candleCount=0;
	
	var candlesCalculator = new CandlesCalculator(1);
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		candleCount++;
		
		if (candleCount==1) { // first candle
			test.equals(hour,5,"first candle hour");
			test.equals(minute,46,"first candle minute");
			test.equals(v,100,"first candle volume");
			test.equals(h,3518500,"first candle h");
			test.equals(l,3518500,"first candle l");
			test.equals(o,3518500,"first candle o");
			test.equals(c,3518500,"first candle c");

		} else if (candleCount==613) { // last candle
			test.equals(hour,20,"last candle hour");
			test.equals(minute,00,"last candle minute");
			test.equals(v,4780,"last candle volume");
			test.equals(h,3555500,"last candle h");
			test.equals(l,3554100,"last candle l");
			test.equals(o,3555300,"last candle o");
			test.equals(c,3554100,"last candle c");
			
		} else if (candleCount==410) { // just a random count 
			test.equals(hour,14,"inner candle hour");
			test.equals(minute,38,"inner candle minute");
			test.equals(v,24154,"inner candle volume");
			test.equals(h,3552300,"inner candle h");
			test.equals(l,3551300,"inner candle l");
			test.equals(o,3551900,"inner candle o");
			test.equals(c,3552100,"inner candle c");

		}
		if (0) {
			util.debug(candleCount+" @ "+hour+":"+minute+
				" h="+h.humanReadablePrice()+" "+
				" l="+l.humanReadablePrice()+" "+
				" o="+o.humanReadablePrice()+" "+
				" c="+c.humanReadablePrice()+" "+
				", volume="+v
			);
		}
	});

	var tickStorage = new TickStorage(dbPath, "AAPL", 20110208);
	tickStorage.load();
	
	var tick;
	while ((tick = tickStorage.nextTick())) {
		candlesCalculator.addTick(tick.unixtime, tick.price, tick.volume);
	}
	candlesCalculator.finish();
	// FIXME sent done to get the really last candle
	
	setTimeout(function(){test.equals(candleCount, 613, "count"); test.done()}, 100);
}

exports['test serialize']= function(test) {
	test.expect(5);
	var candleCount=0, totalHighs=0, totalLows=0, totalVolume=0;

	function onCandle(hour, minute, h,l,o,c,v) {
		candleCount++;
		totalHighs+=h;
		totalLows+=l;
		totalVolume+=v;
	}

	var candlesCalculator = new CandlesCalculator(1);
	candlesCalculator.on('candle', onCandle);

	var tickStorage = new TickStorage(dbPath, "LVS", 20110104);
	tickStorage.load();

	var tick;var didFire=false;
	while ((tick = tickStorage.nextTick())) {
		candlesCalculator.addTick(tick.unixtime, tick.price, tick.volume);
		if (!didFire && candleCount>300 && Math.random()>0.9) {
			didFire=true;
			var st = candlesCalculator.serialize();
			candlesCalculator.removeAllListeners('candle');
			candlesCalculator = undefined;
			candlesCalculator = new CandlesCalculator(1);
			candlesCalculator.on('candle', onCandle);
			candlesCalculator.unserialize(st);
			test.ok(true, "did serialize");
		}
	}

	candlesCalculator.finish();
	test.equal(candleCount,589,"count");
	test.equal(totalHighs, 276157261, "total highs");
	test.equal(totalLows, 275840571, "total Lows");
	test.equal(totalVolume, 39222254, "total volume");
	test.done();

}

/*
exports['emptyCandles']= function(test) {
	test.expect(8)
	
	var candleCount=0;
	
	var candlesCalculator = new CandlesCalculator(1);
	candlesCalculator.shouldEmitEmptyCandles = true;
	
	candlesCalculator.on('candle', function(hour, minute, h,l,o,c,v) {
		candleCount++;
		if (candleCount==346) { // first candle with ticks
			test.equals(hour,5,"first candle hour");
			test.equals(minute,46,"first candle minute");
			test.equals(v,100,"first candle volume");
			test.equals(h,3518500,"first candle h");
			test.equals(l,3518500,"first candle l");
			test.equals(o,3518500,"first candle o");
			test.equals(c,3518500,"first candle c");
		}
		if (0) {
			util.debug(candleCount+" @ "+hour+":"+minute+
				" h="+h.humanReadablePrice()+" "+
				" l="+l.humanReadablePrice()+" "+
				" o="+o.humanReadablePrice()+" "+
				" c="+c.humanReadablePrice()+" "+
				", volume="+v
			);
		}
	});
	
	var tickStorage = new TickStorage(dbPath, "AAPL", 20110208);
	var tick;
	while ((tick = tickStorage.nextTick())) {
		candlesCalculator.addTick(tick.unixtime, tick.price, tick.volume);
	}
	
	test.equals(candleCount, 1199, "count");
	test.done();
}

*/
