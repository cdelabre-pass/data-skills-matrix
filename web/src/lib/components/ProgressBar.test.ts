import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/svelte';
import ProgressBar from './ProgressBar.svelte';

describe('ProgressBar', () => {
	it('renders without crashing at 0%', () => {
		const { container } = render(ProgressBar, {
			props: { current: 0, total: 10, currentIndex: 0 },
		});
		expect(container.querySelector('div')).not.toBeNull();
	});

	it('renders at 50%', () => {
		const { container } = render(ProgressBar, {
			props: { current: 5, total: 10, currentIndex: 5 },
		});
		expect(container.textContent).toContain('50%');
	});

	it('renders at 100%', () => {
		const { container } = render(ProgressBar, {
			props: { current: 10, total: 10, currentIndex: 10 },
		});
		expect(container.textContent).toContain('100%');
	});

	it('shows remaining count', () => {
		const { container } = render(ProgressBar, {
			props: { current: 3, total: 10, currentIndex: 3 },
		});
		expect(container.textContent).toContain('3');
		expect(container.textContent).toContain('10');
	});

	it('handles total=0 without dividing by zero', () => {
		const { container } = render(ProgressBar, {
			props: { current: 0, total: 0, currentIndex: 0 },
		});
		expect(container.textContent).toContain('0%');
	});

	it('renders group progress pills when provided', () => {
		const { container } = render(ProgressBar, {
			props: {
				current: 2,
				total: 4,
				currentIndex: 2,
				groupProgress: {
					analytics: { total: 2, answered: 2, name: 'Analytics' },
					engineering: { total: 2, answered: 0, name: 'Engineering' },
				},
			},
		});
		expect(container.textContent).toContain('Analytics');
	});
});
