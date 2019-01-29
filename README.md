# DCOI
Scripts &amp; Tools for processing DCOI IDC data files.

_These scripts are currently in active development and may have
outstanding issues._

## TODO:

* Script to scrape, validate, and import cost savings files from agency websites.
* Additional validation rules in `validate.py`.
* Handle adjudication of Optimization Exemptions across all scripts.
* Create examples of usage of JSON files on the IT Dashboard.


## validate.py

This script should be run to validate any IDC csv files before submitting to
OMB. The script will output any errors in the data that must be resolved,
and also list warnings of data that does not meet expectations for quality.

Usage: `python validate.py FILENAME.csv`


## createDatabase.py

This script sets up a SQLite database for use by all of the following scripts.

This and all following files use the configuration settings in `config.py`.

Usage: `python createDatabase.py`


## importIDCData.py

This script imports data from an IDC spreadsheet or a directory of spreadsheets
into the SQLite database.

Usage: `python importIDCData.py FILENAME.csv`

Usage: `python importIDCData.py /DIRECTORY/OF/DATAFILES/`


## stratPlanDownload.py

This script scrapes agencies' websites to download their Strategic Plan JSON
files and import them into the database.  Note that this script requires
several supplementary Python packages, which may be installed using the
included `requirements.txt` file.

Install dependencies: `pip install -r requirements.txt`

Usage: `python stratPlanDownload.py`


## runDCOIReport.py

This script generates the JSON data files needed for the IT Dashboard.

Usage: `python runDCOIReport.py`
