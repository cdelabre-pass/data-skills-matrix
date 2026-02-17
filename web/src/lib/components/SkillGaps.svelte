<script lang="ts">
	import type { SkillAnswer } from '$lib/stores/assessment';

	export let answers: Record<string, SkillAnswer>;
	export let skills: any[];
	export let role: string | null;
	export let careerLevelIndex: number = 1;

	interface SkillGap {
		skill: any;
		currentLevel: number;
		expectedLevel: number;
		gap: number;
		inferred?: boolean;
		sourceSkill?: string;
	}

	// Find skills where user is below expected level for a confirmed role
	let gapsFallback = false;
	$: gaps = calculateGaps();

	function calculateGaps(): SkillGap[] {
		const result: SkillGap[] = [];

		for (const skill of skills) {
			const answer = answers[skill.id];
			if (!answer || answer.level === 'nc') continue;

			const currentLevel = answer.level as number;

			if (role) {
				// Role-specific: compare to role expectations
				const expectedLevels = skill.levels?.[role];
				if (!expectedLevels) continue;

				const expectedLevel = expectedLevels[careerLevelIndex];
				if (expectedLevel === 'NC' || expectedLevel === null || expectedLevel === undefined) continue;

				const gap = expectedLevel - currentLevel;

				if (gap > 0) {
					result.push({
						skill,
						currentLevel,
						expectedLevel,
						gap,
						inferred: answer.inferred,
						sourceSkill: answer.sourceSkill
					});
				}
			} else {
				// Role-agnostic: show skills where user scored low (< 2)
				if (currentLevel < 2) {
					result.push({
						skill,
						currentLevel,
						expectedLevel: 2,
						gap: 2 - currentLevel,
						inferred: answer.inferred,
						sourceSkill: answer.sourceSkill
					});
				}
			}
		}

		// Fallback: if role-specific gaps are empty, show skills below Intermédiaire (2)
		gapsFallback = false;
		if (role && result.length === 0) {
			gapsFallback = true;
			for (const skill of skills) {
				const answer = answers[skill.id];
				if (!answer || answer.level === 'nc') continue;

				const currentLevel = answer.level as number;
				if (currentLevel < 2) {
					result.push({
						skill,
						currentLevel,
						expectedLevel: 2,
						gap: 2 - currentLevel,
						inferred: answer.inferred,
						sourceSkill: answer.sourceSkill
					});
				}
			}
		}

		// Sort by gap size (biggest gaps first)
		return result.sort((a, b) => b.gap - a.gap);
	}

	$: strengths = findStrengths();

	interface SkillStrength {
		skill: any;
		level: number;
		inferred?: boolean;
		sourceSkill?: string;
	}

	function findStrengths(): SkillStrength[] {
		if (role) {
			// Role-specific: strengths are skills meeting/exceeding expectations
			return skills
				.filter(skill => {
					const answer = answers[skill.id];
					if (!answer || answer.level === 'nc') return false;

					const expectedLevels = skill.levels?.[role];
					if (!expectedLevels) return false;

					const expected = expectedLevels[careerLevelIndex];
					if (expected === 'NC' || expected === null || expected === undefined) return false;

					return (answer.level as number) >= expected;
				})
				.map(skill => ({
					skill,
					level: answers[skill.id].level as number,
					inferred: answers[skill.id].inferred,
					sourceSkill: answers[skill.id].sourceSkill
				}))
				.sort((a, b) => b.level - a.level)
				.slice(0, 5);
		} else {
			// Role-agnostic: strengths are highest-scored skills (>= 3)
			return skills
				.filter(skill => {
					const answer = answers[skill.id];
					if (!answer || answer.level === 'nc') return false;
					return (answer.level as number) >= 3;
				})
				.map(skill => ({
					skill,
					level: answers[skill.id].level as number,
					inferred: answers[skill.id].inferred,
					sourceSkill: answers[skill.id].sourceSkill
				}))
				.sort((a, b) => b.level - a.level)
				.slice(0, 8);
		}
	}

	// Growth potential: skills where user could become mentor (5) or expert externe (6)
	interface GrowthOpportunity {
		skill: any;
		currentLevel: number;
		targetLevel: 5 | 6;
		targetLabel: string;
	}

	$: growthOpportunities = findGrowthOpportunities();

	function findGrowthOpportunities(): GrowthOpportunity[] {
		const result: GrowthOpportunity[] = [];

		for (const skill of skills) {
			const answer = answers[skill.id];
			if (!answer || answer.level === 'nc') continue;

			const currentLevel = answer.level as number;

			// Expert (level 4) can become Mentor (5) or Expert Externe (6)
			if (currentLevel === 4) {
				result.push({
					skill,
					currentLevel,
					targetLevel: 5,
					targetLabel: 'Mentor'
				});
			}
			// Avancé (level 3) can become Expert (4) then Mentor
			else if (currentLevel === 3) {
				result.push({
					skill,
					currentLevel,
					targetLevel: 5,
					targetLabel: 'Mentor'
				});
			}
			// Mentor (level 5) can become Expert Externe (6)
			else if (currentLevel === 5) {
				result.push({
					skill,
					currentLevel,
					targetLevel: 6,
					targetLabel: 'Expert Externe'
				});
			}
		}

		// Sort by current level (highest first) - closer to goal
		return result.sort((a, b) => b.currentLevel - a.currentLevel).slice(0, 6);
	}

	// Get name of source skill for inference display
	function getSourceSkillName(sourceSkillId: string | undefined): string {
		if (!sourceSkillId) return '';
		const skill = skills.find(s => s.id === sourceSkillId);
		return skill?.name || sourceSkillId;
	}

	const levelColors: Record<number, string> = {
		0: 'bg-level-0',
		1: 'bg-level-1',
		2: 'bg-level-2',
		3: 'bg-level-3',
		4: 'bg-level-4',
		5: 'bg-level-5',
		6: 'bg-level-6'
	};

	let showTips = false;
	let selectedSkill: any = null;

	function openTips(skill: any) {
		selectedSkill = skill;
		showTips = true;
	}

	function closeTips() {
		showTips = false;
		selectedSkill = null;
	}
</script>

<div class="space-y-6">
	<div class="grid grid-cols-1 lg:grid-cols-2 gap-6">
		<!-- Gaps -->
		<div class="card p-6">
			<h2 class="text-xl font-semibold text-base-100 mb-4">
				Axes d'amélioration
				{#if gaps.length > 0}
					<span class="text-sm font-normal text-base-500">({gaps.length})</span>
				{/if}
			</h2>

			{#if gaps.length === 0}
				<div class="text-center py-8 text-base-400">
					<span class="text-4xl mb-2 block">🎉</span>
					<p>Aucun écart identifié !</p>
					<p class="text-sm text-base-500">Vous atteignez ou dépassez les attentes, y compris le niveau Intermédiaire.</p>
				</div>
			{:else}
				{#if gapsFallback}
					<p class="text-sm text-base-400 mb-3">Vous atteignez les attentes pour votre niveau. Voici les compétences à amener à Intermédiaire (2) :</p>
				{/if}
				<div class="space-y-3">
					{#each gaps.slice(0, 8) as { skill, currentLevel, expectedLevel, gap }}
						<div class="p-3 bg-base-800/50 rounded-xl border border-base-700/50">
							<div class="flex items-start justify-between gap-2">
								<div class="flex-1">
									<p class="font-medium text-base-100">{skill.name}</p>
									<p class="text-xs text-base-500">{skill.category.replace('_', ' ')}</p>
								</div>
								<button
									on:click={() => openTips(skill)}
									class="text-xs text-accent-400 hover:text-accent-300 font-medium transition-colors"
								>
									Conseils
								</button>
							</div>
							<div class="flex items-center gap-2 mt-2">
								<span class="text-xs text-base-500">Actuel:</span>
								<span class="w-6 h-6 rounded {levelColors[currentLevel]} flex items-center justify-center text-xs font-medium {currentLevel >= 3 ? 'text-white' : 'text-base-900'}">
									{currentLevel}
								</span>
								<svg class="w-4 h-4 text-base-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
									<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
								</svg>
								<span class="text-xs text-base-500">{role && !gapsFallback ? 'Attendu' : 'Cible'}:</span>
								<span class="w-6 h-6 rounded bg-accent-500/20 text-accent-400 flex items-center justify-center text-xs font-medium">
									{expectedLevel}
								</span>
								<span class="ml-auto text-xs text-red-400 font-medium">-{gap}</span>
							</div>
						</div>
					{/each}

					{#if gaps.length > 8}
						<p class="text-sm text-base-500 text-center">
							Et {gaps.length - 8} autres compétences à améliorer...
						</p>
					{/if}
				</div>
			{/if}
		</div>

		<!-- Strengths -->
		<div class="card p-6">
			<h2 class="text-xl font-semibold text-base-100 mb-4">
				Points forts
				{#if strengths.length > 0}
					<span class="text-sm font-normal text-base-500">({strengths.length})</span>
				{/if}
			</h2>

			{#if strengths.length === 0}
				<div class="text-center py-8 text-base-400">
					<p>Continuez l'évaluation pour identifier vos points forts.</p>
				</div>
			{:else}
				<div class="space-y-3">
					{#each strengths as { skill, level }}
						<div class="p-3 bg-green-500/10 rounded-xl border border-green-500/20 flex items-center gap-3">
							<span class="w-8 h-8 rounded-full {levelColors[level]} flex items-center justify-center text-sm font-bold {level >= 3 ? 'text-white' : 'text-base-900'}">
								{level}
							</span>
							<div>
								<p class="font-medium text-base-100">{skill.name}</p>
								<p class="text-xs text-base-500">{skill.category.replace('_', ' ')}</p>
							</div>
						</div>
					{/each}
				</div>
			{/if}
		</div>
	</div>

	<!-- Growth Opportunities - for senior profiles -->
	{#if growthOpportunities.length > 0}
		<div class="card p-6">
			<div class="flex items-center gap-3 mb-4">
				<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-purple-500/20 to-fuchsia-500/20 flex items-center justify-center">
					<svg class="w-5 h-5 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
					</svg>
				</div>
				<div>
					<h2 class="text-xl font-semibold text-base-100">Potentiel d'évolution</h2>
					<p class="text-sm text-base-400">Compétences où vous pouvez devenir référent</p>
				</div>
			</div>

			<div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
				{#each growthOpportunities as { skill, currentLevel, targetLevel, targetLabel }}
					<div class="p-4 bg-gradient-to-br from-purple-500/5 to-fuchsia-500/5 rounded-xl border border-purple-500/20 hover:border-purple-500/40 transition-colors">
						<div class="flex items-start justify-between gap-2 mb-3">
							<p class="font-medium text-base-100 text-sm">{skill.name}</p>
							<button
								on:click={() => openTips(skill)}
								class="text-xs text-purple-400 hover:text-purple-300 font-medium transition-colors whitespace-nowrap"
							>
								Conseils
							</button>
						</div>
						<div class="flex items-center gap-2">
							<span class="w-7 h-7 rounded-lg {levelColors[currentLevel]} flex items-center justify-center text-xs font-bold {currentLevel >= 3 ? 'text-white' : 'text-base-900'}">
								{currentLevel}
							</span>
							<svg class="w-4 h-4 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
							</svg>
							<span class="w-7 h-7 rounded-lg {levelColors[targetLevel]} flex items-center justify-center text-xs font-bold text-white">
								{targetLevel}
							</span>
							<span class="text-xs text-purple-400 ml-1">{targetLabel}</span>
						</div>
					</div>
				{/each}
			</div>
		</div>
	{/if}
</div>

<!-- Tips Modal - Full screen on mobile -->
{#if showTips && selectedSkill}
	<!-- svelte-ignore a11y-no-noninteractive-element-interactions -->
	<div
		class="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-end sm:items-center justify-center z-50 sm:p-4"
		role="dialog"
		aria-modal="true"
		aria-labelledby="modal-title"
		on:click={closeTips}
		on:keydown={(e) => e.key === 'Escape' && closeTips()}
	>
		<!-- svelte-ignore a11y-no-static-element-interactions -->
		<div
			class="card w-full sm:max-w-lg max-h-[90vh] sm:max-h-[80vh] overflow-auto animate-scale-in rounded-t-2xl sm:rounded-2xl rounded-b-none sm:rounded-b-2xl"
			on:click|stopPropagation
			on:keydown|stopPropagation
		>
			<!-- Mobile drag handle -->
			<div class="sm:hidden flex justify-center py-2">
				<div class="w-12 h-1 rounded-full bg-base-600"></div>
			</div>

			<div class="p-4 sm:p-6">
				<div class="flex items-start justify-between mb-4 gap-4">
					<h3 id="modal-title" class="text-lg sm:text-xl font-semibold text-base-100">{selectedSkill.name}</h3>
					<button
						on:click={closeTips}
						class="flex-shrink-0 w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-lg sm:rounded bg-base-800 sm:bg-transparent text-base-400 hover:text-base-200 transition-colors"
						aria-label="Fermer"
					>
						<svg class="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>

				{#if selectedSkill.improvement_tips && Object.keys(selectedSkill.improvement_tips).length > 0}
					<div class="space-y-3 sm:space-y-4">
						<h4 class="font-medium text-base-300 text-sm sm:text-base">Conseils pour progresser</h4>
						{#each Object.entries(selectedSkill.improvement_tips) as [transition, tip]}
							<div class="p-3 bg-base-800/50 rounded-xl border border-base-700/50">
								<p class="text-xs font-medium text-accent-400 mb-1">Niveau {transition}</p>
								<p class="text-xs sm:text-sm text-base-300">{tip}</p>
							</div>
						{/each}
					</div>
				{/if}

				{#if selectedSkill.resources && selectedSkill.resources.length > 0}
					<div class="mt-4 sm:mt-6">
						<h4 class="font-medium text-base-300 mb-3 text-sm sm:text-base">Ressources</h4>
						<div class="space-y-1 sm:space-y-2">
							{#each selectedSkill.resources as resource}
								<a
									href={resource.url}
									target="_blank"
									rel="noopener noreferrer"
									class="flex items-center gap-2 p-3 sm:p-2 hover:bg-base-800/50 active:bg-base-700/50 rounded-lg group transition-colors min-h-[44px]"
								>
									<span class="text-lg">
										{#if resource.type === 'video'}📺
										{:else if resource.type === 'course'}🎓
										{:else if resource.type === 'book'}📚
										{:else if resource.type === 'tutorial'}📝
										{:else}📄
										{/if}
									</span>
									<span class="flex-1 text-sm text-base-300 group-hover:text-accent-400 transition-colors">
										{resource.title}
									</span>
									<svg class="w-4 h-4 text-base-500 flex-shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
									</svg>
								</a>
							{/each}
						</div>
					</div>
				{/if}

				<!-- Close button for mobile - at bottom for easy thumb access -->
				<button
					on:click={closeTips}
					class="sm:hidden w-full mt-6 py-3 rounded-xl bg-base-800 text-base-300 font-medium text-sm active:bg-base-700 transition-colors"
				>
					Fermer
				</button>
			</div>
		</div>
	</div>
{/if}
