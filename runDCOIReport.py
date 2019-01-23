###
# This script exports data to show on the ITDashboard from a local sqlite database.
###
#
# TODO: Add Key Mission Facilities to calculations
# TODO: Add cost savings queries - this needs cost savings data file scraper
#
from __future__ import print_function

import csv
import sys
import itertools
import sqlite3
import json
import copy

import config

# Convenience function for setting deep dictionary values
# Removes a *lot* of dictionary cruft initialization!
# Usage:
# myTest = {}
# deepadd(myTest, 'a', 'b', 'c', 10)
# deepadd(myTest, 'a', 'b', 'c', 5)
# print(myTest)
# > {'a': {'b': {'c': 15}}}
def deepadd(myList, *params):
  params = list(params)
  
  key = params.pop(0)

  if len(params) > 1:
    if key not in myList:
      myList[key] = {}
    deepadd(myList[key], *params)

  elif len(params) == 1:
    if key not in myList:
      myList[key] = params[0]
    else:
      myList[key] += params[0]


# Setup our base data holders.
metrics = [
  'virtualization',
  'servers',
  'mainframes',
  'hpcs',
  'downtime',
  'plannedUptime',
  'energyMetering',
  'underutilizedServers'
]

baseData = {
  'datacenters': {
    'open': {},
    'kmf': {},
    'closed': {}
  },
  'savings': {},
  'metrics': {}
}

for metric in metrics:
  baseData['metrics'][metric] = {}

allAgencies = 'All Agencies'

tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']

data = {
  'All Agencies': copy.deepcopy(baseData)
}


conn = sqlite3.connect(config.DB_CONFIG['file'])
conn.row_factory = sqlite3.Row

c = conn.cursor()


# 1. First, get our overall counts.

c.execute('''
SELECT
agency,
year,
quarter,
COUNT(*) AS count,
keyMissionFacility,
closingStage,
tier
FROM datacenters
WHERE ownershipType = 'Agency Owned'
GROUP BY agency, year, quarter, tier, keyMissionFacility, closingStage
''')

for row in c.fetchall():
  # Initialize our data.
  if row['agency'] not in data:
    data[row['agency']] = copy.deepcopy(baseData)

  # Setup our quarter string.
  quarter = "{} Q{}".format(row['year'], row['quarter'])

  # If it's not closed, it's open.
  closingStage = 'closed'
  if row['closingStage'] != 'Closed':
    closingStage = 'open'
  
  tier = row['tier']
  if tier not in tiers:
    tier = 'nontiered'

  # Agency
  deepadd(data, row['agency'], 'datacenters', closingStage, quarter, 'total', row['count'])
  deepadd(data, row['agency'], 'datacenters', closingStage, quarter, tier, row['count'])

  # Total
  deepadd(data, allAgencies, 'datacenters', closingStage, quarter, 'total', row['count'])
  deepadd(data, allAgencies, 'datacenters', closingStage, quarter, tier, row['count'])

  ## KMFs

  # handle Key Mission Facilities; we only care about open ones.
  if row['keyMissionFacility'] == 'Yes' and closingStage == 'open':
    # Agency
    deepadd(data, row['agency'], 'datacenters', 'kmf', quarter, 'total', row['count'])
    deepadd(data, row['agency'], 'datacenters', 'kmf', quarter, tier, row['count'])

    # Total
    deepadd(data, allAgencies, 'datacenters', 'kmf', quarter, 'total', row['count'])
    deepadd(data, allAgencies, 'datacenters', 'kmf', quarter, tier, row['count'])


# 2. Next, calculate our metrics for open data centers.

c.execute('''
SELECT
agency,
year,
quarter,
SUM(electricityMetered) AS energyMetering,
SUM(underutilizedServers) AS underutilizedServers,
SUM(downtimeHours) AS downtime,
SUM(plannedAvailabilityHours) AS plannedUptime,
SUM(mainframesCount) AS mainframes,
SUM(HPCCount) AS hpcs,
SUM(serverCount) AS servers,
SUM(virtualHostCount) AS virtualization
FROM datacenters
WHERE closingStage != 'Closed'
AND ownershipType = 'Agency Owned'
GROUP BY agency, year, quarter
ORDER BY agency, year, quarter
''')

for row in c.fetchall():
  # Setup our quarter string.
  quarter = "{} Q{}".format(row['year'], row['quarter'])

  for metric in metrics:
    data[row['agency']]['metrics'][metric][quarter] = row[metric]

  # Setup our aggregate.
  if quarter not in data[allAgencies]['metrics']['virtualization']:
    for metric in metrics:
      data[allAgencies]['metrics'][metric][quarter] = 0

  # Add to our aggregate.
  for metric in metrics:
    data[allAgencies]['metrics'][metric][quarter] += row[metric]


print( json.dumps(data) )

#conn.commit()
conn.close()

exit()

"""
Example JSON format (numbers are made up!)
TODO: split up by tier.

{
  "All Agencies": {
    "datacenters": {
      "open": {
        "2018 Q4": {
          "total": 3600,
          "tier 1": 2000,
          "tier 2": 1000,
          "tier 3": 500,
          "tier 4": 100,
          "nontiered": 5000
        }
      },
      "closed": {
        "2018 Q4": {
          "total": 3600,
          "tier 1": 2000,
          "tier 2": 1000,
          "tier 3": 500,
          "tier 4": 100,
          "nontiered": 4000
        }
      },
      "kmf": {
        "2018 Q4": {
          "total": 700,
          "tier 1": 300,
          "tier 2": 200,
          "tier 3": 150,
          "tier 4": 50
        }
      }
    },
    "savings": {
      "2018 Q4": 1000
    },
    "metrics": {
      "virtualization": {
        "2018 Q4": 5000
      },
      "servers":  {
        "2018 Q4": 218000
      },
      "mainframes": {
        "2018 Q4": "50000"
      },
      "hpcs": {
        "2018 Q4": "25000"
      },
      "downtime":  {
        "2018 Q4": 50
      },
      "plannedUptime": {
        "2018 Q4": 200000
      },
      "energyMetering": {
        "2018 Q4": 5000
      },
      "underutilizedServers": {
        "2018 Q4": 150
      }
    }
  },
  "USDA": {
    "datacenters": {
    "datacenters": {
      "open": {
        "2018 Q4": {
          "total": 360,
          "tier 1": 200,
          "tier 2": 100,
          "tier 3": 50,
          "tier 4": 10,
          "nontiered": 500
        }
      },
      "closed": {
        "2018 Q4": {
          "total": 360,
          "tier 1": 200,
          "tier 2": 100,
          "tier 3": 50,
          "tier 4": 10,
          "nontiered": 4000
        }
      },
      "kmf": {
        "2018 Q4": {
          "total": 70,
          "tier 1": 30,
          "tier 2": 20,
          "tier 3": 15,
          "tier 4": 5
        }
      }
    },
    "savings": {
      "2018 Q4": 100
    },
    "metrics": {
      "virtualization": {
        "2018 Q4": 500
      },
      "servers":  {
        "2018 Q4": 21000
      },
      "mainframes": {
        "2018 Q4": "5000"
      },
      "hpcs": {
        "2018 Q4": "2500"
      },
      "unplanned outages":  {
        "2018 Q4": 5
      },
      "plannedUptime": {
        "2018 Q4": 20000
      },
      "energyMetering": {
        "2018 Q4": 500
      },
      "underutilizedServers": {
        "2018 Q4": 15
      }
    }
  }
}
"""