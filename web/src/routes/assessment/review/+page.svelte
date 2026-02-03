<script lang="ts">
	import { onMount } from 'svelte';
	import { assessmentStore, type InferredSuggestion } from '$lib/stores/assessment';

	let ready = false;
	let skillsData: any = null;
	let inferredSkills: Array<{
		skill: any;
		inference: InferredSuggestion;
		overrideLevel: number | 'nc' | null;
	}> = [];

	const levelLabels: Record<number | string, string> = {
		0: 'Je ne connais pas',
		1: 'Débutant',
		2: 'Intermédiaire',
		3: 'Avancé',
		4: 'Expert',
		5: 'Mentor/Évangéliste',
		6: 'Expert Externe',
		'nc': 'Non concerné'
	};

	onMount(async () => {
		const saved = assessmentStore.load();
		// Note: saved.role can be null in role-agnostic mode
		if (!saved || saved.skills.length === 0) {
			window.location.href = '/';
			return;
		}

		const response = await fetch('/data/skills-data.json');
		skillsData = await response.json();
		assessmentStore.setSkillsData(skillsData);

		// Build list of inferred skills that haven't been manually answered
		const state = saved;
		inferredSkills = [];

		for (const [skillId, inference] of Object.entries(state.inferences)) {
			// Skip if user already answered this skill manually
			if (state.answers[skillId] && !state.answers[skillId].inferred) continue;

			// Find the skill data
			const skill = state.skills.find(s => s.id === skillId);
			if (!skill) continue;

			inferredSkills.push({
				skill,
				inference: inference as InferredSuggestion,
				overrideLevel: null
			});
		}

		// Sort by confidence (highest first)
		inferredSkills.sort((a, b) => b.inference.confidence - a.inference.confidence);

		ready = true;
	});

	function getSourceSkillName(sourceSkillId: string): string {
		const state = assessmentStore.getProgress();
		const allSkills = $assessmentStore.skills;
		const sourceSkill = allSkills.find(s => s.id === sourceSkillId);
		return sourceSkill?.name || sourceSkillId;
	}

	function acceptSuggestion(index: number) {
		const item = inferredSkills[index];
		assessmentStore.acceptInference(item.skill.id);
		inferredSkills[index].overrideLevel = item.inference.suggestedLevel;
		inferredSkills = inferredSkills;
	}

	function overrideSuggestion(index: number, level: number | 'nc') {
		const item = inferredSkills[index];
		assessmentStore.overrideInference(item.skill.id, level);
		inferredSkills[index].overrideLevel = level;
		inferredSkills = inferredSkills;
	}

	function acceptAll() {
		for (let i = 0; i < inferredSkills.length; i++) {
			if (inferredSkills[i].overrideLevel === null) {
				acceptSuggestion(i);
			}
		}
	}

	function skipReview() {
		// Accept all remaining suggestions and go to results
		acceptAll();
		goToResults();
	}

	function goToResults() {
		assessmentStore.complete();
		window.location.href = '/results';
	}

	$: allReviewed = inferredSkills.every(item => item.overrideLevel !== null);
	$: reviewedCount = inferredSkills.filter(item => item.overrideLevel !== null).length;
</script>

<svelte:head>
	<title>Révision des suggestions - Skills Matrix</title>
</svelte:head>

<!-- Background gradient -->
<div class="hero-gradient absolute inset-0 pointer-events-none opacity-50"></div>

{#if ready}
	<div class="relative max-w-4xl mx-auto px-4 sm:px-6 py-8">
		<!-- Header -->
		<div class="text-center mb-8 animate-fade-in-down">
			<div class="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-amber-500/10 border border-amber-500/30 mb-4">
				<svg class="w-5 h-5 text-amber-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
					<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
				</svg>
				<span class="text-amber-400 font-medium">Suggestions intelligentes</span>
			</div>
			<h1 class="text-3xl md:text-4xl font-bold text-base-100 mb-3">
				Révision des compétences inférées
			</h1>
			<p class="text-base-400 text-lg max-w-2xl mx-auto">
				Basé sur vos réponses, nous avons estimé votre niveau sur certaines compétences connexes.
				Vérifiez et ajustez si nécessaire.
			</p>
		</div>

		{#if inferredSkills.length === 0}
			<!-- No inferences to review -->
			<div class="card p-8 text-center animate-fade-in">
				<div class="w-16 h-16 mx-auto mb-4 rounded-full bg-green-500/20 flex items-center justify-center">
					<svg class="w-8 h-8 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
					</svg>
				</div>
				<h2 class="text-xl font-bold text-base-100 mb-2">Tout est prêt !</h2>
				<p class="text-base-400 mb-6">
					Aucune compétence n'a été inférée. Vous pouvez consulter vos résultats.
				</p>
				<button on:click={goToResults} class="btn btn-primary">
					Voir mes résultats
				</button>
			</div>
		{:else}
			<!-- Progress indicator -->
			<div class="mb-6 flex items-center justify-between">
				<div class="flex items-center gap-3">
					<div class="text-sm text-base-500">
						<span class="text-accent-400 font-bold">{reviewedCount}</span>
						<span class="text-base-600">/</span>
						<span>{inferredSkills.length}</span>
						<span class="ml-1">révisées</span>
					</div>
				</div>
				<div class="flex items-center gap-3">
					<button
						on:click={skipReview}
						class="text-sm text-base-500 hover:text-base-300 transition-colors"
					>
						Accepter tout et continuer
					</button>
				</div>
			</div>

			<!-- Inferred skills list -->
			<div class="space-y-4">
				{#each inferredSkills as item, index}
					{@const isReviewed = item.overrideLevel !== null}
					{@const confidence = Math.round(item.inference.confidence * 100)}
					<div
						class="card p-5 transition-all duration-300 animate-fade-in {isReviewed ? 'opacity-60 border-green-500/30' : ''}"
						style="animation-delay: {index * 50}ms"
					>
						<div class="flex flex-col sm:flex-row sm:items-start gap-4">
							<!-- Skill info -->
							<div class="flex-1 min-w-0">
								<div class="flex items-center gap-2 mb-2">
									<h3 class="font-semibold text-base-100">{item.skill.name}</h3>
									{#if isReviewed}
										<span class="px-2 py-0.5 text-xs bg-green-500/20 text-green-400 rounded-full flex items-center gap-1">
											<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
												<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
											</svg>
											Révisé
										</span>
									{/if}
								</div>
								<p class="text-sm text-base-500 mb-3 line-clamp-2">{item.skill.description || ''}</p>

								<!-- Inference source -->
								<div class="flex items-center gap-2 text-xs text-base-500">
									<svg class="w-4 h-4 text-amber-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
										<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
									</svg>
									<span>
										Basé sur <span class="text-base-400">{getSourceSkillName(item.inference.sourceSkill)}</span>
										(niveau {item.inference.sourceLevel})
									</span>
									<span class="px-1.5 py-0.5 rounded bg-base-700 text-base-400">
										{confidence}% confiance
									</span>
								</div>
							</div>

							<!-- Level selection -->
							<div class="flex flex-col items-end gap-2">
								<div class="text-xs text-base-500 mb-1">Niveau suggéré</div>
								<div class="flex items-center gap-2">
									<!-- Suggested level badge -->
									<div class="flex items-center gap-2 px-3 py-2 rounded-lg bg-amber-500/10 border border-amber-500/30">
										<span class="text-2xl font-bold text-amber-400">{item.inference.suggestedLevel}</span>
										<span class="text-xs text-amber-400/70">{levelLabels[item.inference.suggestedLevel]}</span>
									</div>
								</div>

								{#if !isReviewed}
									<!-- Action buttons -->
									<div class="flex items-center gap-2 mt-2">
										<button
											on:click={() => acceptSuggestion(index)}
											class="btn btn-sm bg-green-500/20 text-green-400 hover:bg-green-500/30 border border-green-500/30"
										>
											<svg class="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
												<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M5 13l4 4L19 7" />
											</svg>
											Accepter
										</button>

										<!-- Override dropdown -->
										<div class="relative group">
											<button class="btn btn-sm btn-secondary">
												Modifier
												<svg class="w-4 h-4 ml-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
													<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19 9l-7 7-7-7" />
												</svg>
											</button>
											<div class="absolute right-0 top-full mt-1 py-1 w-48 bg-base-800 border border-base-700 rounded-lg shadow-xl opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all duration-200 z-10">
												{#each [0, 1, 2, 3, 4, 5, 6] as level}
													<button
														on:click={() => overrideSuggestion(index, level)}
														class="w-full px-3 py-2 text-left text-sm hover:bg-base-700 transition-colors flex items-center gap-2
															{level === item.inference.suggestedLevel ? 'text-amber-400' : 'text-base-300'}"
													>
														<span class="w-6 h-6 rounded bg-base-700 flex items-center justify-center font-mono text-xs">
															{level}
														</span>
														<span>{levelLabels[level]}</span>
														{#if level === item.inference.suggestedLevel}
															<span class="text-xs text-amber-500 ml-auto">suggéré</span>
														{/if}
													</button>
												{/each}
												<div class="border-t border-base-700 my-1"></div>
												<button
													on:click={() => overrideSuggestion(index, 'nc')}
													class="w-full px-3 py-2 text-left text-sm text-base-400 hover:bg-base-700 transition-colors flex items-center gap-2"
												>
													<span class="w-6 h-6 rounded bg-base-700 flex items-center justify-center">
														<svg class="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
															<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
														</svg>
													</span>
													<span>Non concerné</span>
												</button>
											</div>
										</div>
									</div>
								{:else}
									<!-- Show selected level -->
									<div class="flex items-center gap-2 text-sm text-base-400">
										<span>Niveau final:</span>
										<span class="px-2 py-1 rounded bg-base-700 font-medium text-base-200">
											{item.overrideLevel === 'nc' ? 'NC' : item.overrideLevel}
										</span>
									</div>
								{/if}
							</div>
						</div>
					</div>
				{/each}
			</div>

			<!-- Continue button -->
			<div class="mt-8 flex justify-center animate-fade-in">
				<button
					on:click={goToResults}
					class="btn btn-primary btn-lg shadow-glow flex items-center gap-2"
					class:opacity-50={!allReviewed}
				>
					<span>{allReviewed ? 'Voir mes résultats' : 'Continuer vers les résultats'}</span>
					<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
						<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M13 7l5 5m0 0l-5 5m5-5H6" />
					</svg>
				</button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Loading state -->
	<div class="flex flex-col items-center justify-center min-h-[60vh]">
		<div class="relative w-16 h-16">
			<div class="absolute inset-0 rounded-full border-2 border-base-800"></div>
			<div class="absolute inset-0 rounded-full border-2 border-accent-500 border-t-transparent animate-spin"></div>
		</div>
		<p class="mt-6 text-base-500 text-sm">Chargement des suggestions...</p>
	</div>
{/if}

<style>
	.line-clamp-2 {
		display: -webkit-box;
		-webkit-line-clamp: 2;
		-webkit-box-orient: vertical;
		overflow: hidden;
	}
</style>
