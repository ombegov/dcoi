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
import io

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

  # For a single file.
  if os.path.isfile(args.filename):
    import_file(args.filename, args.quarter, conn)

  # For a director of files.
  elif(os.path.isdir(args.filename)):
    for f in os.listdir(args.filename):
      theFile = os.path.join(args.filename, f)
      if os.path.isfile(theFile):
        import_file(theFile, args.quarter, conn)

  conn.close()


# Lowercase the field keys by updating the header row, for maximum compatiblity.
def lower_headings(iterator):
    return itertools.chain([next(iterator).lower()], iterator)

# Checks if a path is an actual directory
def is_path(filename):
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

def import_file(filename, q, conn):
  c = conn.cursor()

  print('Importing ', filename)

  year, quarter = q.split('q')
  quarter = int(quarter)
  year = int(year)

  agencies = []

  with io.open(filename, 'r', encoding='utf-8-sig') as datafile:
    reader = csv.DictReader(lower_headings(datafile))
    for row in reader:
      # We only want valid records.
      if row.get('record validity') != 'Valid Facility':
        continue

      # Overwrite any previous data for this agency for the specified quarter.
      if row.get('agency abbreviation') not in agencies:
        agencies.append(row.get('agency abbreviation'))

        print('Clearing {} {} q{}'.format(row.get('agency abbreviation'), year, quarter))

        c.execute('DELETE FROM datacenters WHERE year=:year AND quarter=:quarter AND agency=:agency',
          {
            'year': year,
            'quarter': quarter,
            'agency': row.get('agency abbreviation')
          }
        )
        conn.commit()

      print(row.get('data center id'), year, quarter)

      insertData = {
        'id' : row.get('data center id'),
        'quarter' : quarter,
        'year': year,
        'agency' : row.get('agency abbreviation'),
        'component' : row.get('component'),
        'ownershipType' : row.get('ownership type'),
        'sharedServicesPosition' : row['inter-agency shared services position'],
        'tier' : row.get('data center tier'),
        'country' : row.get('country'),
        'grossFloorArea' : row.get('gross floor area'),
        'keyMissionFacility' : int(row.get('key mission facility').lower() == 'yes'),
        'keyMissionFacilityType' : row.get('key mission facility type'),
        'optimizationExempt': int(row.get('optimization exempt') == 'yes'),
        'electricityMetered' : int(row.get('electricity is metered') == 'yes'),
        'avgElectricityUsage' : row.get('avg electricity usage'),
        'avgITElectricityUsage' : row.get('avg it electricity usage'),
        'underutilizedServers' : row.get('underutilized servers'),
        'downtimeHours' : row.get('actual hours of facility downtime'),
        'plannedAvailabilityHours' : row.get('planned hours of facility availability'),
        'mainframesCount' : row.get('total mainframes'),
        'HPCCount' : row.get('total hpc cluster nodes'),
        'serverCount' : row.get('total servers'),
        'virtualHostCount' : row.get('total virtual hosts'),
        'closingStage' : row.get('closing stage'),
        'closingTargetDate' : row.get('closing fiscal year') + ' ' + row.get('closing quarter'),
        'comments' : row.get('comments')
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
          optimizationExempt,
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
          :optimizationExempt,
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

      conn.commit()

if __name__ == '__main__':
  main()
  exit()