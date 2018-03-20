define([
		'jquery', 
		'bootstrap', 
		'Sortable', 				
		'FileSaver',				
		'./glyphLookup', 			
		'./multipleSeqAlignment',
		], function (
						$, 
						bootstrap, 
						Sortable, 
						FileSaver,
						glyphRef, 
						MSA,
						) {


	// Gap object //
    var emptyXItem = {
        "rev": {
            "seq": ""
        },
        "standard": {
            "seq": ""
        }
    }

	var msa = new MSA();
	msa.emptyXItem = emptyXItem;

    // Global Vars //
    var loadFileSelection = '';
    var itemToDelete = '';
    var spacerOutput = {};
    var reverseComplemented = false;
    var sortArray = [];
    var display = 'spacers';
    var importedFileName = '';

    // Id lookup helper //
    var id = function(id) {
        return document.getElementById(id);
    }

    function loadSpacers() {
        $('#saveTitle').text("New alignment");
    	$.getJSON("data/spacerOutput.json", function(data) {
            spacerOutput = data;
            startupPageBuilder();
    	});
        loadModalHTML();
        addSingletonActions();
        addMainReverseBtnAction();
        addMainRCBtnAction();
        addLengthSortAction();
        addRepeatSpacerToggleAction();
    }

    function startupPageBuilder () {
        buildDualList();
        refreshPageItems();
        createFunctionalElements();
    }

    function buildDualList() {
        var reversed = reverseComplemented ? true : false;
        $.each(spacerOutput, function (key, val) {
            var spacerContainer = buildSpacerContainer(val, reversed);
            var spacerList = val.spacers;
            var repeatList = val.repeats;
            var mergedList = JSON.parse(JSON.stringify(val.repeats));
            var repeatItr = 0;
            var spacerItr = 0;
            var insertIdx = 1;
            for (repeatItr; repeatItr < repeatList.length; repeatItr++) {
                var spacerItr = nextSpacerIndex(spacerList, spacerItr);
                if (spacerItr >= 0) {
                    var nextSpacer = spacerList[spacerItr];
                    mergedList.splice(insertIdx, 0, nextSpacer);
                    spacerItr++;
                    insertIdx += 2;
                } 
            }
            val['merged'] = mergedList;
        });
    }

    function nextSpacerIndex(spacerArray, idx) {
        if (spacerArray[idx] && spacerArray[idx].standard.seq.length > 0) {
            return idx;
        } else if (idx < spacerArray.length) {
            idx++;
            nextSpacerIndex(spacerArray, idx);
            return idx;
        } else {
            return -1;
        }
    }


    function refreshPageItems() {
        $('#mainSpacerContainer').empty();

        var reversed = reverseComplemented ? true : false;
        $.each(spacerOutput, function (key, val) {
            var spacerContainer = buildSpacerContainer(val, reversed);
            $('#mainSpacerContainer').append(spacerContainer);
        });
        // reset flag //
        reverseComplemented = false;
    }

    function buildSpacerContainer(val, reverseComplement) {
        // add action buttons to each row //
        var spacerContainer = "<div class='spacer-container'>"
        spacerContainer += "<span class='action-btn delete-row-btn'><span class='delete-row-icon glyphicon glyphicon-remove-circle'></span></span>";
        spacerContainer += "<span class='action-btn rc-btn'><span class='rev-icon glyphicon glyphicon-random'></span></span>";
        spacerContainer += "<span class='action-btn reverse-btn'><span class='rev-icon glyphicon glyphicon-resize-horizontal'></span></span>";
        spacerContainer += "<span class='action-btn delete-btn'>-</span>";
        spacerContainer += "<span class='action-btn add-btn'>+</span>";

        // start spacer|repeat items //
        spacerContainer += "<div class='spacer-item-list' id='spacerItemList'>";
        var spacerList = val.spacers;
        var repeatList = val.repeats;
        var mergedList = val.merged;
        var spacerTitle = val.title;

        // toggle rc //
        if (reverseComplement) {
            if (val.active == 'standard') {
                val.active = 'rev';
            } else {
                val.active = 'standard';
            }
        }

        // show repeats, spacers, or both //
        var blocklist = [];
        if (display == 'spacers') {
            blockList = extractActiveItems(spacerList, val.active);
        } else if (display == 'repeats') {
            blockList = extractActiveItems(repeatList, val.active);
        } else {
            blockList = extractActiveItems(mergedList, val.active);
        }

        for (block in blockList) {
            var blockItem = blockList[block];
            if (blockItem.seq.length <= 0) {
                var emptySpacer = "<span class='spacer-item empty-spacer'><span class='symbol glyphicon glyphicon-remove'></span></span>";
                spacerContainer += emptySpacer;
            } else {
                var blockColor = "background-color:rgb("+blockItem.bgR+","+blockItem.bgG+","+blockItem.bgB+");"
                var blockSymbolColor = "color:rgb("+blockItem.symR+","+blockItem.symG+","+blockItem.symB+");"
                spacerContainer += "<span class='spacer-item' style='"+ blockColor +"'><span class='symbol " + glyphRef.glyphLookup(blockItem.symbol) + "' style='"+ blockSymbolColor +"'></span></span>";
            }
        }

        spacerContainer += "</div>";
        spacerContainer += "<div class='title'><span class='glyphicon glyphicon-menu-hamburger title-icon'></span><div class='truncate' contenteditable='true' data-toggle='item-tooltip' data-placement='auto' title='" + val.title + "'>" + val.title + "</div></div>";
        spacerContainer += "</div>";

        return spacerContainer;                
    }

    function extractActiveItems(items, active) {
        var extList = [];
        $.each(items, function (key, item) {
                extList.push(item[active]);
        });
        return extList;
    }

    function loadModalHTML() {
        // load SAVEMODAL //
        $('#saveModalContainer').load('html/saveModal.html', function() {
            $('#saveModal').on('show.bs.modal', function (e) {
                $('#saveInput').val('');
            });

            $('#saveBtnModal').click(function() {
                showHUD();
                var saveName = $('#saveInput').val();
                if (saveName.length > 0) {
                    saveAlignment(saveName);
                    $('#saveModal').modal('toggle');
                    $('#saveInput').val('');
                    $('#saveTitle').text(saveName);
                }
                hideHUD();
            });
        });

        // load LOADMODAL //
        $('#loadModalContainer').load('html/loadModal.html', function() {
            $('#loadModal').on('show.bs.modal', function (e) {
                // load saved files into modal //
                $('#loadModal .modal-body').html('');
                var keyList = Object.keys(localStorage);
                for ( var i = 0, len = keyList.length; i < len; ++i ) {
                    key = keyList[i];
                    $('#loadModal .modal-body').append("<div class='load-item'><span class='file-item'><span class='glyphicon glyphicon-file'></span><span>"+key+"</span></span></div>");
                }

                $('#loadModal .modal-body .load-item').each(function() {
                    $(this).click(function() {
                        highlightSelected($(this));
                    });
                });
            });

            $('#loadBtnModal').click(function() {
                showHUD();
                if (loadFileSelection.length > 0) {
                    loadAlignment(loadFileSelection);
                    $('#loadModal').modal('toggle');
                    $('#saveTitle').text(loadFileSelection);
                    clearSelected();
                }
                hideHUD();
            });
        });

        // load MANAGEMODAL //
        $('#manageModalContainer').load('html/manageModal.html', function() {
            $('#manageModal').on('show.bs.modal', function (e) {
                populateManageList();
            });
        });

        // load DELETEMODAL //
        $('#deleteModalContainer').load('html/deleteModal.html', function() {
            $('#deleteBtnModal').click(function() {
                showHUD();
                if (itemToDelete.length > 0) {
                    localStorage.removeItem(itemToDelete);
                    itemToDelete = '';
                    populateManageList();
                }
                hideHUD();
            });
        });

        // load EXPORTMODAL //
        $('#exportModalContainer').load('html/exportModal.html', function() {
            $('#exportModal').on('show.bs.modal', function (e) {
                $('#exportInput').val('');
            });

            $('#exportBtnModal').click(function() {
                showHUD();
                var expName = $('#exportInput').val();
                if (expName.length > 0) {
                    exportAlignment(expName);
                    $('#exportModal').modal('toggle');
                    $('#exportInput').val('');
                }
                hideHUD();
            });
        });

        // load IMPORTMODAL //
        $('#importModalContainer').load('html/importModal.html', function() {
            $('#importBtnModal').click(function() {
                loadFile();
            });
        });

        // load DELETECONFIRMMODAL //
        $('#confirmDeleteContainer').load('html/confirmDeleteModal.html', function() {

            $('#confirmDeleteBtn').click(function(btn) {
                showHUD();
                var index = $(this).data('index');
                if (index >= 0) {
                    spacerOutput.splice(index, 1);
                    refreshPageItems();
                    createFunctionalElements();
                    $('#confirmDeleteModal').modal('hide');
                }
                hideHUD();
            });
        });

    }

    function addSingletonActions () {
        $('#importBtnModal').each(function() {
            $(this).click( function() {
                loadFile();
            });
        });

        $('[data-toggle=tooltip]').tooltip();
    }

    function populateManageList() {
        $('#manageModal .modal-body').html('');
        var keyList = Object.keys(localStorage);
        for ( var i = 0, len = keyList.length; i < len; ++i ) {
            key = keyList[i];
            $('#manageModal .modal-body').append("<div class='load-item'><span class='file-item'><span class='glyphicon glyphicon-file'></span><span>"+key+"</span></span><span class='manage-trash-delete glyphicon glyphicon-trash'></span></div>");
        }

        $('#manageModal .manage-trash-delete').each(function() {
            $(this).click(function() {
                $('#deleteModal').modal('toggle');
                var toDelete = $(this).siblings('.file-item').text();
                $('#deleteModal .modal-title').text("Are you sure you want to delete '" + toDelete + "'?");
                itemToDelete = toDelete;
            });
        });
    }

    function highlightSelected(btn) {
        clearSelected();
        $(btn).children('.file-item').addClass('selected');
        var selected = $(btn).text();
        loadFileSelection = selected;
    }

    function clearSelected() {
        $('#loadModal .modal-body .file-item').each(function() {
            $(this).removeClass('selected');
        });
        loadFileSelection = '';
    }

    function loadAlignment(name) {
        var loadedAlign = localStorage.getItem(name);
        spacerOutput = JSON.parse(loadedAlign);
        startupPageBuilder();
        $('.modal-backdrop').remove();
    }

    function saveAlignment(name) {
        try {
            localStorage.setItem(name, JSON.stringify(spacerOutput));
        } catch (err){
            alert("This browser's local storage is full. You can choose File Actions > Export, to save this data to disk.")
        }
    }

    function exportAlignment(name) {
        // using FileSaver.min.js //
        var blob = new Blob([JSON.stringify(spacerOutput)], {type: "text/plain;charset=utf-8"});
        saveAs(blob, name+".json");
        $('#saveTitle').text(name);
    }

    function createFunctionalElements() {
        createSortable();
        attachOnClickEvents();
    }

    function addMainReverseBtnAction() {
        $('.main-btn.main-rev-btn').click(function() {
            showHUD();
            reverseSpacers();
            hideHUD();
        });
    }

    function addMainRCBtnAction() {
        $('.main-btn.main-rc-btn').click(function() {
            showHUD();
            reverseComplemented = true;
            refreshPageItems();
            createFunctionalElements();
            hideHUD();
        });
    }

    function addLengthSortAction() {
        $('.main-btn.main-length-btn').click(function() {
            // sort by length ASC //
            showHUD();
            
            spacerOutput.sort(function(a, b) {
                if (display == 'spacers') {
                    return a.spacers.length - b.spacers.length;
                } else if (display == 'repeats') {
                    return a.repeats.length - b.repeats.length;
                } else {
                    return a.merged.length - b.merged.length;
                }
                
            });
            refreshPageItems();
            createFunctionalElements();
            hideHUD();
        });

        $('.main-btn.main-length-alt-btn').click(function() {
            // sort by length DESC //
            showHUD();
            spacerOutput.sort(function(a, b) {
                if (display == 'spacers') {
                    return b.spacers.length - a.spacers.length;
                } else if (display == 'repeats') {
                    return b.repeats.length - a.repeats.length;
                } else {
                    return b.merged.length - a.merged.length;
                }
            });
            refreshPageItems();
            createFunctionalElements();
            hideHUD();
        });
    }

    function addRepeatSpacerToggleAction() {
        $('.main-btn.spacer-toggle-btn').click(function() {
            showHUD();
            display = 'spacers';
            refreshPageItems();
            createFunctionalElements();
            hideHUD();
        });
        $('.main-btn.repeat-toggle-btn').click(function() {
            showHUD();
            display = 'repeats';
            refreshPageItems();
            createFunctionalElements();
            hideHUD();
        });
        $('.main-btn.both-toggle-btn').click(function() {
            showHUD();
            display = 'merged';
            refreshPageItems();
            createFunctionalElements();
            hideHUD();
        });
        $('.main-btn.align-btn').click(function() {
            if (spacerOutput.length > 1) {
                showHUD();
                msa.spacerOutput = spacerOutput;
                msa.initiateAlignment();
                spacerOutput = msa.spacerOutput;
                refreshPageItems();
                createFunctionalElements();
                hideHUD();
            }
        });
    }

    function attachOnClickEvents() {
        $('.add-btn').each(function() {
            $(this).click( function() { 
                addEmptySpacer($(this)); 
            });
        });

        $('.delete-btn').each(function() {
            $(this).click( function() { 
                removeEmptySpacer($(this)); 
            });
        });

        $('.reverse-btn').each(function() {
            $(this).click( function() { 
                reverseRow($(this)); 
            });
        });

        $('.rc-btn').each(function() {
            $(this).click( function() { 
                rcRow($(this)); 
            });
        });
        $('.delete-row-btn').each(function() {
            $(this).click( function() { 
                deleteItemRow($(this)); 
            });
        });

        // enable tooltips at the spacer-container level //
        $('[data-toggle=item-tooltip]').tooltip();

        modifyEditableContent();
    }

    function modifyEditableContent() {
        $('div[contenteditable=true]').keydown(function(e) {
            if (e.keyCode == 13) {
                // prevent the default behaviour of return key pressed //
                e.preventDefault();
                e.target.blur();

                var newTitle = e.target.innerHTML;
                var titleList = $('[contenteditable]');
                var idx;
                $.each(titleList, function (key, val) {
                    if (val.innerHTML == newTitle) {
                        idx = key;
                        return false;
                    }
                });

                // to fix &nbsp; being added to string //
                var trimmedString = newTitle.replace(/&nbsp;/g, ''); 

                spacerOutput[idx].title = trimmedString;

                $(e.target).tooltip('hide')
                                       .attr('data-original-title', trimmedString)
                                       .tooltip('fixTitle');

                return false;
            }
        });
    }

    function deleteItemRow(btn) {

        var targetContainer = ($(btn).siblings(".spacer-item-list"));
        var index = $(".spacer-item-list").index(targetContainer);
        var title = spacerOutput[index].title;
        
        $('#confirmDeleteTitle').text(title);
        $('#confirmDeleteBtn').data('index', index);
        $('#confirmDeleteModal').modal('show');
    }

    function reverseRow(btn) {
        var targetSpacerContainer = ($(btn).siblings(".spacer-item-list"));

        var container = targetSpacerContainer[0];
        var spacers = $(container).find("span.spacer-item");
        var revSpacers = [];
        $(spacers).each(function(key, val) {
            revSpacers.push(val);
        });
        revSpacers = revSpacers.reverse();
    
        $(spacers).remove();
        $(container).append(revSpacers);

        var revBtnList = $('.action-btn.reverse-btn');
        var index = $(revBtnList).index($(btn));

        spacerOutput[index].spacers = spacerOutput[index].spacers.reverse();
        spacerOutput[index].repeats = spacerOutput[index].repeats.reverse();
        spacerOutput[index].merged = spacerOutput[index].merged.reverse();
    }

    function rcRow(btn) {
        var rcBtnList = $('.action-btn.rc-btn');
        var index = $(rcBtnList).index($(btn));
        var data = spacerOutput[index];
        var spacerContainer = buildSpacerContainer(data, true);
        $('.spacer-container').eq(index).replaceWith(spacerContainer);
        addFunctionAtIndex(index);
    }

    function addFunctionAtIndex(index) {
        var container = $('.spacer-container').eq(index);
        $(container).find('.add-btn').click(function(){
            addEmptySpacer($(this));
        });

        $(container).find('.delete-btn').click(function(){
            removeEmptySpacer($(this));
        });

        $(container).find('.reverse-btn').click(function(){
            reverseRow($(this));
        });

         $(container).find('.rc-btn').click(function(){
            rcRow($(this));
        });

         $('.delete-row-btn').each(function() {
            $(this).click( function() { 
                deleteItemRow($(this)); 
            });
        });

         clearSortable();
         createItemSort();
    }

    function addEmptySpacer(btn) {
        var targetContainer = ($(btn).siblings(".spacer-item-list"));
        var emptySpacer = $("<span class='spacer-item empty-spacer'><span class='symbol glyphicon glyphicon-remove'></span></span>");
        $(targetContainer).append(emptySpacer);

        var index = $(".spacer-item-list").index(targetContainer);
        var itemList = spacerOutput[index][display];
        itemList.push(emptyXItem);
    }

    function removeEmptySpacer(btn) {
        var targetContainer = ($(btn).siblings(".spacer-item-list"));
        var totalItemList = $(targetContainer).find(".spacer-item");
        var removeableEmptyDivList = $(targetContainer).find(".empty-spacer");
        if (removeableEmptyDivList.length > 0) {
            emptyDiv = removeableEmptyDivList[removeableEmptyDivList.length - 1];
            $(emptyDiv).remove();
            
            var index = $(".spacer-item-list").index(targetContainer);
            var itemList = spacerOutput[index][display];
            var emptyItemIndex = totalItemList.index(emptyDiv)
            itemList.splice(emptyItemIndex, 1);
        }


    }

    function reverseSpacers() {
        var spacerContainers = $(".spacer-item-list");
        var i = 0;
        for (i; i < spacerContainers.length; i ++) {
            var container = spacerContainers[i];
            var spacers = $(container).find("span.spacer-item");
            var revSpacers = [];
            $(spacers).each(function(key, val) {
                revSpacers.push(val);
            });
            revSpacers = revSpacers.reverse();
    
            $(spacers).remove();
            $(container).append(revSpacers);
        }

        $.each(spacerOutput, function (key, val) {
            val.spacers = val.spacers.reverse();
            val.repeats = val.repeats.reverse();
            val.merged = val.merged.reverse();
        });
    }

    function clearSortable() {
        for (sortItem in sortArray) {
            sortArray[sortItem].destroy();
        }
        sortArray = [];
    }

    function createItemSort() {
        [].forEach.call(id('mainSpacerContainer').getElementsByClassName('spacer-item-list'), function (el) {
            var sortItem = Sortable.create(el, {
                animation: 150, 
                draggable: ".spacer-item", 
                ghostClass: "ghost-spacer-item",

                onEnd: function (/**Event*/evt) {
                    var itemIndex = $(".spacer-item-list").index(evt.from);
                    modifySpacerItemOrder(itemIndex, evt.oldIndex, evt.newIndex);
                }
            });
            sortArray.push(sortItem);
        });
    }

    function createSortable() {
        var mainContainer = $("#mainSpacerContainer");
        Sortable.create(mainContainer.get(0), {
            animation: 150, 
            draggable: ".spacer-container",
            ghostClass: "ghost-spacer-container",
            handle: ".title-icon", 

            onEnd: function (/**Event*/evt) {
                modifySpacerRowOrder(evt.oldIndex, evt.newIndex);
            }
        });
    
        createItemSort();
    }

    function modifySpacerRowOrder (fromIndex, toIndex) {
        var item = spacerOutput[fromIndex];
        spacerOutput.splice(fromIndex, 1);
        spacerOutput.splice(toIndex, 0, item);
    }

    function modifySpacerItemOrder (itemIndex, fromIndex, toIndex) {
        var itemArray = spacerOutput[itemIndex][display];
        var item = itemArray[fromIndex];
        itemArray.splice(fromIndex, 1);
        itemArray.splice(toIndex, 0, item);
    }

    function loadFile () {
        var input, file, fr;
    
        if (typeof window.FileReader !== 'function') {
            alert("The file API isn't supported on this browser yet.");
            return;
        }
    
        input = document.getElementById('fileinput');
        if (!input) {
            alert("Could not find the fileinput element.");
        }
        else if (!input.files) {
            alert("This browser does not support the `files` property of file inputs.");
        }
        else if (!input.files[0]) {
            alert("Please select a file before clicking 'Import'");
        }
        else {
            file = input.files[0];
            importedFileName = file.name.slice(0, -5);
            fr = new FileReader();
            fr.onload = receivedText;
            fr.readAsText(file);

            $('#importModal').modal('toggle');
            $('#jsonFile')[0].reset();
        }
    }

    function receivedText(e) {
        var data = e.target.result;
        var newSpacerOutput = JSON.parse(data);
        spacerOutput = newSpacerOutput;
        $('.modal-backdrop').remove();
        $('#saveTitle').text(importedFileName);
        importedFileName = '';
        startupPageBuilder();
    }

    function showHUD() {
        $('#HUD').addClass('is-active');
    }

    function hideHUD() {
        $('#HUD').removeClass('is-active');
    }

    $(document).ready(function () {
    	loadSpacers();
	});
});
