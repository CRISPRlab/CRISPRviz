define(['underscore'], function (_) {

	function MSAModule() {

		// set self vars and functions for external get/set //
		var self = this;
		self.spacerOutput = [];	//is set by main.js
		self.emptyXItem = ''; 	//is set by main.js

        // rounding //
        fixedVar = 4;
        
    	// PSA //
    	seqA = [];
    	seqB = [];
    	masterArray = [];
    	tracebackArray = [];
    	breadCrumbArray = [];
    	masterTree = [];
    	globalAlignment = [];
    	Path = Object.freeze({'DIAG':1, 'HORIZONTAL':2, 'VERTICAL':3});	
	
    	// MSA //
    	var psaGlobalAlignmentSet = true;
    	var msaGlobalAlignmentSet = true;
    	var matchAward = 4;
    	var mismatchPenalty = -1;
    	var gapPenalty = -2;
    	var doubleGapPenalty = gapPenalty - 1;


		//----------------------------------------------------------------------------------//
		//----------------------------------------------------------------------------------//
		//----------------------------ALIGNMENT CALCS AND FORMATTING------------------------//
		//----------------------------------------------------------------------------------//
		//----------------------------------------------------------------------------------//


		self.initiateAlignment = function () {
        	var extractedSpacers = extractActiveItemsWithTitles();
        	var spacerCombo = combination(extractedSpacers);
        	var rootTreeTable = comboToTreeTable(spacerCombo);
        	reduceRootTreeTable(rootTreeTable, extractedSpacers);
        	executeMultipleAlignment();
        	finalizeSpacerSequences();	
    	}
    

        function finalizeSpacerSequences () {
    
            var finalAlignment = globalAlignment[globalAlignment.length - 1];
            var alignments = finalAlignment.alignments;
            cleanEndGaps(alignments);
            var titles = finalAlignment.titles;
    
            $.each(titles, function (key, title) {
                var moveToIdx = key;
                var moveFromIdx;
    
                $.each(self.spacerOutput, function (key, val) {
                    if (title == val.title) {
                        moveFromIdx = key;
                        return false;
                    }
                });
    
                self.spacerOutput.splice(moveToIdx, 0, self.spacerOutput.splice(moveFromIdx, 1)[0]);
    
                // generate gap index list //
                var gapIndexList = generateGapIndexList(alignments[moveToIdx]);
                var spacerList = self.spacerOutput[moveToIdx].spacers;
                $.each(gapIndexList, function (key, val) {
                    spacerList.splice(val, 0, self.emptyXItem);
                });
    
            });
    
        }

        function generateGapIndexList (alignment) {
            var gapIndexList = [];
            $.each(alignment, function (key, val) {
                if (val == 0) {
                    gapIndexList.push(key);
                }
            });
            return gapIndexList;
        }

        function executeMultipleAlignment () {
    
            globalAlignment = [];
    
            $.each(masterTree, function (key, val) {
                var titleArray = val.titles;
                var newAlignments = [];
                var newTitles = [];
                var newOrder = [];
                var idxCounter = 0;
                $.each(titleArray, function (titleKey, titleVal) {
    
                    if (typeof titleVal === 'number') {
                        var alignmentObj = alignmentLookup(titleVal, null, null, null, idxCounter);
                        newAlignments = newAlignments.concat(alignmentObj.alignments);
                        newTitles = newTitles.concat(alignmentObj.titles);
                        newOrder.push(alignmentObj.order);
                        idxCounter = alignmentObj.idxCounter;
                    } else {
                        newTitles.push(titleVal)
                        var seq = val.alignments[titleKey]; 
                        seq.shift();
                        newAlignments.push(seq);
                        newOrder.push([idxCounter]);
                        idxCounter++;
                    }
                });
        
                if (newAlignments.length == 2) {
                    newAlignments[0].unshift(0);
                    newAlignments[1].unshift(0);
                    initiateSpaceAndScore(newAlignments[0], newAlignments[1]);
                    globalAlignment.push({
                        'titles' : newTitles, 
                        'alignments' : [seqA, seqB], 
                        'order' : newOrder
                    });
                } else if (newAlignments.length > 2) {
                    initiateMultipleSpaceAndScore(newAlignments, newTitles, newOrder);
                } else { // handle alignment with a single remaining clade //
                    console.log('Single new alignment produced. ERROR');
                }
            });
        }

        function alignmentLookup(idx, alignments, titles, order, iter) { //RECURSIVE
            var idxCounter = iter;
            var recAlignList = alignments || [];
            var recTitleList = titles || [];
            var orderList = order || [];
    
            var item = globalAlignment[idx]; 
            var titleArray = item.titles;
            var alignArray = item.alignments;
            $.each(titleArray, function (key, val) {
                if (typeof val === 'number') {
                    alignmentLookup(val, recAlignList, recTitleList, orderList, iterCounter);
                } else {
                    recAlignList.push(alignArray[key]);
                    recTitleList.push(val);
                    orderList.push(idxCounter);
                    idxCounter++;
                }
            });
            return {
                'titles' : recTitleList, 
                'alignments' : recAlignList,
                'order' : orderList, 
                'idxCounter' : idxCounter
            }
        }

        function reduceRootTreeTable (table, extractedSpacers, rootIdx) {
            // find max value (from the highest scoring alignment) //
            var reduceCount = rootIdx || 0;
            var maxIdxY, maxIdxX;
            var compareArr = [];
            var i = 2;
            for (i; i < table.length; i++) {
                var row = table[i].slice(1);
                compareArr.push(_.max(row));
            }
            var tableMax = _.max(compareArr);
    
            var maxIdxY = $.inArray(tableMax, compareArr) + 2;
            var maxIdxX = $.inArray(tableMax, table[maxIdxY].slice(1)) + 1;
    
            // << extract titles and alignment push to masterTree >> //
    
            // get row and column title contents (these will be strings or numbers) //
            var titleA = table[0][maxIdxX];
            var titleB = table[maxIdxY][0];
            
            // get alignments //
            var itemsInA = 0, itemsInB = 0;
            var alignA, alignB;
            if (typeof titleA === 'string') { // is a simple single title //
                itemsInA++;
                $.each(extractedSpacers, function (key, val) {
                    if (val.title == titleA) {
                        alignA = val.spacers;
                    }
                });
            } else { // lookup how many items are in this //
                itemsInA = masterTreeItemCount(titleA, 0);
            }
            if (typeof titleB === 'string') { // is a simple single title //
                itemsInB++;
                $.each(extractedSpacers, function (key, val) {
                    if (val.title == titleB) {
                        alignB = val.spacers;
                    }
                });
            } else { //lookup how many items are in this //
                itemsInB = masterTreeItemCount(titleB, 0);
            }
            
            masterTree.push({
                "titles" : [titleA, titleB],
                "alignments" : [alignA, alignB], 
                "score" : +tableMax.toFixed(fixedVar) // + fixes float to string issue //
            });
    
            if (table.length <= 3) {
                return;
            }
    
            // create deep copy of array //
            var reducedTable = JSON.parse(JSON.stringify(table));
    
            // <<REMOVAL STEP>> //
            var toDeleteX, toDeleteY;
            if (maxIdxY > maxIdxX) {
                toDeleteY = maxIdxY;
                toDeleteX = maxIdxX;
            } else {
                toDeleteY = maxIdxX;
                toDeleteX = maxIdxY;
            }
            reducedTable.splice(toDeleteY, 1); // delete rows //
            reducedTable.splice(toDeleteX, 1); // delete rows //
            matrixRemoveColumn(reducedTable, toDeleteY); // delete columns //
            matrixRemoveColumn(reducedTable, toDeleteX); // delete columns //
    
    
            // << ADDITION STEP >> //
    
            // << ADD NEW BLANK ROWS >> //
            reducedTable[0].splice(1, 0, reduceCount);
            var newRow = [reduceCount];
            
    
            reducedTable.splice(1, 0, newRow);
    
            // << CALCULATE AVERAGED VALUES FROM PREVIOUS TABLE >> //
            var columnAvgs = [];
            var l = 1; 
            for (l; l < table.length; l++) {
                if (l == maxIdxX || l == maxIdxY) {
                    continue;
                }
                var row = table[l];
                var rowSum = ((row[maxIdxX]*itemsInA) || 0) + ((row[maxIdxY]*itemsInB) || 0);
                var columnSum = ((table[maxIdxX][l]*itemsInA) || 0) + ((table[maxIdxY][l]*itemsInB) || 0);
                columnAvgs.push((rowSum + columnSum)/(itemsInA+itemsInB));
            }
    
            // << INSERT AVERAGED VALUES INTO FIRST COLUMN >> //
            var n = 0; 
            for (n; n < columnAvgs.length; n++) {
                var avg = columnAvgs[n];
                reducedTable[n+2].splice(1, 0, +avg.toFixed(fixedVar)); // + fixes float to string issue
            }
    
            if (reducedTable.length > 2) {
                // continue to reduce table //
                reduceCount++;
                reduceRootTreeTable(reducedTable, extractedSpacers, reduceCount);
            }
    
        }

        function masterTreeItemCount(idx, count) {
            // recursively count the number of items in each masterArray entry //
            var itemArray = masterTree[idx].titles;
            $.each(itemArray, function (key, val){
                if (typeof val === 'string') {
                    count++;
                } else {
                    count = masterTreeItemCount(val, count);
                }
            });
            return count;
        }
    
        function matrixRemoveColumn(table, idx) {
            var i = 0; 
            for (i; i < table.length; i++) {
                var row = table[i];
                row.splice(idx, 1);
            }
    
            return table;
        }

        function comboToTreeTable (combo) {
    
            var treeMasterArray = [];
    
            // initiate matrix rows //
            var openRow = 1; // indicates next open row //
            var i = 0;
            for (i; i < self.spacerOutput.length + 1; i++) {
                var rowArr = [];
                if (i == 0) {
                    rowArr.push(0);
                }
                treeMasterArray.push(rowArr);
            }
    
            var m = 0; 
            for (m; m < combo.length; m++) {
                var score = combo[m].score;
                var titleA = combo[m].titleA;
                var titleB = combo[m].titleB;
                var titleAIdx = $.inArray(titleA, treeMasterArray[0]);
                var titleBIdx = -1;
    
                // << handle ROWS >> //
                // special case of first item (need to add to column) //
                if (m == 0) {
                    treeMasterArray[openRow].push(titleA);
                    openRow++;
                }
                if (titleAIdx <= -1) { // doesn't exist, add //
                    treeMasterArray[0].push(titleA);
                    titleAIdx = treeMasterArray[0].length - 1;
                }
    
                // << handle COLUMNS >> //
                var k = 1;
                for (k; k < treeMasterArray.length; k++) {
                    var currRow = treeMasterArray[k];
                    titleBIdx = $.inArray(titleB, currRow);
                    if (titleBIdx > -1) {
                        titleBIdx = k;
                        break;
                    }
                }
    
                if (titleBIdx <= -1) { // not found in any row //
                    treeMasterArray[openRow].push(titleB);
                    titleBIdx = openRow;
                    openRow++;
                }
    
                // special case of last item (need to add entry to header) //
                if (m == combo.length - 1) {
                    treeMasterArray[0].push(titleB);
                }
    
                treeMasterArray[titleBIdx].push(score);
            }
            return treeMasterArray;
        }

        function findHeaderIdx (title, treeArray) {
            var j = 1; 
            for (j; j < treeArray[0].length; j++) {
                var headerTitleIdx = $.inArray(title, treeArray[0][j]);
                if (headerTitleIdx > -1) {
                    return j;
                }
            }
            return -1;
        }

        function extractActiveItemsWithTitles() {
            var items = [];
            var i = 0; 
            for (i; i < self.spacerOutput.length; i++) {
                var active = self.spacerOutput[i].active;
                var title = self.spacerOutput[i].title;
                var spacerList = self.spacerOutput[i].spacers;
                var extractedInfo = extractActiveItemCalcVals(spacerList, active);
                var spacerArray = extractedInfo.extList;
                var toDeleteIdxList = extractedInfo.removeIdxList;
                spacerArray.unshift(0);
                items.push({
                    'title' : title, 
                    'spacers' : spacerArray
                });
    
                var j = toDeleteIdxList.length;
                for (j; j > 0; j--) {
                    var idxToDelete = toDeleteIdxList[j-1];
                    spacerList.splice(idxToDelete, 1);
                }
            }
            return items;
        }

        function extractActiveItemCalcVals(items, active) {
            var extList = [];
            var removeList = [];
            $.each(items, function (key, item) {
                    if (item[active].seq.length > 0) {
                        extList.push(item[active].calc);
                    } else {
                        removeList.push(key)
                    }
            });
            return {
                'extList' : extList, 
                'removeIdxList' : removeList
            };
        }

        function combination(arr) {
            var results = [];
            for (var i = 0; i < arr.length - 1; i++) {
                for (var j = i + 1; j < arr.length; j++) {
                    var score = initiateSpaceAndScore(arr[i].spacers, arr[j].spacers, true);
                    var dict = {
                        'titleA' : arr[i].title,
                        'titleB' : arr[j].title,
                        'indexA' : i, 
                        'indexB' : j,
                        'score' : +score.toFixed(fixedVar) // + fixes float to string issue
                    }
                    results.push(dict);
                }
            }
            return results;
        }


//----------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------//
//------------------------GLOBAL PAIRWISE ALIGNMENT EXECUTION-----------------------//
//----------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------//

// * seqA and seqB refer to the side sequence (A) and the top sequence (B) of the matrix, respectively


        function initiateSpaceAndScore (parSeqA, parSeqB, scoreOnly) {
            seqA = [];
            seqB = [];
            masterArray = [];
            tracebackArray = [];
            breadCrumbArray = [];
            masterTree = [];
    
            seqA = parSeqA;
            seqB = parSeqB;
    
            if (seqA.length <= 1 || seqB.length <=1) {
                return;
            }
    
            // create dynamic list of arrays //
            var i = 0;
            for (i; i < seqA.length; i++) {
                var matrixRow = [];
                masterArray.push(matrixRow);
    
                var tbRow = [];
                tracebackArray.push(tbRow);
            }
    
            calculateGhostRow();
            calculateGhostColumn();
            var finalScore = evaluateSpacers(scoreOnly);
            if (scoreOnly) {
                return Math.round(finalScore, 3);
            }
        }

        calculateGhostRow = function (scoreOnly) {
            var ghostRow = masterArray[0];
            if (!scoreOnly) {
                var tbRow = tracebackArray[0];
            }
            var i = 0;
            for (i; i < seqB.length; i++) {
                ghostRow.push(i*gapPenalty);
                if (!scoreOnly) {
                    tbRow.push(Path.HORIZONTAL);
                }
            }
        }

        calculateGhostColumn = function (scoreOnly) {
            var i = 1; 
            for (i; i < seqA.length; i++) {
                var ghostColumnIdx = masterArray[i];
                ghostColumnIdx.push(i*gapPenalty);
    
                if (!scoreOnly) {
                    var tbColumnIdx = tracebackArray[i];
                    tbColumnIdx.push(Path.VERTICAL);
                }
            }
        }

        evaluateSpacers = function (scoreOnly) {
    
            var i = 1;
            for (i; i < seqA.length; i++) {
                var baseA = seqA[i];
                var j = 1;
                for (j; j < seqB.length; j++) {
                    var baseB = seqB[j];
    
                    var diagVal, verticalGapVal, horizontalGapVal;
    
                    var rowAbove = masterArray[i-1];
                    var currentRow = masterArray[i];
                    if (!scoreOnly) {
                        var tracebackRow = tracebackArray[i];
                    }
                    var diagStart = rowAbove[j-1];
    
                    // check if we're in the last column, or on the last row //
                    // do not penalize end gaps //
                    var gapAdjPenalty = gapPenalty;
                    var mismatchAdjPenalty = mismatchPenalty;
                    // if last column | last row || past length of seqA(all gaps left) | past length of seqB(all gaps left)
                    // don't penalize differing lengths: maximize match potential //
                    if (j == masterArray[0].length - 1 || i == masterArray.length - 1 ) { 
                        gapAdjPenalty = 0;
                        mismatchAdjPenalty = 0; // to encourage diag movement into the final row (prevenets uneeded gaps) //
                    }
    
                    // equality test //
                    if (baseA == baseB) {
                        diagVal = diagStart + matchAward;
                    } else {
                        diagVal = diagStart + mismatchAdjPenalty;
                    }
    
                    // gap test //
                    var verticalStart = rowAbove[j];
                    verticalGapVal = verticalStart + gapAdjPenalty;
                    var horizontalStart = currentRow[j-1];
                    horizontalGapVal = horizontalStart + gapAdjPenalty;
    
                    var m = Math.max(diagVal, verticalGapVal, horizontalGapVal);
                    currentRow.push(m);
    
                    // traceback reference //
                    if (!scoreOnly) {
                        if (m == diagVal) {
                            tracebackRow.push(Path.DIAG);
                        } else if (m == verticalGapVal) {
                            tracebackRow.push(Path.VERTICAL);
                        } else {
                            tracebackRow.push(Path.HORIZONTAL);
                        }
                    }
                    
                }
            }
    
    
            var finalRow = masterArray[masterArray.length - 1];
            var finalScore = finalRow[finalRow.length - 1];
    
            if (scoreOnly) {
                return finalScore;
            } else {
                initiateTraceback();
            }
            
        }

        initiateTraceback = function () {
            if (psaGlobalAlignmentSet == true) {
                var idxA = seqA.length-1;
                var idxB = seqB.length-1;
                var finalRow = tracebackArray[tracebackArray.length - 1];
                breadCrumbArray.unshift(finalRow[finalRow.length - 1]);
                buildBreadcrumbs(idxA, idxB, finalRow[finalRow.length - 1]);
            } else {
                var idxA, idxB;
                var finalRowMaxIdx = matrixRowMaxIndex(masterArray[masterArray.length - 1]); // finds max of last row of masterArray //
                var finalColumnMaxIdx = matrixColumnMaxIndex(masterArray[0].length - 1, masterArray); // finds max of last column of masterArray //
                if (masterArray[finalColumnMaxIdx][masterArray[0].length - 1] >= masterArray[masterArray.length - 1][finalRowMaxIdx]) { // locate max idx's and setup startig point for traceback //
                    idxA = finalColumnMaxIdx;
                    idxB = masterArray[0].length - 1;
                } else {
                    idxB = finalRowMaxIdx;
                    idxA = masterArray.length - 1;
                }
                var firstBreadCrumb = tracebackArray[idxA][idxB];
                breadCrumbArray.unshift(firstBreadCrumb);
                buildBreadcrumbs(idxA, idxB, firstBreadCrumb);
            }
    
        }

        function matrixColumnMaxIndex (idx, matrix) {
    
            var highest = 0;
            var i = 1;
            for (i; i < matrix.length; i++) {
                if (matrix[i][idx] > matrix[highest][idx]) {
                    highest = i;
                }
            }
            return highest;
        }

        function matrixRowMaxIndex (matrixRow) {
    
            var highest = 0;
            var i = 1;
            for (i; i < matrixRow.length; i++) {
                if (matrixRow[i] > matrixRow[highest]) {
                    highest = i;
                }
            }
            return highest;
        }

        buildBreadcrumbs = function (idxA, idxB, dir) {
            if (idxA > 0 || idxB > 0) {
                var rowAbove = tracebackArray[idxA - 1];
                if (dir == Path.DIAG) {
                    var nextVal = rowAbove[idxB - 1];
                    breadCrumbArray.unshift(nextVal);
                    idxA--;
                    idxB--;
                    buildBreadcrumbs(idxA, idxB, nextVal);
                } else if (dir == Path.VERTICAL) {
                    var nextVal = rowAbove[idxB];
                    breadCrumbArray.unshift(nextVal);
                    idxA--;
                    buildBreadcrumbs(idxA, idxB, nextVal);
                } else {
                    var currentRow = tracebackArray[idxA];
                    var nextVal = currentRow[idxB-1];
                    breadCrumbArray.unshift(nextVal);
                    idxB--;
                    buildBreadcrumbs(idxA, idxB, nextVal);
                }
            } else {
                breadCrumbArray.splice(0, 1);
                traceFinalPath();
            }
        }

        traceFinalPath = function () {
            var idxA = 0;
            var idxB = 0;
            var seqAFinal = [];
            var seqBFinal = [];
            var i = 0; 
            for (i; i < breadCrumbArray.length; i++) {
                var dir = breadCrumbArray[i];
                if (dir == Path.DIAG) {
                    idxA++;
                    idxB++;
                    seqAFinal.push(seqA[idxA]);
                    seqBFinal.push(seqB[idxB]);
                } else if (dir == Path.HORIZONTAL) {
                    idxB++;
                    seqAFinal.push(0);
                    seqBFinal.push(seqB[idxB]);
                } else {
                    idxA++;
                    seqAFinal.push(seqA[idxA]);
                    seqBFinal.push(0);
                }
            }
            seqA = seqAFinal;
            seqB = seqBFinal;
        }

//----------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------//
//------------------------GLOBAL MULTIPLE ALIGNMENT EXECUTION-----------------------//
//----------------------------------------------------------------------------------//
//----------------------------------------------------------------------------------//

// ** This section is run once per multiple sequence alignment and can be:
//  1) an alignment against a single sequence
//  2) an alignment against another alignment
//  * pairwise alignments take the pairwise route since MSA has specialized scoring/algoroithm tweaks
//  * throughout this section, vars with A or B refer to the sequence down the side (A), and the sequence
//    across the top (B)

        var mMaxLength, mMaxLengthA, mMaxLengthB;
        var mMasterArray = [];
        var mTracebackArray = [];
        var mBreadCrumbArray = [];

        function initiateMultipleSpaceAndScore (alignments, titles, order) {
    
            // ensure all arrays are the same length //
            mMaxLength = 0;
            mMaxLengthA = 0;
            mMaxLengthB = 0;
            var alignments = addEqualLengths(alignments, order);
            mMasterArray = [];
            mTracebackArray = [];
            mBreadCrumbArray = [];
    
            var i = 0;
            for (i; i < mMaxLength + 1; i++) {
                var matrixRow = [];
                mMasterArray.push(matrixRow);
    
                var tbRow = [];
                mTracebackArray.push(tbRow);
            }
    
            calculateMultipleGhostRow();
            calculateMultipleGhostColumn();
            evaluateMutlipleAlignments(alignments, titles, order);
        }

        calculateMultipleGhostRow = function () {
            var ghostRow = mMasterArray[0];
            var tbRow = mTracebackArray[0];
            var i = 0;
            for (i; i < mMaxLength + 1; i++) {
                ghostRow.push(i*gapPenalty);
                tbRow.push(Path.HORIZONTAL);
            }
        }

        calculateMultipleGhostColumn = function () {
            var i = 1; 
            for (i; i < mMaxLength + 1; i++) {
                var ghostColumnIdx = mMasterArray[i];
                ghostColumnIdx.push(i*gapPenalty);
    
                var tbColumnIdx = mTracebackArray[i];
                tbColumnIdx.push(Path.VERTICAL);
            }
        }

        function evaluateMutlipleAlignments (alignments, titles, order) {
    
            // ROW iterator //
            var rowIdx = 1; 
            for (rowIdx; rowIdx < mMaxLength + 1; rowIdx++) {
    
                // COLUMN iterator //
                var columnIdx = 1; 
                for (columnIdx; columnIdx < mMaxLength + 1; columnIdx++) {
    
                    var diagVal, verticalGapVal, horizontalGapVal;
                    var rowAbove = mMasterArray[rowIdx-1];
                    var currentRow = mMasterArray[rowIdx];
                    var tracebackRow = mTracebackArray[rowIdx];
                    var diagStart = rowAbove[columnIdx-1];
    
                    // DIAG //
                    var diagVal = compressColumn(alignments, order, columnIdx, rowIdx, Path.DIAG);
                    diagVal += diagStart;
    
                    // VERTICAL //
                    var verticalStart = rowAbove[columnIdx];
                    var verticalGapVal = compressColumn(alignments, order, columnIdx, rowIdx, Path.VERTICAL);
                    verticalGapVal += verticalStart;
    
                    var horizontalStart = currentRow[columnIdx-1];
                    var horizontalGapVal = compressColumn(alignments, order, columnIdx, rowIdx, Path.HORIZONTAL);
                    horizontalGapVal += horizontalStart;
    
                    var m = Math.max(diagVal, verticalGapVal, horizontalGapVal);
                    currentRow.push(parseFloat(m.toFixed(fixedVar)));
    
    
                    if (m == diagVal) {
                        tracebackRow.push(Path.DIAG);
                    } else if (m == verticalGapVal) {
                        tracebackRow.push(Path.VERTICAL);
                    } else {
                        tracebackRow.push(Path.HORIZONTAL);
                    }
    
                }
    
            }
    
            var finalRow = mMasterArray[mMasterArray.length - 1];
            var finalScore = finalRow[finalRow.length - 1];
    
            initiateMultipleTraceback(alignments, titles, order);
        }

        function compressColumn(alignments, order, columnIdx, rowIdx, path) {
            var columnScore = 0;
            var iterator = 0;
            var emptyCount = 0;
            var i = 0;
            for (i; i < order[0].length; i++) {
                var idx = order[0][i];
                var localSeqA = alignments[idx];
                var j = 0;
                for (j; j < order[1].length; j++) {
                    var jIdx = order[1][j];
                    var localSeqB = alignments[jIdx];
    
                    var valA, valB;
                    if (path == Path.DIAG) {
                        valA = localSeqA[columnIdx-1];
                        valB = localSeqB[rowIdx-1];
                    } else if (path == Path.HORIZONTAL) {
                        valA = 0;
                        valB = localSeqB[rowIdx-1];
                    } else {
                        valA = localSeqA[columnIdx-1]; 
                        valB = 0;
                    }
                        
                    var mMatchAward = matchAward;
                    var mGapPenalty = gapPenalty;
                    var mMismatchPenalty = mismatchPenalty;
    
                    var gapAdjPenalty = mGapPenalty;
                    var mismatchAdjPenalty = mMismatchPenalty;
                    if (columnIdx == mMaxLength || rowIdx == mMasterArray.length - 1) { //last column | last row
                        gapAdjPenalty = 0;
                        mismatchAdjPenalty = 0; //to encourage diag movement into the final row (prevents uneeded gaps)
                    }
    
                    if (valA == 0 && valB == 0) { // both fields are gapped //
                        if (path == Path.DIAG) {
                            emptyCount++;
                        }
                        columnScore += doubleGapPenalty;
                    } else if (valA == valB) {              // match //
                        columnScore += mMatchAward;
                    } else if (valA == 0 || valB == 0) {    // gapped mismatch //
                        columnScore += gapAdjPenalty;
                    } else {                                // non-gapped mismatch //
                        columnScore += mismatchAdjPenalty;
                    }
                    iterator++;
                    
                }
            }
    
            return columnScore/iterator;
        }

        initiateMultipleTraceback = function (alignments, titles, order) {
            if (msaGlobalAlignmentSet == true) {
                var idxA = mMaxLength;
                var idxB = mMaxLength;
                var finalRow = mTracebackArray[mTracebackArray.length - 1];
                mBreadCrumbArray.unshift(finalRow[finalRow.length - 1]);
                buildMultipleBreadcrumbs(idxA, idxB, finalRow[finalRow.length - 1], alignments, titles, order);
            } else {
                var idxA, idxB;
                var finalRowMaxIdx = matrixRowMaxIndex(mMasterArray[mMasterArray.length - 1]); //finds max of last row of masterArray
                var finalColumnMaxIdx = matrixColumnMaxIndex(mMasterArray[0].length - 1, mMasterArray); //finds max of last column of masterArray
                if (mMasterArray[finalColumnMaxIdx][mMasterArray[0].length - 1] >= mMasterArray[mMasterArray.length - 1][finalRowMaxIdx]) { //locate max idx's and setup startig point for traceback
                    idxA = finalColumnMaxIdx;
                    idxB = mMasterArray[0].length - 1;
                } else {
                    idxB = finalRowMaxIdx;
                    idxA = mMasterArray.length - 1;
                }
                var firstBreadCrumb = mTracebackArray[idxA][idxB];
                mBreadCrumbArray.unshift(firstBreadCrumb);
                buildMultipleBreadcrumbs(idxA, idxB, firstBreadCrumb, alignments, titles, order);
                
            }
        }

        buildMultipleBreadcrumbs = function (idxA, idxB, dir, alignments, titles, order) {
            
            if (idxA > 0 || idxB > 0) {
                var rowAbove = mTracebackArray[idxA - 1];
                if (dir == Path.DIAG) {
                    var nextVal = rowAbove[idxB - 1];
                    if (idxB < mTracebackArray[0].length - 1 && idxA < mTracebackArray.length - 1) { // prevent unecessary gaps after reaching last row|column //
                        mBreadCrumbArray.unshift(nextVal);
                    }
                    idxA--;
                    idxB--;
                    buildMultipleBreadcrumbs(idxA, idxB, nextVal, alignments, titles, order);
                } else if (dir == Path.VERTICAL) {
                    var nextVal = rowAbove[idxB];
                    if (idxB < mTracebackArray[0].length - 1 && idxA < mTracebackArray.length - 1) { // prevent unecessary gaps after reaching last row|column //
                        mBreadCrumbArray.unshift(nextVal);
                    }
                    idxA--;
                    buildMultipleBreadcrumbs(idxA, idxB, nextVal, alignments, titles, order);
                } else {
                    var currentRow = mTracebackArray[idxA];
                    var nextVal = currentRow[idxB-1];
                    if (idxB < mTracebackArray[0].length - 1 && idxA < mTracebackArray.length - 1) { // prevent unecessary gaps after reaching last row|column //
                        mBreadCrumbArray.unshift(nextVal);
                    }
                    idxB--;
                    buildMultipleBreadcrumbs(idxA, idxB, nextVal, alignments, titles, order);
                }
            } else {
                mBreadCrumbArray.splice(0, 1);
                mBreadCrumbArray.pop();
                
                traceMultipleFinalPath(alignments, titles, order);
                return;
            }
        }

        traceMultipleFinalPath = function (alignments, titles, order) {
    
            var i = 0; 
            for (i; i < mBreadCrumbArray.length; i++) {
                var dir = mBreadCrumbArray[i];
                if (dir == Path.DIAG) {
                    // we already have it, do nothing //
                } else if (dir == Path.HORIZONTAL) {
                    insertAtMatrixIndex(0, i, order[1], alignments); // val, idx, gaps top alignment //
                } else {
                    insertAtMatrixIndex(0, i, order[0], alignments); // val, idx. gaps side alignment //
                }
            }
    
            globalAlignment.push({
                'titles' : titles,
                'alignments' : alignments,  
                'order' : order
            });
        }

        function insertAtMatrixIndex (val, idx, orderArray, alignments) { // alignmentArray is upper or lower alignment: 0 or 1 respectively //
            $.each(orderArray, function (key, val) {
                var alignment = alignments[val];
                alignment.splice(idx, 0, 0);
            });
        }

        function cleanEndGaps (alignments) {
            $.each(alignments, function (key, arr) {
                var i = arr.length - 1;
                for (i; i > 0; i--) {
                    var spacer = arr[i];
                    if (spacer == 0) {
                        arr.splice(i, 1);
                    } else {
                        break;
                    }
                }
            });
        }

    function addEqualLengths (alignments, order) {

        var i = 0;
        var j = 0;
        var sortAlignment = JSON.parse(JSON.stringify(alignments));
        mMaxLength = sortAlignment.sort(function (a, b) { return b.length - a.length; })[0].length;

        $.each(alignments, function (key, val) {    
            val = val.concat(new Array(mMaxLength-val.length).fill(0));
            alignments.splice(key, 1, val);
        });

        return alignments;
    }

}


return MSAModule;
});
