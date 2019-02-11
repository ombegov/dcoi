###
# This script creates a local sqlite database for procecssing DCOI data.
###

import argparse
import sqlite3

import config


conn = sqlite3.connect(config.DB_CONFIG['file'])
c = conn.cursor()


c.execute('''
  CREATE TABLE IF NOT EXISTS datacenters (
    id TEXT,
    year INT,
    quarter INT,
    agency TEXT,
    component TEXT,
    ownershipType TEXT,
    sharedServicesPosition TEXT,
    tier TEXT,
    country TEXT,
    grossFloorArea INTEGER,
    keyMissionFacility INTEGER,
    keyMissionFacilityType TEXT,
    optimizationExempt INTEGER,
    electricityMetered INTEGER,
    avgElectricityUsage REAL,
    avgITElectricityUsage REAL,
    underutilizedServers INTEGER,
    downtimeHours INTEGER,
    plannedAvailabilityHours INTEGER,
    mainframesCount INTEGER,
    HPCCount INTEGER,
    serverCount INTEGER,
    virtualHostCount INTEGER,
    closingStage TEXT,
    closingTargetDate TEXT,
    comments TEXT
  )
''')

# We store our floats as TEXT. See https://github.com/ombegov/dcoi/issues/6
c.execute('''
  CREATE TABLE IF NOT EXISTS stratplans (
    agency TEXT,
    importDate INTEGER,
    type TEXT,
    fy16Planned TEXT,
    fy16Achieved TEXT,
    fy17Planned TEXT,
    fy17Achieved TEXT,
    fy18Planned TEXT,
    fy18Achieved TEXT,
    fy19Planned TEXT,
    fy19Achieved TEXT,
    fy20Planned TEXT,
    fy20Achieved TEXT,
    explanation TEXT,
    costsOfClosures TEXT,
    costsOfOptimization TEXT,
    historicalCostSavings TEXT
  )
''')

conn.commit()

conn.close()

exit()
