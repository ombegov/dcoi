###
# This script downloads agency strategic plans and saves them to the database.
###

import sqlite3
import requests
import string
import re
import time
import sys
# Our JSON might not be... pristine, so we must use a more flexible module.
from barely_json import parse
from requests.packages.urllib3.exceptions import InsecureRequestWarning

# Stop yelling about the insecure requests.
requests.packages.urllib3.disable_warnings(InsecureRequestWarning)

import config

# Request headers for our scraper.
headers = {
  'User-Agent': 'OFCIO DCOI Scraper',
  'From': 'ofcio@omb.eop.gov'
}

conn = sqlite3.connect(config.DB_CONFIG['file'])
c = conn.cursor()

fileLocation = "/digitalstrategy/datacenteroptimizationstrategicplan.json"

agencies = {
  "Commerce": "https://www.commerce.gov",
  "DHS": "http://www.dhs.gov",
  "DOD": "http://www.defense.gov",
  "DOT": "https://www.transportation.gov",
  "ED": "https://www2.ed.gov",
  "Energy": "http://www.energy.gov",
  "EPA": "http://www.epa.gov",
  "GSA": "http://www.gsa.gov",
  "HHS": "http://www.hhs.gov",
  "HUD": "http://www.hud.gov",
  "Interior": "https://www.doi.gov",
  "Justice": "https://www.justice.gov",
  "Labor": "http://www.dol.gov",
  "NASA": "http://www.nasa.gov",
  "NRC": "https://www.nrc.gov",
  "NSF": "https://www.nsf.gov",
  "OPM": "http://www.opm.gov",
  "SBA": "http://www.sba.gov",
  "SSA": "http://www.ssa.gov",
  "State": "http://www.state.gov",
  "Treasury": "http://www.treasury.gov",
  "USAID": "http://www.usaid.gov",
  "USDA": "http://www.usda.gov",
  "VA": "http://www.va.gov"
}

missingAgencies = []

today = int(time.strftime("%Y%m%d"))

types = [
  'costSavings',
  'closures',
  ('optimizationMetrics', 'energyMetering'),
  ('optimizationMetrics', 'virtualization'),
  ('optimizationMetrics', 'underutilizedServers'),
  ('optimizationMetrics', 'availability')
]

fields = [
  'fy16Planned',
  'fy16Achieved',
  'fy17Planned',
  'fy17Achieved',
  'fy18Planned',
  'fy18Achieved',
  'fy19Planned',
  'fy19Achieved',
  'fy20Planned',
  'fy20Achieved',
  'explanation',
  'methodology',
  'costsOfClosures',
  'costsOfOptimization',
  'historicalCostSavings'
]

def filter_nonprintable(text):
    nonprintable = set([chr(i) for i in range(128)]).difference(string.printable)

    return re.sub(r'[^\x00-\x7f]',r'',
      text.translate({ord(character):None for character in nonprintable})
    )

for agency in agencies:
  planFile = agencies[agency] + fileLocation
  print(agency, planFile)

  try:
    # Give at least ten seconds for slower agencies to respond
    # Don't verify the certificate since agencies stuggle with SSL.
    r = requests.get(planFile, timeout=10, headers=headers, verify=False)
  except:
    print('! Cannot download file. {}'.format(sys.exc_info()[0]))
    missingAgencies.append(agency)
    continue

  if r.status_code == 200 and len(r.text):
    text = filter_nonprintable(r.text)
    try:
      data = parse(text)
    except:
      print('! Error in file.', sys.exc_info()[0])
      missingAgencies.append(agency)
      continue

    if not 'closures' in data:
      print('! Using old schema.')
      missingAgencies.append(agency)
      continue

    # Delete any previous plans.
    conn.execute('DELETE FROM stratplans WHERE agency=:agency', {'agency': agency})

    # Insert into database.

    # loop over our categories.
    for type in types:

      if isinstance(type, str):
        if type in data:
          row = data[type]

      elif isinstance(type, tuple):
        (key, type) = type
        if key in data and type in data[key]:
          row = data[key][type]

      else:
        print('Missing JSON field "{}"'.format(type))
        continue

      # Holder for our data to put into the database.
      insertData = {
        'agency': agency,
        'importDate': today,
        'type': type
      }

      # Then loop over our fields and build the insert data.
      for field in fields:
        if field in row:
          # We store these floats as strings due to Python's precision.
          # https://github.com/ombegov/dcoi/issues/6
          insertData[field] = str(row[field])

      # Create a string for the insert statement.
      insertString = 'INSERT INTO stratplans ({}) VALUES({})'.format(
        ', '.join(insertData.keys()), # fields list
        ', '.join([':'+key for key in insertData.keys()]) # values: fill with ":fieldName"
      )

      conn.execute(insertString, insertData)

  else:
    print('! Cannot download file. (HTTP {})'.format(r.status_code))
    missingAgencies.append(agency)
    continue

# Commit and close the connection.
conn.commit()
conn.close()

if len(missingAgencies):
  print('Could not download these strategic plans:', missingAgencies)