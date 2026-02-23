<script lang="ts">
	import type { SkillAnswer } from '$lib/stores/assessment';

	export let answers: Record<string, SkillAnswer>;
	export let skills: any[];

	// Only count answers for skills in the current assessment
	$: skillIds = new Set(skills.map((s) => s.id));
	$: answeredSkills = Object.values(answers).filter(
		(a) => skillIds.has(a.skillId) && a.level !== 'nc',
	);
	$: totalAnswered = answeredSkills.length;
	$: inferredCount = answeredSkills.filter((a) => a.inferred).length;
	$: manualCount = totalAnswered - inferredCount;
	$: averageLevel =
		totalAnswered > 0
			? (
					answeredSkills.reduce((sum, a) => sum + (a.level as number), 0) /
					totalAnswered
				).toFixed(1)
			: '0';

	function getLevelCount(lvl: number): number {
		return answeredSkills.filter((a) => a.level === lvl).length;
	}

	function getLevelCountByType(lvl: number, inferred: boolean): number {
		return answeredSkills.filter(
			(a) => a.level === lvl && !!a.inferred === inferred,
		).length;
	}

	const levelLabels = [
		'Aucun',
		'Débutant',
		'Intermédiaire',
		'Avancé',
		'Expert',
		'Mentor',
		'Expert Ext.',
	];
	const levelColors = [
		'bg-level-0',
		'bg-level-1',
		'bg-level-2',
		'bg-level-3',
		'bg-level-4',
		'bg-level-5',
		'bg-level-6',
	];
</script>

<div class="card p-6">
	<h2 class="text-xl font-semibold text-base-100 mb-4">Résumé</h2>

	<div class="grid grid-cols-2 gap-4 mb-6">
		<div
			class="text-center p-4 bg-base-800/50 rounded-xl border border-base-700/50"
		>
			<p class="text-3xl font-bold text-accent-400">{totalAnswered}</p>
			<p class="text-sm text-base-400">Compétences évaluées</p>
			{#if inferredCount > 0}
				<div class="mt-2 flex items-center justify-center gap-2 text-xs">
					<span class="text-base-500">{manualCount} manuelles</span>
					<span class="text-base-600">|</span>
					<span class="text-amber-400 flex items-center gap-1">
						<svg
							class="w-3 h-3"
							fill="none"
							stroke="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								stroke-linecap="round"
								stroke-linejoin="round"
								stroke-width="2"
								d="M13 10V3L4 14h7v7l9-11h-7z"
							/>
						</svg>
						{inferredCount} inférées
					</span>
				</div>
			{/if}
		</div>
		<div
			class="text-center p-4 bg-base-800/50 rounded-xl border border-base-700/50"
		>
			<p class="text-3xl font-bold text-accent-400">{averageLevel}</p>
			<p class="text-sm text-base-400">Niveau moyen</p>
		</div>
	</div>

	<div>
		<h3 class="text-sm font-medium text-base-400 mb-3">
			Distribution des niveaux
		</h3>
		<div class="space-y-2">
			{#each [6, 5, 4, 3, 2, 1, 0] as level}
				{@const count = getLevelCount(level)}
				{@const manualLevelCount = getLevelCountByType(level, false)}
				{@const inferredLevelCount = getLevelCountByType(level, true)}
				{@const percentage =
					totalAnswered > 0 ? (count / totalAnswered) * 100 : 0}
				{@const manualPercentage =
					totalAnswered > 0 ? (manualLevelCount / totalAnswered) * 100 : 0}

				<div class="flex items-center gap-3">
					<span class="w-24 text-xs text-base-400">{levelLabels[level]}</span>
					<div
						class="flex-1 h-4 bg-base-800 rounded-full overflow-hidden relative"
					>
						<!-- Manual answers (solid) -->
						<div
							class="{levelColors[
								level
							]} h-full transition-all duration-500 absolute left-0"
							style="width: {manualPercentage}%"
						></div>
						<!-- Inferred answers (striped pattern overlay) -->
						{#if inferredLevelCount > 0}
							<div
								class="{levelColors[
									level
								]} h-full transition-all duration-500 absolute opacity-60"
								style="left: {manualPercentage}%; width: {percentage -
									manualPercentage}%; background-image: repeating-linear-gradient(45deg, transparent, transparent 2px, rgba(0,0,0,0.2) 2px, rgba(0,0,0,0.2) 4px);"
							></div>
						{/if}
					</div>
					<span class="w-8 text-xs text-base-400 text-right">{count}</span>
				</div>
			{/each}
		</div>

		<!-- Legend for inferred skills -->
		{#if inferredCount > 0}
			<div
				class="mt-4 pt-3 border-t border-base-700/50 flex items-center justify-center gap-4 text-xs text-base-500"
			>
				<div class="flex items-center gap-1.5">
					<div class="w-3 h-3 rounded bg-accent-500"></div>
					<span>Manuelle</span>
				</div>
				<div class="flex items-center gap-1.5">
					<div
						class="w-3 h-3 rounded bg-accent-500 opacity-60"
						style="background-image: repeating-linear-gradient(45deg, transparent, transparent 1px, rgba(0,0,0,0.3) 1px, rgba(0,0,0,0.3) 2px);"
					></div>
					<span>Inférée</span>
				</div>
			</div>
		{/if}
	</div>
</div>
