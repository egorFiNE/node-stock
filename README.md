# node-stock

An extremely fast and efficient **[Node.js](http://nodejs.org)** storage engine for raw stock market tick data as well as a couple of handy modules for trading software development.  

**node-stock** is used by my proprietary blackbox trading company for all our robots. The code has been in production for more than a year now, so it is considered mature.

The code is well unit-tested.

# Modules

## TickStorage, Symbols, Symbol

The main thing: a tick storage engine.

## …and others

* **ExtraNumber** - incredibly small yet vital module for internal price representation in **node-stock**.
* **ExtraDate** - date and time calculations specifically helpful for algorithmic trading on NYSE,  NASDAQ and CME;
* **WorkingDays** - NYSE and NASDAQ working days calculator;
* **TimePeriod** - defines a list of human-readable day time periods and a few calculations with it; 
* **ExtraLog** - console.log and formatter functions tailored to **node-stock** internal formats of price and date/time;
* **CandlesCalculator** - Fast OLHC calculator over raw tick data;

# Coding agreements

## Price format

All prices in **node-stock** and derived software are stored in integer in 1/100 of a cent. I.e. $23,45 becomes 234500. To convert a conventional price to this format, use <code>parseInt(price*10000)</code>. To show a human-readable version, use <code>Number.humanReadablePrice()</code> in **ExtraNumber**: 

```javascript
require('stock/ExtraNumber');

var price = 23.56;
price = parseInt(price*10000);

console.log("Price = %s", price.humanReadablePrice());

// or: 

require('stock/ExtraLog');

ExtraLog.log("Price = %p", price);
```

## Other agreements

**Daystamp**. A daystamp is a date in form of YYYYMMDD. It can be Number or String, so your code must handle both cases. See <code>ExtraDate</code>, it contains all you need for daystamp calculations. 

**Day minute**. It's the number of a minute since 00:00 in the current day. I.e. 9:30 am becomes 570 (9*60+30=570). BTW, 24hr time is used thorough the project and so should you. 

**dbPath**. Path to the tickers database, a folder. See below for database structure description.

**Time zones management**. You absolutely should run your software in the time zone of the stock exchange you are trading with. There are two ways of doing that: 

**1.** Set <code>TZ</code> environment variable: 

	TZ=America/New_York node something.js 

**2.** Set <code>process.env.TZ</code> right at the start of your script before making anything else, especially before calling any Date methods: 

```javascript
process.env.TZ='America/New_York';
console.log("Hello at %s", new Date());

// or: 

require('stock/ExtraDate');
require('stock/ExtraLog');
process.env.TZ='America/New_York';
ExtraLog.log("Hello at %D", Date.unixtime());
```

# Requirements

* **Node.js** &gt;= 0.6.0; s
* **node-date-utils** https://github.com/JerrySievert/node-date-utils or <code>npm install date-utils</code>;
* **node-compress-buffer** https://github.com/egorFiNE/node-compress-buffer or <code>npm install compress-buffer</code>;
* **optimist** https://github.com/substack/node-optimist.git or <code>npm install optimist</code>; 
* **nodeunit** for unit testing; 

**Note:** nodeunit must be launched in New York time zone: 

	TZ=America/New_York nodeunit test/

# Installation

<code>npm install stock</code>.

# FAQ

## Q: Why such a complex file format for ticks files? 

A: It's not. If you actually start developing your own ticks database you will inevitably end up with a similar format. For a funny reference: this format is about forty times smaller and way faster than text files.

## Q: Can you sell me raw ticks database for XXX or ZZZ?

A: Unfortunately, no. My license doesn't allow reselling of tick data. However if you need some tick data **strictly** for R&D - please get in touch with me by email, we can work something out. 

**However,** I have made one particular NYSE ticker and one NASDAQ ticker publicly available so that you can play around with data. Should be enough for basic testing and development. They are anonymized but the data is correct and intact; please don't try to figure out which company it is. You can find nyse.zip and nasdaq.zip at Downloads area at Github. 

## Q: Augmentation of built-in classes?! You moron!

**node-stock** adds methods to <code>Date</code> (see **ExtraDate**) and <code>Number</code> (see **ExtraNumber**).

This practice is wrong. Please do not inherit it in your project. There are only *extremely* rare cases when it's okay to do so and I consider these two modules an example of those. 

## Q: How do I run unit tests?

<code>nodeunit test/</code>

# Database structure

Database path (<code>dbPath</code>) is a folder which contains tickers folders: 

	/mnt/storage/tickers/
	/mnt/storage/tickers/AAPL/
	/mnt/storage/tickers/ORCL/
	/mnt/storage/tickers/YHOO/
	…

Each ticker folder contains TickStorage files, each named with a daystamp of that day: 

	/mnt/storage/tickers/YHOO/20110103.ticks
	/mnt/storage/tickers/YHOO/20110104.ticks
	…

Each file is in TickStorage format. 

You don't need to traverse this folder structure manually: there are two handy modules that will do that for you: <code>Symbols</code> and <code>Symbol</code>. They abstract the actual file storage from you. 

Here's a handy sinopsis: 

```javascript
Symbols = require('stock/Symbols');
Symbol = require('stock/Symbol');
TickStorage = require('stock/TickStorage');
require('stock/ExtraDate');
require('stock/ExtraNumber');

var dbPath = '/Users/egor/tickers';

// initialise the class that works with tickers database (a folder of tickers folders) 
var symbols  = new Symbols(dbPath);

// now actually load the list of tickers (folders) available at that path
if (!symbols.load()) {
	console.log("Cannot load tickers database!");
	return;
}


// now let's iterate over all tickers available
var symbol;
while ((symbol=symbols.next())) {
	// mind that here "symbol" is a instantiated "Symbol" class

	// actually load list of days (files) at for that ticker (folder)
	if (!symbol.load()) {
		console.log("Cannot load days for %s", symbol.symbol);
		return;
	}


	// prepare tick storage for the first day of that ticker
	var tickStorage = new TickStorage(dbPath, symbol.symbol, symbol.firstDay());

	// actually load the raw tick data for this symbol at that day
	if (!tickStorage.load()) {
		console.log("Cannot load ticks for %s/%s", symbol.symbol, symbol.firstDay());
		return;
	}

	// iterate over market ticks and calculate total volume
	var tick, totalVolume=0;
	while ((tick=tickStorage.nextTick())) {
		if (tick.isMarket) {
			totalVolume+=tick.volume;
		}
	}

	console.log("%s total volume = %d", symbol.symbol, totalVolume);
}
```


# License 

**node-stock** is triple-licensed. 

If you are using **node-stock** in-house and do not redistribute the software, you can use it under LGPL v2.1. Essentially this means "do whatever you want as long as it's in-house". Feel free to provide commercial services or make zillions of money with this software. Just drop me an email so I can share your joy.

If you are redistributing **node-stock**, please consider it GPLv2 licensed. 

If neither option is good for you, I can sell you a commercial license, which also includes my personal support. Contact me by email. 

# Contacts

**node-stock** is created by Egor Egorov, me@egorfine.com. I welcome your comments and suggestions, please feel free to drop me an email. 
