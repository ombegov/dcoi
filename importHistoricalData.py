###
# This script may be used to import a full dump of the historical DCOI data to
# a local sqlite database.
###

import csv
import sys
import itertools
import sqlite3

import config

try:
  filename = sys.argv[1]
except IndexError:
  print ('No filename specified!')
  exit()

print ('Filename: ', filename)

# Variables we will re-use


conn = sqlite3.connect(config.DB_CONFIG['file'])
c = conn.cursor()

rows = []
with open(filename, 'r') as datafile:
  reader = csv.DictReader(datafile)
  for row in reader:
    quarter, year = row['quarter'].split(' ')

    quarter = int(quarter[1])
    year = int(year)

    # We only want valid, recent records.
    if row['recordValidity'] != 'Valid Facility' or year < 2017:
      continue

    print(row['dataCenterID'], year, quarter)

    rows.append({
      'id' : row['dataCenterID'],
      'quarter' : quarter,
      'year': year,
      'agency' : row['agencyAbbrev'],
      'component' : row['component'],
      'ownershipType' : row['ownershipType'],
      'sharedServicesPosition' : row['interAgencySharedServicesPosition'],
      'tier' : row['dataCenterTier'],
      'country' : row['country'],
      'grossFloorArea' : row['grossFloorArea'],
      'keyMissionFacility' : int(row['keyMissionFacility'].lower() == 'yes'),
      'keyMissionFacilityType' : row['keyMissionFacility1'],
      'electricityMetered' : int(row['tcoElectricityIsMetered'].lower() == 'yes'),
      'avgElectricityUsage' : row['averageElectricityUsage'],
      'avgITElectricityUsage' : row['averageITElectricityUsage'],
      'underutilizedServers' : row['underutilizedServers'],
      'downtimeHours' : row['facilityDowntimeActual'],
      'plannedAvailabilityHours' : row['facilityAvailabilityPlanned'],
      'mainframesCount' : row['totalMainframes'],
      'HPCCount' : row['totalHPCClusterNodes'],
      'serverCount' : row['totalServers'],
      'virtualHostCount' : row['totalVirtualHosts'],
      'closingStage' : row['closingStage'],
      'closingTargetDate' : row['closingTargetDate'],
      'comments' : row['comments']
    })

  c.executemany('''
    INSERT INTO datacenters
    (
      id,
      quarter,
      year,
      agency,
      component,
      ownershipType,
      sharedServicesPosition,
      tier,
      country,
      grossFloorArea,
      keyMissionFacility,
      keyMissionFacilityType,
      electricityMetered,
      avgElectricityUsage,
      avgITElectricityUsage,
      underutilizedServers,
      downtimeHours,
      plannedAvailabilityHours,
      mainframesCount,
      HPCCount,
      serverCount,
      virtualHostCount,
      closingStage,
      closingTargetDate,
      comments
    ) VALUES (
      :id,
      :quarter,
      :year,
      :agency,
      :component,
      :ownershipType,
      :sharedServicesPosition,
      :tier,
      :country,
      :grossFloorArea,
      :keyMissionFacility,
      :keyMissionFacilityType,
      :electricityMetered,
      :avgElectricityUsage,
      :avgITElectricityUsage,
      :underutilizedServers,
      :downtimeHours,
      :plannedAvailabilityHours,
      :mainframesCount,
      :HPCCount,
      :serverCount,
      :virtualHostCount,
      :closingStage,
      :closingTargetDate,
      :comments
    )
  ''', rows)

conn.commit()
conn.close()

exit()