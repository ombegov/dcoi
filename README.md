# DCOI
Scripts &amp; Tools for processing DCOI IDC data files.

_These scripts are currently in active development and may have
outstanding issues._

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


## example-site/

This directory contains demo data and example visualizations of our imported
data.

Using python, you can serve a local version with `python -m http.server 8000`
(Python 3) or `python -m SimpleHTTPServer 8000` (Python 2).

## validate-web/

This directory contains a port of the validate.py script to run in a web browser, client-side only.  This is currently copied to [@WhiteHouse/datacenters](https://github.com/WhiteHouse/datacenters) for the validator that appears on [https://datacenters.cio.gov](https://datacenters.cio.gov).
