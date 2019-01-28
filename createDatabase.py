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

c.execute('''
  CREATE TABLE IF NOT EXISTS stratplans (
    importDate INTEGER,
    type TEXT,
    fy16Planned REAL,
    fy16Achieved REAL,
    fy17Planned REAL,
    fy17Achieved REAL,
    fy18Planned REAL,
    fy18Achieved REAL,
    fy19Planned REAL,
    fy19Achieved REAL,
    fy20Planned REAL,
    fy20Achieved REAL,
    explanation TEXT,
    costsOfClosures TEXT,
    costsOfOptimization TEXT,
    historicalCostSavings TEXT
  )
''')

conn.commit()

conn.close()

exit()
