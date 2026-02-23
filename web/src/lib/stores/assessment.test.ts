import { describe, it, expect, beforeEach, vi } from 'vitest';
import { get } from 'svelte/store';
import {
	assessmentStore,
	assessmentProgress,
	currentSkill,
} from './assessment';

// Mock localStorage
const localStorageMock = {
	store: {} as Record<string, string>,
	getItem: vi.fn((key: string) => localStorageMock.store[key] || null),
	setItem: vi.fn((key: string, value: string) => {
		localStorageMock.store[key] = value;
	}),
	removeItem: vi.fn((key: string) => {
		delete localStorageMock.store[key];
	}),
	clear: vi.fn(() => {
		localStorageMock.store = {};
	}),
};

Object.defineProperty(global, 'localStorage', { value: localStorageMock });

// Mock skills data for testing
const mockSkillsData = {
	skills: [
		{
			id: 'sql_basics',
			name: 'SQL Basics',
			description: 'Basic SQL queries',
			category: 'technical',
			levels: { data_analyst: { 1: 'Basic', 2: 'Intermediate' } },
			level_descriptions: { '1': 'Basic', '2': 'Intermediate' },
		},
		{
			id: 'python_basics',
			name: 'Python Basics',
			description: 'Basic Python programming',
			category: 'technical',
			levels: { data_analyst: { 1: 'Basic', 2: 'Intermediate' } },
			level_descriptions: { '1': 'Basic', '2': 'Intermediate' },
		},
		{
			id: 'communication',
			name: 'Communication',
			description: 'Communication skills',
			category: 'soft_skills',
			levels: { data_analyst: { 1: 'Basic', 2: 'Intermediate' } },
			level_descriptions: { '1': 'Basic', '2': 'Intermediate' },
		},
	],
	core_skills_by_role: {
		data_analyst: ['sql_basics'],
	},
	skill_groups: {
		data_fundamentals: {
			name: 'Data Fundamentals',
			skills: ['sql_basics', 'python_basics'],
		},
	},
	inference_rules: [
		{
			source: 'sql_basics',
			rules: [
				{
					condition: '>= 3',
					targets: [{ skill: 'python_basics', suggestion: 2, confidence: 0.8 }],
				},
				{
					condition: '<= 1',
					targets: [{ skill: 'python_basics', suggestion: 0, confidence: 0.9 }],
				},
			],
		},
	],
};

describe('assessmentStore', () => {
	beforeEach(() => {
		localStorageMock.clear();
		assessmentStore.clear();
	});

	describe('initialization', () => {
		it('initializes with null values', () => {
			const state = get(assessmentStore);
			expect(state.name).toBeNull();
			expect(state.role).toBeNull();
			expect(state.categories).toEqual([]);
			expect(state.skills).toEqual([]);
		});

		it('initializes assessment with provided data', () => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);

			const state = get(assessmentStore);
			expect(state.name).toBe('Test User');
			expect(state.role).toBe('data_analyst');
			expect(state.categories).toEqual(['technical']);
			expect(state.mode).toBe('standard');
			expect(state.skills.length).toBe(2); // Only technical skills
			expect(state.startedAt).not.toBeNull();
		});

		it('filters skills by category', () => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['soft_skills'],
				mockSkillsData,
				'standard',
			);

			const state = get(assessmentStore);
			expect(state.skills.length).toBe(1);
			expect(state.skills[0].id).toBe('communication');
		});
	});

	describe('setName', () => {
		it('sets name correctly', () => {
			assessmentStore.setName('New Name');
			expect(get(assessmentStore).name).toBe('New Name');
		});

		it('saves to localStorage', () => {
			assessmentStore.setName('Test User');
			expect(localStorageMock.setItem).toHaveBeenCalled();
		});
	});

	describe('answering skills', () => {
		beforeEach(() => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);
		});

		it('records skill answer', () => {
			assessmentStore.answer('sql_basics', 3);

			const state = get(assessmentStore);
			expect(state.answers['sql_basics']).toBeDefined();
			expect(state.answers['sql_basics'].level).toBe(3);
			expect(state.answers['sql_basics'].inferred).toBe(false);
		});

		it('records not concerned answer', () => {
			assessmentStore.answer('sql_basics', 'nc');

			const state = get(assessmentStore);
			expect(state.answers['sql_basics'].level).toBe('nc');
		});

		it('records inferred answer', () => {
			assessmentStore.answer('python_basics', 2, true, 0.9, 'sql_basics');

			const state = get(assessmentStore);
			const answer = state.answers['python_basics'];
			expect(answer.inferred).toBe(true);
			expect(answer.confidence).toBe(0.9);
			expect(answer.sourceSkill).toBe('sql_basics');
		});
	});

	describe('navigation', () => {
		beforeEach(() => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);
		});

		it('starts at first skill', () => {
			const state = get(assessmentStore);
			expect(state.currentSkillIndex).toBe(0);
		});

		it('moves to next skill', () => {
			assessmentStore.nextSkill();
			expect(get(assessmentStore).currentSkillIndex).toBe(1);
		});

		it('moves to previous skill', () => {
			assessmentStore.nextSkill();
			assessmentStore.previousSkill();
			expect(get(assessmentStore).currentSkillIndex).toBe(0);
		});

		it('does not go below 0', () => {
			assessmentStore.previousSkill();
			expect(get(assessmentStore).currentSkillIndex).toBe(0);
		});

		it('goes to specific skill', () => {
			assessmentStore.goToSkill(1);
			expect(get(assessmentStore).currentSkillIndex).toBe(1);
		});
	});

	describe('progress tracking', () => {
		beforeEach(() => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);
		});

		it('calculates progress correctly', () => {
			const progress = assessmentStore.getProgress();
			expect(progress.total).toBe(2);
			expect(progress.answered).toBe(0);
			expect(progress.percentage).toBe(0);
		});

		it('updates progress when answering', () => {
			assessmentStore.answer('sql_basics', 3);

			const progress = assessmentStore.getProgress();
			expect(progress.answered).toBe(1);
			expect(progress.percentage).toBe(50);
		});

		it('tracks inferred vs manual counts', () => {
			assessmentStore.answer('sql_basics', 3, false);
			assessmentStore.answer('python_basics', 2, true, 0.9);

			const progress = assessmentStore.getProgress();
			expect(progress.manualCount).toBe(1);
			expect(progress.inferredCount).toBe(1);
		});
	});

	describe('completion', () => {
		beforeEach(() => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);
		});

		it('marks assessment as complete', () => {
			assessmentStore.complete();

			const state = get(assessmentStore);
			expect(state.completedAt).not.toBeNull();
		});
	});

	describe('clear', () => {
		it('resets state to initial values', () => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);
			assessmentStore.clear();

			const state = get(assessmentStore);
			expect(state.name).toBeNull();
			expect(state.role).toBeNull();
			expect(state.skills).toEqual([]);
		});

		it('removes from localStorage', () => {
			assessmentStore.init(
				'Test User',
				'data_analyst',
				['technical'],
				mockSkillsData,
				'standard',
			);
			assessmentStore.clear();

			expect(localStorageMock.removeItem).toHaveBeenCalled();
		});
	});
});

describe('derived stores', () => {
	beforeEach(() => {
		localStorageMock.clear();
		assessmentStore.clear();
		assessmentStore.init(
			'Test User',
			'data_analyst',
			['technical'],
			mockSkillsData,
			'standard',
		);
	});

	describe('currentSkill', () => {
		it('returns current skill', () => {
			const skill = get(currentSkill);
			expect(skill).not.toBeNull();
			expect(skill?.category).toBe('technical');
		});

		it('updates when navigating', () => {
			const firstSkill = get(currentSkill);
			assessmentStore.nextSkill();
			const secondSkill = get(currentSkill);

			expect(firstSkill?.id).not.toBe(secondSkill?.id);
		});
	});

	describe('assessmentProgress', () => {
		it('tracks progress reactively', () => {
			let progress = get(assessmentProgress);
			expect(progress.percentage).toBe(0);

			assessmentStore.answer('sql_basics', 3);
			progress = get(assessmentProgress);
			expect(progress.percentage).toBe(50);
		});
	});
});

describe('inference rules', () => {
	beforeEach(() => {
		localStorageMock.clear();
		assessmentStore.clear();
		assessmentStore.init(
			'Test User',
			'data_analyst',
			['technical'],
			mockSkillsData,
			'standard',
		);
	});

	it('suggests inference when source skill is answered at high level', () => {
		assessmentStore.answer('sql_basics', 3);
		const state = get(assessmentStore);
		expect(state.inferences['python_basics']).toBeDefined();
		expect(state.inferences['python_basics'].suggestedLevel).toBe(2);
		expect(state.inferences['python_basics'].confidence).toBe(0.8);
	});

	it('suggests inference when source skill is answered at low level', () => {
		assessmentStore.answer('sql_basics', 1);
		const state = get(assessmentStore);
		expect(state.inferences['python_basics']).toBeDefined();
		expect(state.inferences['python_basics'].suggestedLevel).toBe(0);
	});

	it('does not infer when source skill is nc', () => {
		assessmentStore.answer('sql_basics', 'nc');
		const state = get(assessmentStore);
		expect(state.inferences['python_basics']).toBeUndefined();
	});

	it('does not override manually answered target skill', () => {
		assessmentStore.answer('python_basics', 4, false);
		assessmentStore.answer('sql_basics', 3);
		const state = get(assessmentStore);
		// Manual answer should not be overridden by inference
		expect(state.answers['python_basics'].level).toBe(4);
		expect(state.answers['python_basics'].inferred).toBe(false);
	});

	it('inferred answers are reflected in progress', () => {
		assessmentStore.answer('sql_basics', 3);
		// The inference should auto-apply
		const progress = assessmentStore.getProgress();
		// sql_basics is manually answered
		expect(progress.manualCount).toBeGreaterThanOrEqual(1);
	});
});

describe('quick mode', () => {
	beforeEach(() => {
		localStorageMock.clear();
		assessmentStore.clear();
	});

	it('in quick mode, only includes core skills', () => {
		assessmentStore.init(
			'Test User',
			'data_analyst',
			['technical'],
			mockSkillsData,
			'quick',
		);
		const state = get(assessmentStore);
		// Only sql_basics is core for data_analyst
		expect(state.skills.every((s) => s.isCore)).toBe(true);
	});
});

describe('role-agnostic mode (null role)', () => {
	beforeEach(() => {
		localStorageMock.clear();
		assessmentStore.clear();
	});

	it('includes all skills when role is null', () => {
		assessmentStore.init(null, null, ['technical'], mockSkillsData, 'standard');
		const state = get(assessmentStore);
		expect(state.skills.length).toBe(2); // both technical skills
	});
});

describe('localStorage persistence', () => {
	it('saves state to localStorage when answering', () => {
		assessmentStore.clear();
		assessmentStore.init(
			'Test User',
			'data_analyst',
			['technical'],
			mockSkillsData,
			'standard',
		);
		assessmentStore.answer('sql_basics', 3);
		expect(localStorageMock.setItem).toHaveBeenCalled();
	});
});
