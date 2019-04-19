function loadApp() {
  $('#app').html('<div class="loading">Loading...</div>\
<div class="after-load">\
  <div class="form-row">\
    <label for="agency-list">Agency</label>\
    <select id="agency-list"></select>\
  </div>\
  <div class="row">\
    <div id="count" class="chart">\
      <h2>Closures Over Time</h2>\
      <div class="placeholder"></div>\
    </div>\
    <div id="savings" class="chart">\
      <h2>Cost Savings &amp; Avoidance</h2>\
      <div class="placeholder"></div>\
    </div>\
    <div id="tier" class="chart">\
      <h2>Current Count by Tier</h2>\
      <div class="placeholder"></div>\
    </div>\
  <div id="kmfs" class="chart">\
    <h2>Key Misson Facilities by Type</h2>\
    <div class="placeholder"></div>\
  </div>\
  </div>\
  <div class="row">\
    <div id="energyMetering" class="chart"></div>\
    <div id="virtualization" class="chart"></div>\
  </div>\
</div>');
}

function displayMessage(id, message) {
  let elm = $('#'+id+' .placeholder');
  elm.empty();
  elm.append(message);
}

function chartWrap(id, chartOptions) {
  let newName = id+'-canvas';
  let elm = $('#'+id+' .placeholder');
  elm.empty();
  elm.append('<canvas id="'+newName+'"></canvas>');
  return new Chart( $('#'+newName), chartOptions );
}

var allData;
$( document ).ready(function (){
  loadApp();
  $.getJSON('./data.json', function(data) {
    allData = data;
    setAgencies(Object.keys(data));
    showData(data, 'All Agencies');
  });
});

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

function showData(data, agency) {
  // Show our charts after we have data.
  $('.loading').hide();
  $('after-load').show();

  let colors = {
    'green': '#28a745',
    'trans-green': 'rgba(28, 167, 45, 0.4)',
    'blue': '#007bff',
    'trans-blue': 'rgba(00, 123, 255, 0.4)',
    'grey': '#555555',
    'trans-grey': 'rgba(55, 55, 55, 0.4)',
    'red': '#dc3545',
    'yellow': '#ffc107',
    'teal': '#17a2b8',
    'purple': '#563d7c'
  };


  let stateColors = {'closed': colors['grey'], 'open': colors['blue'], 'kmf': colors['green']};
  let kmfTypeColors = {
    'Mission': colors['green'],
    'Location': colors['yellow'],
    'Processing': colors['teal'],
    'Control': colors['blue'],
    'Legal': colors['red'],
    'Other': colors['purple']
  };

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
            stacked: true,
            scaleLabel: {
              display: true,
              labelString: 'Definitions changed and Key Mission Facilities (KMFs) were added in Q4 2018'
            }
          }],
          yAxes: [{
            stacked: true
          }]
        }
      },
      data: {
        labels: timeperiods.sort()
      }
    }

    countData.data.datasets = closeState.map(function(state) {
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

    let countChart = chartWrap('count', countData);

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
  showClosures(data, agency);

// Key Mission Facility Types
  function showKMFTypes(data, agency) {
    let timeperiods, mostRecent, types;

    // If we don't have types in the most recent list, we don't have any KMFs.
    try {
      timeperiods = Object.keys(data[agency]['kmf']);
      mostRecent = timeperiods[ timeperiods.length - 1 ];
      types = Object.keys(data[agency]['kmf'][mostRecent]);

      console.log(types);
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
          }]
        },
        legend: {
          display: false
        }
      },
      data: {
        labels: types,
        datasets: [{
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
  showKMFTypes(data, agency);

  // Cost savings
  function showSavings(data, agency) {
    let timeperiods = Object.keys(data[agency]['savings']);

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
              display: true,
              labelString: 'In millions of dollars. Data is incomplete for 2018 and later'
            }
          }]
        }
      }
    };

    let savingsChart = chartWrap('savings', savingsData);
  }
  showSavings(data, agency);

  // Metrics

}