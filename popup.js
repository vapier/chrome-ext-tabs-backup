// Copyright (c) 2012 The Chromium Authors. All rights reserved.
// Use of this source code is governed by a BSD-style license that can be
// found in the LICENSE file.

// Add event listeners once the DOM has fully loaded by listening for the
// `DOMContentLoaded` event on the document, and adding your listeners to
// specific elements when it triggers.
document.addEventListener('DOMContentLoaded', function () {
	//document.querySelector('button').addEventListener('click', testf);
	document.getElementById("menuItem_backupNow").addEventListener('click', menu_backupNow);
	//document.getElementById("menuItem_restoreNow").addEventListener('click', menu_restoreNow);
	document.getElementById("menuItem_options").addEventListener('click', menu_ShowOptions);
	document.getElementById("menuItem_showOlderBackups").addEventListener('click', menu_ShowOlderBackups);
	document.getElementById("menuItem_showAdvancedView").addEventListener('click', menu_ShowAdvancedView);


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

	elem.id = divId;
	elem.className = 'backupItem';
	elem.innerHTML = '<div class="backupItemWrapper">' +
					'<div class="backupItemContent">' +
					 '<div class="backupItemTitle">' + backupName + "</div>" +
					 '<div class="backupItemDetails">' +
						'Nr. Windows:<span class="backupItemDetailsNr">' + backupObj.windows.length + '</span><br />' +
						'Nr. Tabs:<span class="backupItemDetailsNr">' + backupObj.totNumTabs + '</span>' +
					 '</div>' +

					 '<div class="backupItemToolbar">' +
						'<a id="' + restoreButtonId + '"><img src="icon_48.png" title="Open Windows & Tabs" style="border: 0; width: 24px; height: 24px" /></a>' +
						'<a id="' + deleteButtonId + '"><img src="trash_48.png" title="Delete Backup" style="border: 0; width: 22px; height: 22px" /></a>' +
					 '</div>' +

					 '<div class="backupItemFooter">' +
						(backupObj.isAutomatic ? '<span class="backupItemFooterAutoBackup">AUTO BACKUP</span>' :
												 '<span class="backupItemFooterManualBackup">MANUAL BACKUP</span>') +
					 '</div>' +
					 '</div>' +
					 '</div>';

	//elem.innerHTML += "# Windows: " +
	//backupsDiv.appendChild(elem);

	var restoreFuncHandler = (function(backupName) {
		return function(event) {
			bootbox.confirm("Open Windows & Tabs of backup '" + backupName + "'?", function(confirmed) {
				if (confirmed) {
					chrome.runtime.getBackgroundPage((bg) => bg.restoreNow(backupName));
				}
			});

			/*if (!confirm("Open Windows & Tabs of backup '" + backupName + "'?")) {
				return;
			}*/


		};
	})(backupName);

	var deleteFuncHandler = function() {


			bootbox.confirm("Delete backup '" + backupName + "'?", function(confirmed) {
				if (confirmed) {
					chrome.runtime.getBackgroundPage((bg) => {
						bg.deleteBackup(backupName, () => updateStorageInfo());
					});

					//if (elem.parentNode) {
					//  elem.parentNode.removeChild(elem);
					//
					removeBackupItemDiv (backupName);
				}
			});


		};

	if (insertAtBeginning && backupsDiv.childNodes.length > 0) {
		// some items already exist
		var firstNode = backupsDiv.childNodes[0];
		backupsDiv.insertBefore(elem, firstNode);
	} else {
		backupsDiv.appendChild(elem);
	}


	document.getElementById(restoreButtonId).addEventListener('click', restoreFuncHandler);
	document.getElementById(deleteButtonId).addEventListener('click', deleteFuncHandler);

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

	//var backupItemDiv = document.getElementById (divId);
	//if (backupItemDiv.parentNode) {
	 // backupItemDiv.parentNode.removeChild(backupItemDiv);
	//}
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

	updateStorageInfo();

}

function updateStorageInfo() {
	chrome.storage.local.getBytesInUse(null, function(bytesInUse) {
		var storageText;
		if (bytesInUse < 1024) {
			storageText = bytesInUse.toFixed(2) + " bytes";
		} else if (bytesInUse < 1024 * 1024) {
			storageText = (bytesInUse / 1024).toFixed(2)  + " Kb";
		} else {
			storageText = (bytesInUse / (1024 * 1024)).toFixed(2) + " Mb";
		}

		var storageSpan = document.getElementById("storageSpan");
		storageSpan.innerHTML = storageText;
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
			updateStorageInfo();

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
