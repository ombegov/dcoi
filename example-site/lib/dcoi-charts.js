/**
 * Visualizations for DCOI data.
 */

var allData;

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

const changeData = '2018 Q4';

const allAgencies = 'All Agencies';

const tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4'];

function localizeValue(value, label) {
  if(label && (label.indexOf('Percent') > -1 || label.indexOf('%') > -1)) {
    return percentValue(value);
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
    setAgencies(Object.keys(data));
    showSummaryTable(data);
    showData(data, currentAgency);
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
  <div id="main-message" class="message"></div>\
  <h2>Summary</h2>\
  <div class="summary-table" id="summary-table"></div>\
  <h2>Cost Savings & Closures</h2>\
  <div class="charts">\
    <div id="count-tiered" class="chart">\
      <h3>Closures Over Time – Tiered Only</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018.</p>\
    </div>\
    <div id="count-all" class="chart">\
      <h3>Closures Over Time – All Facilities</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018.</p>\
    </div>\
    <div id="tier" class="chart">\
      <h3>Count by Tier – Most Recent Quarter</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
    </div>\
    <div id="kmfs" class="chart">\
      <h3>Key Misson Facilities by Type (Most Recent Quarter)</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
    </div>\
    <div id="savings" class="chart">\
      <h3>Cost Savings &amp; Avoidance by Year</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p class="notice">In millions of dollars. Data is incomplete for 2018 and later.</p>\
      <p class="message"></p>\
    </div>\
  </div>\
  <div id="optimization">\
    <h2>Optimization Metrics</h2>\
    <p>Note: Optimization metrics are only calculated for tiered data centers designed for such improvements. Exemptions are granted by permission of OMB.</p>\
  </div>\
  <div class="charts">\
    <div id="virtualization" class="chart">\
      <h3>Virtualization</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
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
    <div id="industryAvailability" class="chart">\
      <h3>Availability by Tier – Most Recent Quarter</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>\
        Number of facilities meeting industry-standard availability (in parentheses) for their tier.\
      </p>\
      <p>\
        Availability has only been reported since Q4 2018. Partial data may only be available for this metric.\
      </p>\
    </div>\
    <div id="energyMetering" class="chart">\
      <h3>Energy Metering</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>Definitions for energy meterting changed in Q4 2018.</p>\
    </div>\
    <div id="utilization" class="chart">\
      <h3>Underutilized Servers</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
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
    .append('<p>'+message+'</p>');
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

function buildTable (config) {
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
    let label = set.label || '';

    table += '<tr>';
    table += '<th>' + label + '</th>';
    datasets[i].data.forEach(function(datum, j) {
      datum = fn(datum || 0, label);
      table += '<td>' + datum + '</td>';
    });
    table += '</tr>';
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
  let fields = ['Savings', 'Closures', 'Virtualization', 'Availability', 'Metering', 'Utilization'];

  let timeperiods = Object.keys(data[allAgencies]['datacenters']['closed']).sort();
  let mostRecent = timeperiods[ timeperiods.length - 1 ];

  // Remove "All Agencies"
  agencies.splice( agencies.indexOf(allAgencies), 1 );
  agencies = agencies.sort();

  let table = '<table class="table datatable">';
  table += '<thead><tr><th>Agency</th>';

  table += fields.reduce( function(acc, field) { return acc + th(field); }, '');

  table += '</tr></thead><tbody>';

  agencies.forEach(function(agency) {
    table += tr(agency, data[agency]);
  });

  table += '</tbody></table>';

  $('#summary-table').append(table);
  $('#summary-table table').DataTable({
     paging: false,
     info: false
  });

  function tr(agency, data) {
    let cls = nameToClass(agency);
    let row = '<tr class="' + cls + '">';

    row += th(agency);

    // Savings
    if(data['plan'] && data['plan']['savings']) {
      row += td( Object.keys(data['plan']['savings']).reduce( function(acc, field) {
        if(field !== 'total' &&
          typeof data['plan']['savings'][field]['Achieved'] != 'undefined') {
          acc += parseFloat(data['plan']['savings'][field]['Achieved']);
        }
        return acc;
      }, 0).toFixed(2));
    }
    else {
      row += td('-');
    }

    // Closures
    row += td(data['datacenters']['closed'][mostRecent]['total'] || '-')

    // Some agencies have no metrics.
    if(data['metrics']) {
      // Virtualization
      row += td(
        data['metrics']['virtualization'][mostRecent] ?
        data['metrics']['virtualization'][mostRecent]['total'] : '-'
      );

      // Availability
      let percent = '-';
      if(data['metrics']['availability'][mostRecent]) {
        if(data['metrics']['downtime'][mostRecent]['total']) {
          percent = (
            (
              data['metrics']['plannedAvailability'][mostRecent]['total'] -
              data['metrics']['downtime'][mostRecent]['total']
            ) / data['metrics']['plannedAvailability'][mostRecent]['total'] * 100
          ).toFixed(4)+'%'
        }
        else {
          percent = '100%';
        }
      }
      row += td(percent);

      // Metering
      row += td(
        data['metrics']['energyMetering'][mostRecent] ?
        data['metrics']['energyMetering'][mostRecent]['total'] : '-'
      );

      // Utilization
      row += td(
        data['metrics']['underutilizedServers'][mostRecent] ?
        data['metrics']['underutilizedServers'][mostRecent]['total'] : '-'
      );
    }
    else {
      row += td('-')+td('-')+td('-')+td('-');
    }

    row += '</tr>';

    return row;
  }
  function th(elm) {
    return '<th>' + elm + '</th>';
  }
  function td(elm) {
    return '<td>' + elm + '</td>';
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

  $('#main-message').empty();
  if(!data[agency]['plan'] || !Object.keys(data[agency]['plan'])) {
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
  showVirtualization(data, agency);
  showAvailability(data, agency);
  showIndustryAvailability(data, agency);
  showMetering(data, agency);
  showUnderutilizedServers(data, agency);
}


function showClosures(data, agency) {
  let closeState = ['closed', 'open', 'kmf'];
  let timeperiods = Object.keys(data[allAgencies]['datacenters'][ closeState[0] ]).sort();
  let mostRecent = timeperiods[ timeperiods.length - 1 ];

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
      labels: timeperiods.sort()
    },
    lines: [
      { value: '2018 Q4' }
    ]
  }

  // Create a copy of this chart.
  let countTierData = $.extend(true,{},countData);

  countData.data.datasets = closeState.map(function(state) {
    return {
      label: state,
      backgroundColor: stateColors[state],
      data: timeperiods.map(function(time) {
        let result = 0;

        // Sum of "total" (Tiered) and "nontiered"
        if(data[agency]['datacenters'][state] &&
          data[agency]['datacenters'][state][time]) {
          if(data[agency]['datacenters'][state][time]['total']) {
            result += data[agency]['datacenters'][state][time]['total'];
          }

          if(data[agency]['datacenters'][state][time]['nontiered']) {
            result += data[agency]['datacenters'][state][time]['nontiered'];
          }
        }

        return result;
      })
    };
  });

  countTierData.data.datasets = closeState.map(function(state) {
    return {
      label: state,
      backgroundColor: stateColors[state],
      data: timeperiods.map(function(time) {
        // If we have data for this time period, return it. Otherwise null.
        try {
          return data[agency]['datacenters'][state][time]['total'];
        }
        catch(e) {
          return 0;
        }
      })
    };
  });

  if(data[agency]['plan'] && data[agency]['plan']['closures']) {
    countTierData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    Object.keys(data[agency]['plan']['closures']).forEach(function(year, idx, arr) {
      countTierData.options.annotation.annotations.push(
        goalLine(data[agency]['plan']['closures'][year]['Planned'],
          year, idx, ' Closed', arr.length)
      );
    });
  }

  let countAllChart = chartWrap('count-all', countData);

  let countTieredChart = chartWrap('count-tiered', countTierData);

  // By Tier
  tierData = {
    type: 'bar',
    options: {
      title: {
        display: true,
        text: mostRecent
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
        if(data[agency]['datacenters'][state] &&
          data[agency]['datacenters'][state][mostRecent] &&
          data[agency]['datacenters'][state][mostRecent][tier]
        ) {
          return data[agency]['datacenters'][state][mostRecent][tier];
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
    displayMessage('kmfs', 'No Key Mission Facilities reported for this quarter.');
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
        text: mostRecent
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
      data[agency]['kmf'][mostRecent][type]['total']
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

  let timeperiods = Object.keys(data[agency]['plan']['savings']);
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
    hidden: true,
    label: 'Cumulative',
    borderColor: colors['blue'],
    backgroundColor: colors['trans-blue'],
    pointRadius: 6,
    lineTension: 0,
    data: []
  }

  $.each(timeperiods, function(i, timeperiod) {
    plannedData['data'].push( data[agency]['plan']['savings'][timeperiod]['Planned'] );
    achievedData['data'].push( data[agency]['plan']['savings'][timeperiod]['Achieved'] );

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
      labels: timeperiods,
      datasets: [plannedData, achievedData, totalData]
    },
    options: {
      tooltips: {
        callbacks: {
          label: function (obj) {
            return parseFloat(obj.value).toFixed(2);
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
  let timeperiods = Object.keys(data[agency]['metrics']['virtualization']).sort();

  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Virtual Hosts',
    borderColor: colors['green'],
    backgroundColor: colors['green'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
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
    achievedData['data'].push( data[agency]['metrics']['virtualization'][timeperiod]['total'] );
    serverData['data'].push( data[agency]['metrics']['servers'][timeperiod]['total'] );
    percentData['data'].push(
      (data[agency]['metrics']['virtualization'][timeperiod]['total'] /
       data[agency]['metrics']['servers'][timeperiod]['total']  * 100)
        .toFixed(2)
    );
  });

  virtualizationData = {
    type: 'bar',
    data: {
      labels: timeperiods,
      datasets: [percentData, achievedData, serverData]
    },
    options: {
      scales: {
        yAxes: [
          {
            id: 'y-axis-left',
            position: 'left',
            stacked: false,
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

  if(data[agency]['plan'] && data[agency]['plan']['virtualization']) {
    virtualizationData.options.annotation = {
      drawTime: 'afterDatasetsDraw',
      annotations: []
    };

    Object.keys(data[agency]['plan']['virtualization']).forEach(function(year, idx, arr) {
      virtualizationData.options.annotation.annotations.push(
        goalLine(data[agency]['plan']['virtualization'][year]['Planned'],
          year, idx, ' Virtual Hosts', arr.length)
      );
    });
  }

  let virtualizationChart = chartWrap('virtualization', virtualizationData);
}

function showAvailability(data, agency) {
  // We only have recent data for this element.
  let timeperiods = Object.keys(data[agency]['metrics']['plannedAvailability']).sort();

  let idx = timeperiods.indexOf(changeData);

  let totalData = {
    // hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Total Hours',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let downtimeData = {
    yAxisID: 'y-axis-left',
    label: 'Downtime',
    borderColor: colors['red'],
    backgroundColor: colors['red'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
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

  for(let i = idx; i < timeperiods.length; i++) {
    let timeperiod = timeperiods[i];

    totalData['data'].push(
      data[agency]['metrics']['plannedAvailability'][timeperiod]['total']
    );
    downtimeData['data'].push(
      data[agency]['metrics']['downtime'][timeperiod]['total']
    );

    let percent = 0;
    if (data[agency]['metrics']['plannedAvailability'][timeperiod]['total']) {
      percent = (
        (
          data[agency]['metrics']['plannedAvailability'][timeperiod]['total'] -
          data[agency]['metrics']['downtime'][timeperiod]['total']
        ) / data[agency]['metrics']['plannedAvailability'][timeperiod]['total'] * 100
      ).toFixed(4)
    }

    percentData['data'].push(percent);
  }

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
      labels: timeperiods.slice(idx),
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
    $('#availability .message').text('Availability goals cannot be calculated for all agencies combined, as this target is a percentage of each agency\'s planned availability.');
  }

  let availabilityChart = chartWrap('availability', availabilityData);
}

function showIndustryAvailability(data, agency) {
  // We only have recent data for this element.
  let timeperiods = Object.keys(data[agency]['metrics']['availability']).sort();
  let mostRecent = timeperiods[ timeperiods.length - 1 ];

  let idx = timeperiods.indexOf(changeData);

  let tierAvailability = {
    'Tier 1': 99.671,
    'Tier 2': 99.749,
    'Tier 3': 99.982,
    'Tier 4': 99.995
  };

  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Meet Availability',
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
    label: 'Total Count',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let labels = [];

  tiers.forEach(function(tier) {
    let value = data[agency]['metrics']['availability'][mostRecent][tier];

    achievedData['data'].push(
      data[agency]['metrics']['availability'][mostRecent]['total']
    );

    totalData['data'].push(
      data[agency]['metrics']['count'][mostRecent]['total']
    );

    labels.push([tier, '(' + tierAvailability[tier] + '%)']);
  });

  availabilityData = {
    type: 'bar',
    data: {
      labels: labels,
      datasets: [achievedData, totalData]
    },
    options: {
      tooltips: {
        callbacks: {
          title: function(obj) {
            return obj[0].xLabel[0];
          }
        }
      },
      scales: {
        yAxes: [
        {
          id: 'y-axis-left',
          position: 'left',
          stepSize: 1,
          stacked: false
        }
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


  let availabilityChart = chartWrap('industryAvailability', availabilityData);
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
    achievedData['data'].push( data[agency]['metrics']['energyMetering'][timeperiod]['total'] );
    totalData['data'].push( data[agency]['metrics']['count'][timeperiod]['total'] );
    percentData['data'].push(
      (data[agency]['metrics']['energyMetering'][timeperiod]['total'] /
       data[agency]['metrics']['count'][timeperiod]['total'] * 100 )
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
    achievedData['data'].push( data[agency]['metrics']['underutilizedServers'][timeperiod]['total'] );
    serverData['data'].push( data[agency]['metrics']['servers'][timeperiod]['total'] );
    percentData['data'].push(
      (data[agency]['metrics']['underutilizedServers'][timeperiod]['total'] /
       data[agency]['metrics']['servers'][timeperiod]['total']  * 100)
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