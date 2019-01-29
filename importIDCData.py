###
# This script may be used to import IDC spreadsheets to a local sqlite database
# The spreadsheet must be in the historical IDC format.
###
from __future__ import print_function

import os
import csv
import sys
import itertools
import sqlite3
import argparse
import re

import config


def main():
  # Variables we will re-use
  parser = argparse.ArgumentParser(description='Import IDC spreadsheets.')
  parser.add_argument('quarter', type=is_quarter,
    help='The year and quarter this data was reported ( format: YYYYq# )')
  parser.add_argument('filename', type=is_path,
    help='file or directory to import')

  args = parser.parse_args()

  conn = sqlite3.connect(config.DB_CONFIG['file'])
  c = conn.cursor()

  # For a single file.
  if os.path.isfile(args.filename):
    import_file(args.filename, args.quarter, c)

  # For a director of files.
  elif(os.path.isdir(args.filename)):
    for f in os.listdir(args.filename):
      theFile = os.path.join(args.filename, f)
      if os.path.isfile(theFile):
        import_file(theFile, args.quarter, c)

  conn.commit()
  conn.close()


# Lowercase the field keys by updating the header row, for maximum compatiblity.
def lower_headings(iterator):
    return itertools.chain([next(iterator).lower()], iterator)

def is_path(filename):
    """Checks if a path is an actual directory"""
    if os.path.isfile(filename):
      return filename
    elif os.path.isdir(filename):
      return filename
    else:
        msg = "{0} is not a directory".format(filename)
        raise argparse.ArgumentTypeError(msg)

def is_quarter(quarter):
  if re.match('^[0-9]{4}q[1-4]$', quarter):
    return quarter
  else:
    msg = "{0} is not a valid quarter. Must match 2018q3 or similar".format(quarter)
    raise argparse.ArgumentTypeError(msg)

def import_file(filename, q, c):
  print('# ', filename)

  year, quarter = q.split('q')
  quarter = int(quarter)
  year = int(year)

  with open(filename, 'r') as datafile:
    reader = csv.DictReader(lower_headings(datafile))
    for row in reader:

      # We only want valid records.
      if row['record validity'] != 'Valid Facility':
        continue

      print(row['data center id'], year, quarter)

      insertData = {
        'id' : row['data center id'],
        'quarter' : quarter,
        'year': year,
        'agency' : row['agency abbreviation'],
        'component' : row['component'],
        'ownershipType' : row['ownership type'],
        'sharedServicesPosition' : row['inter-agency shared services position'],
        'tier' : row['data center tier'],
        'country' : row['country'],
        'grossFloorArea' : row['gross floor area'],
        'keyMissionFacility' : row['key mission facility'],
        'keyMissionFacilityType' : row['key mission facility type'],
        'electricityMetered' : row['electricity is metered'],
        'avgElectricityUsage' : row['avg electricity usage'],
        'avgITElectricityUsage' : row['avg it electricity usage'],
        'underutilizedServers' : row['underutilized servers'],
        'downtimeHours' : row['actual hours of facility downtime'],
        'plannedAvailabilityHours' : row['planned hours of facility availability'],
        'mainframesCount' : row['total mainframes'],
        'HPCCount' : row['total hpc cluster nodes'],
        'serverCount' : row['total servers'],
        'virtualHostCount' : row['total virtual hosts'],
        'closingStage' : row['closing stage'],
        'closingTargetDate' : row['closing fiscal year'] + ' ' + row['closing quarter'],
        'comments' : row['comments']
      }

      c.execute('''
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
      ''', insertData)

if __name__ == '__main__':
  main()
  exit()