###
# This script downloads agency strategic plans and saves them to the database.
###

import sqlite3
import requests
# Our JSON might not be... pristine, so we must use a more flexible module.
from barely_json import parse
import string
import re

import config


conn = sqlite3.connect(config.DB_CONFIG['file'])
c = conn.cursor()

fileLocation = "/digitalstrategy/datacenteroptimizationstrategicplan.json"

agencies = {
"Commerce": "https://www.commerce.gov",
"DHS": "http://www.dhs.gov",
"DOD": "http://www.defense.gov",
"DOT": "https://www.transportation.gov",
"ED": "http://www.ed.gov",
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

def filter_nonprintable(text):
    nonprintable = set([chr(i) for i in range(128)]).difference(string.printable)

    return re.sub(r'[^\x00-\x7f]',r'',
      text.translate({ord(character):None for character in nonprintable})
    )

for agency in agencies:
  planFile = agencies[agency] + fileLocation
  print(agency, planFile)

  try:
    # Give at least two seconds for slower agencies to respond
    r = requests.get(planFile, timeout=2)
  except requests.exceptions.Timeout:
    print('! Cannot download file. (timeout)')
    missingAgencies.append(agency)
    continue

  if r.status_code == 200 and len(r.text):
    #try:
      text = filter_nonprintable(r.text)
      data = parse(text)
      print(data)


  else:
    print('! Cannot download file. ({})'.format(r.status_code))
    missingAgencies.append(agency)
    continue

if len(missingAgencies):
  print('Could not download these strategic plans:', missingAgencies)