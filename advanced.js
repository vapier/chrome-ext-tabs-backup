// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
	//document.querySelector('button').addEventListener('click', testf);
	//document.getElementById("menuItem_restoreNow").addEventListener('click', menu_restoreNow);
	document.getElementById("menuItem_showOlderBackups").addEventListener('click', menu_ShowOlderBackups);
	document.getElementById("restoreSelectedDiv").addEventListener('click', menu_RestoreSelected);
	document.getElementById("restoreSelectedClearSelectionLink").addEventListener('click', menu_ClearSelection);

	document.getElementById("restoreSelectedRadioSingleWindowSpanLabel").addEventListener('click', function() {
		$('#restoreSelectedRadioSingleWindow').prop('checked', true);
	});

	document.getElementById("restoreSelectedRadioMultipleWindowsSpanLabel").addEventListener('click', function() {
		$('#restoreSelectedRadioMultipleWindows').prop('checked', true);
	});


	initBackupsList (false /*showAll*/);

	/*$(function() {
        $( "#dialog-confirm" ).dialog({
            resizable: false,
            height:140,
            modal: true,
            buttons: {
                "Delete all items": function() {
                    $( this ).dialog( "close" );
                },
                Cancel: function() {
                    $( this ).dialog( "close" );
                }
            }
        });
    });*/


});

function menu_ShowOptions () {
	chrome.tabs.create({url:chrome.extension.getURL("options.html")});
}

function menu_ShowAdvancedView() {
	chrome.tabs.create({url:chrome.extension.getURL("advanced.html")});
}

function menu_ClearSelection () {
	var selectedCheckboxes = $("input:checked");
	for (var i = 0; i < selectedCheckboxes.length; i++) {
		var checkbox = selectedCheckboxes[i];
		if (checkbox.type == 'checkbox') {
			checkbox.checked = false;
		}
	}

	updateRestoreSelectedDiv();
}

function menu_RestoreSelected_Real() {
	var selectedCheckboxes = $("input:checked");

	var restoreToMultipleWindows = $('#restoreSelectedRadioMultipleWindows').is(':checked');

	var allUrls = [];

	var windows = {};
	var windowsKeys = [];

	for (var i = 0; i < selectedCheckboxes.length; i++) {
		var checkbox = selectedCheckboxes[i];
		//if (!checkbox.hasAttribute('tbrBackupName') || !checkbox.hasAttribute('tbrWindowIndex')) {
		if (checkbox.tbrBackupName === undefined ||
				checkbox.tbrWindowIndex === undefined ||
				checkbox.tbrTabUrl === undefined) {
			continue;
		}
		//checkbox.tbrBackupName
		//checkbox.tbrWindowIndex
		console.log("Restoring " + checkbox.tbrBackupName + " --> " + checkbox.tbrWindowIndex);

		var tabUrl = checkbox.tbrTabUrl;

		var windowIdx = checkbox.tbrWindowIndex;
		var bkpName = checkbox.tbrBackupName;
		var key = bkpName + "_" + windowIdx;

		if (!(key in windows)) {
			windows[key] = [];
			windowsKeys.push(key);
		}

		windows[key].push(tabUrl);

		allUrls.push(checkbox.tbrTabUrl);
	}

	if (restoreToMultipleWindows) {
		for (var i = 0; i < windowsKeys.length; i++) {
			var key = windowsKeys[i];
			var urls = windows[key];

			var windowProperties = {
				url: urls
			};

			// Create a new Window
			chrome.windows.create(windowProperties, function(createdWindow) {

			});
		}
	} else {
		var windowProperties = {
			url: allUrls
		};

		// Create a new Window
		chrome.windows.create(windowProperties, function(createdWindow) {

		});
	}
}

function menu_RestoreSelected() {
	bootbox.confirm("Restore selection?", function(confirmed) {
		if (confirmed) {
			menu_RestoreSelected_Real();
		}
	});



}

function updateRestoreSelectedDiv() {
	var selectedCheckboxes = $("input:checked");

	var numSelectedTabs = 0;
	var numSelectedWindows = 0;
	for (var i = 0; i < selectedCheckboxes.length; i++) {
		var checkbox = selectedCheckboxes[i];

		if (checkbox.tbrIsWindow !== undefined) {
			if (checkbox.tbrIsWindow) {
				numSelectedWindows++;
			}
		}

		if (checkbox.tbrBackupName === undefined ||
				checkbox.tbrWindowIndex === undefined ||
				checkbox.tbrTabUrl === undefined) {
			continue;
		}



		// find the first selected tab checkbox
		numSelectedTabs++;
	}

	$('#restoreSelectedInfoNumTabs').html(numSelectedTabs);

	var restoreDiv = $('#floatingRightDiv');

	if (numSelectedTabs > 0) {


		if (!restoreDiv.is(':visible')) {
			restoreDiv.fadeIn(600);
		}



	} else {
		if (restoreDiv.is(':visible')) {
			restoreDiv.fadeOut(600);
		}
	}
}

function menu_ShowOlderBackups () {
	// save current scrollbar position
	//var scrollPosition = $(document).scrollTop();

	// Re-initialize backups list
	//initBackupsList(true /*showAll*/, function () {
		// Update the scrollbar position to the saved one
	//	$(document).scrollTop(scrollPosition);
	//});



	var oldestVisibleBackupItem = $(".backupItem:last");
	var oldestVisibleBackupItemId = oldestVisibleBackupItem.attr('id');
	// the id is in the form 'div_' + backupName
	var oldestVisibleBackupName = oldestVisibleBackupItemId.substring(4);


	var backupsDiv = document.getElementById ('backupsDiv');

	chrome.storage.local.get(null, function(items) {
		var backupsList = [];
		if(items.backups_list) {
			backupsList = items.backups_list;
		}

		var shouldInsert = false;

		for (var i = backupsList.length-1; i >= 0; i--) {
			var backupName = backupsList[i];
			var backupObj = items[backupName];

			if (!backupObj) {
				continue;
			}

			if (backupObj.isAutomatic === undefined) {
				backupObj.isAutomatic = true;
			}

			if (oldestVisibleBackupName == backupName) {
				// found last visible item, start inserting
				shouldInsert = true;
			} else {

				if (shouldInsert) {
					insertBackupItem(backupName, backupObj, false /*insertAtBeginning*/, false /*doAnimation*/);
				}
			}
		}

		// Hide the "show all" link
		$("#showOlderBackupsDiv").hide();
	});

}

function insertBackupItem (backupName, backupObj, insertAtBeginning, doAnimation) {
	var backupsDiv = document.getElementById ('backupsDiv');

	var restoreButtonId = 'restoreSelectedBackup_' + backupName;
	var deleteButtonId = 'deleteSelectedBackup_' + backupName;
	var divId = 'div_' + backupName;

	var elem = document.createElement("div");
	if (doAnimation) {
		// start with hidden element (only if we are doing the animation later)
		elem.style.cssText = 'display: none';
	}

	var backupTitleDivId = 'backup_title_' + backupName;
	var backupItemClickId = 'backup_click_' + backupName;

	elem.id = divId;
	elem.className = 'backupItem';
	elem.innerHTML = '<div class="backupItemWrapper" id="' + backupTitleDivId + '">' +
					'<div class="backupItemContent" id="' + backupItemClickId + '">' +
					 '<div class="backupItemTitle">' + backupName + "</div>" +
					 '<div class="backupItemDetails">' +
						'Nr. Windows:<span class="backupItemDetailsNr">' + backupObj.windows.length + '</span><br />' +
						'Nr. Tabs:<span class="backupItemDetailsNr">' + backupObj.totNumTabs + '</span>' +
					 '</div>' +

					// '<div class="backupItemToolbar">' +
					//	'<a id="' + restoreButtonId + '"><img src="icon_48.png" title="Open Windows & Tabs" style="border: 0; width: 24px; height: 24px" /></a>' +
					//	'<a id="' + deleteButtonId + '"><img src="trash_48.png" title="Delete Backup" style="border: 0; width: 22px; height: 22px" /></a>' +
					// '</div>' +

					 '<div class="backupItemFooter">' +
						(backupObj.isAutomatic ? '<span class="backupItemFooterAutoBackup">AUTO BACKUP</span>' :
												 '<span class="backupItemFooterManualBackup">MANUAL BACKUP</span>') +
					 '</div>' +
					 '</div>' +
					 '</div>';

	//elem.innerHTML += "# Windows: " +
	//backupsDiv.appendChild(elem);

	//var restoreFuncHandler = (function(backupName) {
	//	return function(event) {
	//		bootbox.confirm("Open Windows & Tabs of backup '" + backupName + "'?", function(confirmed) {
	//			if (confirmed) {
	//				chrome.extension.getBackgroundPage().restoreNow(backupName);
	//			}
	//		});

			/*if (!confirm("Open Windows & Tabs of backup '" + backupName + "'?")) {
				return;
			}*/


	//	};
	//})(backupName);

	//var deleteFuncHandler = (function(backupName, elem) {
	//	return function(event) {
			/*if (!confirm("Delete backup '" + backupName + "'?")) {
				return;
			}*/

	//		bootbox.confirm("Delete backup '" + backupName + "'?", function(confirmed) {
	//			if (confirmed) {
	//				chrome.extension.getBackgroundPage().deleteBackup(backupName, function() {

	//				});

					//if (elem.parentNode) {
					//  elem.parentNode.removeChild(elem);
					//
	//				removeBackupItemDiv (backupName);
	//			}
	//		});


	//	};
	//})(backupName, elem);

	if (insertAtBeginning && backupsDiv.childNodes.length > 0) {
		// some items already exist
		var firstNode = backupsDiv.childNodes[0];
		backupsDiv.insertBefore(elem, firstNode);
	} else {
		backupsDiv.appendChild(elem);
	}

	$(jq(backupItemClickId)).click(function() {
		var restoreDivId = "restoreDiv_" + backupName;
		var restoreDiv = $(jq(restoreDivId));
		if (restoreDiv.length == 0) {
			// element never created, create it
			showAdvancedRestoreFor(backupName);
		} else {
			if (restoreDiv.is(':visible')) {
				//restoreDiv.hide();
				restoreDiv.slideUp();
				//$('#restoreSelectedDiv').slideUp();
			} else {
				restoreDiv.slideDown();
				//$('#restoreSelectedDiv').slideDown();
			}
			//restoreDiv.remove();

		}


	});

	//document.getElementById(restoreButtonId).addEventListener('click', restoreFuncHandler);
	//document.getElementById(deleteButtonId).addEventListener('click', deleteFuncHandler);

	if (doAnimation) {
		var divIdJQ = jq(divId);
		$(divIdJQ).slideDown(1000);
	}
	/*obj.animate({ height: 1, opacity: 1 }, {
            duration: 1000,
            complete: function(){obj.css('display', 'block');}
        });*/

	//obj.fadeIn(2000);
	//obj.slideDown();

	//$(divId).display = 'none';
	//$(divId).slideUp();
	//$(divId).fadeOut(1000);
	/*var bkp = $("backupsDiv");
	bkp.remove();
	var div = $(divId);
	var a = 0;*/
	/*setTimeout( function() {
		var obj = $("#" + divId);
		obj.fadeIn();

	}, 1000 );*/
}

function jq(myid) {
   return '#' + myid.replace(/(:|\.| )/g,'\\$1');
}

function addClickListenerForWindowTitle (windowTitleDiv, tabsDivId) {
	windowTitleDiv.addEventListener('click', function(e) {
		var clickedElem = e.target;
		if (clickedElem) {
			if (clickedElem.className.indexOf("parentIgnoreClick") != -1) {
				// ignore click
				return;
			}
		}
		$(jq(tabsDivId)).slideToggle();
	});
}

function addClickListenerForWindowCheckbox(checkboxWindowElem, windowTabs, backupName, i) {
	checkboxWindowElem.addEventListener('click', function(e) {
		var isChecked = checkboxWindowElem.checked;

		for (var j = 0; j < windowTabs.length; j++) {

			var checkboxId = 'checkbox_tab_' + backupName + '_' + i + '_' + j;
			$(jq(checkboxId)).prop('checked', isChecked);
			//var el = document.getElementById(checkboxId);
			//document.getElementById(checkboxId).change()
			//document.getElementById(checkboxId).checked = isChecked;
		}

		updateRestoreSelectedDiv();
	});
}



function showAdvancedRestoreFor (backupName) {
	chrome.storage.local.get(backupName, function(items) {
		if(!items[backupName]) {
			alert("An error occured. Please reload the page.");
			return;
		}

		var backupTitleDivId = 'backup_title_' + backupName;

		var elem = document.createElement("div");
		var divId = "restoreDiv_" + backupName;

		elem.id = divId;
		elem.className = 'restoreDiv';
		elem.innerHTML = '';

		var expandCollapseDiv = document.createElement('div');
		expandCollapseDiv.className = "restoreDivCollapseExpand";
		//expandCollapseDiv.innerHTML = 'Collapse all';
		var collapseAElem = document.createElement('a');
		collapseAElem.innerHTML = "Collapse all";
		var expandAElem = document.createElement('a');
		expandAElem.innerHTML = "Expand all";


		expandCollapseDiv.appendChild(collapseAElem);
		expandCollapseDiv.appendChild(document.createTextNode(' / '));
		expandCollapseDiv.appendChild(expandAElem);

		elem.appendChild(expandCollapseDiv);

		var allTabsDivsIds = [];

		var fullBackup = items[backupName];

		for(var i = 0; i < fullBackup.windows.length; i++) {
			var window = fullBackup.windows[i];
			var windowTabs = window.tabs;

			var windowTitleDiv = document.createElement('div');

			//windowTitleDiv.innerHTML = "<span>Window " + (i+1) + '</span>' +
			//							'<span style="float: right; font-size: 12px;">Nr. Tabs: ' + windowTabs.length + '</span>';

			windowTitleDiv.className = 'windowTitleDiv';

			var tabsDiv = document.createElement('div');
			tabsDiv.id = 'tabsDiv_' + backupName + '_' + i;
			tabsDiv.className = 'tabsDiv';
			tabsDiv.hidden = true;

			allTabsDivsIds.push(tabsDiv.id);

			addClickListenerForWindowTitle(windowTitleDiv, tabsDiv.id);

			var checkboxWindowId = 'checkbox_window_' + backupName + '_' + i;

			var checkboxWindowElem = document.createElement('input');
			checkboxWindowElem.type = "checkbox";
			checkboxWindowElem.id = checkboxWindowId;
			checkboxWindowElem.className = "regular-checkbox parentIgnoreClick";

			checkboxWindowElem.tbrIsWindow = true;

			var checkboxWindowLabelElem = document.createElement('label')
			checkboxWindowLabelElem.className = "parentIgnoreClick";
			checkboxWindowLabelElem.htmlFor = checkboxWindowId;
			checkboxWindowLabelElem.style.cssText = 'margin-bottom: -4px; margin-right: 8px;';

			addClickListenerForWindowCheckbox(checkboxWindowElem, windowTabs, backupName, i);


			var windowTitleSpan = document.createElement('span');
			windowTitleSpan.innerHTML =
				`<span style="font-weight: bold">Window ${i + 1} (${window.state}) ${window.width}×${window.height} @ ${window.top}×${window.left}</span>` +
				`<span style="float: right; font-size: 11px;">Tabs: ${windowTabs.length}</span>`;
			//windowTitleSpan.innerHTML = '<span>Window ' + (i+1) + '</span>' +
			//							'<br /><span style="font-size: 10px;">Nr. Tabs: ' + windowTabs.length + '</span>';

			windowTitleDiv.appendChild(checkboxWindowElem);
			windowTitleDiv.appendChild(checkboxWindowLabelElem);
			windowTitleDiv.appendChild(windowTitleSpan);




			for (var j = 0; j < windowTabs.length; j++) {
				var tab = windowTabs[j];
				var tabTitle = tab.title;
				var tabUrl = tab.url;

				var checkboxId = 'checkbox_tab_' + backupName + '_' + i + '_' + j;

				var tabElem = document.createElement('div');
				tabElem.style.cssText = "position: relative";

				var checkboxTabElem = document.createElement('input');
				checkboxTabElem.type = "checkbox";
				//checkboxTabElem.name = "name";
				//checkboxTabElem.value = "value";
				checkboxTabElem.id = checkboxId;
				checkboxTabElem.className = "regular-checkbox";

				// custom attributes
				checkboxTabElem.tbrBackupName = backupName;
				checkboxTabElem.tbrWindowIndex = i;
				checkboxTabElem.tbrTabUrl = tabUrl;

				var checkboxTabLabelElem = document.createElement('label')
				checkboxTabLabelElem.htmlFor = checkboxId;

				var tabSpanElem = document.createElement('span');
				tabSpanElem.className = "restoreTabSpan";
				var title = tabTitle === '' ? tabUrl : tabTitle;
				tabSpanElem.innerHTML =
					(tab.pinned ? '📌 ' : '') +
					`<a href="${tabUrl}" target="_blank">${title}</a>`;

				tabElem.appendChild(checkboxTabElem);
				tabElem.appendChild(checkboxTabLabelElem);
				tabElem.appendChild(tabSpanElem);

				tabsDiv.appendChild(tabElem);

				checkboxTabElem.addEventListener('change', function (e) {
					console.log('cb changed - ' + e.target.id + ' : ' + e.target.checked);

					updateRestoreSelectedDiv();
				});
				//addClickListenerFor(checkboxId
				//checkboxTabElem.addEventListener('click', function() {
				//});

				//var checkboxId = 'checkbox_tab_' + backupName + '_' + i + '_' + j;
				//var checkboxHtml = '<input type="checkbox" id="' + checkboxId + '" class="regular-checkbox" /><label for="' + checkboxId + '" class="labelCheckbox"></label>'
				//tabsDiv.innerHTML += '<div style="position: relative">' + checkboxHtml + '<span class="restoreTabSpan"><a href="' + tabUrl + '" target="_blank">' + tabTitle + '</a></span>' + '<br />' +
				//					'</div>';
			}


			elem.appendChild(windowTitleDiv);
			elem.appendChild(tabsDiv);

		}


		collapseAElem.addEventListener('click', function () {
			for (var i = 0; i < allTabsDivsIds.length; i++) {
				$(jq(allTabsDivsIds[i])).slideUp();
			}
		});

		expandAElem.addEventListener('click', function () {
			for (var i = 0; i < allTabsDivsIds.length; i++) {
				$(jq(allTabsDivsIds[i])).slideDown();
			}
		});

		var backupTitleDiv = document.getElementById(backupTitleDivId);
		backupTitleDiv.appendChild(elem);
		$(jq(divId)).hide();
		$(jq(divId)).slideDown();
		//$('#restoreSelectedDiv').slideDown();

		//$('#restoreSelectedDiv').fadeIn(1000);

	});
}

function removeBackupItemDiv (backupName) {
	var divId = 'div_' + backupName;
	var divIdClean = jq(divId);
	var obj = $(divIdClean);
	//obj.fadeOut();
	//obj.slideUp();
	obj.animate({ height: 0, opacity: 0 }, {
            duration: 1000,
            complete: function(){obj.remove();}
        });

	var backupItemDiv = document.getElementById (divId);
	if (backupItemDiv.parentNode) {
	 // backupItemDiv.parentNode.removeChild(backupItemDiv);
	}
}

function initBackupsList(showAll, callback) {
	var backupsDiv = document.getElementById ('backupsDiv');
	//var node = backupsDiv.childNodes[0];
	backupsDiv.innerHTML = '';
	//backupsDiv.style = 'display: none';
	//$("#backupsDiv").html("");
	/*while (backupsDiv.hasChildNodes()) {
		backupsDiv.removeChild(backupsDiv.lastChild);
	}*/

	$("#showOlderBackupsDiv").hide();

	if (!showAll) {
		$("#backupsDiv").hide();
	}

	chrome.storage.local.get(null, function(items) {
		var backupsList = [];
		if(items.backups_list) {
			backupsList = items.backups_list;
		}

		var numInsertedItems = 0;
		for (var i = backupsList.length-1; i >= 0; i--) {
		//for (var i = 0; i < backupsList.length; i++) {
			var backupName = backupsList[i];
			var backupObj = items[backupName];

			if (!backupObj) {
				continue;
			}

			if (backupObj.isAutomatic === undefined) {
				backupObj.isAutomatic = true;
			}

			if (!showAll) {
				if (numInsertedItems >= 10) {
					$("#showOlderBackupsDiv").show();
					break;
				}
			}

			insertBackupItem(backupName, backupObj, false /*insertAtBeginning*/, false /*doAnimation*/);

			numInsertedItems++;
		}

		if (!showAll) {
			$("#backupsDiv").slideDown();
		}

		if (callback) {
			callback();
		}

	});


}

var lastTimeBackupNowClicked = 0;

function menu_backupNow() {
	// Ignore clicks if less than 1 second has passed since last click (avoids rapid useless backups)
	if (lastTimeBackupNowClicked != 0) {
		var diffTime = Math.abs(new Date().getTime() - lastTimeBackupNowClicked);
		if (diffTime < 1000) {
			return;
		}
	}

	lastTimeBackupNowClicked = new Date().getTime();

	chrome.runtime.getBackgroundPage((bg) => bg.backupNowManual(function(success, backupName, backupObj) {
		if (success) {
			//updateBackupsList();
			insertBackupItem (backupName, backupObj, true /*insertAtBeginning*/, true /*doAnimation*/);


			//bootbox.alert("Backup successfully created!");
		} else {
			alert('An error occured while creating the backup..');
		}
	}));

}

function menu_restoreNow() {
	chrome.runtime.getBackgroundPage((bg) => bg.restoreNow('full_backup'));
}

//document.onload(function () {
//var a = document.getElementById("myid");
//a.innerHTML = "ciaociao";
//});

/*
var storageLocal = chrome.storage.local;
storageLocal.getBytesInUse(null, function(bytesInUse) {
	var elem = document.createElement("div");
	elem.innerHTML = "<b>BYTES IN USE: " + bytesInUse + "</b><br />";
	document.body.appendChild(elem);
});*/
