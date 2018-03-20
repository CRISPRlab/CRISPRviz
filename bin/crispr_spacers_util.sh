#!/bin/bash

# Utility to move spacer file to appropriate location for server startup
SOURCE_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
cp -rf ./spacerOutput.json ${SOURCE_DIR}/../data

echo "source dir: "${SOURCE_DIR}

#detect python version:
#version 2 = server.py
#version 3 = http.server
declare -a VERSION_FULL=$(python -c 'import sys; print(sys.version_info[:])')
if [ $? -gt 0 ]; then
	#python is not installed
	echo "ERROR: Python 2 or 3 must be installed to complete execution of this application."
	exit 0
fi

VERSION=${VERSION_FULL%?}

if [ "${VERSION}" -eq "2" ]; then
	echo "PYTHON VERSION 2"
	nohup server.py --port 4444 --dir ${SOURCE_DIR}/.. & ## runs even after terminal window is closed
	# open http://localhost:8000/crispr_spacers.html
elif [ "${VERSION}" -eq "3" ]; then
	echo "PYTHON VERSION 3"
	cd ${SOURCE_DIR}/..
	nohup python -m http.server 4444 & ## runs even after terminal window is closed
else 
	echo "ERROR: unsupported version of Python. This software currently supports use of Python 2 and 3."
fi

echo "...Executing server.py..."
echo "('Serving HTTP on', '0.0.0.0', 'port', 4444, '...')"

printf "\nCRISPRviz <>||<>||<> processing COMPLETE! >> check localhost:4444 for results.\n"

exit 1
