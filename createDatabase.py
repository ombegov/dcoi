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


conn.commit()

conn.close()

exit()
