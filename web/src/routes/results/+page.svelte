<script lang="ts">
	import { onMount } from 'svelte';
	import { assessmentStore } from '$lib/stores/assessment';
	import RadarChart from '$lib/components/RadarChart.svelte';
	import ResultsSummary from '$lib/components/ResultsSummary.svelte';
	import SkillGaps from '$lib/components/SkillGaps.svelte';
	import LevelSuggestion from '$lib/components/LevelSuggestion.svelte';
	import ExportButtons from '$lib/components/ExportButtons.svelte';
	import RoleProfileByCategory from '$lib/components/RoleProfileByCategory.svelte';

	let ready = false;
	let skillsData: any = null;

	onMount(async () => {
		const saved = assessmentStore.load();
		if (!saved || Object.keys(saved.answers).length === 0) {
			window.location.href = '/';
			return;
		}

		const response = await fetch('/data/skills-data.json');
		skillsData = await response.json();
		ready = true;
	});

	// Calculate average level per category
	function getCategoryAverages(state: any): Record<string, number> {
		const categories: Record<string, { sum: number; count: number }> = {};

		for (const skill of state.skills) {
			const answer = state.answers[skill.id];
			if (!answer || answer.level === 'nc') continue;

			if (!categories[skill.category]) {
				categories[skill.category] = { sum: 0, count: 0 };
			}
			categories[skill.category].sum += answer.level;
			categories[skill.category].count++;
		}

		const averages: Record<string, number> = {};
		for (const [cat, data] of Object.entries(categories)) {
			averages[cat] = data.count > 0 ? data.sum / data.count : 0;
		}
		return averages;
	}

	// Calculate suggested career level based on answer patterns
	// For each career level, calculate what % of skills meet that level's expectations
	// Suggest the highest career level where user meets >= 70% of expectations
	function suggestCareerLevel(state: any, skillsData: any): { level: string; confidence: number } {
		const role = state.role;
		const levels = skillsData?.levels || []; // Career levels: junior, confirmed, senior, expert

		if (levels.length === 0) {
			return { level: 'junior', confidence: 0 };
		}

		// For each career level, calculate match rate
		const levelScores: { levelId: string; matchRate: number; skillCount: number }[] = [];

		for (let levelIndex = 0; levelIndex < levels.length; levelIndex++) {
			let meetsExpectation = 0;
			let totalSkills = 0;

			for (const skill of state.skills) {
				const answer = state.answers[skill.id];
				if (!answer || answer.level === 'nc') continue;

				const expectedLevels = skill.levels?.[role];
				if (!expectedLevels) continue;

				const expected = expectedLevels[levelIndex];
				if (expected === 'NC' || expected === null) continue;

				totalSkills++;
				if (answer.level >= expected) {
					meetsExpectation++;
				}
			}

			const matchRate = totalSkills > 0 ? meetsExpectation / totalSkills : 0;
			levelScores.push({
				levelId: levels[levelIndex].id,
				matchRate,
				skillCount: totalSkills
			});
		}

		if (levelScores.length === 0 || levelScores[0].skillCount === 0) {
			return { level: levels[0]?.id || 'junior', confidence: 0 };
		}

		// Find the highest career level where user meets >= 70% of expectations
		const THRESHOLD = 0.7;
		let suggestedIndex = 0;

		for (let i = 0; i < levelScores.length; i++) {
			if (levelScores[i].matchRate >= THRESHOLD) {
				suggestedIndex = i;
			}
		}

		return {
			level: levels[suggestedIndex].id,
			confidence: Math.round(levelScores[suggestedIndex].matchRate * 100)
		};
	}

	$: categoryAverages = ready ? getCategoryAverages($assessmentStore) : {};
	$: suggestedLevel = ready && skillsData && $assessmentStore.role ? suggestCareerLevel($assessmentStore, skillsData) : null;
	$: roleData = skillsData?.roles?.find((r: any) => r.id === $assessmentStore.role);
	$: isRoleAgnostic = !$assessmentStore.role;

	// Calculate unanswered skills for "continue" CTA (only count answers for skills in the assessment)
	$: skillIds = new Set($assessmentStore.skills.map((s: any) => s.id));
	$: answeredCount = Object.values($assessmentStore.answers).filter((a: any) => skillIds.has(a.skillId)).length;
	$: totalSkills = $assessmentStore.skills.length;
	$: unansweredCount = totalSkills - answeredCount;
	$: completionPercentage = totalSkills > 0 ? Math.round((answeredCount / totalSkills) * 100) : 0;
	$: showContinueCTA = unansweredCount > 0 || (suggestedLevel && suggestedLevel.confidence < 70);

	function continueAssessment() {
		// Find first unanswered skill
		const state = $assessmentStore;
		const firstUnansweredIndex = state.skills.findIndex(s => !state.answers[s.id]);
		if (firstUnansweredIndex >= 0) {
			assessmentStore.goToSkill(firstUnansweredIndex);
		}
		window.location.href = '/assessment';
	}
</script>

<svelte:head>
	<title>Résultats - Skills Matrix</title>
</svelte:head>

{#if ready && skillsData}
	<!-- Background gradient -->
	<div class="hero-gradient absolute inset-0 pointer-events-none opacity-50"></div>

	<div class="relative max-w-6xl mx-auto px-4 py-8">
		<div class="text-center mb-8 animate-fade-in-down">
			<h1 class="text-3xl font-bold text-base-100 mb-2">Vos résultats</h1>
			<p class="text-base-400">
				{#if isRoleAgnostic}
					Évaluation <span class="font-medium text-accent-400">multi-domaines</span>
				{:else}
					Évaluation pour le rôle : <span class="font-medium text-accent-400">{roleData?.name}</span>
				{/if}
			</p>
		</div>

		<div class="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-8">
			<ResultsSummary
				answers={$assessmentStore.answers}
				skills={$assessmentStore.skills}
			/>

			{#if suggestedLevel}
				<LevelSuggestion
					level={suggestedLevel.level}
					confidence={suggestedLevel.confidence}
					levels={skillsData.levels}
				/>
			{/if}
		</div>

		<!-- Role-agnostic: show per-category role profiles -->
		{#if isRoleAgnostic}
			<div class="mb-8">
				<RoleProfileByCategory
					answers={$assessmentStore.answers}
					skills={$assessmentStore.skills}
					{skillsData}
				/>
			</div>
		{/if}

		<!-- Continue answering CTA -->
		{#if showContinueCTA}
			<div class="mb-8 p-5 rounded-2xl bg-gradient-to-r from-accent-500/10 via-accent-500/5 to-transparent border border-accent-500/20 animate-fade-in">
				<div class="flex flex-col sm:flex-row sm:items-center gap-4">
					<div class="flex-1">
						<div class="flex items-center gap-3 mb-2">
							{#if suggestedLevel && suggestedLevel.confidence < 70}
								<div class="w-10 h-10 rounded-xl bg-amber-500/20 flex items-center justify-center">
									<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
									</svg>
								</div>
								<h3 class="font-semibold text-base-100">Améliorez la précision</h3>
							{:else}
								<div class="w-10 h-10 rounded-xl bg-accent-500/20 flex items-center justify-center">
									<svg class="w-5 h-5 text-accent-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
									</svg>
								</div>
								<h3 class="font-semibold text-base-100">Complétez votre évaluation</h3>
							{/if}
						</div>
						<p class="text-base-400 text-sm">
							{#if unansweredCount > 0}
								Il reste <span class="text-accent-400 font-medium">{unansweredCount} compétence{unansweredCount > 1 ? 's' : ''}</span> à évaluer.
							{/if}
							{#if suggestedLevel && suggestedLevel.confidence < 70}
								Votre niveau de confiance est de <span class="text-amber-400 font-medium">{suggestedLevel.confidence}%</span>.
								Répondez à plus de questions pour obtenir une évaluation plus précise.
							{/if}
						</p>

						<!-- Progress bar -->
						<div class="mt-3 flex items-center gap-3">
							<div class="flex-1 h-2 bg-base-800 rounded-full overflow-hidden">
								<div
									class="h-full bg-gradient-to-r from-accent-600 to-accent-400 transition-all duration-500"
									style="width: {completionPercentage}%"
								></div>
							</div>
							<span class="text-xs text-base-500 font-mono">{completionPercentage}%</span>
						</div>
					</div>

					<button
						on:click={continueAssessment}
						class="btn btn-primary shadow-glow flex items-center gap-2 whitespace-nowrap"
					>
						<span>Continuer</span>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
						</svg>
					</button>
				</div>
			</div>
		{/if}

		<div class="card p-6 mb-8 animate-fade-in">
			<h2 class="text-xl font-semibold text-base-100 mb-4">Vue d'ensemble par domaine</h2>
			<div class="h-80">
				<RadarChart data={categoryAverages} />
			</div>
		</div>

		<SkillGaps
			answers={$assessmentStore.answers}
			skills={$assessmentStore.skills}
			role={$assessmentStore.role}
			{skillsData}
		/>

		<div class="mt-8">
			<ExportButtons
				assessmentState={$assessmentStore}
				{skillsData}
			/>
		</div>

		<div class="mt-8 text-center">
			<a href="/" class="btn btn-secondary">
				Nouvelle évaluation
			</a>
		</div>
	</div>
{:else}
	<div class="flex flex-col items-center justify-center min-h-[60vh]">
		<div class="relative w-16 h-16">
			<div class="absolute inset-0 rounded-full border-2 border-base-800"></div>
			<div class="absolute inset-0 rounded-full border-2 border-accent-500 border-t-transparent animate-spin"></div>
		</div>
		<p class="mt-6 text-base-500 text-sm">Chargement des résultats...</p>
	</div>
{/if}
