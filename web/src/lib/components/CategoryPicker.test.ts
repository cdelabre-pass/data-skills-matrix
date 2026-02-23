import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import CategoryPicker from './CategoryPicker.svelte';

const mockCategories = [
	{ id: 'analytics', name: 'Analytics', skill_count: 5 },
	{ id: 'engineering', name: 'Engineering', skill_count: 8 },
	{ id: 'ml', name: 'Machine Learning', skill_count: 4 },
	{ id: 'ops', name: 'Data Ops', skill_count: 3 },
];

const mockSkills = [
	{
		id: 'sql',
		name: 'SQL',
		category: 'analytics',
		levels: { data_analyst: [1, 2, 3, 4] },
	},
	{
		id: 'python',
		name: 'Python',
		category: 'engineering',
		levels: { data_analyst: [1, 2, 3, 4] },
	},
	{
		id: 'dbt',
		name: 'dbt',
		category: 'engineering',
		levels: { data_analyst: [1, 2, 3, 4] },
	},
	{
		id: 'ml_basics',
		name: 'ML Basics',
		category: 'ml',
		levels: { data_analyst: [1, 2, 3, 4] },
	},
	{
		id: 'airflow',
		name: 'Airflow',
		category: 'ops',
		levels: { data_analyst: [1, 2, 3, 4] },
	},
];

describe('CategoryPicker', () => {
	it('renders all categories', () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: null,
				skills: mockSkills,
			},
		});
		expect(container.textContent).toContain('Analytics');
		expect(container.textContent).toContain('Engineering');
		expect(container.textContent).toContain('Machine Learning');
	});

	it('shows the heading', () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: null,
				skills: mockSkills,
			},
		});
		expect(container.textContent).toContain('Domaines à évaluer');
	});

	it('shows select all and deselect all buttons', () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: null,
				skills: mockSkills,
			},
		});
		expect(container.textContent).toContain('Tout sélectionner');
		expect(container.textContent).toContain('Tout désélectionner');
	});

	it('selecting 3 categories shows the confirm button', async () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: null,
				skills: mockSkills,
			},
		});
		// Click "Select all"
		const selectAllBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Tout sélectionner'),
		)!;
		await fireEvent.click(selectAllBtn);
		expect(container.textContent).toContain('Continuer');
	});

	it('confirm button is clickable after selecting enough categories', async () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: null,
				skills: mockSkills,
			},
		});

		// Select all
		const selectAllBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Tout sélectionner'),
		)!;
		await fireEvent.click(selectAllBtn);

		// Confirm button should be enabled
		const confirmBtn = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Continuer'),
		)!;
		expect(confirmBtn).not.toBeNull();
		expect(confirmBtn.hasAttribute('disabled')).toBe(false);
	});

	it('filters skill count by selected role', () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: 'data_analyst',
				skills: mockSkills,
			},
		});
		// Analytics category has 1 skill for data_analyst
		expect(container.textContent).toContain('1');
	});

	it('Tout désélectionner clears selection', async () => {
		const { container } = render(CategoryPicker, {
			props: {
				categories: mockCategories,
				selectedRole: null,
				skills: mockSkills,
			},
		});
		const selectAll = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Tout sélectionner'),
		)!;
		await fireEvent.click(selectAll);
		const deselectAll = Array.from(container.querySelectorAll('button')).find(
			(b) => b.textContent?.includes('Tout désélectionner'),
		)!;
		await fireEvent.click(deselectAll);
		// Summary block should not appear (need min 3 selected to show summary)
		expect(container.textContent).not.toContain('Continuer');
	});
});
