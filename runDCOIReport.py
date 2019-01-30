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
import re
from decimal import Decimal

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

def getQuarter(row):
  return "{} Q{}".format(row['year'], row['quarter'])

# The default JSON encoder is too dumb to handle Decimals. However, using
# Python-native floats end up as an approximation, so we must use flagged
# strings instead. We remove these flags before outputting.

JSONEncoder_olddefault = json.JSONEncoder.default
def JSONEncoder_newdefault(self, o):
#    if isinstance(o, UUID): return str(o)
#    if isinstance(o, datetime): return str(o)
#    if isinstance(o, time.struct_time): return datetime.fromtimestamp(time.mktime(o))
    if isinstance(o, Decimal): return "FLOAT:"+str(o)
    return JSONEncoder_olddefault(self, o)
json.JSONEncoder.default = JSONEncoder_newdefault

def jsonCleanup(json):
  return re.sub(r'"FLOAT:([0-9\.]+)"', r'\1', json)

# Setup our base data holders.
metrics = [
  'count',
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

data = {
  'All Agencies': copy.deepcopy(baseData)
}

for metric in metrics:
  baseData['metrics'][metric] = {}

allAgencies = 'All Agencies'

tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']


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
  quarter = getQuarter(row)

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
tier,
COUNT(*) AS count,
SUM(electricityMetered) AS energyMetering,
SUM(underutilizedServers) AS underutilizedServers,
SUM(downtimeHours) AS downtime,
SUM(plannedAvailabilityHours) AS plannedUptime,
SUM(mainframesCount) AS mainframes,
SUM(HPCCount) AS hpcs,
SUM(serverCount) AS servers,
SUM(virtualHostCount) AS virtualization
FROM datacenters
WHERE closingStage = 'Not Closed'
AND ownershipType = 'Agency Owned'
GROUP BY agency, year, quarter, tier
ORDER BY agency, year, quarter, tier
''')

for row in c.fetchall():
  # Setup our quarter string.
  quarter = getQuarter(row)

  tier = row['tier']
  if tier not in tiers:
    #tier = 'nontiered'
    continue

  for metric in metrics:
    deepadd(data, row['agency'], 'metrics', metric, quarter, tier, row[metric])
    deepadd(data, row['agency'], 'metrics', metric, quarter, 'total', row[metric])

    deepadd(data, allAgencies, 'metrics', metric, quarter, tier, row[metric])
    deepadd(data, allAgencies, 'metrics', metric, quarter, 'total', row[metric])


# 3. Calculate our cost savings

c.execute('''
SELECT *
FROM stratplans
WHERE type=:type
GROUP BY agency
ORDER BY importDate DESC
''', {'type': 'costSavings'})

for row in c.fetchall():
  for field,value in dict(row).items():

    match = re.match(r'^fy([0-9]{2})([a-zA-Z_]+)$', field);
    if match != None and value != None:
      year = 2000 + int(match.group(1))
      type = match.group(2)

      # Convert our value to a safe decimal instead of a float.
      # https://github.com/ombegov/dcoi/issues/6
      value = Decimal(value)

      deepadd(data, row['agency'], 'savings', year, type, value)
      deepadd(data, allAgencies, 'savings', year, type, value)


print( jsonCleanup(json.dumps(data)) )
# TODO: Maybe export a file instead of just printing?

#conn.commit()
conn.close()

exit()

"""
Example JSON format (numbers are made up!)

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
      "2017": {
        "planned": 300,
        "actual": 600
      },
      "2018": {
        "planned": 100,
        "actual": 500
      }
    },
    "metrics": {
      "virtualization": {
        "total": 3000,
        "tier 1": 300,
        "tier 2": 500,
        "tier 3": 1200,
        "tier 4": 1000
      },
      "servers":  {
        "total": 6000,
        "tier 1": 1000,
        "tier 2": 1000,
        "tier 3": 2000,
        "tier 4": 2000
      },
      "mainframes": {
        "total": 360,
        "tier 1": 200,
        "tier 2": 100,
        "tier 3": 50,
        "tier 4": 10
      },
      "hpcs": {
        "total": 30,
        "tier 1": 0,
        "tier 2": 0,
        "tier 3": 10,
        "tier 4": 20
      },
      "downtime":  {
        "total": 36,
        "tier 1": 20,
        "tier 2": 10,
        "tier 3": 5,
        "tier 4": 1
      },
      "plannedUptime": {
        "total": 360000,
        "tier 1": 200000,
        "tier 2": 100000,
        "tier 3": 50000,
        "tier 4": 10000
      },
      "energyMetering": {
        "total": 3600,
        "tier 1": 2000,
        "tier 2": 1000,
        "tier 3": 500,
        "tier 4": 100
      },
      "underutilizedServers": {
        "total": 3600,
        "tier 1": 2000,
        "tier 2": 1000,
        "tier 3": 500,
        "tier 4": 100
      }
    }
  }
}
"""