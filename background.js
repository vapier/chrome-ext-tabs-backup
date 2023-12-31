// Create a backup on first install (or if storage is wiped for some reason.
chrome.storage.local.get(function(items) {
	// Setup defaults.
	if (items.prefs_max_backup_items === undefined) {
		chrome.storage.local.set({prefs_max_backup_items: 10});
	}
	if (items.prefs_backup_timer === undefined) {
		chrome.storage.local.set({prefs_backup_timer: 30});
	}

	// If a backup exists already, nothing to do.
	if (items.backups_list) {
		return;
	}

	// Create a backup now
	var d = new Date();
	var formattedDate = date_format (d);

	backupNow(true, formattedDate, function({success, backupName, backupObj}) {
		// backup completed
	});
});

function initAlarm () {
	//console.log("initAlarm");

	var BACKUP_ALARM_NAME = "backup_alarm";

	// Clear any previous alarm
	chrome.alarms.clearAll();

	chrome.storage.local.get(function(items) {
		const timerMinutes = items.prefs_backup_timer;
		chrome.alarms.create(BACKUP_ALARM_NAME, {periodInMinutes: timerMinutes});
	});
}

initAlarm();

function onAlarm (alarm) {
	var d = new Date();
	var formattedDate = date_format (d);

	console.log("Alarm {" + alarm + "} fired up: " + formattedDate);

	// if last backup time != lastTabsEdit
	//	perform automatic backup
		backupNow(true, formattedDate, function({success, backupName, backupObj}) {
			// automatic backup completed
			chrome.runtime.sendMessage({
				action: 'insertBackupItem',
				args: [backupName, backupObj, true /*insertAtBeginning*/, true /*doAnimation*/],
			});
		});
}

chrome.alarms.onAlarm.addListener(onAlarm);

// yyyy-mm-dd hh:mm:ss
function date_format(d) {
	const prependZero = (val) => val.toString().padStart(2, '0');
	return d.getFullYear() + "-" +
		prependZero(d.getMonth() + 1) + "-" +
		prependZero(d.getDate()) + " " +
		prependZero(d.getHours()) + ":" +
		prependZero(d.getMinutes()) + ":" +
		prependZero(d.getSeconds());
}


function backupNowManual (callbackDone) {
	var d = new Date();
	var formattedDate = date_format (d);

	backupNow(false, formattedDate, callbackDone);


}

async function deleteOldestBackup() {
	const items = await chrome.storage.local.get();
	if (!items.backups_list) {
		return;
	}

	const backupsList = items.backups_list;
	const numItemsToDelete = backupsList.length - items.prefs_max_backup_items;
	for (let i = 0; i < numItemsToDelete; ++i) {
		const deletedBackupName = backupsList[i];
		await deleteBackup(deletedBackupName);

		chrome.runtime.sendMessage({
			action: 'removeBackupItemDiv',
			args: [deletedBackupName],
		});
	}
}

//var isCreatingBackup = false;

function backupNow(isAutomatic, backupName, callbackDone) {
	console.log("backupNow - isAutomatic: " + isAutomatic + " name: " + backupName);
	/*if (isCreatingBackup === true) {
		console.log("backupNow - already running ... skipping ...");
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
				state: window.state,
				top: window.top,
				left: window.left,
				width: window.width,
				height: window.height,
				tabs: []
			};

			var windowTabs = window.tabs;

			// If it's a single window sittig at the new tab page, don't bother
			// saving it.  This is a nice shortcut when things crash as it will
			// only show a single window.
			if (windowTabs.length == 1) {
				const tab = windowTabs[0];
				if (tab.url == 'chrome://newtab/')
					continue;
			}

			for (var j = 0; j < windowTabs.length; j++) {
				var tab = windowTabs[j];

				//console.log("==> Tab " + j + " (" + tab.index + "): " + tabUrl);

				// Ignore windows that we can't/shouldn't backup.
				if (tab.url.startsWith('chrome-untrusted://')) {
					continue;
				}

				var bkpTab = {
					url: tab.url,
					title: tab.title,
					highlighted: tab.highlighted,
					pinned: tab.pinned,
				};

				// Add tab to tabs arrays
				bkpWindow.tabs.push(bkpTab);
			}

			if (bkpWindow.tabs.length) {
				totNumTabs += bkpWindow.tabs.length;

				fullBackup.windows.push(bkpWindow);
			}
		}

		if (totNumTabs == 0)
			return;

		fullBackup.totNumTabs = totNumTabs;

		var storageSetValues = {};
		storageSetValues[backupName] = fullBackup;

		// Store backup
		chrome.storage.local.set(storageSetValues, function () {
			if (chrome.runtime.lastError) {
				//isCreatingBackup = false;
				// TODO change icon to error...
				//alert ("Error: " + chrome.runtime.lastError.message);
				updateBrowserActionIcon (1);

				callbackDone({success: false});
			} else {
				console.log("backup saved");
				//alert("Backup saved successfully!");

				chrome.storage.local.get(function(items) {
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
							callbackDone({success: false});
						} else {
							console.log("Backups list saved successfully");

							updateBrowserActionIcon (0);
							callbackDone({
								success: true,
								backupName,
								backupObj: fullBackup,
							});

							if (backupsList.length > items.prefs_max_backup_items) {
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

	chrome.action.setIcon({path: icon});
}

async function deleteBackup(backupName) {
	console.log("Deleting backup " + backupName);

	await chrome.storage.local.remove(backupName);
	//console.log("=> Deleted backup " + backupName);

	const items = await chrome.storage.local.get("backups_list");
	//console.log("==> got backups_list " + backupName);

	if (!items.backups_list) {
		return;
	}

	var backupsList = items.backups_list;

	var index = backupsList.indexOf(backupName);
	if (index >= 0) {
		backupsList.splice(index, 1);
	}

	//console.log("===> Updating backups_list (removing " + backupName + ")");

	await chrome.storage.local.set({"backups_list": backupsList});
	//console.log("===> Updated backups_list (removed " + backupName + ")");
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
			const window = fullBackup.windows[i];

			//console.log ("Window " + i);

			urlsToOpen = [];

			const windowTabs = window.tabs;
			for (let j = 0; j < windowTabs.length; j++) {
				const tab = windowTabs[j];
				const tabUrl = tab.url;
				urlsToOpen.push(tabUrl);
			}

			const windowProperties = {
				state: 'normal',
				url: urlsToOpen,
				top: window.top,
				left: window.left,
				width: window.width,
				height: window.height,
			};

			// Create a new Window
			chrome.windows.create(windowProperties, function(createdWindow) {
				// Chrome errors if the dimensions are set on non-normal windows.
				// So we create the window first with the right settings, then
				// update the window state.
				if (window.state != 'normal') {
					chrome.windows.update(createdWindow.id, {state: window.state});
				}

				chrome.windows.get(createdWindow.id, {populate: true}, ({tabs}) => {
					for (let tabi = 0; tabi < windowTabs.length; ++tabi) {
						const oldtab = windowTabs[tabi];
						const newtab = tabs[tabi];
						chrome.tabs.update(newtab.id, {
							highlighted: oldtab.highlighted,
							pinned: oldtab.pinned,
						}, () => {
							if (!oldtab.highlighted) {
								// If we discard a tab too fast, Chrome will completely
								// throw it away.  Wait until it's in a stable enough
								// state for us to discard it.
								let retryCount = 60;
								const checktab = (id) => {
									if (retryCount-- < 0)
										return;
									chrome.tabs.get(id, (tab) => {
										if (tab.pendingUrl)
											setTimeout(() => checktab(id), 500);
										else
											chrome.tabs.discard(id);
									});
								};
								checktab(newtab.id);
							}
						});
					}
				});
			});
		}
	});
}

/**
 * Callback from other pages (like the popup).
 */
chrome.runtime.onMessage.addListener(function(request, sender, sendResponse) {
	console.log(`Got message from ${sender.id}: action=${request.action}`, request);

	let asyncResponse = false;
	switch (request?.action) {
		case 'initAlarm':
			initAlarm();
			break;

		case 'restoreNow':
			restoreNow(...request.args);
			break;

		case 'deleteBackup':
			deleteBackup(...request.args).then(sendResponse);
			asyncResponse = true;
			break;

		case 'backupNowManual':
			backupNowManual(sendResponse);
			asyncResponse = true;
			break;
	}
	return asyncResponse;
});

/**
 * Context menu callback.
 */
function onContextMenu(info, tab = undefined) {
	switch (info.menuItemId) {
		case 'feedback':
			chrome.tabs.create({url: 'https://github.com/vapier/chrome-ext-tabs-backup/issues'});
			break;
	}
}

/**
 * Setup context menus.
 */
async function installContextMenus() {
	// Clear previous entries to avoid adding duplicates.
	chrome.contextMenus.removeAll();

	chrome.contextMenus.onClicked.addListener(onContextMenu);

	const entries = [
		{
			'type': 'normal',
			'id': 'feedback',
			'title': 'Send feedback',
			'contexts': ['action'],
		},
	];
	entries.forEach((entries) => chrome.contextMenus.create(entries));
}
installContextMenus();
