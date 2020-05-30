from __future__ import print_function

import csv
import sys
import itertools
import re
import io
from pprint import pprint

# Remove the script from our arguments.
arguments = sys.argv[1:]

errorsOnly = False
showSummary = False

# Check for our flags, and strip from our arguments.
i = 0
while i < len(arguments):
  argument = arguments[i]
  stripArgument = True

  if argument == '--errors-only':
    errorsOnly = True
  elif argument == '--show-summary':
    showSummary = True
  else:
    stripArgument = False

  if stripArgument:
    del arguments[i]
  else:
    i += 1

# Our remaining argument should be the filename.
try:
  filename = arguments[0]
except IndexError:
  print ('No filename specified!')
  exit()

print ('Filename: ', filename)

# Constant to define allowed values for a field
VALID_VALUES = {
  "Record Validity": ['Invalid Facility', 'Valid Facility'],
  "Ownership Type": ['Agency Owned', 'Colocation', 'Outsourcing', 'Using Cloud Provider'],
  "Inter-Agency Shared Services Position": ['Provider', 'Tenant', 'None'],
  "Country": ['U.S.', 'Outside U.S.'],
  "Data Center Tier": ['Non-Tiered', 'Tier 1', 'Tier 2', 'Tier 3', 'Tier 4', 'Unknown', 'Using Cloud Provider'],
  "Key Mission Facility": ['Yes', 'No'],
  "Key Mission Facility Type": ['Mission', 'Processing', 'Control', 'Location', 'Legal', 'Other'],
  "Electricity Is Metered": ['Yes', 'No'],
  "Closing Fiscal Year": [str(i) for i in range(2010, 2022)], # 2010 - 2021
  "Closing Quarter": ['Q1', 'Q2', 'Q3', 'Q4'],
  "Closing Stage": ['Closed', 'Migration Execution', 'Not closing'],
}

VALID_TIERS = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']

# Constant to define functions to check field value format
VALID_FUNCTIONS = {
  'Gross Floor Area': ['is_integer', 'greater_0'],
  'Avg Electricity Usage': ['is_decimal', 'greater_0'],
  'Avg IT Electricity Usage': ['is_decimal', 'greater_0'],
  'Underutilized Servers': ['is_integer', 'equal_greater_0'],
  'Actual Hours of Facility Downtime': ['is_decimal', 'equal_greater_0'],
  'Planned Hours of Facility Availability': ['is_decimal', 'equal_greater_0'],
  'Rack Count': ['is_integer', 'equal_greater_0'],
  'Total Mainframes' : ['is_integer', 'equal_greater_0'],
  'Total HPC Cluster Nodes': ['is_integer', 'equal_greater_0'],
  'Total Virtual Hosts': ['is_integer', 'equal_greater_0'],
}

# Variables we will re-use

hasErrors = False
hasWarnings = False
hasValidFacilities = False

allRecordWarnings = {
  'underutilized servers': 'No facilities were listed having underutilized servers. Please verify this information.',
  'facility downtime': 'No facilities were listed with any downtime. Please verify this information.',
  'key mission facilities': 'No key mission facilities were listed. Please verify this information.'
}

# Lowercase the field keys by updating the header row, for maximum compatiblity.
def lower_headings(iterator):
    return itertools.chain([next(iterator).lower()], iterator)

# must be an integer, e.g. "10", "-7"
def is_integer(value):
  try:
    int(value)
  except ValueError:
    return "must be an integer value"

# must be a float, e.g. "10", "-7.6"
def is_decimal(value):
  try:
    float(value)
  except ValueError:
    return "must be an float value"

# must be greater than 0, e.g. "0.1", "5"
def greater_0(value):
  try:
    assert float(value) > 0
  except ValueError:
    return "must be greater than 0"
  except AssertionError:
    return "must be greater than 0"

# must be equal or greater than 0, e.g. "0", "0.0", "10"
def equal_greater_0(value):
  try:
    assert float(value) >= 0
  except ValueError:
    return "must be greater than or equal to 0"
  except AssertionError:
    return "must be greater than or equal to 0"

# check field to against its valid_values/_functions
def validate_values(data, field, msg=''):
  errors = []
  value = data.get(field.lower(), '')

  # this function is not responsible to blank check
  if not value:
    return []

  # check against a list of values first
  if VALID_VALUES.get(field):
    values = VALID_VALUES.get(field)
    if value.lower() not in map(str.lower, values):
      msg = msg or 'If not blank, {} value must be one of "{}"; "{}" is given.'.format(field, '", "'.join(values), value)
      errors.append(msg)
  # then check with a list of functions
  elif VALID_FUNCTIONS.get(field):
    funcs = VALID_FUNCTIONS.get(field)
    errs = []
    for func in funcs:
      if not func:
        continue
      elif not isinstance(func, str):
        print('Provide a function name in function list for field "{}". {} is given.'.format(field, type(func)))
        exit()

      try:
        errs.append(eval(func)(value))
      except NameError:
        print('Function "{}" is not defined for field "{}".'.format(func, field))

        exit()
    # remove empty ones
    errs = [x for x in errs if x]

    if errs:
      msg = msg or field + ' ' + ', '.join(errs) + '. "' + value + '" is given.'
      errors.append(msg)

  return errors

# Check field for required
def validate_required(data, field, msg=''):
  errors = []
  # check required implies check valid values first
  errors.extend(validate_values(data, field, msg))

  if len(errors) == 0 and not data.get(field.lower()):
    errors.append(msg or '{} must not be blank.'.format(field))

  return errors

# Main function starts
with io.open(filename, 'r', encoding='utf-8-sig', errors='replace') as datafile:
  reader = csv.DictReader(lower_headings(datafile))
  stats = {
    'record_total': 0,
    'record_error': 0,
    'record_warning': 0,
    'error': 0,
    'warning': 0,
    'summary': {
      'error': {},
      'warning': {},
    },
  }
  for row in reader:
    num = reader.line_num
    errors = []
    warnings = []
    applicable = False

    ###
    # Data acceptance rules. These should match the IDC instructions.
    ###

    ###
    # Required fields.
    ###
    required_fields = ['agency abbreviation', 'component', 'record validity', #'data center name',
      'ownership type', 'gross floor area', 'data center tier', 'key mission facility', 'electricity is metered',
      'underutilized servers', 'actual hours of facility downtime', 'planned hours of facility availability',
      'rack count', 'total servers', 'total mainframes', 'total hpc cluster nodes', 'total virtual hosts', 'closing stage'
    ]
    if row.get('record validity', '').lower() == 'invalid facility':
      required_fields = ['agency abbreviation', 'component', 'record validity']

    elif row.get('ownership type', '').lower() != 'agency owned':
      required_fields = ['agency abbreviation', 'component', 'record validity', 'closing stage']

    elif row.get('inter-agency shared services position', '').lower() == 'tenant':
      required_fields = ['agency abbreviation', 'component', 'record validity', 'closing stage', 'ownership type']

    elif row.get('key mission facility', '').lower() == 'yes':
      required_fields = ['agency abbreviation', 'component', 'record validity', 'closing stage', 'ownership type', 'key mission facility type']
      applicable = True
      hasValidFacilities = True

    elif row.get('closing stage', '').lower() == 'closed':
      required_fields = ['agency abbreviation', 'component', 'record validity', 'ownership type', 'gross floor area', 'data center tier', 'closing stage']
    else:
      applicable = True
      hasValidFacilities = True

    for required_field in required_fields:
      errors.extend(validate_required(row, required_field))

    ###
    # If we don't have a valid data center, don't check any more errors.
    ###
    if not applicable:
      continue

    # Common optional value checks
    #
    errors.extend(validate_values(row, 'Country'))

    # Other checks
    #
    if row.get('data center id') and not (re.match(r"DCOI-DC-\d+$", row.get('data center id'))):
        errors.append('Data Center ID must be DCOI-DC-##### or leave blank for new data centers.')

    if row.get('ownership type', '').lower() == 'Using Cloud Provider'.lower() and row.get('data center tier', '').lower() != 'Using Cloud Provider'.lower():
        errors.append('Data Center Tier must be "Using Cloud Provider" if Ownership Type is "Using Cloud Provider".')

    if row.get('ownership type', '').lower() == 'Colocation'.lower():
      msg = 'Inter-Agency Shared Services Position must not be blank if Ownership Type is "Colocation".'
      errors.extend(validate_required(row, 'Inter-Agency Shared Services Position', msg))
    else:
      errors.extend(validate_values(row, 'Inter-Agency Shared Services Position'))

    if row.get('key mission facility', '').lower() == 'yes':
      msg = 'Key Mission Facilities must have a Key Mission Facility Type.'
      errors.extend(validate_required(row, 'Key Mission Facility Type', msg))
    else:
      errors.extend(validate_values(row, 'Key Mission Facility Type'))

    if row.get('closing stage', '').lower() in ['closed', 'migration execution']:
      msg = 'Closing Fiscal Year must not be blank if Closing Stage is "Closed" or "Migration Execution".'
      errors.extend(validate_required(row, 'Closing Fiscal Year', msg))
      msg = 'Closing Quarter must not be blank if Closing Stage is "Closed" or "Migration Execution".'
      errors.extend(validate_required(row, 'Closing Quarter', msg))
    else:
      errors.extend(validate_values(row, 'Closing Fiscal Year'))
      errors.extend(validate_values(row, 'Closing Quarter'))

    if row.get('planned hours of facility availability') and float(row.get('planned hours of facility availability')) == 0:
      errors.append('Planned Hours of Facility Availability must be greater than 0.')

    ###
    # Data validation rules. This should catch any bad data.
    ###

    if (row.get('record validity', '').lower() == 'valid facility' and
        row.get('closing stage', '').lower() != 'closed' and
        row.get('ownership type', '').lower() == 'agency owned' and
        row.get('data center tier', '').lower() not in map(str.lower, VALID_TIERS)):
      warnings.append('Only tiered data centers need to be reported, marked as "{}"'.format(row.get('data center tier')))


    # Impossible PUEs

    # PUE = 1.0:
    if (row.get('avg electricity usage') and
        row.get('avg it electricity usage') and
        row.get('avg electricity usage').replace('.','',1).isdigit() and
        row.get('avg it electricity usage').replace('.','',1).isdigit() and
        float(row.get('avg electricity usage')) <= float(row.get('avg it electricity usage'))):
      warnings.append(
        'Avg Electricity Usage ({}) for a facility should be greater than Avg IT Electricity Usage ({})'
          .format(row.get('avg electricity usage'), row.get('avg it electricity usage'))
      )

    if row.get('electricity is metered', '').lower() == 'yes':
      msg = 'Avg Electricity Usage should not be blank if Electricity is Metered.'
      warnings.extend(validate_required(row, 'Avg Electricity Usage', msg))
      msg = 'Avg IT Electricity Usage should not be blank if Electricity is Metered.'
      warnings.extend(validate_required(row, 'Avg IT Electricity Usage', msg))

    # Check for incorrect KMF reporting
    if row.get('key mission facility type') and row.get('key mission facility', '').lower() != 'yes':
      warnings.append('Key Mission Facility Type should only be present if Key Mission Facility is "Yes"')

    if row.get('key mission facility', '').lower() == 'yes':
      if row.get('data center tier', '').lower() not in map(str.lower, VALID_TIERS):
        warnings.append('Key Mission Facilities should not be non-tiered data centers.')

      if row.get('ownership type', '').lower() != 'agency owned':
        warnings.append('Key Mission Facilities should only be agency-owned.')

      if row.get('record validity', '').lower() != 'valid facility':
        warnings.append('Invalid facilities should not be Key Mission Facilities.')

      if row.get('closing stage', '').lower() != 'not closing':
        warnings.append('Key Mission Facilities should be "Not Closing" for Closing Stage.')

    # Total Servers vs Total Virtual Hosts
    #
    if (row.get('total servers') and row.get('total virtual hosts') and row.get('total mainframes') and
      int(row.get('total virtual hosts')) > (int(row.get('total servers')) + int(row.get('total mainframes')))
    ):
      warnings.append('Total Virtual Hosts should not be greater than Total Servers plus Total Mainframes. Total Virtual Hosts represents the physical servers or mainframes dedicated to providing a virtualization layer to guest operating systems. These should be also included in the Total counts. Total Virtual Hosts is not a count of the guest operating systems (Total Virtual OS in previous collections).')

    # Flags for all-records. Checks to see if agencies are generally following our guidance.
    #
    if applicable:
      # Downtime
      if row.get('actual hours of facility downtime') and float(row.get('actual hours of facility downtime')) > 0:
        if 'facility downtime' in allRecordWarnings:
          del allRecordWarnings['facility downtime']

      # Underutilized Servers
      if row.get('underutilized servers') and int(row.get('underutilized servers')) > 0:
        if 'underutilized servers' in allRecordWarnings:
          del allRecordWarnings['underutilized servers']

      # Key Mission Facilities
      if row.get('key mission facility') and row.get('key mission facility').lower() == 'yes':
        if 'key mission facilities' in allRecordWarnings:
          del allRecordWarnings['key mission facilities']


    ###
    # Print our results.
    ###

    if len(errors) or (len(warnings) and not errorsOnly):
      # Print some sort of name to look up, even if we don't have one.
      dcName = []

      if row.get('agency abbreviation'):
        dcName.append(row.get('agency abbreviation'))

      if row.get('component'):
        dcName.append(row.get('component'))

      if row.get('data center id'):
        dcName.append(row.get('data center id'))

      else:
        dcName.append('Line Number {}'.format(num))

      print(' - '.join(dcName))

    if len(errors) > 0:
      hasErrors = True
      print('  Errors:', "\n   ", "\n    ".join(errors))

    if len(warnings) > 0 and not errorsOnly:
      hasWarnings = True
      print('  Warnings:', "\n   ", "\n    ".join(warnings))

    stats['record_total'] += 1
    stats['record_error'] += 1 if len(errors) else 0
    stats['record_warning'] += 1 if len(warnings) else 0
    stats['error'] += len(errors)
    stats['warning'] += len(warnings)
    agencyName = row.get('agency abbreviation', 'noname')
    for e in errors:
      if agencyName not in stats['summary']['error']:
        stats['summary']['error'][agencyName] = {}
      if e in stats['summary']['error'][agencyName]:
        stats['summary']['error'][agencyName][e] += 1
      else:
        stats['summary']['error'][agencyName][e] = 1
    for w in warnings:
      if agencyName not in stats['summary']['warning']:
        stats['summary']['warning'][agencyName] = {}
      if w in stats['summary']['warning'][agencyName]:
        stats['summary']['warning'][agencyName][w] += 1
      else:
        stats['summary']['warning'][agencyName][w] = 1


  ###
  # Print our final validation results.
  ###

  if len(allRecordWarnings):
    print('')
    print('General Warnings')
    for warn in allRecordWarnings.values():
      print('  ' + warn)

  print('')
  print('********************************************************************************')

  print('* Total records in file: %d.' % stats['record_total'])

  if hasErrors or hasWarnings:
    print('*')
    print('*', end=" ")
    if hasErrors:
      print('%d errors found in %d records.' % (stats['error'], stats['record_error']), end=" ")

    if hasWarnings and not errorsOnly:
      print('%d warnings found in %d records.' % (stats['warning'], stats['record_warning']))
    else:
      print('')

    print('*')

  if hasErrors:
    print('* Any errors must be corrected before the data file will be accepted.')

  if hasWarnings and not errorsOnly:
    print('* The warnings above _should_ be corrected before submitting this data, but it ')
    print('* is not required.')

  if not hasErrors and not hasWarnings:
    print('* The file had no problems or errors.')

  print('********************************************************************************')

  if hasErrors and showSummary:
    print('Error Summary by Agency')
    pprint(stats['summary']['error'])

  if hasWarnings and showSummary and not errorsOnly:
    print('********************************************************************************')
    print('Warning Summary by Agency')
    pprint(stats['summary']['warning'])

  print('')
