/**
 * Visualizations for DCOI data.
 *
 * TODO:
 *   - Check close/open/kmf data for NaN & missing data. (E.g. USDA, SSA)
 *   - Finish metrics
 *   - Fix availability
 *   - Fix energy metering
 *   - Target values for metrics
 *   - Investigate missing KMF total for Q4 2018
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

$( document ).ready(function (){
  loadApp();
  $.getJSON('./data.json', function(data) {
    allData = data;
    setAgencies(Object.keys(data));
    showData(data, 'All Agencies');
  });
});

function loadApp() {
  $('#app').html('<div class="loading">Loading...</div>\
<div class="after-load">\
  <div class="form-row">\
    <label for="agency-list">Agency</label>\
    <select id="agency-list"></select>\
  </div>\
  <h2>Cost Savings & Closures</h2>\
  <div class="charts">\
    <div id="count-all" class="chart">\
      <h3>Closures Over Time (All)</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018.</p>\
    </div>\
    <div id="count-tiered" class="chart">\
      <h3>Closures Over Time (Tiered Only)</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018.</p>\
    </div>\
    <div id="tier" class="chart">\
      <h3>Current Count by Tier</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
    </div>\
    <div id="kmfs" class="chart">\
      <h3>Current Key Misson Facilities by Type</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
    </div>\
    <div id="savings" class="chart">\
      <h3>Cost Savings &amp; Avoidance</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>In millions of dollars. Data is incomplete for 2018 and later.</p>\
    </div>\
  </div>\
  <div>\
    <h2>Optimization Metrics</h2>\
    <p>Note: Optimization metrics are only calculated for tiered data centers designed for such improvements.</p>\
  </div>\
  <div class="charts">\
    <div id="virtualization" class="chart">\
      <h3>Virtualization</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>\
        Server count is inclusive of any virtual hosts.\
      </p>\
    </div>\
    <div id="availability" class="chart">\
      <h3>Availability</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
      <p>\
        Number of facilities meeting expected availability for their tier.\
        Expected Availability for Tier 1: 99.671%, Tier 2: 99.749%, Tier 3: 99.982%, Tier 4: 99.995%.\
      </p>\
      <p>\
        Availability has only been reported since Q4 2018. Partial data may only be available for this metric.\
      </p>\
    </div>\
    <div id="energyMetering" class="chart">\
      <h3>Energy Metering</h3>\
      <div class="chart-holder"></div>\
      <div class="table-holder"></div>\
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
</div>');
}

function displayMessage(id, message) {
  let elm = $('#'+id+' .chart-holder');
  elm.empty();
  elm.append(message);
  $('#'+id+' .table-holder').empty()
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

function setAgencies(agencies) {
  // Move 'All Agencies' to the front.
  agencies.splice( $.inArray('All Agencies', agencies), 1 );
  agencies.unshift('All Agencies');

  let agencyList = $('#agency-list');
  for(let i = 0; i < agencies.length; i++) {
    agencyList.append($('<option value="'+agencies[i]+'">'+agencies[i]+'</option>'));
  }

  agencyList.change(function(e) {
    $('.loading').show();
    $('after-load').hide();
    showData(allData, $(e.target).val());
  });
}

function buildTable (config) {
  let data = config.data;
  let datasets = data.datasets;

  if(config.options.legend && config.options.legend.reverse) {
    datasets = datasets.reverse();
  }

  let table = '<table>';
  table += '<thead><tr><th></th>';

  data.labels.forEach(function (item, idx) {
    table += '<th>' + item + '</th>';
  })
  table += '</tr></thead><tbody>';

  let columnCount = 0;
  datasets.forEach(function (set, i) {
    let label = set.label || '';
    table += '<tr>';
    table += '<th>' + label + '</th>';
    datasets[i].data.forEach(function(datum, j) {
      datum = datum || 0;
      table += '<td>' + datum + '</td>';
    });
    table += '</tr>';
  });

  table += '</tbody></table>';

  return table;
};

function showData(data, agency) {
  // Show our charts after we have data.
  $('.loading').hide();
  $('after-load').show();


  showClosures(data, agency);
  showKMFTypes(data, agency);
  showSavings(data, agency);
  showVirtualization(data, agency);
  showAvailability(data, agency);
  showMetering(data, agency);
  showUnderutilizedServers(data, agency);
}


function showClosures(data, agency) {
  let closeState = ['closed', 'open', 'kmf'];
  let timeperiods = Object.keys(data['All Agencies']['datacenters'][ closeState[0] ]).sort();
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
        // If we have data for this time period, return it. Otherwise null.
        try {
          // Sum of "total" (Tiered) and "nontiered"
          return data[agency]['datacenters'][state][time]['total'] +
            data[agency]['datacenters'][state][time]['nontiered'];
        }
        catch(e) {
          return 0;
        }
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
      labels: ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']
    }
  }

  tierData.data.datasets = closeState.map(function(state) {
    return {
      label: state,
      backgroundColor: stateColors[state],
      data: tierData.data.labels.map(function(tier) {
        // If we have data for this time period, return it. Otherwise null.
        try {
          return data[agency]['datacenters'][state][mostRecent][tier];
        }
        catch(e) {
          return null;
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
  types.splice( types.indexOf('Other'), 1 );
  types.push('Other');

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
            beginAtZero: true,
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

  let timeperiods = Object.keys(data[agency]['savings']);

  if(typeof timeperiods == 'undefined') {
    displayMessage('savings', 'Cost savings are missing for this agency.');
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

  $.each(timeperiods, function(i, timeperiod) {
    plannedData['data'].push( Math.round(data[agency]['savings'][timeperiod]['Planned']) );
    achievedData['data'].push( Math.round(data[agency]['savings'][timeperiod]['Achieved']) );
  });

  savingsData = {
    type: 'line',
    data: {
      labels: timeperiods,
      datasets: [plannedData, achievedData]
    },
    options: {
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

  let plannedData = {
    label: 'Planned',
    borderColor: colors['grey'],
    borderDash: [5,5],
    backgroundColor: colors['trans-grey'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
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
    hidden: true,
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
    // plannedData['data'].push( Math.round(data[agency]['savings'][timeperiod]['Planned']) );
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
      datasets: [percentData, /*plannedData,*/ achievedData, serverData]
    },
    options: {
      tooltips: {
        callbacks: {
          label: function(obj) {
            let label = this._data.datasets[obj.datasetIndex].label;
            if(label == 'Percent') {
              return label + ': ' + obj.value + '%';
            }
            return label + ': ' + obj.value;
          }
        }
      },
      scales: {
        yAxes: [
        {
          id: 'y-axis-left',
          position: 'left',
          stacked: false,
          ticks: {
            min: 0
          }
        },
        {
          id: 'y-axis-right',
          position: 'right',
          stacked: false,
          ticks: {
            min: 0,
            callback: function(value) { return value + '%'; }
          }
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

  let virtualizationChart = chartWrap('virtualization', virtualizationData);
}

function showAvailability(data, agency) {
  // We only have recent data for this element.
  let timeperiods = Object.keys(data[agency]['metrics']['availability']).sort();

  let idx = timeperiods.indexOf(changeData);

  let plannedData = {
    label: 'Planned',
    borderColor: colors['grey'],
    borderDash: [5,5],
    backgroundColor: colors['trans-grey'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
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
    hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Total Count',
    borderColor: colors['blue'],
    backgroundColor: colors['blue'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let percentData = {
    yAxisID: 'y-axis-right',
    label: 'Percent',
    borderColor: colors['purple'],
    backgroundColor: colors['trans-purple'],
    fill: false,
    pointRadius: 3,
    lineTension: 0,
    data: []
  };

  for(let i = idx; i < timeperiods.length; i++) {
    let timeperiod = timeperiods[i];
    // plannedData['data'].push( Math.round(data[agency]['savings'][timeperiod]['Planned']) );
    // percentData['data'].push( data[agency]['metrics']['availability'][timeperiod]['total'] );
    achievedData['data'].push(
      data[agency]['metrics']['availability'][timeperiod]['total']
    );

    let totalCount = data[agency]['datacenters']['open'][timeperiod]['total'];
    if(data[agency]['datacenters']['kmf'][timeperiod]) {
      totalCount += data[agency]['datacenters']['kmf'][timeperiod]['total'];
    }
    totalData['data'].push(totalCount);
  }

  availabilityData = {
    type: 'bar',
    data: {
      labels: timeperiods.slice(idx),
      datasets: [/*plannedData,*/ achievedData, totalData/*, percentData*/]
    },
    options: {
      scales: {
        yAxes: [
        {
          id: 'y-axis-left',
          position: 'left',
          stacked: false,
          ticks: {
            min: 0
          }
        },
        // {
        //   id: 'y-axis-right',
        //   position: 'right',
        //   stacked: false,
        //   ticks: {
        //     min: 0,
        //     callback: function(value) { return value + '%'; }
        //   }
        // }
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

  let availabilityChart = chartWrap('availability', availabilityData);
}

function showMetering(data, agency) {
  let timeperiods = Object.keys(data[agency]['metrics']['energyMetering']).sort();

  let plannedData = {
    label: 'Planned',
    borderColor: colors['grey'],
    borderDash: [5,5],
    backgroundColor: colors['trans-grey'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Have Energy Metering',
    borderColor: colors['green'],
    backgroundColor: colors['green'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let totalData = {
    hidden: true,
    yAxisID: 'y-axis-left',
    label: 'Total Count',
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
    let totalCount = data[agency]['datacenters']['open'][timeperiod]['total'];
    if(data[agency]['datacenters']['kmf'][timeperiod]) {
      totalCount += data[agency]['datacenters']['kmf'][timeperiod]['total'];
    }

    // plannedData['data'].push( Math.round(data[agency]['savings'][timeperiod]['Planned']) );
    achievedData['data'].push( data[agency]['metrics']['energyMetering'][timeperiod]['total'] );
    totalData['data'].push( totalCount );
    percentData['data'].push(
      (data[agency]['metrics']['energyMetering'][timeperiod]['total'] /
       data[agency]['metrics']['servers'][timeperiod]['total']  * 100)
        .toFixed(2)
    );
  });

  meteringData = {
    type: 'bar',
    data: {
      labels: timeperiods,
      datasets: [percentData, /*plannedData,*/ achievedData, totalData]
    },
    options: {
      tooltips: {
        callbacks: {
          label: function(obj) {
            let label = this._data.datasets[obj.datasetIndex].label;
            if(label == 'Percent') {
              return label + ': ' + obj.value + '%';
            }
            return label + ': ' + obj.value;
          }
        }
      },
      scales: {
        yAxes: [
        {
          id: 'y-axis-left',
          position: 'left',
          stacked: false,
          ticks: {
            min: 0
          }
        },
        {
          id: 'y-axis-right',
          position: 'right',
          stacked: false,
          ticks: {
            min: 0,
            callback: function(value) { return value + '%'; }
          }
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

  let meteringChart = chartWrap('energyMetering', meteringData);
}

function showUnderutilizedServers(data, agency) {
  // We only have recent data for this element.
  let timeperiods = Object.keys(data[agency]['metrics']['underutilizedServers']).sort();

  let idx = timeperiods.indexOf(changeData);

  let plannedData = {
    label: 'Planned',
    borderColor: colors['grey'],
    borderDash: [5,5],
    backgroundColor: colors['trans-grey'],
    fill: false,
    pointRadius: 6,
    lineTension: 0,
    data: []
  };
  let achievedData = {
    yAxisID: 'y-axis-left',
    label: 'Underutilized',
    borderColor: colors['green'],
    backgroundColor: colors['green'],
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
    // plannedData['data'].push( Math.round(data[agency]['savings'][timeperiod]['Planned']) );
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
      datasets: [percentData, /*plannedData,*/ achievedData, serverData]
    },
    options: {
      tooltips: {
        callbacks: {
          label: function(obj) {
            let label = this._data.datasets[obj.datasetIndex].label;
            if(label == 'Percent') {
              return label + ': ' + obj.value + '%';
            }
            return label + ': ' + obj.value;
          }
        }
      },
      scales: {
        yAxes: [
        {
          id: 'y-axis-left',
          position: 'left',
          stacked: false,
          ticks: {
            min: 0
          }
        },
        {
          id: 'y-axis-right',
          position: 'right',
          stacked: false,
          ticks: {
            min: 0,
            callback: function(value) { return value + '%'; }
          }
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

  let underutilizedServersChart = chartWrap('utilization', underutilizedServersData);
}