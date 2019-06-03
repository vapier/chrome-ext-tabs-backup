
// Set default values if needed
if (!localStorage.prefsMaxBackupItems) {
	localStorage.prefsMaxBackupItems = "30";
}

if (!localStorage.prefsBackupTimer) {
	localStorage.prefsBackupTimer = "5";
}

if (!localStorage.lastTimerIntervalId) {
	localStorage.lastTimerIntervalId = 0;
}

if (!localStorage.lastTabsEdit) {
	localStorage.lastTabsEdit = 0;
}

if (!localStorage.lastBackupTime) {
	localStorage.lastBackupTime = -1;

	// Create a backup now
	var d = new Date();
	var formattedDate = date_format (d);

	backupNow(true, formattedDate, function(success, backupName, backupObj) {
		// backup completed
	});

	localStorage.lastBackupTime = localStorage.lastTabsEdit;
}



// Works only for Event Pages
/*
chrome.runtime.onInstalled.addListener(function() {
	console.log("Extension installed/updates");

	if (localStorage.lastBackupTime != localStorage.lastTabsEdit) {
		// Create a backup now
		var d = new Date();
		var formattedDate = date_format (d);

		backupNow(true, formattedDate, function(success, backupName, backupObj) {
			// backup completed
		});

		localStorage.lastBackupTime = localStorage.lastTabsEdit;
	}
});*/

chrome.tabs.onRemoved.addListener(function(tabId, removeInfo) {
	//console.log('tabs.onRemoved');

	tabsEdited(true);
});

chrome.tabs.onUpdated.addListener(function(tabId, changeInfo, tab) {
	//console.log('tabs.onUpdated');

	tabsEdited(true);
});

chrome.tabs.onAttached.addListener(function(tabId, attachInfo) {
	//console.log('tabs.onAttached');

	tabsEdited(false);
});

chrome.tabs.onMoved.addListener(function(tabId, moveInfo) {
	//console.log('tabs.onMoved');

	tabsEdited(false);
});

chrome.tabs.onDetached.addListener(function(tabId, detachInfo) {
	//console.log('tabs.onDetached');

	tabsEdited(false);
});

chrome.tabs.onCreated.addListener(function(tab) {
	//console.log('tabs.onCreated');

	tabsEdited(true);
});

function tabsEdited (isImportant) {
	var d = new Date();
	var millis = d.getTime();

	console.log('tabsEdited - lastTabsEdit: ' + localStorage.lastTabsEdit);
	console.log('tabsEdited - new lastTabsEdit: ' + millis);

	localStorage.lastTabsEdit = millis;


}

function initAlarm () {
	console.log("initAlarm");

	var BACKUP_ALARM_NAME = "backup_alarm";

	// Clear any previous alarm
	chrome.alarms.clearAll();
	clearInterval(parseInt(localStorage.lastTimerIntervalId));

	var timerMinutes = parseInt(localStorage.prefsBackupTimer);

	// Apparantely once the app is on the Chrome Store it's not possible
	// to create alarms that have period less than 5 minutes..
	if (timerMinutes < 5) {
		var timerMillis = timerMinutes * 60 * 1000;
		localStorage.lastTimerIntervalId = setInterval (onAlarm, timerMillis);
		console.log("Created interval alarm - id: " + localStorage.lastTimerIntervalId + " time: " + timerMinutes + " minutes");
	} else {
		console.log("Creating chrome.alarm 'backup_alarm' - time: " + timerMinutes + " minutes");
		chrome.alarms.create(BACKUP_ALARM_NAME, {periodInMinutes: timerMinutes});
	}
}

initAlarm();

function onAlarm (alarm) {
	var d = new Date();
	var formattedDate = date_format (d);

	console.log("Alarm {" + alarm + "} fired up: " + formattedDate + " last tabs edit: " + localStorage.lastTabsEdit + " last backup time: " + localStorage.lastBackupTime);

	// localStorage.lastBackupTime
	// if last backup time != lastTabsEdit
	//	perform automatic backup
	if (localStorage.lastBackupTime != localStorage.lastTabsEdit) {
		backupNow(true, formattedDate, function(success, backupName, backupObj) {
			// automatic backup completed
			var popupViews = chrome.extension.getViews({type: "popup"});
			if (popupViews.length > 0) {
				for (var i = 0; i < popupViews.length; i++) {
					var popupView = popupViews[i];
					if (!popupView.insertBackupItem) {
						continue;
					}

					popupView.insertBackupItem(backupName, backupObj, true /*insertAtBeginning*/, true /*doAnimation*/);
					popupView.updateStorageInfo();
				}
			}
		});

		localStorage.lastBackupTime = localStorage.lastTabsEdit;
	}
}

chrome.alarms.onAlarm.addListener(onAlarm);

function date_prependZero (val) {
	return val < 10 ? "0" + val : "" + val;
}

// yyyy-m-d h:i:s
function date_format (d) {
	var monthOneOffset = d.getMonth() + 1; // convert from 0-11 to 1-12

	var formattedDate = d.getFullYear() + "-" + date_prependZero(monthOneOffset) + "-" + date_prependZero(d.getDate())
		+ " " + date_prependZero(d.getHours()) + ":" + date_prependZero(d.getMinutes()) + ":" + date_prependZero(d.getSeconds());

	return formattedDate;
}


function backupNowManual (callbackDone) {
	var d = new Date();
	var formattedDate = date_format (d);

	backupNow(false, formattedDate, callbackDone);


}

function deleteOldestBackup () {
	chrome.storage.local.get("backups_list", function(items) {
		if(!items.backups_list) {
			return;
		}

		var backupsList = items.backups_list;
		var numItemsToDelete = backupsList.length - parseInt(localStorage.prefsMaxBackupItems);
		if (numItemsToDelete > 0) {
			var i = 0;
			var loopFunc = function () {
				//
				if (i > 0) {
					var deletedBackupName = backupsList[i-1];
					var popupViews = chrome.extension.getViews({type: "popup"});
					if (popupViews.length > 0) {
						for (var j = 0; j < popupViews.length; j++) {
							var popupView = popupViews[j];
							if (!popupView.removeBackupItemDiv) {
								continue;
							}

							popupView.removeBackupItemDiv(deletedBackupName);
							popupView.updateStorageInfo();
						}
					}
				}
				//

				if (i >= numItemsToDelete) {
					return;
				}

				deleteBackup (backupsList[i], loopFunc);
				i++;
			};

			loopFunc ();
		}

		//for (var i = 0; i < numItemsToDelete; i++) {
		// TODO WARNING: I'm calling deleteBackup rapidly, while deleting is async...(I should wait for each delete to complete before deleting the next)
			//deleteBackup (backupsList[i], function() {

			//});
		//}

	});
}

//var isCreatingBackup = false;

function backupNow(isAutomatic, backupName, callbackDone) {
	console.log("backupNow - isAutomatic: " + isAutomatic + " name: " + backupName);
	/*if (isCreatingBackup === true) {
		console.log("backupNow - already running..skipping..");
		return;
	}*/

	//isCreatingBackup = true;

	/*if (!confirm("Perform a full backup? All windows and their tabs will be saved!")) {
		return;
	}*/

	var fullBackup = {
		windows: [],
		isAutomatic: isAutomatic,
		totNumTabs: 0
	};

	chrome.windows.getAll({populate : true}, function (window_list) {
		var totNumTabs = 0;

		for(var i=0;i<window_list.length;i++) {
			var window = window_list[i];

			//console.log ("Window " + i);

			var bkpWindow = {
				tabs: []
			};

			var windowTabs = window.tabs;
			for (var j = 0; j < windowTabs.length; j++) {
				var tab = windowTabs[j];

				//console.log("==> Tab " + j + " (" + tab.index + "): " + tabUrl);

				var bkpTab = {
					url: tab.url,
					title: tab.title
				};

				// Add tab to tabs arrays
				bkpWindow.tabs.push(bkpTab);
			}

			totNumTabs += windowTabs.length;

			fullBackup.windows.push(bkpWindow);
		}

		fullBackup.totNumTabs = totNumTabs;

		var storageSetValues = {};
		storageSetValues[backupName] = fullBackup;

		// Store backup
		chrome.storage.local.set(storageSetValues, function () {
			if (chrome.runtime.lastError) {
				//isCreatingBackup = false;
				// TODO change icon to error..
				//alert ("Error: " + chrome.runtime.lastError.message);
				updateBrowserActionIcon (1);

				callbackDone(false);
			} else {
				console.log("backup saved");
				//alert("Backup saved successfully!");

				chrome.storage.local.get("backups_list", function(items) {
					var backupsList = [];
					if(items.backups_list) {
						backupsList = items.backups_list;
					}

					console.log("Updating 'backups_list' - cur. size: " + backupsList.length);

					backupsList.push(backupName);

					chrome.storage.local.set({"backups_list": backupsList}, function () {
						//isCreatingBackup = false;

						if (chrome.runtime.lastError) {
							console.log ("Error saving backups_list: " + chrome.runtime.lastError.message);
							updateBrowserActionIcon (1);
							callbackDone(false);
						} else {
							console.log("Backups list saved successfully");

							updateBrowserActionIcon (0);
							callbackDone(true, backupName, fullBackup);

							if (backupsList.length > parseInt(localStorage.prefsMaxBackupItems)) {
								deleteOldestBackup();
							}
						}
					});
				});
			}
		});
	});
}

/**
 * 0 ==> OK
 * 1 ==> ERROR
 */
function updateBrowserActionIcon (status) {
	var icon;
	switch(status) {
		case 0:
			icon = "icon_ok.png";
			break;
		default:
			icon = "icon_error.png";
			break;
	}

	chrome.browserAction.setIcon({path: icon});
}

function deleteBackup (backupName, callback) {
	console.log("Deleting backup " + backupName);

	chrome.storage.local.remove(backupName, function() {
		//console.log ("=> Deleted backup " + backupName);

		chrome.storage.local.get("backups_list", function(items) {
			//console.log ("==> got backups_list " + backupName);

			if(!items.backups_list) {
				callback();
				return;
			}

			var backupsList = items.backups_list;

			var index = backupsList.indexOf(backupName);
			if (index >= 0) {
				backupsList.splice(index, 1);
			}

			//console.log ("===> Updating backups_list (removing " + backupName + ")");

			chrome.storage.local.set({"backups_list": backupsList}, function() {
				//console.log ("===> Updated backups_list (removed " + backupName + ")");

				callback();
			});

			//console.log ("==> EXIT got backups_list " + backupName);
		});

		//console.log ("=> EXIT Deleted backup " + backupName);
	});

	//console.log("EXIT Deleting backup " + backupName);


}

function restoreNow(backupName) {
	console.log("restoreNow");

	chrome.storage.local.get(backupName, function(items) {
		if(!items[backupName]) {
			alert("No Backup found");
			return;
		}

		/*if (!confirm("Restore full backup?")) {
			return;
		}*/
		/*
		if (confirm("Would you like to close all existing windows first?")) {
			chrome.windows.getAll({populate : false}, function (window_list) {
				for(var i=0;i<window_list.length;i++) {
					var window = window_list[i];
					chrome.windows.remove(window.id);
				}
			});
		}*/


		var fullBackup = items[backupName];

		for(var i=0;i<fullBackup.windows.length;i++) {
			var window = fullBackup.windows[i];

			//console.log ("Window " + i);

			urlsToOpen = [];

			var windowTabs = window.tabs;
			for (var j = 0; j < windowTabs.length; j++) {
				var tab = windowTabs[j];
				var tabUrl = tab.url;
				urlsToOpen.push(tabUrl);
			}

			var windowProperties = {
				url: urlsToOpen
			};

			// Create a new Window
			chrome.windows.create(windowProperties, function(createdWindow) {
				//console.log("Created window id: " + createdWindow.id);

				//chrome.tabs.remove(createdWindow.tabs[0].id);

				// Create new tabs
				/*var windowTabs = window.tabs;
				for (var j = 0; j < windowTabs.length; j++) {
					var tab = windowTabs[j];
					var tabUrl = tab.url;

					console.log("==> Tab " + j + ": " + tabUrl);

					var tabProperties = {
						url: tabUrl,
						windowId: createdWindow.id
					};

					chrome.tabs.create(tabProperties, function(createdTab) {
						// do nothing..
					});
				}*/
			});



		}
	});
}