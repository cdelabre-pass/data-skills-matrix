import { writable, derived, get } from 'svelte/store';

export type AssessmentMode = 'quick' | 'standard';

export interface SkillAnswer {
	skillId: string;
	level: number | 'nc'; // 0-4 or 'nc' for not concerned
	timestamp: number;
	inferred?: boolean; // true if this was auto-inferred
	confidence?: number; // inference confidence 0-1
	sourceSkill?: string; // the skill that triggered this inference
}

export interface InferredSuggestion {
	skillId: string;
	suggestedLevel: number;
	confidence: number;
	sourceSkill: string;
	sourceLevel: number;
}

export interface SkillWithGroup {
	id: string;
	name: string;
	description: string;
	category: string;
	level_descriptions: Record<string, string>;
	behavioral_indicators?: Record<string, string[]>;
	groupId?: string;
	groupName?: string;
	isCore?: boolean;
	[key: string]: unknown;
}

export interface AssessmentState {
	name: string | null;
	role: string | null;
	categories: string[];
	mode: AssessmentMode;
	answers: Record<string, SkillAnswer>;
	inferences: Record<string, InferredSuggestion>; // skillId -> inference suggestion
	currentSkillIndex: number;
	skills: SkillWithGroup[]; // Filtered and ordered skills for this assessment
	skillGroups: string[]; // Ordered list of group IDs in this assessment
	startedAt: number | null;
	completedAt: number | null;
}

const STORAGE_KEY = 'skills-matrix-assessment';

// Evaluate an inference condition like ">= 3" or "<= 1"
function evaluateCondition(condition: string, level: number): boolean {
	const match = condition.match(/([<>=]+)\s*(\d+)/);
	if (!match) return false;
	const [, operator, valueStr] = match;
	const value = parseInt(valueStr, 10);
	switch (operator) {
		case '>=': return level >= value;
		case '<=': return level <= value;
		case '>': return level > value;
		case '<': return level < value;
		case '=':
		case '==': return level === value;
		default: return false;
	}
}

// Calculate inferences based on current answers
function calculateInferences(
	answers: Record<string, SkillAnswer>,
	inferenceRules: any[]
): Record<string, InferredSuggestion> {
	const inferences: Record<string, InferredSuggestion> = {};

	for (const ruleSet of inferenceRules) {
		const sourceSkillId = ruleSet.source;
		const sourceAnswer = answers[sourceSkillId];

		if (!sourceAnswer || sourceAnswer.level === 'nc') continue;

		const sourceLevel = sourceAnswer.level as number;

		for (const rule of ruleSet.rules) {
			if (!evaluateCondition(rule.condition, sourceLevel)) continue;

			for (const target of rule.targets) {
				const targetSkillId = target.skill;

				// Don't override manually answered skills
				if (answers[targetSkillId] && !answers[targetSkillId].inferred) continue;

				// Keep highest confidence inference
				const existing = inferences[targetSkillId];
				if (!existing || target.confidence > existing.confidence) {
					inferences[targetSkillId] = {
						skillId: targetSkillId,
						suggestedLevel: target.suggestion,
						confidence: target.confidence,
						sourceSkill: sourceSkillId,
						sourceLevel
					};
				}
			}
		}
	}

	return inferences;
}

// Find which group a skill belongs to
function findSkillGroup(skillId: string, skillGroups: Record<string, any>): { groupId: string; groupName: string } | null {
	for (const [groupId, group] of Object.entries(skillGroups)) {
		if (group.skills?.includes(skillId)) {
			return { groupId, groupName: group.name };
		}
	}
	return null;
}

// Order skills by groups for smart navigation
function orderSkillsByGroups(
	skills: any[],
	skillGroups: Record<string, any>,
	coreSkillIds: string[],
	mode: AssessmentMode
): { orderedSkills: SkillWithGroup[]; groupOrder: string[] } {
	// Create a map of skills by their group
	const skillsByGroup: Record<string, any[]> = {};
	const ungroupedSkills: any[] = [];
	const groupOrder: string[] = [];

	// First, categorize all skills by group
	for (const skill of skills) {
		const groupInfo = findSkillGroup(skill.id, skillGroups);
		const isCore = coreSkillIds.includes(skill.id);

		const enrichedSkill = {
			...skill,
			groupId: groupInfo?.groupId || 'other',
			groupName: groupInfo?.groupName || 'Autres compétences',
			isCore
		};

		if (groupInfo) {
			if (!skillsByGroup[groupInfo.groupId]) {
				skillsByGroup[groupInfo.groupId] = [];
				groupOrder.push(groupInfo.groupId);
			}
			skillsByGroup[groupInfo.groupId].push(enrichedSkill);
		} else {
			ungroupedSkills.push(enrichedSkill);
		}
	}

	// Sort skills within each group: core first, then alphabetically
	for (const groupId of Object.keys(skillsByGroup)) {
		skillsByGroup[groupId].sort((a, b) => {
			// Core skills first
			if (a.isCore && !b.isCore) return -1;
			if (!a.isCore && b.isCore) return 1;
			// Then alphabetically by name
			return a.name.localeCompare(b.name);
		});
	}

	// Build ordered list
	const orderedSkills: SkillWithGroup[] = [];

	// Add grouped skills in group order
	for (const groupId of groupOrder) {
		const groupSkills = skillsByGroup[groupId];
		if (mode === 'quick') {
			// In quick mode, only add core skills
			orderedSkills.push(...groupSkills.filter(s => s.isCore));
		} else {
			// In standard mode, add all skills
			orderedSkills.push(...groupSkills);
		}
	}

	// Add ungrouped skills at the end
	if (ungroupedSkills.length > 0) {
		ungroupedSkills.sort((a, b) => {
			if (a.isCore && !b.isCore) return -1;
			if (!a.isCore && b.isCore) return 1;
			return a.name.localeCompare(b.name);
		});

		if (mode === 'quick') {
			orderedSkills.push(...ungroupedSkills.filter(s => s.isCore));
		} else {
			orderedSkills.push(...ungroupedSkills);
		}

		if (ungroupedSkills.some(s => mode === 'standard' || s.isCore)) {
			groupOrder.push('other');
		}
	}

	return { orderedSkills, groupOrder };
}

function createAssessmentStore() {
	const initialState: AssessmentState = {
		name: null,
		role: null,
		categories: [],
		mode: 'standard',
		answers: {},
		inferences: {},
		currentSkillIndex: 0,
		skills: [],
		skillGroups: [],
		startedAt: null,
		completedAt: null
	};

	const store = writable<AssessmentState>(initialState);
	const { subscribe, set, update } = store;

	// Store reference to skills data for inference calculations
	let _skillsData: any = null;

	return {
		subscribe,

		setName(name: string) {
			update(state => ({ ...state, name }));
			this.save();
		},

		init(name: string, role: string | null, categories: string[], skillsData: any, mode: AssessmentMode = 'standard') {
			_skillsData = skillsData;

			// Get skill groups configuration
			const skillGroups = skillsData.skill_groups || {};

			let coreSkillIds: string[];
			let filteredSkills: any[];

			if (role) {
				// Role-specific mode: filter by role
				coreSkillIds = skillsData.core_skills_by_role?.[role] || [];

				filteredSkills = skillsData.skills.filter((skill: any) => {
					if (!categories.includes(skill.category)) return false;
					const hasLevels = skill.levels && skill.levels[role];
					const isCore = skill.core_roles?.includes(role);
					return hasLevels || isCore;
				});
			} else {
				// Role-agnostic mode: include skills that are core for ANY role
				// Collect all core skills across all roles
				const allCoreSkillIds = new Set<string>();
				const coreSkillsByRole = skillsData.core_skills_by_role || {};
				for (const roleSkills of Object.values(coreSkillsByRole) as string[][]) {
					for (const skillId of roleSkills) {
						allCoreSkillIds.add(skillId);
					}
				}
				coreSkillIds = Array.from(allCoreSkillIds);

				// Include all skills in selected categories
				filteredSkills = skillsData.skills.filter((skill: any) => {
					if (!categories.includes(skill.category)) return false;
					// In role-agnostic mode, include skill if it has levels for ANY role
					const hasAnyLevels = skill.levels && Object.keys(skill.levels).length > 0;
					return hasAnyLevels;
				});
			}

			// Order skills by groups (smart ordering)
			const { orderedSkills, groupOrder } = orderSkillsByGroups(
				filteredSkills,
				skillGroups,
				coreSkillIds,
				mode
			);

			const state: AssessmentState = {
				name,
				role,
				categories,
				mode,
				answers: {},
				inferences: {},
				currentSkillIndex: 0,
				skills: orderedSkills,
				skillGroups: groupOrder,
				startedAt: Date.now(),
				completedAt: null
			};

			set(state);
			this.save();
		},

		answer(skillId: string, level: number | 'nc', inferred: boolean = false, confidence?: number, sourceSkill?: string) {
			update(state => {
				const newAnswers = {
					...state.answers,
					[skillId]: {
						skillId,
						level,
						timestamp: Date.now(),
						inferred,
						confidence,
						sourceSkill
					}
				};

				// Recalculate inferences based on new answers
				const inferenceRules = _skillsData?.inference_rules || [];
				const newInferences = calculateInferences(newAnswers, inferenceRules);

				// Auto-apply high-confidence inferences (>= 0.85) as answers
				// This allows skipping those skills during assessment
				for (const [inferredSkillId, inference] of Object.entries(newInferences)) {
					// Only auto-apply if not already answered manually
					if (!newAnswers[inferredSkillId] || newAnswers[inferredSkillId].inferred) {
						// Only auto-apply high confidence inferences
						if (inference.confidence >= 0.85) {
							newAnswers[inferredSkillId] = {
								skillId: inferredSkillId,
								level: inference.suggestedLevel,
								timestamp: Date.now(),
								inferred: true,
								confidence: inference.confidence,
								sourceSkill: inference.sourceSkill
							};
						}
					}
				}

				return {
					...state,
					answers: newAnswers,
					inferences: newInferences
				};
			});
			this.save();
		},

		// Accept an inferred suggestion as the answer
		acceptInference(skillId: string) {
			const state = get(store);
			const inference = state.inferences[skillId];
			if (inference) {
				this.answer(skillId, inference.suggestedLevel, true, inference.confidence);
			}
		},

		// Override an inferred suggestion with a manual answer
		overrideInference(skillId: string, level: number | 'nc') {
			this.answer(skillId, level, false);
		},

		// Find the next skill that hasn't been answered (manual or inferred)
		getNextUnansweredIndex(fromIndex: number = 0): number {
			const state = get(store);
			for (let i = fromIndex; i < state.skills.length; i++) {
				const skill = state.skills[i];
				if (!state.answers[skill.id]) {
					return i;
				}
			}
			return -1; // All skills answered
		},

		nextSkill() {
			update(state => {
				// Find next non-inferred skill after current position
				let newIndex = state.currentSkillIndex + 1;

				// Skip over auto-inferred skills
				while (newIndex < state.skills.length) {
					const skill = state.skills[newIndex];
					const answer = state.answers[skill.id];
					// Stop if skill has no answer OR was manually answered
					if (!answer || !answer.inferred) {
						break;
					}
					newIndex++;
				}

				// Cap at last skill
				newIndex = Math.min(newIndex, state.skills.length - 1);
				return { ...state, currentSkillIndex: newIndex };
			});
			this.save();
		},

		previousSkill() {
			update(state => {
				// Find previous non-inferred skill
				let newIndex = state.currentSkillIndex - 1;

				// Skip over auto-inferred skills going backwards
				while (newIndex >= 0) {
					const skill = state.skills[newIndex];
					const answer = state.answers[skill.id];
					// Stop if skill has no answer OR was manually answered
					if (!answer || !answer.inferred) {
						break;
					}
					newIndex--;
				}

				// Cap at first skill
				newIndex = Math.max(newIndex, 0);
				return { ...state, currentSkillIndex: newIndex };
			});
			this.save();
		},

		goToSkill(index: number) {
			update(state => {
				const newIndex = Math.max(0, Math.min(index, state.skills.length - 1));
				return { ...state, currentSkillIndex: newIndex };
			});
			this.save();
		},

		// Go to the next unanswered skill (skipping inferred ones)
		goToNextUnanswered() {
			const state = get(store);
			const nextIndex = this.getNextUnansweredIndex(state.currentSkillIndex);
			if (nextIndex >= 0) {
				this.goToSkill(nextIndex);
			}
		},

		complete() {
			update(state => ({
				...state,
				completedAt: Date.now()
			}));
			this.save();
		},

		save() {
			const state = get(store);
			localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
		},

		load(): AssessmentState | null {
			try {
				const saved = localStorage.getItem(STORAGE_KEY);
				if (saved) {
					const state = JSON.parse(saved);
					set(state);
					return state;
				}
			} catch (e) {
				console.error('Failed to load assessment state:', e);
			}
			return null;
		},

		clear() {
			_skillsData = null;
			set(initialState);
			localStorage.removeItem(STORAGE_KEY);
		},

		// Reload skillsData reference (needed after page reload)
		setSkillsData(skillsData: any) {
			_skillsData = skillsData;
		},

		getProgress() {
			const state = get({ subscribe });
			const total = state.skills.length;
			// Only count answers for skills in the current assessment
			const skillIds = new Set(state.skills.map(s => s.id));
			const relevantAnswers = Object.values(state.answers).filter(a => skillIds.has(a.skillId));
			const answered = relevantAnswers.length;
			const inferredCount = relevantAnswers.filter(a => a.inferred).length;
			const manualCount = answered - inferredCount;
			return {
				answered,
				total,
				percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
				inferredCount,
				manualCount
			};
		}
	};
}

export const assessmentStore = createAssessmentStore();

// Derived store for current skill
export const currentSkill = derived(
	assessmentStore,
	$state => $state.skills[$state.currentSkillIndex] || null
);

// Derived store for current skill group info
export const currentSkillGroup = derived(
	assessmentStore,
	$state => {
		const skill = $state.skills[$state.currentSkillIndex];
		if (!skill) return null;

		const prevSkill = $state.currentSkillIndex > 0
			? $state.skills[$state.currentSkillIndex - 1]
			: null;

		const isNewGroup = !prevSkill || prevSkill.groupId !== skill.groupId;

		// Count skills in this group
		const groupSkills = $state.skills.filter(s => s.groupId === skill.groupId);
		const currentInGroup = groupSkills.findIndex(s => s.id === skill.id) + 1;

		return {
			groupId: skill.groupId,
			groupName: skill.groupName,
			isNewGroup,
			currentInGroup,
			totalInGroup: groupSkills.length,
			isCore: skill.isCore
		};
	}
);

// Derived store for progress
export const assessmentProgress = derived(
	assessmentStore,
	$state => {
		const total = $state.skills.length;
		// Only count answers for skills in the current assessment
		const skillIds = new Set($state.skills.map(s => s.id));
		const relevantAnswers = Object.values($state.answers).filter(a => skillIds.has(a.skillId));
		const answered = relevantAnswers.length;
		const inferredCount = relevantAnswers.filter(a => a.inferred).length;
		const manualCount = answered - inferredCount;
		return {
			answered,
			total,
			percentage: total > 0 ? Math.round((answered / total) * 100) : 0,
			inferredCount,
			manualCount
		};
	}
);

// Derived store for progress by group
export const groupProgress = derived(
	assessmentStore,
	$state => {
		const groups: Record<string, { total: number; answered: number; name: string }> = {};

		for (const skill of $state.skills) {
			const groupId = skill.groupId || 'other';
			if (!groups[groupId]) {
				groups[groupId] = { total: 0, answered: 0, name: skill.groupName || 'Autres' };
			}
			groups[groupId].total++;
			if ($state.answers[skill.id]) {
				groups[groupId].answered++;
			}
		}

		return groups;
	}
);
