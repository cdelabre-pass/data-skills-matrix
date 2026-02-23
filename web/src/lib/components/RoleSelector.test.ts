import { describe, it, expect } from 'vitest';
import { render, fireEvent } from '@testing-library/svelte';
import RoleSelector from './RoleSelector.svelte';

const mockRoles = [
	{ id: 'data_analyst', name: 'Data Analyst' },
	{ id: 'data_engineer', name: 'Data Engineer' },
	{ id: 'data_scientist', name: 'Data Scientist' },
];

describe('RoleSelector', () => {
	it('renders all roles', () => {
		const { container } = render(RoleSelector, { props: { roles: mockRoles } });
		expect(container.textContent).toContain('Data Analyst');
		expect(container.textContent).toContain('Data Engineer');
		expect(container.textContent).toContain('Data Scientist');
	});

	it('renders the role-agnostic option', () => {
		const { container } = render(RoleSelector, { props: { roles: mockRoles } });
		expect(container.textContent).toContain('Évaluer tous les domaines');
	});

	it('shows heading', () => {
		const { container } = render(RoleSelector, { props: { roles: mockRoles } });
		expect(container.textContent).toContain('Sélectionnez votre rôle');
	});

	it('each role has a clickable button', () => {
		const { container } = render(RoleSelector, { props: { roles: mockRoles } });
		const buttons = Array.from(container.querySelectorAll('button'));
		const roleButtons = buttons.filter((b) =>
			mockRoles.some((r) => b.textContent?.includes(r.name)),
		);
		expect(roleButtons).toHaveLength(mockRoles.length);
	});

	it('role-agnostic option is clickable', async () => {
		const { container } = render(RoleSelector, { props: { roles: mockRoles } });
		const agnosticButton = Array.from(
			container.querySelectorAll('button'),
		).find((b) => b.textContent?.includes('Évaluer tous les domaines'))!;
		// Clicking should not throw
		await expect(fireEvent.click(agnosticButton)).resolves.toBeTruthy();
	});

	it('renders with empty roles list', () => {
		const { container } = render(RoleSelector, { props: { roles: [] } });
		expect(container.querySelector('div')).not.toBeNull();
	});
});
