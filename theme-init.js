// Load the theme override asap to help with initial loading/flashing.
function switchTheme(theme) {
	const css = document.querySelector('link#theme-override');
	if (theme == 'light' || theme == 'dark') {
		css.href = `${theme}.css`;
	} else {
		css.href = '';
	}
}

switchTheme(localStorage.prefsTheme);
