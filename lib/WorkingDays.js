WorkingDays = {};

WorkingDays.nyseHolidays = {
	2011: {
		1:  [17],
		2:  [21],
		4:  [22],
		5:  [30],
		7:  [4],
		9:  [5],
		11: [24],
		12: [26]
	},
	2012: {
		1:  [2, 16],
		2:  [20],
		4:  [6],
		5:  [28],
		7:  [4],
		9:  [3],
		11: [22],
		12: [25]
	},
	2013: {
		1:  [1, 21],
		2:  [18],
		3:  [29],
		5:  [27],
		7:  [4],
		9:  [2],
		11: [28],
		12: [25]
	}
}

WorkingDays.isNyseHoliday = function(day) {
	var entry = WorkingDays.nyseHolidays[day.getFullYear()];
	if (entry) {
		entry = entry[day.getMonth()+1];
		if (entry) {
			return entry.indexOf(day.getDate()) >= 0;
		}
	}
	return false;
}

WorkingDays.isWeekend = function(day) {
	var _d = day.getDay();
	return (_d == 6 || _d==0);
}

WorkingDays.prevNyseDay = function(day) {
	var nextDate = day.clone();
	nextDate.addDays(-1);
	while (WorkingDays.isWeekend(nextDate) || WorkingDays.isNyseHoliday(nextDate)) {
		nextDate.addDays(-1);
	}
	return nextDate;
}

WorkingDays.nextNyseDay = function(day) {
	var nextDate = day.clone();
	nextDate.addDays(1);
	while (WorkingDays.isWeekend(nextDate) || WorkingDays.isNyseHoliday(nextDate)) {
		nextDate.addDays(1);
	}
	return nextDate;
}

module.exports = WorkingDays;
