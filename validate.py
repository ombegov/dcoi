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
validClosingStages = ['closed', 'migration execution', 'not closing']
validRecordValidity = ['invalid facility', 'valid facility']
validTiers = ['tier 1', 'tier 2', 'tier 3', 'tier 4']
validKMFTypes = ['mission', 'processing', 'control', 'location', 'legal', 'other']

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

    if row.get('record validity', '').lower() not in validRecordValidity:
      errors.append('Record Validity value must be one of "' + '", "'.join(validRecordValidity) + '".')
      
    if row.get('key mission facility') == 'Yes':
      if not row.get('key mission facility type'):
        errors.append('Key Mission Facilities must have a Key Mission Facility Type.')
        
      elif row.get('key mission facility type', '').lower() not in validKMFTypes:
        errors.append('Key Mission Facilities must have a Key Mission Facility Type, "{}" given.'.format(row.get('key mission facility type')))
        
      elif row.get('key mission facility type', '').lower() == 'legal' and not row.get('comments'):
        errors.append('Key Mission Facilities of Type "legal" must include the statute or regulation in the Comments field.')

      elif row.get('key mission facility type', '').lower() == 'other' and not row.get('comments'):
        errors.append('Key Mission Facilities of Type "other" must have an explanation in the Comments field.')

    # The data centers that are still targets for optimization - Valid, Agency-Owned, Open, non-Tenant.
    if (row.get('record validity') == 'Valid Facility' and
        row.get('ownership type') == 'Agency Owned' and
        row.get('closing stage') != 'Closed' and
        row.get('inter-agency shared services position') != 'Tenant'):

      if not row.get('closing stage'):
        errors.append('Closing Stage must not be blank.')
      else:
        try:
          validClosingStages.index(row.get('closing stage', '').lower())

          if row.get('closing stage', '').lower() != 'not closing':
            if not row.get('closing fiscal year'):
              errors.append('Closing Fiscal Year must not be blank if Closing Stage is not "Not Closing"')

            if not row.get('closing quarter'):
              errors.append('Closing Quarter must not be blank if Closing Stage is not "Not Closing"')

        except ValueError:
          errors.append('Closing Stage value must be one of "' + '", "'.join(validClosingStages) + '".')


      if row.get('key mission facility') == 'Yes':
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

        elif row.get('electricity is metered') == 'Yes':
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
    
    if (row.get('record validity') == 'Valid Facility' and
        row.get('closing stage') != 'Closed' and
        row.get('ownership type') == 'Agency Owned' and
        row.get('data center tier', '').lower() not in validTiers):
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
    if row.get('key mission facility type') and row.get('key mission facility') != 'Yes':
      warnings.append('Key Mission Facility Type should only be present if Key Mission Facility is "Yes"')
    
    if row.get('key mission facility') == 'Yes':
      if row.get('data center tier', '').lower() not in validTiers:
        warnings.append('Key Mission Facilities should not be non-tiered data centers.')
        
      if row.get('ownership type') != 'Agency Owned':
        warnings.append('Key Mission Facilities should only be agency-owned.')
  
      if row.get('record validity') != 'Valid Facility':
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