import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';

// Use vi.hoisted so these variables are available in the vi.mock factory
const { mockTheme, mockToggle } = vi.hoisted(() => {
	// eslint-disable-next-line @typescript-eslint/no-require-imports
	const { writable } = require('svelte/store');
	const mockTheme = writable('dark');
	const mockToggle = vi.fn(() => {
		mockTheme.update((t: string) => (t === 'dark' ? 'light' : 'dark'));
	});
	return { mockTheme, mockToggle };
});

vi.mock('$lib/stores/theme', () => ({
	theme: {
		subscribe: mockTheme.subscribe,
		toggle: mockToggle,
		set: mockTheme.set,
		init: vi.fn(),
	},
}));

import ThemeToggle from './ThemeToggle.svelte';

describe('ThemeToggle', () => {
	beforeEach(() => {
		mockTheme.set('dark');
		mockToggle.mockClear();
	});

	it('renders a button', () => {
		const { container } = render(ThemeToggle);
		expect(container.querySelector('button')).not.toBeNull();
	});

	it('has accessible aria-label', () => {
		const { container } = render(ThemeToggle);
		const button = container.querySelector('button');
		expect(button?.getAttribute('aria-label')).toBeTruthy();
	});

	it('shows an SVG icon', () => {
		const { container } = render(ThemeToggle);
		expect(container.querySelector('svg')).not.toBeNull();
	});

	it('clicking calls toggle', async () => {
		const { container } = render(ThemeToggle);
		const button = container.querySelector('button')!;
		await fireEvent.click(button);
		expect(mockToggle).toHaveBeenCalledOnce();
	});

	it('aria-label changes depending on theme value', () => {
		mockTheme.set('dark');
		const { container: darkContainer } = render(ThemeToggle);
		const darkLabel = darkContainer
			.querySelector('button')!
			.getAttribute('aria-label');

		mockTheme.set('light');
		const { container: lightContainer } = render(ThemeToggle);
		const lightLabel = lightContainer
			.querySelector('button')!
			.getAttribute('aria-label');

		expect(darkLabel).not.toBe(lightLabel);
	});
});
