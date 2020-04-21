
document.addEventListener('DOMContentLoaded', function () {
	restoreOptions();
	document.querySelector('#saveBtn').addEventListener('click', saveOptions);
	document.querySelector('#restoreDefaultBtn').addEventListener('click', restoreToDefault);

	['light', 'system', 'dark'].forEach((theme) => {
		document.getElementById(`theme-${theme}`).addEventListener('click', setThemeClick);
	});

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

function setThemeClick() {
	const theme = this.textContent.toLowerCase();
	setThemeValue(theme);
	switchTheme(theme);
}

function setThemeValue(value) {
	const element = document.getElementById('prefsTheme');
	switch (value) {
		case 'light':
		case 'dark':
			break;
		default:
			value = 'system';
			break;
	}
	element.value = value;

	['light', 'system', 'dark'].forEach((theme) => {
		document.getElementById(`theme-${theme}`).className =
			value == theme ? 'selected' : '';
	});
}

function saveOptions () {
	var backupPeriodMinutes = getSelectValue("prefsSelectBackupPeriod");
	localStorage.prefsBackupTimer = backupPeriodMinutes;

	var backupMaxItems = getSelectValue("prefsSelectMaxBackups");
	localStorage.prefsMaxBackupItems = backupMaxItems;

	var theme = document.getElementById('prefsTheme').value;
	localStorage.prefsTheme = theme;

	// Re-initialize the backup alarm
	chrome.runtime.getBackgroundPage((bg) => bg.initAlarm());

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
	setThemeValue("system");

	saveOptions();
}

function restoreOptions() {
	var backupPeriodMinutes = localStorage.prefsBackupTimer;
	var backupMaxItems = localStorage.prefsMaxBackupItems;
	var theme = localStorage.prefsTheme;

	setSelectValue ("prefsSelectBackupPeriod", backupPeriodMinutes);
	setSelectValue ("prefsSelectMaxBackups", backupMaxItems);
	setThemeValue(theme);
}
