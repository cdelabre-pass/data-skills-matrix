<script lang="ts">
	import { onMount } from 'svelte';
	import {
		assessmentStore,
		currentSkill,
		currentSkillGroup,
		assessmentProgress,
		groupProgress,
	} from '$lib/stores/assessment';
	import SkillQuestion from '$lib/components/SkillQuestion.svelte';
	import ProgressBar from '$lib/components/ProgressBar.svelte';

	let ready = false;
	let skillsData: any = null;
	let showGroupTransition = false;
	let showInferenceNotification = false;
	let lastInferredSkills: string[] = [];

	onMount(async () => {
		// Load skills data for inference
		const response = await fetch('/data/skills-data.json');
		skillsData = await response.json();

		const saved = assessmentStore.load();
		// Note: saved.role can be null in role-agnostic mode, so we don't check for it
		if (!saved || saved.skills.length === 0) {
			window.location.href = '/';
			return;
		}
		// Set skills data reference for inference calculations
		assessmentStore.setSkillsData(skillsData);
		ready = true;
	});

	// Get inference for current skill if available
	$: currentInference = $currentSkill
		? $assessmentStore.inferences[$currentSkill.id] || null
		: null;

	// Show group transition animation when entering new group
	$: if (
		$currentSkillGroup?.isNewGroup &&
		$assessmentStore.currentSkillIndex > 0
	) {
		showGroupTransition = true;
		setTimeout(() => (showGroupTransition = false), 2000);
	}

	// Get names of inferred skills
	function getInferredSkillNames(skillIds: string[]): string[] {
		return skillIds.map((id) => {
			const skill = $assessmentStore.skills.find((s) => s.id === id);
			return skill?.name || id;
		});
	}

	function handleAnswer(
		event: CustomEvent<{ skillId: string; level: number | 'nc' }>,
	) {
		const { skillId, level } = event.detail;

		// Track current inferred skills before answer
		const beforeInferred = Object.values($assessmentStore.answers)
			.filter((a) => a.inferred)
			.map((a) => a.skillId);

		assessmentStore.answer(skillId, level);

		// Check for newly inferred skills
		const afterInferred = Object.values($assessmentStore.answers)
			.filter((a) => a.inferred)
			.map((a) => a.skillId);

		const newlyInferred = afterInferred.filter(
			(id) => !beforeInferred.includes(id),
		);

		if (newlyInferred.length > 0) {
			lastInferredSkills = newlyInferred;
			showInferenceNotification = true;
			setTimeout(() => {
				showInferenceNotification = false;
			}, 4000);
		}

		setTimeout(() => {
			if (
				$assessmentStore.currentSkillIndex <
				$assessmentStore.skills.length - 1
			) {
				assessmentStore.nextSkill();
			} else if ($assessmentProgress.answered === $assessmentProgress.total) {
				goToNextStep();
			}
		}, 300);
	}

	function goToNextStep() {
		// Check if there are inferences to review
		const hasInferences = Object.keys($assessmentStore.inferences).some(
			(skillId) => {
				const answer = $assessmentStore.answers[skillId];
				return !answer || answer.inferred;
			},
		);

		if (hasInferences) {
			window.location.href = '/assessment/review';
		} else {
			assessmentStore.complete();
			window.location.href = '/results';
		}
	}

	function finishAssessment() {
		goToNextStep();
	}

	// Group icon mapping
	const groupIcons: Record<string, string> = {
		sql_query:
			'M4 7v10c0 2 1 3 3 3h10c2 0 3-1 3-3V7c0-2-1-3-3-3H7c-2 0-3 1-3 3zm3 0h10v10H7V7zm2 2v2h2V9H9zm4 0v2h2V9h-2zm-4 4v2h6v-2H9z',
		python_ecosystem:
			'M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm-1-4h2v2h-2v-2zm0-8h2v6h-2V8z',
		transformation: 'M7 7h10v2H7V7zm0 4h10v2H7v-2zm0 4h7v2H7v-2z',
		devops:
			'M19.14 12.94c.04-.31.06-.63.06-.94 0-.31-.02-.63-.06-.94l2.03-1.58c.18-.14.23-.41.12-.61l-1.92-3.32c-.12-.22-.37-.29-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54c-.04-.24-.24-.41-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.04.31-.06.63-.06.94s.02.63.06.94l-2.03 1.58c-.18.14-.23.41-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z',
		ml_core:
			'M12 2a10 10 0 100 20 10 10 0 000-20zm0 18a8 8 0 110-16 8 8 0 010 16zm-1-13h2v6h-2V7zm0 8h2v2h-2v-2z',
		soft_skills:
			'M16 11c1.66 0 2.99-1.34 2.99-3S17.66 5 16 5c-1.66 0-3 1.34-3 3s1.34 3 3 3zm-8 0c1.66 0 2.99-1.34 2.99-3S9.66 5 8 5C6.34 5 5 6.34 5 8s1.34 3 3 3zm0 2c-2.33 0-7 1.17-7 3.5V19h14v-2.5c0-2.33-4.67-3.5-7-3.5zm8 0c-.29 0-.62.02-.97.05 1.16.84 1.97 1.97 1.97 3.45V19h6v-2.5c0-2.33-4.67-3.5-7-3.5z',
	};
</script>

<svelte:head>
	<title>Évaluation en cours - Skills Matrix</title>
</svelte:head>

<!-- Background gradient -->
<div
	class="hero-gradient absolute inset-0 pointer-events-none opacity-50"
></div>

{#if ready && $currentSkill}
	<div class="relative max-w-4xl mx-auto px-4 sm:px-6 py-4">
		<!-- Progress -->
		<div class="mb-4 animate-fade-in-down">
			<ProgressBar
				current={$assessmentProgress.answered}
				total={$assessmentProgress.total}
				currentIndex={$assessmentStore.currentSkillIndex}
				groupProgress={$groupProgress}
			/>

			<!-- Inference count indicator -->
			{#if $assessmentProgress.inferredCount > 0}
				<div class="mt-3 flex justify-center">
					<div
						class="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-amber-500/10 border border-amber-500/30 text-xs"
					>
						<svg
							class="w-4 h-4 text-amber-400"
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
						<span class="text-amber-400">
							<span class="font-bold">{$assessmentProgress.inferredCount}</span>
							compétence{$assessmentProgress.inferredCount > 1 ? 's' : ''} inférée{$assessmentProgress.inferredCount >
							1
								? 's'
								: ''}
						</span>
					</div>
				</div>
			{/if}
		</div>

		<!-- Inference notification toast -->
		{#if showInferenceNotification && lastInferredSkills.length > 0}
			<div class="fixed top-4 right-4 z-50 max-w-sm animate-slide-in-right">
				<div
					class="card p-4 bg-gradient-to-r from-amber-500/20 to-amber-500/5 border-amber-500/30 shadow-lg"
				>
					<div class="flex items-start gap-3">
						<div
							class="w-8 h-8 rounded-lg bg-amber-500/20 flex items-center justify-center flex-shrink-0"
						>
							<svg
								class="w-4 h-4 text-amber-400"
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
						</div>
						<div class="flex-1 min-w-0">
							<p class="text-sm font-medium text-amber-400">
								{lastInferredSkills.length} compétence{lastInferredSkills.length >
								1
									? 's'
									: ''} inférée{lastInferredSkills.length > 1 ? 's' : ''}
							</p>
							<p class="text-xs text-base-400 mt-1">
								{getInferredSkillNames(lastInferredSkills)
									.slice(0, 2)
									.join(', ')}
								{#if lastInferredSkills.length > 2}
									<span class="text-base-500"
										>+{lastInferredSkills.length - 2} autre{lastInferredSkills.length -
											2 >
										1
											? 's'
											: ''}</span
									>
								{/if}
							</p>
						</div>
						<button
							on:click={() => (showInferenceNotification = false)}
							class="text-base-500 hover:text-base-300 transition-colors"
							aria-label="Fermer"
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
									d="M6 18L18 6M6 6l12 12"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/if}

		<!-- Group transition banner -->
		{#if showGroupTransition && $currentSkillGroup}
			<div
				class="mb-6 p-4 rounded-xl bg-gradient-to-r from-accent-500/10 to-transparent border border-accent-500/20 animate-fade-in"
			>
				<div class="flex items-center gap-3">
					<div
						class="w-10 h-10 rounded-lg bg-accent-500/20 flex items-center justify-center"
					>
						<svg
							class="w-5 h-5 text-accent-400"
							fill="currentColor"
							viewBox="0 0 24 24"
						>
							<path
								d={groupIcons[$currentSkillGroup.groupId || 'devops'] ||
									groupIcons.devops}
							/>
						</svg>
					</div>
					<div>
						<p class="text-sm text-accent-400 font-medium">Nouveau groupe</p>
						<p class="text-base-100 font-bold">
							{$currentSkillGroup.groupName}
						</p>
					</div>
				</div>
			</div>
		{/if}

		<!-- Current group indicator (always visible, compact) -->
		{#if $currentSkillGroup && !showGroupTransition}
			<div class="mb-2 flex items-center gap-2 text-sm">
				<span class="text-base-500">{$currentSkillGroup.groupName}</span>
				<span class="text-base-600">•</span>
				<span class="text-base-400">
					{$currentSkillGroup.currentInGroup}/{$currentSkillGroup.totalInGroup}
				</span>
				{#if $currentSkill.isCore}
					<span
						class="px-2 py-0.5 text-xs bg-accent-500/20 text-accent-400 rounded-full"
					>
						Compétence clé
					</span>
				{/if}
			</div>
		{/if}

		<!-- Question card -->
		<div class="mb-4">
			<SkillQuestion
				skill={$currentSkill}
				currentAnswer={$assessmentStore.answers[$currentSkill.id]?.level}
				inference={currentInference}
				answeredCount={$assessmentProgress.manualCount}
				on:answer={handleAnswer}
			/>
		</div>

		<!-- Navigation -->
		<div class="flex justify-between items-center gap-4">
			<button
				on:click={() => assessmentStore.previousSkill()}
				disabled={$assessmentStore.currentSkillIndex === 0}
				class="btn btn-secondary flex items-center gap-2"
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
						d="M15 19l-7-7 7-7"
					/>
				</svg>
				<span class="hidden sm:inline">Précédent</span>
			</button>

			<!-- Question counter -->
			<div
				class="flex items-center gap-2 px-4 py-2 rounded-xl bg-base-800/50 border border-base-700/50"
			>
				<span class="font-mono text-sm text-base-400">
					<span class="text-accent-400 font-bold"
						>{$assessmentStore.currentSkillIndex + 1}</span
					>
					<span class="text-base-600 mx-1">/</span>
					<span>{$assessmentStore.skills.length}</span>
				</span>
			</div>

			{#if $assessmentStore.currentSkillIndex < $assessmentStore.skills.length - 1}
				<button
					on:click={() => assessmentStore.nextSkill()}
					class="btn btn-secondary flex items-center gap-2"
				>
					<span class="hidden sm:inline">Suivant</span>
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
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			{:else}
				<button
					on:click={finishAssessment}
					class="btn btn-primary flex items-center gap-2 shadow-glow"
				>
					<span>Résultats</span>
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
							d="M9 5l7 7-7 7"
						/>
					</svg>
				</button>
			{/if}
		</div>

		<!-- Early finish option -->
		{#if $assessmentProgress.answered > 0 && $assessmentProgress.answered < $assessmentProgress.total}
			<div class="mt-8 text-center animate-fade-in">
				<button
					on:click={finishAssessment}
					class="text-sm text-base-500 hover:text-base-300 transition-colors group"
				>
					<span
						class="border-b border-dashed border-base-600 group-hover:border-base-400"
					>
						Terminer maintenant
					</span>
					<span class="text-base-600 ml-2">
						({$assessmentProgress.answered}/{$assessmentProgress.total})
					</span>
				</button>
			</div>
		{/if}
	</div>
{:else}
	<!-- Loading state -->
	<div class="flex flex-col items-center justify-center min-h-[60vh]">
		<div class="relative w-16 h-16">
			<div class="absolute inset-0 rounded-full border-2 border-base-800"></div>
			<div
				class="absolute inset-0 rounded-full border-2 border-accent-500 border-t-transparent animate-spin"
			></div>
		</div>
		<p class="mt-6 text-base-500 text-sm">Chargement de l'évaluation...</p>
	</div>
{/if}

<style>
	@keyframes slide-in-right {
		from {
			opacity: 0;
			transform: translateX(100%);
		}
		to {
			opacity: 1;
			transform: translateX(0);
		}
	}

	:global(.animate-slide-in-right) {
		animation: slide-in-right 0.3s ease-out;
	}
</style>
