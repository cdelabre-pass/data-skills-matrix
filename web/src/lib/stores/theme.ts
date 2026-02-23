import { writable } from 'svelte/store';
import { browser } from '$app/environment';

export type Theme = 'dark' | 'light';

const STORAGE_KEY = 'skills-matrix-theme';

function getInitialTheme(): Theme {
	if (!browser) return 'dark';

	// Check localStorage first
	const stored = localStorage.getItem(STORAGE_KEY);
	if (stored === 'light' || stored === 'dark') {
		return stored;
	}

	// Check system preference
	if (window.matchMedia('(prefers-color-scheme: light)').matches) {
		return 'light';
	}

	return 'dark';
}

function createThemeStore() {
	const { subscribe, set, update } = writable<Theme>(getInitialTheme());

	return {
		subscribe,

		toggle() {
			update((current) => {
				const next = current === 'dark' ? 'light' : 'dark';
				if (browser) {
					localStorage.setItem(STORAGE_KEY, next);
					applyTheme(next);
				}
				return next;
			});
		},

		set(theme: Theme) {
			if (browser) {
				localStorage.setItem(STORAGE_KEY, theme);
				applyTheme(theme);
			}
			set(theme);
		},

		init() {
			if (browser) {
				const theme = getInitialTheme();
				applyTheme(theme);
				set(theme);

				// Listen for system preference changes
				window
					.matchMedia('(prefers-color-scheme: light)')
					.addEventListener('change', (e) => {
						if (!localStorage.getItem(STORAGE_KEY)) {
							const newTheme = e.matches ? 'light' : 'dark';
							applyTheme(newTheme);
							set(newTheme);
						}
					});
			}
		},
	};
}

function applyTheme(theme: Theme) {
	if (!browser) return;

	const root = document.documentElement;

	if (theme === 'light') {
		root.classList.add('light');
		root.classList.remove('dark');
	} else {
		root.classList.add('dark');
		root.classList.remove('light');
	}
}

export const theme = createThemeStore();
