/**
 * Visualizations for DCOI data.
 **
 *
 *                        ###########
 *                    ###################
 *               ############## ##############
 *          #############   ,~~~~~,   #############
 *     #############        | OMB |        #############
 *  ###########             |OFCIO|             ###########
 * #######                  '~~~~~'                   #######
 * #########################################################
 *     #################################################
 *         =========       =========       =========
 *         |     oo|       |     oo|       |     oo|
 *         |===== .|       |===== .|       |===== .|
 *         |===== .|       |===== .|       |===== .|
 *         |===== .|       |===== .|       |===== .|
 *         |===== .|       |===== .|       |===== .|
 *         |===== .|       |===== .|       |===== .|
 *         |-------|       |-------|       |-------|
 *         | XXXXX |       | XXXXX |       | XXXXX |
 *         | XXXXX |       | XXXXX |       | XXXXX |
 *         =========       =========       =========
 *      ###############################################
 *    ############  _____   ____   ____  __  ############
 *   ############  |  __ ',' __ '.' __ '|  |  ############
 *   ############  | |  | | ,  '-| |  | |  |  ############
 *   ############  | |__' | '__,-| '__' |  |  ############
 *   ############  |_____,',____,,'____'|__|  ############
 *   #############                           #############
 *   #####################################################
 *
 */

var allData;
var meta;
var allTimeperiods;
var allMostRecent;
var mostRecentYear;
var mostRecentQuarter;
var planYears = [];
var planPastYears = [];

const changeData = '2018 Q4';
var changeIdx;
var newTimeperiods;

var dataObj;

const colors = {
  'green': '#28a745',
  'trans-green': 'rgba(28, 167, 45, 0.4)',
  'blue': '#007bff',
  'trans-blue': 'rgba(00, 123, 255, 0.4)',
  'grey': '#555555',
  'trans-grey': 'rgba(55, 55, 55, 0.4)',
  'red': '#dc3545',
  'trans-red': 'rgba(220, 53, 69, 0.4)',
  'yellow': '#ffc107',
  'trans-yellow': 'rgba(255, 193, 7, 0.4)',
  'teal': '#17a2b8',
  'trans-teal': 'rgba(23, 162, 184, 0.4)',
  'purple': '#563d7c',
  'trans-purple': 'rgba(86, 61, 124, 0.4)'
};

const goalColors = {
  'yellow': '#ffc107',
  'trans-yellow': 'rgba(255, 193, 7, 0.7)',
  'pink': '#b817b8',
  'trans-pink': 'rgba(184, 23, 184, 0.7)',
  'teal': '#17a2b8',
  'trans-teal': 'rgba(23, 162, 184, 0.7)',
  'orange': '#ff8800',
  'trans-orange': 'rgba(255, 136, 0, 0.7)',
  'darkgreen': '#1b5e20',
  'trans-darkgreen': 'rgba(27, 94, 32, 0.7)'
}
const goalColorsKeys = Object.keys(goalColors);

const stateColors = {
  'closed': colors['grey'],
  'open': colors['blue'],
  'kmf': colors['green']
};

const kmfTypeColors = {
  'Mission': colors['green'],
  'Location': colors['yellow'],
  'Processing': colors['teal'],
  'Control': colors['blue'],
  'Legal': colors['red'],
  'Other': colors['purple']
};


const allAgencies = 'All Agencies';

const tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

/* SafeObj helpers: map & reducer functions. */

// Array to object keys.
function _arrObj (arr) {
  let obj = {}
  arr.forEach(function(elm) { obj[elm] = null; });
  return obj;
}

// Replace null with zero.
function _nullZero(val) { return val || 0 };

// Sum any arguments.
function _sum(vals) {
  if(vals) {
    return vals.reduce(function(acc, val) { return acc + val; })
  }
  return 0;
}

// Combines the values of two arrays at each index.
function _sumArray(arr1, arr2) {
  if(arr1) {
    if(arr2) {
      return arr1.map(function(val, i) {
        let val1 = arr1[i] || 0;
        let val2 = arr2[i] || 0;
        return val1 + val2;
      });
    }
    else {
      return arr1;
    }
  }
  else {
    return arr2;
  }
}

function _oForEach(obj, callback) {
  let keys = Object.keys(obj);
  let results = [];
  for(let i = 0; i < keys.length; i++) {
    results.push(callback(keys[i], obj[keys[i]], i, keys));
  }
  return results;
}

function times(n, str) {
  let result = '';
  for(let i = 0; i < n; i++) {
    result += str;
  }
  return result;
}

function localizeValue(value, label) {
  if(label) {
    if(label.indexOf('Percent') > -1 || label.indexOf('%') > -1) {
      if(value == 'N/A') { return value; }
      return percentValue(value);
    }
    else if(label.indexOf('Savings') > -1) {
      return parseFloat(parseFloat(value).toFixed(2)).toLocaleString();
    }
    else if(label === 'Downtime') {
      return value || 0;
    }
  }

  return parseInt(value).toLocaleString();
}

function percentValue(value) {
  return value + '%';
}

/* Begin global chart configuration  */
Chart.defaults.global.tooltips.callbacks.label =
  function(obj) {
    let label = this._data.datasets[obj.datasetIndex].label;
    return label + ': ' + localizeValue(obj.value, label);
  };

// Left axis is always linear values.
Chart.defaults.bar.scales.yAxes[0].ticks = Chart.defaults.bar.scales.yAxes[0].ticks || {};
Chart.defaults.bar.scales.yAxes[0].ticks.min = 0;
Chart.defaults.bar.scales.yAxes[0].ticks.callback =
  function(value) {
    // Don't show duplicate ticks if we have decimals.
    if(Math.ceil(value) !== Math.floor(value)) {
      return;
    }
    return localizeValue(value);
  }

var percentAxis = {
  id: 'y-axis-right',
  position: 'right',
  stacked: false,
  ticks: {
    min: 0,
    callback: percentValue
  },
  gridLines: {
    display: false
  }
};

function goalLine(value, year, idx, units, count) {
  // Our colors will loop around.
  let colorIdx = idx;
  while( colorIdx >= (goalColorsKeys.length/2) ) {
    colorIdx -= (goalColorsKeys.length/2);
  }
  let color = goalColorsKeys[colorIdx*2];
  let transColor = goalColorsKeys[(colorIdx*2)+1];

  // TODO: Something smarter with calculating positions here.
  let width = 90;
  // if(count) {
  //   width = Math.ceil(500 / count) -10
  // };
  let xPos = (idx * width) + 10;

  // Left axis is the standard, right axis is our percentages.
  let scaleID = (units != '%') ? 'y-axis-left' : 'y-axis-right'

  return {
    scaleID: scaleID,
    value: value,
    label: {
      content: year + ' Goal',
      enabled: true,
      position: 'left',
      xAdjust: xPos,
      backgroundColor: goalColors[color],
      fontSize: 11,
      xPadding: 3,
      yPadding: 1
    },
    type: 'line',
    mode: 'horizontal',
    borderColor: goalColors[transColor],
    borderWidth: 3,
    borderDash: [3, 5],
    borderDashOffset: 5,
    units: units
  };
}

/* End global chart configuration */

// Determine what we should show by checking the url querystring.
let currentAgency = getParameterByName('agency') || allAgencies;

$( document ).ready(function (){
  loadApp();
  $.getJSON('./data.json', function(data) {
    allData = data;
    meta = allData['__meta__'];
    delete allData['__meta__'];

    dataObj = new SafeObj(data);

    // Establish our global data timeperiods.
    allTimeperiods = Object.keys(data[allAgencies]['datacenters']['closed']).sort();
    allMostRecent = allTimeperiods[ allTimeperiods.length - 1 ];
    changeIdx = allTimeperiods.indexOf(changeData);
    newTimeperiods = allTimeperiods.slice(changeIdx);

    [mostRecentYear, mostRecentQuarter] = allMostRecent.split(' ');

    Object.keys(data[allAgencies]['plan']['closures']).forEach(function(year) {
      if(planYears.indexOf(year) == -1) {
        planYears.push(year);

        if(year <= mostRecentYear) {
          planPastYears.push(year);
        }
      }
    });

    setAgencies(Object.keys(data));
    showSummaryTable(data);
    showData(data, currentAgency);

    window.addEventListener("beforeprint", function() {
      for (var id in Chart.instances) {
        Chart.instances[id].resize();
      }
    });
  });
});

function loadApp() {
  $('#app').html('<div class="loading">Loading...</div>\
<article class="after-load">\
  <form class="agency-select form-row">\
    <label for="agency-list">Show Agency: </label>\
    <select id="agency-list"></select>\
  </form>\
  <h1 id="agency-name"></h1>\
  <div id="updated-message" class="message"></div>\
  <div id="main-message" class="message"></div>\
  <h2>Summary</h2>\
  <p class="helper-text">Field titles may be clicked to sort on that field.</p>\
  <div class="summary-table" id="summary-table"></div>\
  <p>Agencies marked with <strong>*</strong> had not reported a strategic plan at the time this report was generated. Goal information is incomplete for these agencies.</p>\
  <p><span class="complete">Fields marked in green indicate agencies that have completed this requirement of DCOI and have no further work required in this area.</span></p>\
  <p><span class="goal-met">Fields marked in blue indicate agencies that have met their current fiscal year goal for this component of DCOI.</span></p>\
</article>\
<article class="after-load">\
  <h2>Cost Savings & Closures</h2>\
  <p class="helper-text">Labels in the legend may be clicked to hide or show that data category in the chart.</p>\
  <div id="closures-savings-message" class="message"></div>\
  <div class="charts">\
    <div id="count-tiered" class="chart">\
      <h3>Closures Over Time – Valid Tiered Facilities</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
      <p>Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018.</p>\
    </div>\
    <div id="count-all" class="chart">\
      <h3>Closures Over Time – All Facilities</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
      <p>Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018.</p>\
    </div>\
    <div id="tier" class="chart">\
      <h3>Count by Tier - Most Recent Quarter</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
    </div>\
    <div id="kmfs" class="chart">\
      <h3>Tiered Key Misson Facility Types - Most Recent Quarter</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
    </div>\
    <div id="savings" class="chart">\
      <h3>Cost Savings &amp; Avoidance by Year</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="notice">In millions of dollars. Data is incomplete for 2018 and later.</p>\
      <p class="message"></p>\
    </div>\
  </div>\
</article>\
<article class="after-load">\
  <div id="optimization">\
    <h2>Optimization Metrics</h2>\
    <p class="exemption">Note: Optimization metrics are only calculated for valid, agency-owned, tiered data centers designed for such improvements. All exemptions are granted only by explicit permission of OMB. <span class="exemption-count"></span></p>\
    <p class="helper-text">Labels in the legend may be clicked to hide or show that data category in the chart.</p>\
    <p class="message"></p>\
  </div>\
  <div class="charts" id="optimization-charts">\
    <div id="virtualization" class="chart">\
      <h3>Virtualization</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
      <p>\
        Definitions for virtualization changed in Q4 2018. Server count is inclusive of any virtual hosts.\
      </p>\
    </div>\
    <div id="availability" class="chart">\
      <h3>Availability</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
      <p>\
        Availability has only been reported since Q4 2018. Partial data may only be available for this metric.\
      </p>\
    </div>\
    <div id="energyMetering" class="chart">\
      <h3>Energy Metering</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
      <p>Definitions for energy metering changed in Q4 2018.</p>\
    </div>\
    <div id="utilization" class="chart">\
      <h3>Underutilized Servers</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="message"></p>\
      <p>\
        Underutilized Servers have only been reported since Q4 2018. Partial data may only be available for this metric.\
      </p>\
    </div>\
  </div>\
</article>');
}

function displayMessage(id, message) {
  let elm = $('#'+id)
  elm.find('.chart-holder').empty();
  elm.find('.table-holder').empty()
  elm.find('.message').empty().text(message);
}

function chartWrap(id, chartOptions) {
  let newName = id+'-canvas';
  let chartElm = $('#'+id+' .chart-holder');
  chartElm.empty();
  chartElm.append('<canvas id="'+newName+'"></canvas>');

  // Show our table.
  $('#'+id+' .table-holder').empty().append(buildTable(chartOptions));

  return new Chart( $('#'+newName), chartOptions );
}

function getParameterByName(name, url) {
  if (!url) url = window.location.href;
  name = name.replace(/[\[\]]/g, '\\$&');
  let regex = new RegExp('[?&]' + name + '(=([^&#]*)|&|#|$)');
  let results = regex.exec(url);
  if (!results) return null;
  if (!results[2]) return '';
  return decodeURIComponent(results[2].replace(/\+/g, ' '));
}

function setAgencies(agencies) {
  // Move 'All Agencies' to the front.
  agencies.splice( $.inArray(allAgencies, agencies), 1 );
  agencies.unshift(allAgencies);
  agencies = agencies.sort();

  let agencyList = $('#agency-list');
  for(let i = 0; i < agencies.length; i++) {
    let elm = $('<option value="'+agencies[i]+'">'+agencies[i]+'</option>');
    agencyList.append(elm);
  }

  if(currentAgency) {
    agencyList.val(currentAgency);
  }

  agencyList.change(function(e) {
    // $('.loading').show();
    // $('after-load').hide();
    // showData(allData, $(e.target).val());

    // Instead of dynamic loading, just reload the page.
    // This is easier than managing browser history state.
    let location = window.location.href;
    location = location.replace(/\?agency=(.*)/, '');
    let agency = $(e.target).val();
    if(agency) {
      location += '?agency='+agency
    }
    window.location = location;
  });
}

function buildTable(config) {
  let data = config.data;
  let datasets = data.datasets;

  if(config.options.legend && config.options.legend.reverse) {
    datasets = datasets.reverse();
  }

  let table = '<table class="table">';
  table += '<thead><tr><th></th>';

  data.labels.forEach(function (item, idx) {
    if(Array.isArray(item)) {
      item = item.join('<br>');
    }

    table += '<th>' + item + '</th>';
  })
  table += '</tr></thead><tbody>';

  let fn = localizeValue;
  if(config.options.tooltips &&
    config.options.tooltips.callbacks &&
    config.options.tooltips.callbacks.label) {
    fn = function(value) {
      return config.options.tooltips.callbacks.label({
        value: value
      });
    };
  }

  let columnCount = 0;
  datasets.forEach(function (set, i) {
    if(datasets[i] && datasets[i].data) {
      let label = set.label || '';

      table += '<tr>';
      table += '<th>' + label + '</th>';

      datasets[i].data.forEach(function(datum, j) {
        datum = fn(datum || 0, label);
        table += '<td>' + datum + '</td>';
      });
      table += '</tr>';
    }
  });

  table += '</tbody></table>';

  if(config.options &&
    config.options.annotation &&
    config.options.annotation.annotations
  ) {
    table += '<ol class="goals">';
    config.options.annotation.annotations.forEach(function(elm) {
      let value = localizeValue(elm.value, elm.units);

      // Add our units, unless we have a percent (which already carries its units).
      if(elm.units && elm.units != '%') {
        value += elm.units;
      }
      table += '<li><label>' + elm.label.content + '</label> ' + value + '</li>';
    });
    table += '</ol>';
  }

  return table;
};

function showSummaryTable(data) {
  let agencies = Object.keys(data);
  let fields = [
    'Savings<br><span class="units">millions of dollars</span>',
    'Open<br><span class="units">valid data centers</span>',
    'Closures<br><span class="units">valid data centers</span>',
    'Virtualization<br><span class="units">virtual hosts</span>',
    'Availability<br><span class="units">percent uptime</span>',
    'Metering<br><span class="units">number of data centers</span>',
    'Utilization<br><span class="units">underutilized servers</span>'
  ];

  // Remove "All Agencies"
  agencies.splice( agencies.indexOf(allAgencies), 1 );
  agencies = agencies.sort();

  let table = '<table class="table datatable">\
    <thead>';
  table += tr(th('Agency', {rowspan:2}) + th(fields[0], {colspan:3}) + th(fields.slice(1), {colspan:2}));

  table += th(['Current', 'Goal', 'Total']);
  table += th(['Regular', 'KMF']);
  table += times(5, th(['Current', 'Goal']));

  table +='</thead>\
    <tbody>';

  agencies.forEach(function(agency) {
    table += row(agency, data[agency]);
  });

  table += '</tbody></table>';

  $('#summary-table').append(table);

  // DataTable configuration
  var numbersType = $.fn.dataTable.absoluteOrderNumber( [
    { value: '-', position: 'bottom' },
    { value: 'Complete', position: 'bottom' }
  ] );

  let targets = [];
  for(i = 1; i <= (fields.length * 2) + 1; i++) {
    targets.push(i);
  }

  $('#summary-table table').DataTable({
     paging: false,
     select: true,
     info: false,
     columnDefs: [
       {
         orderSequence: [ "desc", "asc" ],
         type: numbersType,
         targets: targets
       }
     ]
  });

  function row(agency, data) {
    let classes = [nameToClass(agency)];
    let row = '';
    let name = agency;
    if(!dataObj.get(agency, 'plan')) {
      name += '*';
    }

    row += th(name);

    // Savings
    let savingsPlanned = dataObj.get(agency, 'plan.savings', mostRecentYear, 'Planned');
    let savingsAchieved = dataObj.get(agency, 'plan.savings', mostRecentYear, 'Achieved') || 0;
    let savingsTotal = dataObj.sum(agency, 'plan.savings', planPastYears, 'Achieved');
    let savingsOpts = {};
    if(savingsAchieved !== null && savingsPlanned !== null && savingsAchieved >= savingsPlanned) {
      savingsOpts.class = 'goal-met';
    }

    row += td([
      savingsAchieved !== null ? savingsAchieved.toFixed(2) : '-',
      savingsPlanned !== null ? savingsPlanned.toFixed(2) : '-',
      savingsTotal !== null ? savingsTotal.toFixed(2): '-'
    ], savingsOpts);

    // Open Facilities
    let regularCount = dataObj.get(agency, 'datacenters.open', allMostRecent, 'tiered') || 0;
    let openClass = regularCount ? '' : 'complete';

    row += td(
      regularCount,
      {'class': openClass}
    );
    row += td(
      dataObj.get(agency, 'datacenters.kmf', allMostRecent, 'tiered') || 0,
      {'class': openClass}
    );

    // Closures
    let open = dataObj.sum(agency, 'datacenters.[open,kmf]', allMostRecent, 'tiered') || 0;
    let regularOnly = dataObj.sum(agency, 'datacenters.[open]', allMostRecent, 'tiered') || 0;
    let exempt = dataObj.get(agency, 'datacenters.optimizationExempt', allMostRecent, 'tiered') || 0;
    let nonExempt = open - exempt;
    let closed = dataObj.get(agency, 'datacenters.closed', allMostRecent, 'tiered') || 0;
    let closuresPlanned = dataObj.get(agency, 'plan.closures', mostRecentYear, 'Planned');
    let closedClass = openClass;
    if(closedClass == '' && closuresPlanned != null && closed >= closuresPlanned) {
      closedClass = 'goal-met';
    }

    row += td(
      closed != null ? localizeValue(closed) : '-',
      {'class': closedClass}
    );

    if(open == 0) {
      row += td('Complete', {class: 'complete'});
    }
    else {
      if(regularCount == 0 && (closuresPlanned == null || closuresPlanned == 0)) {
        closuresPlanned = 'Complete';
      }
      else if(closuresPlanned == null) {
        closuresPlanned = '-';
      }
      else {
        closuresPlanned = localizeValue(closuresPlanned);
      }

      row += td(
        closuresPlanned,
        {'class': closedClass}
      );
    }

    // Some agencies are done.
    if(open == 0 || nonExempt == 0) {
      row += times(8, td('Complete', {'class': 'complete'}));
    }
    // Some agencies have no metrics.
    else if(typeof data['metrics'] == 'undefined') {
      row += times(8, td('-'));
    }
    else {

      // Virtualization
      let virtualAchieved = dataObj.sum(agency, 'metrics.virtualization', allMostRecent, ['tiered', 'cloud']);
      let virtualPlanned = dataObj.get(agency, 'plan.virtualization', mostRecentYear, 'Planned');
      let virtOpts = {};
      if(virtualAchieved != null && virtualAchieved != 0 && virtualPlanned != null && virtualAchieved >= virtualPlanned) {
        virtOpts.class = 'goal-met';
      }

      row += td(
        virtualAchieved != null ? localizeValue(virtualAchieved) : '-',
        virtOpts
      );

      row += td(
        virtualPlanned != null ? localizeValue(virtualPlanned) : '-',
        virtOpts
      );

      // Availability

      let availPercent = '-';
      let availHours = dataObj.get(agency, 'metrics.plannedAvailability', allMostRecent, 'tiered');
      let downtime = dataObj.get(agency, 'metrics.downtime', allMostRecent, 'tiered') || 0;
      let availPlanned = dataObj.get(agency, 'plan.availability', mostRecentYear, 'Planned');
      let availOpts = {};

      if(availHours) {
        if(downtime) {
          availPercent = ((availHours - downtime) / availHours * 100).toFixed(4);
        }
        else {
          availPercent = 100;
        }
        // If our availability is 100%, that meets any goal we could possibly set.
        if((availPlanned != null || availPercent == 100) && availPercent >= availPlanned) {
          availOpts.class = 'goal-met';
        }

        availPercent = localizeValue(availPercent, 'Percent');
      }

      row += td(availPercent, availOpts);

      row += td(
        availPlanned != null ? localizeValue(availPlanned, 'Percent') : '-',
        availOpts
      );

      // Metering

      let meteringAchieved = dataObj.get(agency, 'metrics.energyMetering', allMostRecent, 'tiered');
      let meteringPlanned = dataObj.get(agency, 'plan.energyMetering', mostRecentYear, 'Planned');
      let meterOpts = {};
      if(meteringAchieved != null && meteringPlanned != null &&
          meteringAchieved >= meteringPlanned) {
        meterOpts.class = 'goal-met';
      }

      row += td(
        meteringAchieved != null ? localizeValue(meteringAchieved) : '-',
        meterOpts
      );

      row += td(
        meteringPlanned != null ? localizeValue(meteringPlanned) : '-',
        meterOpts
      );

      // Utilization - this is the only field that should be *less* than the goal!
      let utilizationAchieved = dataObj.get(agency, 'metrics.underutilizedServers', allMostRecent, 'tiered');
      let utilizationPlanned = dataObj.get(agency, 'plan.underutilizedServers', mostRecentYear, 'Planned');
      let utilOpts = {};
      if(utilizationAchieved != null && utilizationPlanned != null &&
          utilizationAchieved <= utilizationPlanned) {
        utilOpts.class = 'goal-met';
      }

      row += td(
        utilizationAchieved != null ? localizeValue(utilizationAchieved) : '-',
        utilOpts
      );

      row += td(
        utilizationPlanned != null ? localizeValue(utilizationPlanned) : '-',
        utilOpts
      );
    }

    return tr(row, {'class': classes.join(' ')});
  }
  function _elm(tag, elm, opts) {
    if(Array.isArray(elm)) {
      return elm.reduce( function(acc, inner) {
          acc += _elm(tag, inner, opts);
          return acc;
      }, '');
    }
    return '<' + tag + _params(opts) + '>' + elm + '</' + tag + '>';
  }
  function _params(opts) {
    if(!opts) { return '' };
    return ' ' + Object.keys(opts).map(function(key) {
      return key + '="'+opts[key]+'"';
    }, '').join(' ');
  }
  function th(elm, opts) {
    return _elm('th', elm, opts);
  }
  function td(elm, opts) {
    return _elm('td', elm, opts);
  }
  function tr(elm, opts) {
    return _elm('tr', elm, opts);
  }
}

function highlightSummaryRow(agency) {
  $('#summary-table .highlight').removeClass('highlight');
  $('#summary-table .'+nameToClass(agency)).addClass('highlight');
}

function nameToClass(txt) {
  return txt.toLowerCase().replace(' ', '-');
}

function showData(data, agency) {
  // Show our charts after we have data.
  $('.loading').hide();
  $('after-load').show();

  $('#agency-name').text(agency);

  // Clear messages
  $('.message').html('');

  let updated = new Date(meta.updatedAt);
  // We could use moment.js here, but it's a lot of overhead for one line.
  $('#updated-message').text('This data was last updated ' + updated.toDateString());

  $('#main-message').empty();
  if(!dataObj.get(agency,'plan')) {
    $('#main-message').text(
      'At the time this report was generated, this agency had not submitted an \
      updated strategic plan. As a result, target goals for this agency are \
      missing.'
    );
  }

  highlightSummaryRow(agency);
  showClosures(data, agency);
  showKMFTypes(data, agency);
  showSavings(data, agency);

  let tiered = dataObj.sum(agency, 'datacenters.[open,kmf]', allMostRecent, 'tiered') || 0;
  let exempt = dataObj.get(agency, 'datacenters.optimizationExempt', allMostRecent, 'tiered') || 0;

  let empty = !dataObj.get(agency, 'datacenters');

  if(tiered == 0) {
    $('#optimization .message').removeClass('helper-text').empty().text('This agency has no remaining open \
      Tiered data centers, and is complete for all optimization purposes.');
    $('#optimization-charts').hide();
    $('#optimization > .helper-text').hide();

    if(empty) {
      $('#closures-savings-message').html('<p>This agency had no open data centers for the entire period of reporting.</p>');
    }
  }
  else if(exempt >= tiered) {
    $('#optimization .message').removeClass('helper-text').empty().text('All '+ exempt + ' remaining \
      data centers for this agency are key mission facilities that are exempt from optimization  as \
      of ' + mostRecentQuarter + ' ' + mostRecentYear + '. This agency is complete for all optimization purposes.');
    $('#optimization-charts').hide();
  }
  else {
    let intro = 'This agency has ';
    if(agency == allAgencies) {
      intro = 'In total, there are ';
    }
    let exemptCount = exempt || 'no';
    $('#optimization .exemption-count').text(intro + exemptCount + ' key mission facilities \
      exempt from optimization as of ' + mostRecentQuarter + ' ' + mostRecentYear + '.');

    $('#optimization-charts').show();
    $('#optimization > .helper-text').show();

    showVirtualization(data, agency);
    showAvailability(data, agency);
    showMetering(data, agency);
    showUnderutilizedServers(data, agency);
  }
}


function showClosures(data, agency) {
  let closeState = ['closed', 'open', 'kmf'];
  let closeStateObj = _arrObj(closeState);

  // Data Center Counts
  countData = {
    type: 'bar',
    options: {
      tooltips: {
        mode: 'index',
        intersect: false
      },
      responsive: true,
      scales: {
        xAxes: [{
          stacked: true
        }],
        yAxes: [{
          id: 'y-axis-left',
          stacked: true
        }]
      }
    },
    data: {
      labels: allTimeperiods
    },
    lines: [
      { value: '2018 Q4' }
    ]
  }

  // Create a copy of this chart.
  let countTierData = $.extend(true,{},countData);

  countData.data.datasets = [];
  countTierData.data.datasets = []

  closeState.forEach(function(state) {
    let tieredCount = dataObj.get(agency, 'datacenters', state, allTimeperiods, 'tiered');
    if(tieredCount !== null) {
      tieredCount = tieredCount.map(_nullZero)
    }
    let nontieredCount = dataObj.get(agency, 'datacenters', state, allTimeperiods, 'nontiered');
    if(nontieredCount !== null) {
      nontieredCount = nontieredCount.map(_nullZero);
    }

    countData.data.datasets.push({
      label: state,
      backgroundColor: stateColors[state],
      data: _sumArray(tieredCount, nontieredCount)
    });

    countTierData.data.datasets.push({
      label: state,
      backgroundColor: stateColors[state],
      data: tieredCount
    });
  });


  if(dataObj.get(agency, 'plan.closures')) {
    countTierData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    countTierData.options.annotation.annotations =
      _oForEach(
        dataObj.get(agency, 'plan.closures.{*}.Planned'),
        function(year, val, idx, keys) {
          return goalLine(_nullZero(val), year, idx, ' Closed', keys.length);
        }
      );
  }

  let countAllChart = chartWrap('count-all', countData);

  let countTieredChart = chartWrap('count-tiered', countTierData);

  // By Tier
  tierData = {
    type: 'bar',
    options: {
      title: {
        display: true,
        text: allMostRecent
      },
      tooltips: {
        mode: 'index',
        intersect: false
      },
      responsive: true,
      scales: {
        xAxes: [{
          stacked: true,
        }],
        yAxes: [{
          stacked: true
        }]
      }
    },
    data: {
      labels: tiers
    }
  }

  tierData.data.datasets = closeState.map(function(state) {
    return {
      label: state,
      backgroundColor: stateColors[state],
      data: tierData.data.labels.map(function(tier) {
        // If we have data for this time period, return it. Otherwise 0.
        if(
          data[agency]['datacenters'] &&
          data[agency]['datacenters'][state] &&
          data[agency]['datacenters'][state][allMostRecent] &&
          data[agency]['datacenters'][state][allMostRecent][tier]
        ) {
          return data[agency]['datacenters'][state][allMostRecent][tier];
        }
        else {
          return 0;
        }
      })
    };
  });

  let tierChart = chartWrap('tier', tierData);
}

// Key Mission Facility Types
function showKMFTypes(data, agency) {
  let timeperiods, mostRecent, types;

  // If we don't have types in the most recent list, we don't have any KMFs.
  try {
    timeperiods = Object.keys(data[agency]['kmf']);
    mostRecent = timeperiods[ timeperiods.length - 1 ];
    types = Object.keys(data[agency]['kmf'][mostRecent]);
  }
  catch(e) {
    displayMessage('kmfs', 'No Tiered Key Mission Facilities reported for this quarter.');
    return;
  }

  // "Other" goes last.
  if(types.indexOf('Other') > -1) {
    types.splice(types.indexOf('Other') , 1 );
    types.push('Other');
  }

  // Data Center Counts
  kmfData = {
    type: 'bar',
    options: {
      title: {
        display: true,
        text: allMostRecent
      },
      tooltips: {
        mode: 'index',
        intersect: false
      },
      responsive: true,
      scales: {
        xAxes: [{
        }],
        yAxes: [{
          ticks: {
            callback: function(value) {if (value % 1 === 0) {return value;}}
          }
        }]
      },
      legend: {
        display: false
      }
    },
    data: {
      labels: types,
      datasets: [{
        label: 'kmf',
        data: [],
        backgroundColor: []
      }]
    }
  }

  types.forEach(function(type) {
    kmfData.data.datasets[0].backgroundColor.push(kmfTypeColors[type]);
    try {
      kmfData.data.datasets[0].data.push(
      data[agency]['kmf'][allMostRecent][type]['tiered']
      );
    }
    catch(e) {
      return null;
    }
  });

  let kmfChart = chartWrap('kmfs', kmfData);
}

// Cost savings
function showSavings(data, agency) {
  $('#savings .notice').show();
  $('#savings .message').empty();
  if(agency == allAgencies) {
    let missing = [];
    Object.keys(data).forEach(function(ag) {
      if(typeof data[ag]['plan'] === 'undefined') {
        missing.push(ag);
      }
    });
    if(missing.length) {
      $('#savings .message').append('At the time this report was generated, the following agencies had not posted updated cost savings data: ' +
        missing.join(', ') + '.');
    }
  }
  else if(typeof data[agency]['plan'] == 'undefined') {
    $('#savings .notice').hide();
    displayMessage('savings', 'At the time this report was generated, this agency had not posted updated cost savings data.');
    return;
  }

  let plannedData = {
    label: 'Planned',
    borderColor: colors['grey'],
    fill: false,
    borderDash: [5,5],
    backgroundColor: colors['trans-grey'],
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let achievedData = {
    label: 'Achieved',
    borderColor: colors['green'],
    backgroundColor: colors['trans-green'],
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let totalData = {
    // hidden: true,
    label: 'Cumulative',
    borderColor: colors['blue'],
    backgroundColor: colors['trans-blue'],
    pointRadius: 6,
    lineTension: 0,
    data: []
  }

  plannedData['data'] = dataObj.get(agency, 'plan.savings.[*].Planned');
  achievedData['data'] = dataObj.get(agency, 'plan.savings.[*].Achieved');

  achievedData['data'].forEach(function(elm, i) {
    let value = 0;
    if(i > 0) {
      value = totalData['data'][i-1];
    }
    if(achievedData['data'][i]) {
      value += achievedData['data'][i];
    }
    totalData['data'].push(value);
  });

  savingsData = {
    type: 'line',
    data: {
      labels: planYears,
      datasets: [plannedData, achievedData, totalData]
    },
    options: {
      tooltips: {
        callbacks: {
          label: function (obj) {
            return localizeValue(obj.value, 'costSavings');
          }
        }
      },
      scales: {
        yAxes: [{
          stacked: false
        }],
        xAxes: [{
          scaleLabel: {
            display: true
          }
        }]
      }
    }
  };

  let savingsChart = chartWrap('savings', savingsData);
}


// Metrics

function showVirtualization(data, agency) {
  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Virtual Hosts',
    borderColor: colors['green'],
    backgroundColor: colors['green'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: dataObj.get(agency, 'metrics.virtualization', allTimeperiods, 'tiered'),
    stack: 'progress'
  };
  let cloudData = {
    yAxisID: 'y-axis-left',
    label: 'Cloud Instances',
    borderColor: colors['teal'],
    backgroundColor: colors['teal'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: dataObj.get(agency, 'metrics.virtualization', allTimeperiods, 'cloud'),
    stack: 'progress'
  };
  let serverData = {
    // hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Servers',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: dataObj.get(agency, 'metrics.servers', allTimeperiods, 'tiered'),
    stack: 'servers'
  };
  let percentData = {
    type: 'line',
    yAxisID: 'y-axis-right',
    label: 'Percent',
    borderColor: colors['purple'],
    backgroundColor: colors['purple'],
    fill: false,
    pointRadius: 3,
    lineTension: 0,
    data: []
  };

  allTimeperiods.forEach(function(timeperiod, i) {
    percentData['data'].push(
      (dataObj.get(agency, 'metrics.virtualization', timeperiod, 'tiered') /
       dataObj.get(agency, 'metrics.servers', timeperiod, 'tiered')  * 100)
        .toFixed(2)
    );
  });

  virtualizationData = {
    type: 'bar',
    data: {
      labels: allTimeperiods,
      datasets: [percentData, achievedData, cloudData, serverData]
    },
    options: {
      scales: {
        yAxes: [
          {
            id: 'y-axis-left',
            position: 'left',
            stacked: true,
          },
          percentAxis
        ],
        xAxes: [{
          stacked: true,
          scaleLabel: {
            display: true
          }
        }]
      }
    }
  };

  if(dataObj.get(agency, 'plan.virtualization')) {
    virtualizationData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    virtualizationData.options.annotation.annotations =
      _oForEach(
        dataObj.get(agency, 'plan.virtualization.{*}.Planned'),
        function(year, val, idx, keys) {
          return goalLine(_nullZero(val), year, idx, ' Virtual Hosts', keys.length);
        })
      ;
  }

  let virtualizationChart = chartWrap('virtualization', virtualizationData);
}

function showAvailability(data, agency) {
  // We only have recent data for this element.

  let timePeriods = Object.keys(dataObj.get(agency, 'metrics.plannedAvailability.{*}'));
  let idx = allTimeperiods.indexOf(changeData);

  let totalData = {
    // hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Total Hours',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: dataObj.get(agency, 'metrics.plannedAvailability', newTimeperiods, 'tiered')
  };
  let downtimeData = {
    yAxisID: 'y-axis-left',
    label: 'Downtime',
    borderColor: colors['red'],
    backgroundColor: colors['red'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: dataObj.get(agency, 'metrics.downtime', newTimeperiods, 'tiered')
  };
  let percentData = {
    type: 'line',
    yAxisID: 'y-axis-right',
    label: 'Percent Uptime',
    borderColor: colors['purple'],
    backgroundColor: colors['purple'],
    fill: false,
    pointRadius: 3,
    lineTension: 0,
    data: []
  };

  newTimeperiods.forEach(function(timeperiod, i) {
    let value = 'N/A';

    let plannedHours = dataObj.get(agency, 'metrics.plannedAvailability', timeperiod, 'tiered');
    let downtime = dataObj.get(agency, 'metrics.downtime', timeperiod, 'tiered');
    if(plannedHours) {
      value = ((plannedHours - downtime) / plannedHours * 100).toFixed(4)
    }

    percentData['data'].push(value);
  });

  let rightAxis = Object.assign({}, percentAxis);

  // Give our chart a little extra room to breathe since our % are large.
  rightAxis.ticks.min = 0; //Math.min.apply(null, percentData['data']);
  rightAxis.ticks.max = 102; //Math.max.apply(null, percentData['data']);
  rightAxis.ticks.callback = function(value) {
    if(value > 100) {
      return;
    }
    return percentValue(value)
  };

  availabilityData = {
    type: 'bar',
    data: {
      labels: newTimeperiods,
      datasets: [percentData, totalData, downtimeData]
    },
    options: {
      scales: {
        yAxes: [
          {
            id: 'y-axis-left',
            position: 'left',
            stacked: false
          },
          rightAxis
        ],
        xAxes: [{
          stacked: true,
          scaleLabel: {
            display: true
          }
        }]
      }
    }
  };

  $('#availability .message').empty();
  if(data[agency]['plan'] && data[agency]['plan']['availability']) {
    availabilityData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    Object.keys(data[agency]['plan']['availability']).forEach(function(year, idx, arr) {
      availabilityData.options.annotation.annotations.push(
        goalLine(data[agency]['plan']['availability'][year]['Planned'].toFixed(4),
          year, idx, '%', arr.length)
      );
    });
  }
  else if(agency == allAgencies) {
    $('#availability .message').text('Availability goals cannot be calculated for all agencies combined, as this target is a percentage based on each agency\'s planned availability.');
  }

  let availabilityChart = chartWrap('availability', availabilityData);
}

function showMetering(data, agency) {
  let timeperiods = Object.keys(data[agency]['metrics']['energyMetering']).sort();

  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Have Metering',
    borderColor: colors['green'],
    backgroundColor: colors['green'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let totalData = {
    // hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Total Facilities',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let percentData = {
    type: 'line',
    yAxisID: 'y-axis-right',
    label: 'Percent',
    borderColor: colors['purple'],
    backgroundColor: colors['purple'],
    fill: false,
    pointRadius: 3,
    lineTension: 0,
    data: []
  };

  $.each(timeperiods, function(i, timeperiod) {
    achievedData['data'].push( data[agency]['metrics']['energyMetering'][timeperiod]['tiered'] );
    totalData['data'].push( data[agency]['metrics']['count'][timeperiod]['tiered'] );
    percentData['data'].push(
      (data[agency]['metrics']['energyMetering'][timeperiod]['tiered'] /
       data[agency]['metrics']['count'][timeperiod]['tiered'] * 100 )
        .toFixed(2)
    );
  });

  // Give our chart a little extra room to breathe if we're maxed out.
  let rightAxis = Object.assign({}, percentAxis);

  let percentMax = Math.ceil(Math.max.apply(null, percentData['data']));
  if(percentMax = 100) {
    percentMax = 102;

    rightAxis.ticks.max = percentMax;
    rightAxis.ticks.callback = function(value) {
      if(value > 100) {
        return;
      }
      return percentValue(value)
    };
  }

  meteringData = {
    type: 'bar',
    data: {
      labels: timeperiods,
      datasets: [percentData, achievedData, totalData]
    },
    options: {
      scales: {
        yAxes: [
          {
            id: 'y-axis-left',
            position: 'left',
            stacked: false
          },
          rightAxis
        ],
        xAxes: [{
          stacked: true,
          scaleLabel: {
            display: true
          }
        }]
      }
    }
  };

  if(data[agency]['plan'] && data[agency]['plan']['energyMetering']) {
    meteringData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    Object.keys(data[agency]['plan']['energyMetering']).forEach(function(year, idx, arr) {
      meteringData.options.annotation.annotations.push(
        goalLine(data[agency]['plan']['energyMetering'][year]['Planned'],
          year, idx, ' Metered Facilities', arr.length)
      );
    });
  }

  let meteringChart = chartWrap('energyMetering', meteringData);
}

function showUnderutilizedServers(data, agency) {
  // We only have recent data for this element.
  let timeperiods = Object.keys(data[agency]['metrics']['underutilizedServers']).sort();

  let idx = timeperiods.indexOf(changeData);

  if(idx < 0) {
    displayMessage('utilization', 'This agency does not have any underutilized servers reported.');
    return;
  }

  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Underutilized',
    borderColor: colors['red'],
    backgroundColor: colors['red'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let serverData = {
    hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Total Servers',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let percentData = {
    type: 'line',
    yAxisID: 'y-axis-right',
    label: 'Percent',
    borderColor: colors['purple'],
    backgroundColor: colors['purple'],
    fill: false,
    pointRadius: 3,
    lineTension: 0,
    data: []
  };

  for(let i = idx; i < timeperiods.length; i++) {
    let timeperiod = timeperiods[i];
    achievedData['data'].push( data[agency]['metrics']['underutilizedServers'][timeperiod]['tiered'] );
    serverData['data'].push( data[agency]['metrics']['servers'][timeperiod]['tiered'] );
    percentData['data'].push(
      (data[agency]['metrics']['underutilizedServers'][timeperiod]['tiered'] /
       data[agency]['metrics']['servers'][timeperiod]['tiered']  * 100)
        .toFixed(2)
    );
  }

  underutilizedServersData = {
    type: 'bar',
    data: {
      labels: timeperiods.slice(idx),
      datasets: [percentData,achievedData, serverData]
    },
    options: {
      scales: {
        yAxes: [
          {
            id: 'y-axis-left',
            position: 'left',
            stacked: false
          },
          percentAxis
        ],
        xAxes: [{
          stacked: true,
          scaleLabel: {
            display: true
          }
        }]
      }
    }
  };

  if(data[agency]['plan'] && data[agency]['plan']['underutilizedServers']) {
    underutilizedServersData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    Object.keys(data[agency]['plan']['underutilizedServers']).forEach(function(year, idx, arr) {
      underutilizedServersData.options.annotation.annotations.push(
        goalLine(data[agency]['plan']['underutilizedServers'][year]['Planned'],
          year, idx, ' Underutilized', arr.length)
      );
    });
  }

  let underutilizedServersChart = chartWrap('utilization', underutilizedServersData);
}