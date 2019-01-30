from __future__ import print_function

import csv
import sys
import itertools
import re

try:
  filename = sys.argv[1]
except IndexError:
  print ('No filename specified!')
  exit()

print ('Filename: ', filename)

# Variables we will re-use

hasErrors = False
hasWarnings = False
validClosingStages = ['Closed', 'Migration Execution', 'Not closing']
validRecordValidity = ['Invalid Facility', 'Valid Facility']
validTiers = ['Tier 1', 'Tier 2', 'Tier 3', 'Tier 4']
validKMFTypes = ['Mission', 'Processing', 'Control', 'Location', 'Legal', 'Other']
validOwnershipTypes = ['Agency Owned', 'Colocation', 'Outsourcing', 'Using Cloud Provider']
validInterAgencySharedServicesPosition = ['Provider', 'Tenant', 'None']
validCountry = ['U.S.', 'Outside U.S.']

# Lowercase the field keys by updating the header row, for maximum compatiblity.
def lower_headings(iterator):
    return itertools.chain([next(iterator).lower()], iterator)

with open(filename, 'r', encoding='utf-8-sig') as datafile:
  reader = csv.DictReader(lower_headings(datafile))
  stats = {
    'record_total': 0,
    'record_error': 0,
    'record_warning': 0,
    'error': 0,
    'warning': 0
  }
  for row in reader:
    num = reader.line_num
    errors = []
    warnings = []

    ###
    # Data acceptance rules. These should match the IDC instructions.
    ###

    if not row.get('agency abbreviation'):
      errors.append('Agency Abbreviation must not be blank.')

    if not row.get('component'):
      errors.append('Component must not be blank.')

    if row.get('data center id'):
      if not (re.match(r"DCOI-DC-\d+$", row.get('data center id'))):
        errors.append('Data Center ID must be DCOI-DC-#####. Or leave blank for new data centers.')

    if row.get('record validity', '').lower() not in map(str.lower, validRecordValidity):
      errors.append('Record Validity value must be one of "' + '", "'.join(validRecordValidity) + '".')

    if row.get('record validity', '').lower() == 'invalid facility':
      if row.get('closing stage').lower() == 'closed':
        errors.append('Record Validity cannot be "Invalid Facility" if Closing Stage is "Closed".')

    if row.get('ownership type', '').lower() not in map(str.lower, validOwnershipTypes):
      errors.append('Ownership Type value must be one of "' + '", "'.join(validOwnershipTypes) + '".')

    if row.get('ownership type', '').lower() == 'Using Cloud Provider'.lower():
      if row.get('data center tier', '').lower() != 'Using Cloud Provider'.lower():
        errors.append('Data Center Tier must be "Using Cloud Provider" if Ownership Type is "Using Cloud Provider".')

    if row.get('ownership type', '').lower() == 'Colocation'.lower():
      if row.get('inter-agency shared services position', '') == '':
        errors.append('Inter-Agency Shared Services Position must not be blank if Ownership Type is "Colocation".')

    if row.get('inter-agency shared services position', '') != '' and \
          row.get('inter-agency shared services position', '').lower() not in map(str.lower, validInterAgencySharedServicesPosition):
      errors.append('If not blank, Inter-Agency Shared Services Position value must be one of "{}"; "{}" is given.'.format(
            '", "'.join(validInterAgencySharedServicesPosition), row.get('inter-agency shared services position')
      ))

    if row.get('country', '') != '' and row.get('country', '').lower() not in map(str.lower, validCountry):
      errors.append('If not blank, Country value must be one of "{}"; "{}" is given.'.format('", "'.join(validCountry), row.get('country')))

    if row.get('key mission facility', '').lower() == 'yes':
      if not row.get('key mission facility type'):
        errors.append('Key Mission Facilities must have a Key Mission Facility Type.')
        
      elif row.get('key mission facility type', '').lower() not in map(str.lower, validKMFTypes):
        errors.append('Key Mission Facilities must have a Key Mission Facility Type, "{}" given.'.format(row.get('key mission facility type')))
        
      elif row.get('key mission facility type', '').lower() == 'legal' and not row.get('comments'):
        errors.append('Key Mission Facilities of Type "legal" must include the statute or regulation in the Comments field.')

      elif row.get('key mission facility type', '').lower() == 'other' and not row.get('comments'):
        errors.append('Key Mission Facilities of Type "other" must have an explanation in the Comments field.')

    # The data centers that are still targets for optimization - Valid, Agency-Owned, Open, non-Tenant.
    if (row.get('record validity', '').lower() == 'valid facility' and
        row.get('ownership type', '').lower() == 'agency owned' and
        row.get('closing stage', '').lower() != 'closed' and
        row.get('inter-agency shared services position', '').lower() != 'tenant'):

      if not row.get('closing stage'):
        errors.append('Closing Stage must not be blank.')
      else:
        try:
          assert row.get('closing stage', '').lower() in map(str.lower, validClosingStages)

          if row.get('closing stage', '').lower() != 'not closing':
            if not row.get('closing fiscal year'):
              errors.append('Closing Fiscal Year must not be blank if Closing Stage is not "Not Closing"')

            if not row.get('closing quarter'):
              errors.append('Closing Quarter must not be blank if Closing Stage is not "Not Closing"')

        except AssertionError:
          errors.append('Closing Stage value must be one of "' + '", "'.join(validClosingStages) + '".')


      if row.get('key mission facility', '').lower() == 'yes':
        if not row.get('key mission facility type'):
          errors.append('Key Mission Facility Type must not be blank for all Key Mission Facilities')

      else:
        if not row.get('data center name'):
          errors.append('Data Center Name must not be blank.')

        if not row.get('gross floor area'):
          errors.append('Gross Floor Area must not be blank.')

        if not row.get('data center tier'):
          errors.append('Data Center Tier must not be blank.')

        if not row.get('electricity is metered'):
          errors.append('Electricity is Metered must not be blank.')

        elif row.get('electricity is metered', '').lower() == 'yes':
          if not row.get('avg electricity usage'):
            errors.append('Avg Electricity Usage must not be blank if Electricity Is Metered = Yes.')

          if not row.get('avg it electricity usage'):
            errors.append('Avg IT Electricity Usage must not be blank if Electricity Is Metered = Yes.')

        # The following numeric fields may reasonably be "0", so we must check for blanks instead of "not".
        if row.get('underutilized servers') == '':
          errors.append('Underutilized Servers must not be blank.')

        if row.get('actual hours of facility downtime') == '':
          errors.append('Actual Hours of Facility Downtime must not be blank')

        if row.get('planned hours of facility availability') == '':
          errors.append('Planned Hours of Facility Availability must not be blank')

        if row.get('rack count') == '':
          errors.append('Rack Count must not be blank')

        if row.get('total mainframes') == '':
          errors.append('Total Mainframes must not be blank')

        if row.get('total hpc cluster nodes') == '':
          errors.append('Total HPC Cluster Nodes must not be blank')

        if row.get('total servers') == '':
          errors.append('Total Servers must not be blank')

        if row.get('total virtual hosts') == '':
          errors.append('Total Virtual Hosts must not be blank')


    ###
    # Data validation rules. This should catch any bad data.
    ###
    
    if (row.get('record validity', '').lower() == 'valid facility' and
        row.get('closing stage', '').lower() != 'closed' and
        row.get('ownership type', '').lower() == 'agency owned' and
        row.get('data center tier', '').lower() not in map(str.lower, validTiers)):
      warnings.append('Only tiered data centers need to be reported, marked as "{}"'.format(row.get('data center tier')))
        
    
    # Impossible PUEs
    
    # PUE = 1.0:
    if (row.get('avg electricity usage') and
        row.get('avg it electricity usage') and
        row.get('avg electricity usage') == row.get('avg it electricity usage')):
      warnings.append(
        'Avg Electricity Usage ({}) for a facility should never be equal to Avg IT Electricity Usage ({})'
          .format(row.get('avg electricity usage'), row.get('avg it electricity usage'))
      )


    # Check for incorrect KMF reporting      
    if row.get('key mission facility type') and row.get('key mission facility', '').lower() != 'yes':
      warnings.append('Key Mission Facility Type should only be present if Key Mission Facility is "Yes"')
    
    if row.get('key mission facility', '').lower() == 'yes':
      if row.get('data center tier', '').lower() not in map(str.lower, validTiers):
        warnings.append('Key Mission Facilities should not be non-tiered data centers.')
        
      if row.get('ownership type', '').lower() != 'agency owned':
        warnings.append('Key Mission Facilities should only be agency-owned.')
  
      if row.get('record validity', '').lower() != 'valid facility':
        warnings.append('Invalid facilities should not be Key Mission Facilities.')
        
    ###
    # Print our results.
    ###

    if len(errors) or len(warnings):
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

    if len(warnings) > 0:
      hasWarnings = True
      print('  Warnings:', "\n   ", "\n    ".join(warnings))

    stats['record_total'] += 1
    stats['record_error'] += 1 if len(errors) else 0
    stats['record_warning'] += 1 if len(warnings) else 0
    stats['error'] += len(errors)
    stats['warning'] += len(warnings)

  ###
  # Print our final validation results.
  ###

  print('')
  print('********************************************************************************')

  print('* Total records in file: %d.' % stats['record_total'])

  if hasErrors or hasWarnings:
    print('*')
    print('*', end=" ")
    if hasErrors:
      print('%d errors found in %d records.' % (stats['error'], stats['record_error']), end=" ")
    if hasWarnings:
      print('%d warnings found in %d records.' % (stats['warning'], stats['record_warning']))
    print('*')

  if hasErrors:
    print('* Any errors must be corrected before the data file will be accepted.')

  if hasWarnings:
    print('* The warnings above _should_ be corrected before submitting this data, but it ')
    print('* is not required.')

  if not hasErrors and not hasWarnings:
    print('* The file had no problems or errors.')

  print('********************************************************************************')
  print('')