
document.addEventListener('DOMContentLoaded', function () {
	restoreOptions();
	document.querySelector('#saveBtn').addEventListener('click', saveOptions);
	document.querySelector('#restoreDefaultBtn').addEventListener('click', restoreToDefault);

	//document.querySelector('body').addEventListener('click', restoreOptions);
});

function getSelectValue (selectId) {
	var select = document.getElementById(selectId);
	var value = select.children[select.selectedIndex].value;

	return value;
}

function setSelectValue (selectId, value) {
	var select = document.getElementById(selectId);
	for (var i = 0; i < select.children.length; i++) {
		var child = select.children[i];
		if (child.value == value) {
			child.selected = "true";
			break;
		}
	}
}

function saveOptions () {
	var backupPeriodMinutes = getSelectValue("prefsSelectBackupPeriod");
	localStorage.prefsBackupTimer = backupPeriodMinutes;

	var backupMaxItems = getSelectValue("prefsSelectMaxBackups");
	localStorage.prefsMaxBackupItems = backupMaxItems;

	// Re-initialize the backup alarm
	chrome.extension.getBackgroundPage().initAlarm();

	// Update status to let user know options were saved.
	var status = document.getElementById("statusDiv");
	status.innerHTML = "Options Saved";
	setTimeout(function() {
		status.innerHTML = "";
	}, 3000);
}

function restoreToDefault() {
	// those values are also set in background.js..
	setSelectValue ("prefsSelectBackupPeriod", "5");
	setSelectValue ("prefsSelectMaxBackups", "30");

	saveOptions();
}

function restoreOptions() {
	var backupPeriodMinutes = localStorage.prefsBackupTimer;
	var backupMaxItems = localStorage.prefsMaxBackupItems;

	setSelectValue ("prefsSelectBackupPeriod", backupPeriodMinutes);
	setSelectValue ("prefsSelectMaxBackups", backupMaxItems);
}
