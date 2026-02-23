/**
 * Tests for theme store behavior.
 * We test the PUBLIC API (toggle, set, subscribe) using the real store,
 * but mock $app/environment to control the browser flag.
 *
 * Note: because createThemeStore() runs at module load time and reads
 * localStorage, we set up the global BEFORE the import via vi.mock hoisting.
 */
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';

// vi.mock is hoisted above imports automatically by Vite
vi.mock('$app/environment', () => ({ browser: false }));

// With browser=false, the store initialises to 'dark' without touching localStorage
import { theme } from './theme';

describe('theme store (browser=false mode)', () => {
	beforeEach(() => {
		// Reset to dark before each test
		theme.set('dark');
	});

	it('starts as dark', () => {
		expect(get(theme)).toBe('dark');
	});

	it('toggle() dark → light', () => {
		theme.set('dark');
		theme.toggle();
		expect(get(theme)).toBe('light');
	});

	it('toggle() light → dark', () => {
		theme.set('light');
		theme.toggle();
		expect(get(theme)).toBe('dark');
	});

	it('set(light) updates the store', () => {
		theme.set('light');
		expect(get(theme)).toBe('light');
	});

	it('set(dark) updates the store', () => {
		theme.set('light');
		theme.set('dark');
		expect(get(theme)).toBe('dark');
	});

	it('init() does not throw in non-browser environment', () => {
		expect(() => theme.init()).not.toThrow();
	});

	it('subscribing receives current value', () => {
		theme.set('light');
		const values: string[] = [];
		const unsubscribe = theme.subscribe((v) => values.push(v));
		expect(values[0]).toBe('light');
		unsubscribe();
	});
});
