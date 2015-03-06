// To Do
//
// Check for internet connection

var eventList = null;
var eventYear = null;
displayCalendar();
addButtons();
requestEvents(new Date());

$('#event-popup').popup({
	corners: false,
	overlayTheme: "b",
	theme: 'b',
	transition: 'slidedown'
});

function displayCalendar() {
	$('#calendar').datepicker({
	    inline: true,
	    showOtherMonths: true,
	    dayNamesMin: ['S', 'M', 'T', 'W', 'T', 'F', 'S'],
	    prevText: '<i class="fa fa-arrow-circle-left"></i>',
	    nextText: '<i class="fa fa-arrow-circle-right"></i>',
	    onChangeMonthYear: function(year, month, inst) {
	    	$('#events').empty();
	    	
	    	if (year != eventYear) {
	    		requestEvents(new Date(year, month-1, 1));
	    	}

	    	window.setTimeout(function() {
	    		highlightEvents(year, month);
	    	}, 0);
	    },
	    onSelect: function(date, inst) {
	    	inst.inline = false;
	    	if (eventList != null) {
	    		displayEvents(date);
	    	}
	    }
	});
}

function addButtons() {
	$('#refresh-btn').click(function() {
		var firstTD = $('td[data-handler]').first();
		var calDate = new Date(firstTD.attr('data-year'), firstTD.attr('data-month'), 1);
		requestEvents(calDate);
	});

	$('#today-btn').click(function() {
		var firstTD = $('td[data-handler]').first();
		var calDate = new Date(firstTD.attr('data-year'), firstTD.attr('data-month'), 1);
		var today = new Date();
		if (calDate.getFullYear() != today.getFullYear() || calDate.getMonth() != today.getMonth()) {
			$('#calendar').datepicker('setDate', today);
		}
	});
}

function requestEvents(date) {
	
	eventYear = date.getFullYear();
	
	//Get min and max days for REST request (first and last day of selected year)
	var timeMin = $.formatDateTime('yy-mm-ddT00%3A00%3A00Z', new Date(date.getFullYear(), 0, 1));
	var timeMax = $.formatDateTime('yy-mm-ddT23%3A59%3A59Z', new Date(date.getFullYear(), 12, 31));

	//Build URL
	var url = 'https://www.googleapis.com/calendar/v3/calendars/4tkjjvbsredpulmnkt0bql8kac%40group.calendar.google.com/events?timeMax=' + timeMax + '&timeMin=' + timeMin + '&key=AIzaSyADcOTKdpfRjfW6jOdR4rLptfppoNiu-Wg';

	//Request event list
	$.ajax({
		type: 'GET',
		url: url,
		async: false,
		contentType: "application/json",
		dataType: 'jsonp',
	    success: function(data) {
	    	listEvents(data, date);
	    }
	});
}

function listEvents(data, date) {
	eventList = data['items'];

	$.each(eventList, function(index, event) {
	var startDate = getEventDate(event);
	var endDate = getEventDate(event, 'end');	

	// Set all-day	
	if (event['start']['date']) {
		event['all-day'] = true;
	}
	else {
		event['all-day'] = false;
	}	

	// Set multi-day and date-range
	var dateRange = [];
	if ($.formatDateTime('yy-mm-dd', startDate) != $.formatDateTime('yy-mm-dd', endDate)) {
		event['multi-day'] = true;
		var date = startDate;
		while (date <= endDate) {
			dateRange.push($.formatDateTime('yy-mm-dd', date));
			date.setDate(date.getDate()+1);
		}
	}
	else {
		event['multi-day'] = false;
		dateRange.push($.formatDateTime('yy-mm-dd', startDate));
	}
	event['date-range'] = dateRange;

});

	highlightEvents(date.getFullYear(), date.getMonth()+1);

}

function highlightEvents(year, month) {
	$('td').removeClass('event');
	$('p.num-events').remove();

	// Get date currently displayed on calendar
	if (year != undefined & month != undefined) {
		selectedDate = new Date(year, month-1, 1);
	}
	else {
		selectedDate = new Date();
	}

	// Get list of events occurring on selected month/year
	var monthEvents = $.grep(eventList, function(event) {

		for (var i=0; i<event['date-range'].length; i++) {
			if (event['date-range'][i].indexOf($.formatDateTime('yy-mm', selectedDate)) > -1) {
				return true;
			}
		}
		return false;
	})

	// // Loop through each event in month
	// $.each(monthEvents, function(index, event) {
	// 	var dateRange = event['date-range'];

	// 	//For all dates with events, add event class to appropriate table cell
	// 	$('td').filter(function() {
	// 		var tdDate = $.formatDateTime('yy-mm-dd', new Date($(this).attr('data-year'), $(this).attr('data-month'), $(this).text()));
	// 		return (dateRange.indexOf(tdDate) > -1);
	// 	}).addClass('event');

	// });

	// Loop through each day in month
	$('td').each(function() {
	var tdDate = $.formatDateTime('yy-mm-dd', new Date($(this).attr('data-year'), $(this).attr('data-month'), $(this).text()));
	var eventCount = 0;
		$.each(monthEvents, function(index, event) {
			var dateRange = event['date-range'];
			if (dateRange.indexOf(tdDate) > -1) {
				eventCount = eventCount + 1;
			}
		});
		if (eventCount > 0) {
			$(this).addClass('event');
			$(this).append('<p class="num-events">(' + eventCount + ')</p>');
		}
	});
}

function displayEvents(date) {

	//Clear previous events from container
	$('#events').empty();

	var selectedDate = $.formatDateTime('yy-mm-dd', new Date(date));

	//Add all events occurring on selected date to list
	var dateEvents = $.grep(eventList, function(event) {
		return (event['date-range'].indexOf(selectedDate) > -1);
	})

	// Open popup if events occur on selected date
	if (dateEvents.length > 0) {
    	$('#event-popup').popup('open', {x: 0, y: 0});
	}

	//For each event occurring on selected date, add details to event container
	$.each(dateEvents, function(index, event) {

		var startTime = getEventDate(event);
		allDay = event['all-day']; 
		var endTime = getEventDate(event, 'end');
		var time = null;

		// Time format for single day event
		if (startTime.getDate() == endTime.getDate()) {
			if (allDay) {
				time = $.formatDateTime('MM d, yy', startTime);
			}
			else {
				time = $.formatDateTime('MM d, yy', startTime) + '<br>' + $.formatDateTime('g:ii a', startTime) + ' - ' + $.formatDateTime('g:ii a', endTime);
			}
		}
		// Time format for multiday event
		else {
			if (allDay) {
				time = $.formatDateTime('MM d, yy', startTime); + " - " + $.formatDateTime('MM d, yy', endTime);
			}
			else {
				time = $.formatDateTime('MM d, yy g:ii a', startTime) + ' -<br>' + $.formatDateTime('MM d, yy g:ii a', endTime);
			}
		}

		var html = '<div class="event">';
		html = html + '<h2>' + event['summary'] + '</h2>';
		html = html + '<i class="fa fa-clock-o"></i><p class="icon-p">' + time + '</p>';
		if (event['location']) {
			html = html + '<i class="fa fa-globe"></i><p class="icon-p">' + event['location'] + '</p>';
		}
		if (event['description']) {
			html = html + '<p class="description">' + event['description'] + '</p>';
		}
		html = html + '</div>'

		$('#events').append(html);
	});
}

function getEventDate(event, when) {

	if (!when) {
		when = 'start';
	}

	//return dateTime for regular event
	if (event[when]['dateTime']) {
		return new Date(event[when]['dateTime']);	}
	//return dateTime for all-day
	else if (event[when]['date']) {
		// Google calendar sets "end" of all-day events to next day. 
		// Subtract a day from end date to compensate.
		if (when == 'end') {
			var endDate = new Date(event['end']['date'] + 'T00:00:00-04:00');
			endDate.setDate(endDate.getDate()-1);
			return new Date($.formatDateTime('yy-mm-dd', endDate) + 'T00:00:00-04:00');
		}
		else {
			return new Date(event[when]['date'] + 'T00:00:00-04:00');
		}
	}
	else {
		return null;
	}
}

