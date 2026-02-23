<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let skill: {
		id: string;
		name: string;
		description: string;
		category: string;
		level_descriptions: Record<string, string>;
		behavioral_indicators?: Record<string, string[]>;
	};
	export let currentAnswer: number | 'nc' | undefined = undefined;
	export let inference: {
		suggestedLevel: number;
		confidence: number;
		sourceSkill: string;
	} | null = null;
	export let answeredCount: number = 0;

	const dispatch = createEventDispatcher<{
		answer: { skillId: string; level: number | 'nc' };
	}>();

	let expandedLevel: number | null = null;

	const levelLabels: Record<number | string, string> = {
		0: 'Je ne connais pas',
		1: 'Débutant',
		2: 'Intermédiaire',
		3: 'Avancé',
		4: 'Expert',
		5: 'Mentor/Évangéliste',
		6: 'Expert Externe',
		nc: 'Non concerné',
	};

	const levelEmojis: Record<number | string, string> = {
		0: '🌱',
		1: '📚',
		2: '🎯',
		3: '🚀',
		4: '⭐',
		5: '🏆',
		6: '🌟',
		nc: '➖',
	};

	function selectLevel(level: number | 'nc') {
		dispatch('answer', { skillId: skill.id, level });
	}

	function toggleExpand(level: number) {
		expandedLevel = expandedLevel === level ? null : level;
	}

	function formatCategory(cat: string): string {
		return (cat || '')
			.replace(/_/g, ' ')
			.replace(/\b\w/g, (l) => l.toUpperCase());
	}

	$: hasBehavioralIndicators =
		skill.behavioral_indicators &&
		Object.keys(skill.behavioral_indicators).length > 0;
	$: showHint = hasBehavioralIndicators && answeredCount < 3;
</script>

{#key skill.id}
	<div class="card p-3 sm:p-4 animate-fade-in">
		<!-- Header -->
		<div class="mb-3 sm:mb-4">
			<div class="flex flex-wrap items-center gap-2 mb-2">
				<span class="badge badge-accent text-xs">
					{formatCategory(skill.category)}
				</span>
				{#if inference}
					<span
						class="px-2 py-0.5 text-xs font-medium bg-amber-500/20 text-amber-400 rounded-full flex items-center gap-1"
					>
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
								d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
							/>
						</svg>
						Suggestion: Niveau {inference.suggestedLevel}
					</span>
				{/if}
			</div>
			<h2
				class="text-lg sm:text-xl md:text-2xl font-bold text-base-100 mb-1 sm:mb-2"
			>
				{skill.name || 'Compétence'}
			</h2>
			<p class="text-base-400 text-sm sm:text-base leading-relaxed">
				{skill.description || ''}
			</p>
		</div>

		<!-- Behavioral indicators hint - hide after 3 answers -->
		{#if showHint}
			<div
				class="mb-3 p-2 sm:p-3 rounded-lg bg-accent-500/5 border border-accent-500/20"
			>
				<div class="flex items-center gap-2">
					<svg
						class="w-4 h-4 text-accent-400 flex-shrink-0"
						fill="none"
						stroke="currentColor"
						viewBox="0 0 24 24"
					>
						<path
							stroke-linecap="round"
							stroke-linejoin="round"
							stroke-width="2"
							d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z"
						/>
					</svg>
					<p class="text-xs text-base-300">
						<span class="font-medium text-accent-400">Astuce :</span>
						<span class="hidden sm:inline"
							>Cliquez sur un niveau pour voir des exemples.</span
						><span class="sm:hidden">Appuyez pour voir des exemples.</span>
					</p>
				</div>
			</div>
		{/if}

		<!-- Level selection -->
		<div class="space-y-1">
			<p
				class="text-xs font-medium text-base-500 uppercase tracking-wider mb-1"
			>
				Votre niveau actuel
			</p>

			<div class="grid gap-1">
				{#each [0, 1, 2, 3, 4, 5, 6] as level}
					{@const isSelected = currentAnswer === level}
					{@const description = skill.level_descriptions?.[level] || ''}
					{@const indicators = skill.behavioral_indicators?.[level] || []}
					{@const isExpanded = expandedLevel === level}
					{@const isSuggested = inference?.suggestedLevel === level}

					<div class="relative">
						<button
							on:click={() => selectLevel(level)}
							class="level-btn level-btn-{level} w-full {isSuggested &&
							!isSelected
								? 'ring-2 ring-amber-500/50'
								: ''} min-h-[48px] sm:min-h-0 {indicators.length > 0
								? 'pr-12'
								: ''}"
							class:selected={isSelected}
						>
							<div class="flex items-center gap-2 sm:gap-3">
								<!-- Level indicator -->
								<div
									class="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg flex items-center justify-center font-mono font-bold text-sm sm:text-base
								bg-level-{level} {level >= 3 ? 'text-white' : 'text-base-900'}
								{isSelected ? 'scale-110' : ''}
								transition-transform duration-200"
								>
									{level}
								</div>

								<!-- Content -->
								<div class="flex-1 min-w-0 text-left">
									<div class="flex flex-wrap items-center gap-1">
										<span class="font-semibold text-sm text-base-100"
											>{levelLabels[level]}</span
										>
										<span class="text-sm sm:text-base"
											>{levelEmojis[level]}</span
										>
										{#if isSuggested && !isSelected}
											<span class="text-xs text-amber-400">suggéré</span>
										{/if}
									</div>
									{#if description}
										<p
											class="text-xs text-base-400 mt-0.5 line-clamp-1 hidden sm:block"
										>
											{description}
										</p>
									{/if}
								</div>

								<!-- Check indicator -->
								{#if isSelected}
									<div
										class="flex-shrink-0 w-7 h-7 rounded-full bg-accent-500 flex items-center justify-center animate-scale-in"
									>
										<svg
											class="w-4 h-4 text-white"
											fill="currentColor"
											viewBox="0 0 24 24"
										>
											<path
												d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
											/>
										</svg>
									</div>
								{/if}
							</div>
						</button>

						<!-- Expand button for behavioral indicators — outside outer button to avoid button-in-button -->
						{#if indicators.length > 0}
							<button
								on:click|stopPropagation={() => toggleExpand(level)}
								class="absolute right-1.5 top-1/2 -translate-y-1/2 w-9 h-9 sm:w-8 sm:h-8 rounded-lg bg-base-700 hover:bg-base-600 active:bg-base-500 flex items-center justify-center transition-colors"
								title="Voir les exemples"
								aria-label="Voir les exemples pour le niveau {level}"
							>
								<svg
									class="w-4 h-4 text-base-400 transition-transform duration-200"
									class:rotate-180={isExpanded}
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M19 9l-7 7-7-7"
									/>
								</svg>
							</button>
						{/if}

						<!-- Behavioral indicators expandable section -->
						{#if isExpanded && indicators.length > 0}
							<div
								class="mt-2 ml-0 sm:ml-16 p-3 sm:p-4 rounded-xl bg-base-800/50 border border-base-700 animate-fade-in"
							>
								<p
									class="text-xs font-medium text-base-500 uppercase tracking-wider mb-2 sm:mb-3"
								>
									Exemples de comportements pour ce niveau
								</p>
								<ul class="space-y-2">
									{#each indicators as indicator}
										<li
											class="flex items-start gap-2 text-xs sm:text-sm text-base-300"
										>
											<svg
												class="w-4 h-4 text-accent-500 mt-0.5 flex-shrink-0"
												fill="none"
												stroke="currentColor"
												viewBox="0 0 24 24"
											>
												<path
													stroke-linecap="round"
													stroke-linejoin="round"
													stroke-width="2"
													d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"
												/>
											</svg>
											<span>{indicator}</span>
										</li>
									{/each}
								</ul>
								<button
									on:click={() => selectLevel(level)}
									class="mt-3 sm:mt-4 py-2 text-sm text-accent-400 hover:text-accent-300 active:text-accent-200 font-medium flex items-center gap-1"
								>
									<svg
										class="w-4 h-4"
										fill="none"
										stroke="currentColor"
										viewBox="0 0 24 24"
									>
										<path
											stroke-linecap="round"
											stroke-linejoin="round"
											stroke-width="2"
											d="M5 13l4 4L19 7"
										/>
									</svg>
									Sélectionner ce niveau
								</button>
							</div>
						{/if}
					</div>
				{/each}

				<!-- Not concerned option -->
				<button
					on:click={() => selectLevel('nc')}
					class="level-btn level-btn-nc mt-1 min-h-[48px] sm:min-h-0"
					class:selected={currentAnswer === 'nc'}
				>
					<div class="flex items-center gap-2 sm:gap-3">
						<div
							class="flex-shrink-0 w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-base-800 flex items-center justify-center"
						>
							<svg
								class="w-5 h-5 text-base-500"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636"
								/>
							</svg>
						</div>
						<div class="flex-1">
							<span class="font-semibold text-sm text-base-100"
								>{levelLabels['nc']}</span
							>
							<p class="text-xs text-base-500 mt-0.5 hidden sm:block">
								Cette compétence n'est pas pertinente pour mon rôle
							</p>
						</div>
						{#if currentAnswer === 'nc'}
							<div
								class="flex-shrink-0 w-7 h-7 rounded-full bg-base-500 flex items-center justify-center animate-scale-in"
							>
								<svg
									class="w-4 h-4 text-white"
									fill="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"
									/>
								</svg>
							</div>
						{/if}
					</div>
				</button>
			</div>
		</div>
	</div>
{/key}

<style>
	.line-clamp-1 {
		display: -webkit-box;
		-webkit-line-clamp: 1;
		line-clamp: 1;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
