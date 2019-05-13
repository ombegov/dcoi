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
data = {}

metrics = [
  'count',
  'virtualization',
  'servers',
  'mainframes',
  'hpcs',
  'availability',
  'energyMetering',
  'underutilizedServers',
  'plannedAvailability',
  'downtime'
]

allAgencies = 'All Agencies'

tiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']

conn = sqlite3.connect(config.DB_CONFIG['file'])
conn.row_factory = sqlite3.Row

c = conn.cursor()


# First, get our overall counts.

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

maxQuarter = (0,0);

for row in c.fetchall():
  if(row['year'] > maxQuarter[0] or
    (row['year'] == maxQuarter[0] and row['quarter'] > maxQuarter[1])
  ):
    maxQuarter = (row['year'], row['quarter'])

  # Setup our quarter string.
  quarter = getQuarter(row)

  # If it's not closed, it's open.
  closingStage = 'closed'
  if row['closingStage'] != 'Closed':
    closingStage = 'open'

  if row['keyMissionFacility'] == 1 and closingStage == 'open':
    closingStage = 'kmf'

  tier = row['tier']
  if tier not in tiers:
    tier = 'nontiered'

  # Agency
  deepadd(data, row['agency'], 'datacenters', closingStage, quarter, tier, row['count'])
  # All Agencies Sum
  deepadd(data, allAgencies, 'datacenters', closingStage, quarter, tier, row['count'])

  # We only add to the total if this is a tiered facility, based on our new guidance.
  if row['tier'] in tiers:
    deepadd(data, row['agency'], 'datacenters', closingStage, quarter, 'total', row['count'])
    deepadd(data, allAgencies, 'datacenters', closingStage, quarter, 'total', row['count'])


# Analysis of our Key Mission Facilities.  We only do the current quarter.
c.execute('''
SELECT
agency,
year,
quarter,
keyMissionFacilityType,
optimizationExempt,
COUNT(*) AS count
FROM datacenters
WHERE year = :year
AND quarter = :quarter
AND keyMissionFacility = 1
AND ownershipType = 'Agency Owned'
AND closingStage != 'Closed'
AND tier IN('Tier 1', 'Tier 2', 'Tier 3', 'Tier 4')
GROUP BY agency, keyMissionFacilityType, optimizationExempt
ORDER BY agency, keyMissionFacilityType, optimizationExempt
''', {'year': maxQuarter[0], 'quarter': maxQuarter[1]})

for row in c.fetchall():
  # Setup our quarter string.
  quarter = getQuarter(row)

  deepadd(data, row['agency'], 'kmf', quarter, row['keyMissionFacilityType'], 'total', row['count'])
  deepadd(data, allAgencies, 'kmf', quarter, row['keyMissionFacilityType'], 'total', row['count'])

  if row['optimizationExempt'] == 1:
    deepadd(data, row['agency'], 'kmf', quarter, row['keyMissionFacilityType'], 'optimizationExempt', row['count'])
    deepadd(data, allAgencies, 'kmf', quarter, row['keyMissionFacilityType'], 'optimizationExempt', row['count'])


# Next, calculate our metrics for open data centers.

c.execute('''
SELECT
agency,
year,
quarter,
tier,
COUNT(*) AS count,
SUM(electricityMetered) AS energyMetering,
SUM(underutilizedServers) AS underutilizedServers,
SUM(
  CASE LOWER(tier)
    WHEN 'tier 1' THEN
      CASE WHEN (plannedAvailabilityHours - downtimeHours) / plannedAvailabilityHours >= .99671 THEN 1 ELSE 0 END
    WHEN 'tier 2' THEN
      CASE WHEN (plannedAvailabilityHours - downtimeHours) / plannedAvailabilityHours >= .99749 THEN 1 ELSE 0 END
    WHEN 'tier 3' THEN
      CASE WHEN (plannedAvailabilityHours - downtimeHours) / plannedAvailabilityHours >= .99982 THEN 1 ELSE 0 END
    WHEN 'tier 4' THEN
      CASE WHEN (plannedAvailabilityHours - downtimeHours) / plannedAvailabilityHours >= .99995 THEN 1 ELSE 0 END
    ELSE 0
  END
) AS availability,
SUM(plannedAvailabilityHours) AS plannedAvailability,
SUM(downtimeHours) AS downtime,
SUM(mainframesCount) AS mainframes,
SUM(HPCCount) AS hpcs,
SUM(serverCount) AS servers,
SUM(virtualHostCount) AS virtualization
FROM datacenters
WHERE LOWER(closingStage) = 'not closing'
AND LOWER(ownershipType) = 'agency owned'
AND LOWER(tier) IN ('tier 1', 'tier 2', 'tier 3', 'tier 4')
AND optimizationExempt != 1
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


# Export our strategic plan data.

c.execute('''
SELECT *
FROM stratplans
GROUP BY agency, type
ORDER BY importDate DESC
''')

agencies = []
for row in c.fetchall():
  if row['agency'] not in agencies:
    agencies.append(row['agency'])

  fieldname = row['type']

  if row['type'] == 'costSavings':
    fieldname = 'savings'

  for field,value in dict(row).items():
    match = re.match(r'^fy([0-9]{2})([a-zA-Z_]+)$', field);

    if field == 'methodology' and value:
      deepadd(data, row['agency'], 'plan', fieldname+'-methodology', value)

    elif match != None and value != None:
      year = 2000 + int(match.group(1))
      status = match.group(2)

      # Convert our value to a safe decimal instead of a float.
      # https://github.com/ombegov/dcoi/issues/6
      if value:
        try:
          value = Decimal(value)
        except:
          continue

      deepadd(data, row['agency'], 'plan', fieldname, year, status, value)
      deepadd(data, allAgencies, 'plan', fieldname, year, status, value)

# Availability is the only one that is an average, not a sum.
for year, obj in data[allAgencies]['plan']['availability'].items():
  data[allAgencies]['plan']['availability'][year]['Planned'] = data[allAgencies]['plan']['availability'][year]['Planned'] / len(agencies)
  data[allAgencies]['plan']['availability'][year]['Achieved'] = data[allAgencies]['plan']['availability'][year]['Achieved'] / len(agencies)

print( jsonCleanup(json.dumps(data)) )
# TODO: Maybe export a file instead of just printing?

#conn.commit()
conn.close()

exit()
