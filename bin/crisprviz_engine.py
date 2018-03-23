#!/usr/bin/env python
# -*- coding: utf-8 -*-
# using utf-8 coding since this script fails due to non ASCII characters in symbolRef

# USAGE: 
#		crisprviz_engine.py   [-r reverse complement - optional] 
#							[-f fasta file - optional]
#							[-p path - optional]
#			*if no fasta file is provided, all *.spacers.fa files will be processed together

from Bio import SeqIO
import re
import math
import sys
from os import walk
import os.path
import json
import subprocess
import argparse
import re

fileRef = []
reverseComplement = False
def resolveFilePaths() :
	for (dirpath, dirnames, filenames) in walk("."):
		if args.inputFile and len(args.inputFile) > 0 :
			for fileName in filenames :
				if args.inputFile in fileName :
					fileRef.append(fileName) 
		else :
			fileRef.extend(filenames)
			del dirnames[:]

def helpMsg(name=None):                                                            
    return '''crisprviz_engine.py [options]

    	Note: running crisprviz_engine.py with no options will concurrently process all 
    	*_spacers.fa files in the current directory. 
         
         Examples:	# Run for all *_spacers.fa files in current directory concurrently
         			crisprviz_engine.py

         		# Set output to default to reverse complement in web visualizer
         			crisprviz_engine.py -r

         		# Run for a single file (name must end in _spacers.fa)
         			crisprviz_engine.py -f genome_spacers.fa
        '''
	

# parse input arguments #
parser = argparse.ArgumentParser(description='CRISPRviz >> Spacer|Repeat Conversion <>||<>||<> by Matt Nethery', usage=helpMsg())
parser.add_argument('-f', dest='inputFile', help='Input spacer file (*_spacers.fa)',required=False)
parser.add_argument('-r','--rc', dest='rc', action='store_true', help='Reverse complement', required=False)
parser.add_argument('-p','--path', dest='sourcePath', required=True)
parser.set_defaults(predict=False)
args = parser.parse_args()

resolveFilePaths()

if args.rc :
	reverseComplement = True


jsonMaster = []

def convertToRGB(seqItem, rev_comp, calcVal) :
	if rev_comp :
		seqItem.seq = seqItem.seq.reverse_complement()

	if reverseComplement == True :
		initialSeq = seqItem.seq.reverse_complement()
	else :
		initialSeq = seqItem.seq
	
	pure_seq = re.sub('[^A-Za-z]+', '', str(initialSeq))
	lower_seq = pure_seq.lower()
		
		
	#base replacement with numbers for downstream color calculation
	coded_seq = lower_seq.replace("a", "6")
	coded_seq = coded_seq.replace("c", "4")
	coded_seq = coded_seq.replace("g", "2")
	coded_seq = coded_seq.replace("t", "8")
	coded_seq = coded_seq.replace("u", "8")
	coded_seq = coded_seq.replace("n", "5")

	coded_seq = coded_seq.replace("r", "6")
	coded_seq = coded_seq.replace("y", "4")
	coded_seq = coded_seq.replace("m", "6")
	coded_seq = coded_seq.replace("k", "2")
	coded_seq = coded_seq.replace("s", "4")
	coded_seq = coded_seq.replace("w", "6")
	coded_seq = coded_seq.replace("h", "6")
	coded_seq = coded_seq.replace("b", "4")
	coded_seq = coded_seq.replace("v", "6")
	coded_seq = coded_seq.replace("d", "6")
		
	seq_length = len(lower_seq)
		
	bgColorR, bgColorG, bgColorB = (0, 0, 0)
	bgColorR255, bgColorG255, bgColorB255 = (0, 0, 0)
	symbolColorR, symbolColorG, symbolColorB = (0, 0, 0)
	symbolColorR255, symbolColorG255, symbolColorB255 = (0, 0, 0)

	if seq_length < 25 or seq_length > 45 :
		bgColorR255 = 192
		bgColorB255 = 192
		bgColorG255 = 192
		symbolColorR255 = 225
		symbolColorB255 = 0
		symbolColorG255 = 0
	else :
		bgColorR = coded_seq[:5]
		bgColorG = coded_seq[5:10]
		bgColorB = coded_seq[10:15]
		symbolColorR = coded_seq[15:20]
		symbolColorG = coded_seq[20:25]
				
		if seq_length == 25 :
			symbolColorB = "55555"
		else :			
			symbolColorB = coded_seq[25:30]
			i = 0
			for i in range(0, 30 - seq_length) :
				symbolColorB += "5"
				# print symbolColorB
		
		bgColorR255 = round((1.7 * math.sqrt(int(bgColorR)) - 253), 0)
		bgColorG255 = round((1.7 * math.sqrt(int(bgColorG)) - 253), 0)
		bgColorB255 = round((1.7 * math.sqrt(int(bgColorB)) - 253), 0)
		
		symbolColorB255 = round((1.7 * math.sqrt(int(symbolColorB)) - 253), 0)
		symbolColorG255 = round((1.7 * math.sqrt(int(symbolColorG)) - 253), 0)
		symbolColorR255 = round((1.7 * math.sqrt(int(symbolColorR)) - 253), 0)
		
		
	#conversion dict lookup
	#handle sequences shorter than 25 and longer than 45
	if seq_length < 25 :
		symbol = 24
	elif seq_length > 45 :
		symbol = 46
	else :
		symbol = seq_length
		
	if calcVal == False:
		coded_seq = 0

	spacer = {
		"symbol" : symbol,
		"bgR" : bgColorR255,
		"bgG" : bgColorG255,
		"bgB" : bgColorB255,
		"symR" : symbolColorR255,
		"symG" : symbolColorG255,
		"symB" : symbolColorB255,
		"seq" : lower_seq, 
		"calc" : int(coded_seq)
	}

	return spacer
print ("<< Starting spacer|repeat conversion >> ")
for fileItem in fileRef :
	spacerFinal = {}

	if "_spacers.fa" in fileItem :
		spacerList = []
		for seq_record in SeqIO.parse(fileItem, "fasta") :
			spacerRef = convertToRGB(seq_record, False, True)
			spacerRefRC = convertToRGB(seq_record, True, True)
			spacerDualItem = {
				"standard" : spacerRef, 
				"rev" : spacerRefRC
			}
			spacerList.append(spacerDualItem)


		spacerFinal = {
			"title" : fileItem, 
			"spacers" : spacerList, 
			"active" : 'standard'
		}

		#find corresponding REPEATS file
		repeatsFile = fileItem.replace('spacers', 'repeats')

		if os.path.exists(repeatsFile):
			repeatList = []
			for seq_record in SeqIO.parse(repeatsFile, "fasta") :
				repeatRef = convertToRGB(seq_record, False, False)
				repeatRefRC = convertToRGB(seq_record, True, False)
				repeatDualItem = {
					"standard" : repeatRef, 
					"rev" : repeatRefRC
				}
				repeatList.append(repeatDualItem)

			spacerFinal['repeats'] = repeatList
		else :
			spacerFinal['repeats'] = []

		#final output
		jsonMaster.append(spacerFinal)

with open("spacerOutput.json", "w") as outfile :
	json.dump(jsonMaster, outfile)

crisprSpacersUtil = args.sourcePath + '/crispr_spacers_util.sh'

subprocess.Popen(crisprSpacersUtil)


