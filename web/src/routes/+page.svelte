<script lang="ts">
	import { onMount } from 'svelte';
	import { assessmentStore, type AssessmentMode } from '$lib/stores/assessment';
	import RoleSelector from '$lib/components/RoleSelector.svelte';
	import CategoryPicker from '$lib/components/CategoryPicker.svelte';

	function autoFocus(node: HTMLElement) {
		node.focus();
	}

	let skillsData: any = null;
	let step: 'welcome' | 'name' | 'role' | 'categories' | 'mode' | 'ready' =
		'welcome';
	let userName: string = '';
	let selectedRole: string | null = null;
	let selectedCategories: string[] = [];
	let selectedMode: AssessmentMode = 'quick';
	let mounted = false;
	let hasSavedSession = false;
	let savedSessionInfo: {
		name: string | null;
		role: string | null;
		answered: number;
		total: number;
		mode?: AssessmentMode;
	} | null = null;

	onMount(async () => {
		const response = await fetch('/data/skills-data.json');
		skillsData = await response.json();

		// Check for saved session (role can be null in role-agnostic mode)
		const saved = assessmentStore.load();
		if (saved && saved.skills.length > 0) {
			hasSavedSession = true;
			// Only count answers for skills in the current assessment (exclude inferred for other skills)
			const skillIds = new Set(saved.skills.map((s: any) => s.id));
			const relevantAnswerCount = Object.values(saved.answers).filter(
				(a: any) => skillIds.has(a.skillId),
			).length;
			savedSessionInfo = {
				name: saved.name,
				role: saved.role,
				answered: relevantAnswerCount,
				total: saved.skills.length,
				mode: saved.mode,
			};
			userName = saved.name || '';
			selectedRole = saved.role;
			selectedCategories = saved.categories;
			selectedMode = saved.mode || 'standard';
			// Reload skills data reference for inference
			assessmentStore.setSkillsData(skillsData);
		}
		mounted = true;
	});

	function resumeSession() {
		if (
			savedSessionInfo &&
			savedSessionInfo.answered > 0 &&
			savedSessionInfo.answered === savedSessionInfo.total
		) {
			// Assessment complete, go to results
			window.location.href = '/results';
		} else {
			// Resume assessment
			window.location.href = '/assessment';
		}
	}

	function startNew() {
		assessmentStore.clear();
		hasSavedSession = false;
		savedSessionInfo = null;
		userName = '';
		selectedRole = null;
		selectedCategories = [];
		step = 'name';
	}

	function handleNameSubmit() {
		if (userName.trim()) {
			step = 'role';
		}
	}

	function handleRoleSelected(event: CustomEvent<string | null>) {
		selectedRole = event.detail;
		step = 'categories';
	}

	function handleCategoriesSelected(event: CustomEvent<string[]>) {
		selectedCategories = event.detail;
		step = 'mode';
	}

	function selectMode(mode: AssessmentMode) {
		selectedMode = mode;
		step = 'ready';
	}

	function startAssessment() {
		if (userName.trim() && selectedCategories.length > 0) {
			assessmentStore.init(
				userName.trim(),
				selectedRole,
				selectedCategories,
				skillsData,
				selectedMode,
			);
			window.location.href = '/assessment';
		}
	}

	function goBack() {
		if (step === 'role') step = 'name';
		else if (step === 'categories') step = 'role';
		else if (step === 'mode') step = 'categories';
		else if (step === 'ready') step = 'mode';
	}

	// Calculate estimated skill counts for mode selection
	$: estimatedCounts = (() => {
		if (!skillsData || selectedCategories.length === 0) {
			return { quick: 0, standard: 0 };
		}

		if (selectedRole) {
			// Role-specific mode
			const role = selectedRole;
			const coreSkillIds = skillsData.core_skills_by_role?.[role] || [];
			// Quick mode: all core skills for the role, regardless of selected categories
			const coreSkills = skillsData.skills.filter((skill: any) => {
				return skill.core_roles?.includes(role);
			});
			const standardSkills = skillsData.skills.filter((skill: any) => {
				if (!selectedCategories.includes(skill.category)) return false;
				const hasLevels = skill.levels && skill.levels[role];
				const isCore = skill.core_roles?.includes(role);
				return hasLevels || isCore;
			});
			return {
				quick: coreSkills.length,
				standard: standardSkills.length,
			};
		} else {
			// Role-agnostic mode: all skills across all roles
			const allCoreSkillIds = new Set<string>();
			const coreSkillsByRole = skillsData.core_skills_by_role || {};
			for (const roleSkills of Object.values(coreSkillsByRole) as string[][]) {
				for (const skillId of roleSkills) {
					allCoreSkillIds.add(skillId);
				}
			}

			// Quick mode: all core skills regardless of selected categories
			const coreSkills = skillsData.skills.filter((s: any) =>
				allCoreSkillIds.has(s.id),
			);
			const standardSkills = skillsData.skills.filter((skill: any) => {
				if (!selectedCategories.includes(skill.category)) return false;
				return skill.levels && Object.keys(skill.levels).length > 0;
			});
			return {
				quick: coreSkills.length,
				standard: standardSkills.length,
			};
		}
	})();

	$: selectedRoleData = skillsData?.roles?.find(
		(r: any) => r.id === selectedRole,
	);
</script>

<svelte:head>
	<title>Data Compass - Faites le point sur vos compétences data</title>
</svelte:head>

<!-- Hero gradient overlay -->
<div class="hero-gradient absolute inset-0 pointer-events-none"></div>

<div class="relative">
	<!-- Hero Section -->
	{#if step === 'welcome' || step === 'name'}
		<section class="px-6 pt-20 pb-16">
			<div class="max-w-4xl mx-auto text-center">
				<!-- Compass Logo -->
				<div class="relative w-24 h-24 mx-auto mb-8 opacity-0 animate-fade-in">
					<div
						class="absolute inset-0 rounded-full bg-accent-500/20 animate-pulse-soft"
					></div>
					<div
						class="relative w-full h-full rounded-full bg-gradient-to-br from-base-800 to-base-900 border-2 border-accent-500/30 flex items-center justify-center shadow-glow"
					>
						<span class="text-5xl">🧭</span>
					</div>
				</div>

				<h1
					class="text-display-lg md:text-display-xl text-base-100 mb-6 opacity-0 animate-fade-in-up animation-delay-100"
				>
					Faites le point sur vos<br />
					<span class="text-gradient">compétences data</span>
				</h1>

				<p
					class="text-lg md:text-xl text-base-400 max-w-2xl mx-auto leading-relaxed opacity-0 animate-fade-in-up animation-delay-200"
				>
					Évaluez vos forces, identifiez vos axes de progression et recevez des
					recommandations personnalisées.
				</p>
			</div>
		</section>
	{/if}

	<!-- Main content -->
	<div class="max-w-5xl mx-auto px-6 pb-20">
		{#if !skillsData || !mounted}
			<!-- Loading state -->
			<div class="flex flex-col items-center justify-center py-20">
				<div class="relative w-16 h-16">
					<div
						class="absolute inset-0 rounded-full border-2 border-base-800"
					></div>
					<div
						class="absolute inset-0 rounded-full border-2 border-accent-500 border-t-transparent animate-spin"
					></div>
				</div>
				<p class="mt-6 text-base-500 text-sm">Chargement des données...</p>
			</div>
		{:else if step === 'welcome'}
			<div
				class="max-w-xl mx-auto space-y-6 opacity-0 animate-fade-in-up animation-delay-400"
			>
				<!-- Resume session card -->
				{#if hasSavedSession && savedSessionInfo}
					<div class="card p-6 border-accent-500/30 bg-accent-500/5">
						<div class="flex items-start gap-4">
							<div
								class="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0"
							>
								<svg
									class="w-6 h-6 text-accent-400"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
									/>
								</svg>
							</div>
							<div class="flex-1">
								<h3 class="font-bold text-base-100 mb-1">Session en cours</h3>
								<p class="text-sm text-base-400 mb-3">
									{#if savedSessionInfo.name}
										<span class="text-accent-400">{savedSessionInfo.name}</span> •
									{/if}
									{savedSessionInfo.answered}/{savedSessionInfo.total} questions répondues
								</p>
								<div class="flex gap-3">
									<button on:click={resumeSession} class="btn btn-primary">
										{savedSessionInfo.answered === savedSessionInfo.total
											? 'Voir les résultats'
											: 'Reprendre'}
									</button>
									<button
										on:click={startNew}
										class="btn btn-ghost text-base-400"
									>
										Recommencer
									</button>
								</div>
							</div>
						</div>
					</div>
				{/if}

				<!-- Start new assessment -->
				<button
					on:click={() => (step = 'name')}
					class="card card-interactive p-6 w-full text-left group"
				>
					<div class="flex items-center gap-4">
						<div
							class="w-12 h-12 rounded-xl bg-base-800 group-hover:bg-accent-500/20 flex items-center justify-center transition-colors"
						>
							<svg
								class="w-6 h-6 text-base-400 group-hover:text-accent-400 transition-colors"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M12 4v16m8-8H4"
								/>
							</svg>
						</div>
						<div class="flex-1">
							<h3
								class="font-bold text-base-100 group-hover:text-white transition-colors"
							>
								{hasSavedSession
									? 'Nouvelle évaluation'
									: "Commencer l'évaluation"}
							</h3>
							<p class="text-sm text-base-400">
								Démarrer une auto-évaluation de vos compétences
							</p>
						</div>
						<svg
							class="w-5 h-5 text-base-500 group-hover:text-accent-400 group-hover:translate-x-1 transition-all"
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
					</div>
				</button>
			</div>
		{:else if step === 'name'}
			<div class="max-w-md mx-auto animate-fade-in">
				<div class="card p-8">
					<div class="text-center mb-8">
						<div
							class="w-16 h-16 rounded-2xl bg-accent-500/10 border border-accent-500/20 flex items-center justify-center mx-auto mb-4"
						>
							<svg
								class="w-8 h-8 text-accent-400"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"
								/>
							</svg>
						</div>
						<h2 class="text-2xl font-bold text-base-100 mb-2">
							Comment vous appelez-vous ?
						</h2>
						<p class="text-base-400">
							Votre nom apparaîtra sur les résultats de l'évaluation.
						</p>
					</div>

					<form on:submit|preventDefault={handleNameSubmit} class="space-y-6">
						<div>
							<label
								for="name"
								class="block text-sm font-medium text-base-300 mb-2"
								>Prénom et nom</label
							>
							<input
								id="name"
								type="text"
								bind:value={userName}
								placeholder="Ex: Marie Dupont"
								class="input text-lg"
								use:autoFocus
							/>
						</div>

						<button
							type="submit"
							disabled={!userName.trim()}
							class="btn btn-primary w-full btn-lg shadow-glow"
						>
							Continuer
							<svg
								class="w-5 h-5 ml-2 inline"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 7l5 5m0 0l-5 5m5-5H6"
								/>
							</svg>
						</button>
					</form>
				</div>
			</div>
		{:else if step === 'role'}
			<div class="space-y-6 animate-fade-in">
				<button
					on:click={goBack}
					class="btn btn-ghost flex items-center gap-2 -ml-2"
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
					Retour
				</button>

				<!-- User greeting -->
				<div class="text-center mb-4">
					<p class="text-base-400">
						Bienvenue <span class="text-accent-400 font-medium">{userName}</span
						>
					</p>
				</div>

				<RoleSelector roles={skillsData.roles} on:select={handleRoleSelected} />
			</div>
		{:else if step === 'categories'}
			<div class="space-y-8 animate-fade-in">
				<button
					on:click={goBack}
					class="btn btn-ghost flex items-center gap-2 -ml-2"
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
					Retour
				</button>

				<!-- Selected role/mode display -->
				<div class="card p-6 border-accent-500/20 bg-accent-500/5">
					<div class="flex items-center gap-4">
						<div
							class="w-12 h-12 rounded-xl bg-accent-500/20 flex items-center justify-center"
						>
							{#if selectedRole}
								<svg
									class="w-6 h-6 text-accent-400"
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
							{:else}
								<span class="text-xl">🎯</span>
							{/if}
						</div>
						<div>
							<p class="text-sm text-base-500">
								{selectedRole ? 'Rôle sélectionné' : 'Mode sélectionné'}
							</p>
							<p class="font-bold text-lg text-base-100">
								{selectedRole
									? selectedRoleData?.name
									: 'Évaluation multi-domaines'}
							</p>
						</div>
					</div>
				</div>

				<CategoryPicker
					categories={skillsData.categories}
					{selectedRole}
					skills={skillsData.skills}
					on:select={handleCategoriesSelected}
				/>
			</div>
		{:else if step === 'mode'}
			<div class="max-w-2xl mx-auto space-y-8 animate-fade-in">
				<button
					on:click={goBack}
					class="btn btn-ghost flex items-center gap-2 -ml-2"
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
					Retour
				</button>

				<div class="text-center mb-8">
					<h2 class="text-2xl font-bold text-base-100 mb-2">
						Choisissez votre mode
					</h2>
					<p class="text-base-400">
						Le mode standard est recommandé pour la revue annuelle. Le mode
						rapide convient aux points trimestriels.
					</p>
				</div>

				<div class="grid gap-4">
					<!-- Quick Mode -->
					<button
						on:click={() => selectMode('quick')}
						class="card card-interactive p-6 text-left group border-2 transition-all duration-200"
						class:border-accent-500={selectedMode === 'quick'}
						class:border-transparent={selectedMode !== 'quick'}
					>
						<div class="flex items-start gap-4">
							<div
								class="w-14 h-14 rounded-xl bg-accent-500/20 flex items-center justify-center flex-shrink-0"
							>
								<svg
									class="w-7 h-7 text-accent-400"
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
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-bold text-lg text-base-100">Mode Rapide</h3>
									<span
										class="px-2 py-0.5 text-xs font-medium bg-base-600 text-base-300 rounded-full"
										>Revue trimestrielle</span
									>
								</div>
								<p class="text-base-400 text-sm mb-3">
									{estimatedCounts.quick} compétences clés évaluées en 10-15 min.
									Les autres niveaux sont suggérés automatiquement.
								</p>
								<div class="flex items-center gap-4 text-xs text-base-500">
									<span class="flex items-center gap-1">
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
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										10-15 min
									</span>
									<span class="flex items-center gap-1">
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
												d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
											/>
										</svg>
										Suggestions intelligentes
									</span>
								</div>
							</div>
							{#if selectedMode === 'quick'}
								<div
									class="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0"
								>
									<svg
										class="w-5 h-5 text-white"
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

					<!-- Standard Mode -->
					<button
						on:click={() => selectMode('standard')}
						class="card card-interactive p-6 text-left group border-2 transition-all duration-200"
						class:border-accent-500={selectedMode === 'standard'}
						class:border-transparent={selectedMode !== 'standard'}
					>
						<div class="flex items-start gap-4">
							<div
								class="w-14 h-14 rounded-xl bg-base-700 flex items-center justify-center flex-shrink-0"
							>
								<svg
									class="w-7 h-7 text-base-300"
									fill="none"
									stroke="currentColor"
									viewBox="0 0 24 24"
								>
									<path
										stroke-linecap="round"
										stroke-linejoin="round"
										stroke-width="2"
										d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4"
									/>
								</svg>
							</div>
							<div class="flex-1">
								<div class="flex items-center gap-2 mb-1">
									<h3 class="font-bold text-lg text-base-100">Mode Standard</h3>
									<span
										class="px-2 py-0.5 text-xs font-medium bg-accent-500/20 text-accent-400 rounded-full"
										>Revue annuelle</span
									>
								</div>
								<p class="text-base-400 text-sm mb-3">
									Toutes les {estimatedCounts.standard} compétences de votre rôle.
									Évaluation complète et détaillée.
								</p>
								<div class="flex items-center gap-4 text-xs text-base-500">
									<span class="flex items-center gap-1">
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
												d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"
											/>
										</svg>
										25-35 min
									</span>
									<span class="flex items-center gap-1">
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
												d="M9 12l2 2 4-4M7.835 4.697a3.42 3.42 0 001.946-.806 3.42 3.42 0 014.438 0 3.42 3.42 0 001.946.806 3.42 3.42 0 013.138 3.138 3.42 3.42 0 00.806 1.946 3.42 3.42 0 010 4.438 3.42 3.42 0 00-.806 1.946 3.42 3.42 0 01-3.138 3.138 3.42 3.42 0 00-1.946.806 3.42 3.42 0 01-4.438 0 3.42 3.42 0 00-1.946-.806 3.42 3.42 0 01-3.138-3.138 3.42 3.42 0 00-.806-1.946 3.42 3.42 0 010-4.438 3.42 3.42 0 00.806-1.946 3.42 3.42 0 013.138-3.138z"
											/>
										</svg>
										Couverture complète
									</span>
								</div>
							</div>
							{#if selectedMode === 'standard'}
								<div
									class="w-8 h-8 rounded-full bg-accent-500 flex items-center justify-center flex-shrink-0"
								>
									<svg
										class="w-5 h-5 text-white"
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
		{:else if step === 'ready'}
			<div class="max-w-2xl mx-auto animate-scale-in">
				<div class="card p-10 text-center border-accent-500/20">
					<!-- Success icon -->
					<div class="relative w-20 h-20 mx-auto mb-8">
						<div
							class="absolute inset-0 rounded-full bg-accent-500/20 animate-ping"
						></div>
						<div
							class="relative w-full h-full rounded-full bg-gradient-to-br from-accent-500 to-accent-600 flex items-center justify-center shadow-glow"
						>
							<svg
								class="w-10 h-10 text-white"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2.5"
									d="M5 13l4 4L19 7"
								/>
							</svg>
						</div>
					</div>

					<h2 class="text-display text-base-100 mb-2">Prêt à commencer</h2>
					<p class="text-base-400 mb-10">
						Votre évaluation est configurée, <span class="text-accent-400"
							>{userName}</span
						>.
					</p>

					<!-- Summary cards -->
					<div class="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-10">
						<div
							class="p-5 rounded-xl bg-base-800/50 border border-base-700/50 text-left"
						>
							<p class="text-xs text-base-500 uppercase tracking-wider mb-1">
								Nom
							</p>
							<p class="font-bold text-base-100 truncate">{userName}</p>
						</div>
						<div
							class="p-5 rounded-xl bg-base-800/50 border border-base-700/50 text-left"
						>
							<p class="text-xs text-base-500 uppercase tracking-wider mb-1">
								{selectedRole ? 'Rôle' : 'Mode'}
							</p>
							<p class="font-bold text-base-100 truncate">
								{selectedRole ? selectedRoleData?.name : 'Multi-domaines'}
							</p>
						</div>
						<div
							class="p-5 rounded-xl bg-base-800/50 border border-base-700/50 text-left"
						>
							<p class="text-xs text-base-500 uppercase tracking-wider mb-1">
								Mode
							</p>
							<p class="font-bold text-base-100">
								{selectedMode === 'quick' ? 'Rapide' : 'Standard'}
							</p>
						</div>
						<div
							class="p-5 rounded-xl bg-base-800/50 border border-base-700/50 text-left"
						>
							<p class="text-xs text-base-500 uppercase tracking-wider mb-1">
								Compétences
							</p>
							<p class="font-bold text-base-100">
								{selectedMode === 'quick'
									? estimatedCounts.quick
									: estimatedCounts.standard}
							</p>
						</div>
					</div>

					<!-- Actions -->
					<div class="flex flex-col sm:flex-row justify-center gap-4">
						<button on:click={goBack} class="btn btn-secondary">
							Modifier la sélection
						</button>
						<button
							on:click={startAssessment}
							class="btn btn-primary btn-lg shadow-glow"
						>
							Commencer l'évaluation
							<svg
								class="w-5 h-5 ml-2 inline"
								fill="none"
								stroke="currentColor"
								viewBox="0 0 24 24"
							>
								<path
									stroke-linecap="round"
									stroke-linejoin="round"
									stroke-width="2"
									d="M13 7l5 5m0 0l-5 5m5-5H6"
								/>
							</svg>
						</button>
					</div>
				</div>
			</div>
		{/if}
	</div>
</div>
