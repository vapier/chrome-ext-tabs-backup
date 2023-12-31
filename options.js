
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
	chrome.storage.local.set({
		prefs_backup_timer: parseInt(getSelectValue("prefsSelectBackupPeriod")),
		prefs_max_backup_items: parseInt(getSelectValue("prefsSelectMaxBackups")),
		prefs_theme: document.getElementById('prefsTheme').value,
	});

	// Re-initialize the backup alarm
	chrome.runtime.sendMessage({action: 'initAlarm'});

	// Update status to let user know options were saved.
	var status = document.getElementById("statusDiv");
	status.innerHTML = "Options Saved";
	setTimeout(function() {
		status.innerHTML = "";
	}, 3000);
}

function restoreToDefault() {
	// those values are also set in background.js...
	setSelectValue ("prefsSelectBackupPeriod", "5");
	setSelectValue ("prefsSelectMaxBackups", "30");
	setThemeValue("system");

	saveOptions();
}

function restoreOptions() {
	chrome.storage.local.get(function(items) {
		setSelectValue("prefsSelectBackupPeriod", items.prefs_backup_timer);
		setSelectValue("prefsSelectMaxBackups", items.prefs_max_backup_items);
		setThemeValue(items.prefs_theme);
	});
}
