import csv
import sys
import itertools

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
validTiers = ['tier 1', 'tier 2', 'tier 3', 'tier 4']
validKMFTypes = ['mission', 'processing', 'control', 'location', 'legal', 'other']

# Lowercase the field keys by updating the header row, for maximum compatiblity.
def lower_headings(iterator):
    return itertools.chain([next(iterator).lower()], iterator)

with open(filename, 'r') as datafile:
  reader = csv.DictReader(lower_headings(datafile))
  for row in reader:
    num = reader.line_num
    errors = []
    warnings = []

    ###
    # Data acceptance rules. These should match the IDC instructions.
    ###

    if not row['agency abbreviation']:
      errors.append('Agency Abbreviation must not be blank.')

    if not row['component']:
      errors.append('Component must not be blank.')

    if not row['record validity']:
      errors.append('Record Validity must not be blank.')
      
    if row['key mission facility'] == 'Yes':
      if not row['key mission facility type']:
        errors.append('Key Mission Facilities must have a Key Mission Facility Type.')
        
      elif row['key mission facility type'].lower() not in validKMFTypes:
        errors.append('Key Mission Facilities must have a Key Mission Facility Type, "{}" given.'.format(row['key mission facility type']))
        
      elif row['key mission facility type'].lower() == 'other' and not row['comments']:
        errors.append('Key Mission Facilities of Type "other" must have an explanation in the Comments field.')

    # The data centers that are still targets for optimization - Valid, Agency-Owned, Open, non-Tenant.
    if (row['record validity'] == 'Valid Facility' and
        row['ownership type'] == 'Agency Owned' and
        row['closing stage'] != 'Closed' and
        row['inter-agency shared services position'] != 'Tenant'):

      if not row['closing stage']:
        errors.append('Closing Stage must not be blank.')
      else:
        try:
          validClosingStages.index(row['closing stage'].lower())

          if row['closing stage'].lower() != 'not closing':
            if not row['closing fiscal year']:
              errors.append('Closing Fiscal Year must not be blank if Closing Stage is not "Not Closing"')

            if not row['closing quarter']:
              errors.append('Closing Quarter must not be blank if Closing Stage is not "Not Closing"')

        except ValueError:
          errors.append('Closing Stage value must be one of [', ', '.join(validClosingStages), ']')


      if row['key mission facility'] == 'Yes':
        if not row['key mission facility type']:
          errors.append('Key Mission Facility Type must not be blank for all Key Mission Facilities')

      else:
        if not row['data center name']:
          errors.append('Data Center Name must not be blank.')

        if not row['gross floor area']:
          errors.append('Gross Floor Area must not be blank.')

        if not row['data center tier']:
          errors.append('Data Center Tier must not be blank.')

        if not row['electricity is metered']:
          errors.append('Electricity is Metered must not be blank.')

        elif row['electricity is metered'] == 'Yes':
          if not row['avg electricity usage']:
            errors.append('Avg Electricity Usage must not be blank if Electricity Is Metered = Yes.')

          if not row['avg it electricity usage']:
            errors.append('Avg IT Electricity Usage must not be blank if Electricity Is Metered = Yes.')

        # The following numeric fields may reasonably be "0", so we must check for blanks instead of "not".
        if row['underutilized servers'] == '':
          errors.append('Underutilized Servers must not be blank.')

        if row['actual hours of facility downtime'] == '':
          errors.append('Actual Hours of Facility Downtime must not be blank')

        if row['planned hours of facility availability'] == '':
          errors.append('Planned Hours of Facility Availability must not be blank')

        if row['rack count'] == '':
          errors.append('Rack Count must not be blank')

        if row['total mainframes'] == '':
          errors.append('Total Mainframes must not be blank')

        if row['total hpc cluster nodes'] == '':
          errors.append('Total HPC Cluster Nodes must not be blank')

        if row['total servers'] == '':
          errors.append('Total Servers must not be blank')

        if row['total virtual hosts'] == '':
          errors.append('Total Virtual Hosts must not be blank')


    ###
    # Data validation rules. This should catch any bad data.
    ###
    
    if (row['record validity'] == 'Valid Facility' and
        row['closing stage'] != 'Closed' and
        row['ownership type'] == 'Agency Owned' and
        row['data center tier'].lower() not in validTiers):
      warnings.append('Only tiered data centers need to be reported, marked as "{}"'.format(row['data center tier']))
        
    
    # Impossible PUEs
    
    # PUE = 1.0:
    if (row['avg electricity usage'] and 
        row['avg it electricity usage'] and
        row['avg electricity usage'] == row['avg it electricity usage']):
      warnings.append(
        'Avg Electricity Usage ({}) for a facility should never be equal to Avg IT Electricity Usage ({})'
          .format(row['avg electricity usage'], row['avg it electricity usage'])
      )


    # Check for incorrect KMF reporting      
    if row['key mission facility type'] and row['key mission facility'] != 'Yes':
      warnings.append('Key Mission Facility Type should only be present if Key Mission Facility is "Yes"')
    
    if row['key mission facility'] == 'Yes':
      if row['data center tier'] not in validTiers:
        warnings.append('Key Mission Facilities should not be non-tiered data centers.')
        
      if row['ownership type'] != 'Agency Owned':
        warnings.append('Key Mission Facilities should only be agency-owned.')
  
      if row['record validity'] != 'Valid Facility':
        warnings.append('Invalid facilities should not be Key Mission Facilities.')
        
    ###
    # Print our results.
    ###

    if len(errors) or len(warnings):
      # Print some sort of name to look up, even if we don't have one.
      dcName = []
      
      if row['agency abbreviation']:
        dcName.append(row['agency abbreviation'])
      
      if row['component']:
        dcName.append(row['component'])
      
      if row['data center id']:
        dcName.append(row['data center id'])
      
      else:
        dcName.append('Line Number {}'.format(num))
      
      print(' - '.join(dcName))
      
    if len(errors) > 0:
      hasErrors = True
      print('  Errors:', "\n   ", "\n    ".join(errors))

    if len(warnings) > 0:
      hasWarnings = True
      print('  Warnings:', "\n   ", "\n    ".join(warnings))


  ###
  # Print our final validation results.
  ###

  print('')
  print('********************************************************************************')

  if hasErrors:
    print('* Any errors must be corrected before the data file will be accepted.')

  if hasWarnings:
    print('* The warnings above _should_ be corrected before submitting this data, but it ')
    print('* is not required.')

  if not hasErrors and not hasWarnings:
    print('* The file had no problems or errors.')

  print('********************************************************************************')
  print('')