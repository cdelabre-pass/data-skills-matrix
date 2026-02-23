<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let categories: Array<{
		id: string;
		name: string;
		skill_count: number;
	}>;
	export let selectedRole: string | null;
	export let skills: any[];

	const dispatch = createEventDispatcher<{ select: string[] }>();

	let selected: Set<string> = new Set();

	const categoryIcons: Record<string, string> = {
		analytics: '📊',
		engineering: '⚙️',
		ml: '🤖',
		ops: '🔄',
		compliance: '🔒',
		business: '💼',
	};

	const categoryColors: Record<string, string> = {
		analytics: 'from-blue-500/20 to-cyan-500/20 border-blue-500/50',
		engineering: 'from-orange-500/20 to-amber-500/20 border-orange-500/50',
		ml: 'from-rose-500/20 to-pink-500/20 border-rose-500/50',
		ops: 'from-emerald-500/20 to-teal-500/20 border-emerald-500/50',
		compliance: 'from-violet-500/20 to-purple-500/20 border-violet-500/50',
		business: 'from-slate-500/20 to-zinc-500/20 border-slate-500/50',
	};

	function getRelevantSkillCount(categoryId: string): number {
		return skills.filter((skill) => {
			if (skill.category !== categoryId) return false;
			if (selectedRole) {
				// Role-specific: filter by role
				const hasLevels = skill.levels && skill.levels[selectedRole];
				const isCore = skill.core_roles?.includes(selectedRole);
				return hasLevels || isCore;
			} else {
				// Role-agnostic: include all skills with any levels
				return skill.levels && Object.keys(skill.levels).length > 0;
			}
		}).length;
	}

	function toggleCategory(categoryId: string) {
		if (selected.has(categoryId)) {
			selected.delete(categoryId);
		} else {
			selected.add(categoryId);
		}
		selected = selected;
	}

	function selectAll() {
		selected = new Set(
			categories.map((c) => c.id).filter((id) => getRelevantSkillCount(id) > 0),
		);
	}

	function selectNone() {
		selected = new Set();
	}

	const MIN_CATEGORIES = 3;

	function confirm() {
		if (selected.size >= MIN_CATEGORIES) {
			dispatch('select', Array.from(selected));
		}
	}

	$: canContinue = selected.size >= MIN_CATEGORIES;
	$: remainingToSelect = MIN_CATEGORIES - selected.size;

	$: totalSkills = Array.from(selected).reduce(
		(sum, catId) => sum + getRelevantSkillCount(catId),
		0,
	);
	$: estimatedMinutes = Math.ceil(totalSkills * 0.5);
</script>

<div class="space-y-8">
	<div class="text-center">
		<h2 class="text-2xl md:text-3xl font-bold text-base-100 mb-3">
			Domaines à évaluer
		</h2>
		<p class="text-base-400">
			Sélectionnez au moins {MIN_CATEGORIES} catégories pour obtenir un radar complet
			et une évaluation pertinente.
		</p>
	</div>

	<!-- Quick actions -->
	<div class="flex justify-center gap-2">
		<button on:click={selectAll} class="btn btn-ghost text-sm">
			Tout sélectionner
		</button>
		<span class="text-base-700">|</span>
		<button on:click={selectNone} class="btn btn-ghost text-sm">
			Tout désélectionner
		</button>
	</div>

	<!-- Category grid -->
	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each categories as category, i}
			{@const relevantCount = getRelevantSkillCount(category.id)}
			{@const isSelected = selected.has(category.id)}
			{@const hasSkills = relevantCount > 0}

			<button
				on:click={() => hasSkills && toggleCategory(category.id)}
				disabled={!hasSkills}
				class="group relative card p-5 text-left transition-all duration-300 overflow-hidden
					{isSelected ? 'border-accent-500/50 bg-accent-500/5' : 'border-base-800/80'}
					{hasSkills ? 'card-interactive' : 'opacity-40 cursor-not-allowed'}"
				style="animation-delay: {i * 50}ms"
			>
				<!-- Gradient background when selected -->
				{#if isSelected}
					<div
						class="absolute inset-0 bg-gradient-to-br {categoryColors[
							category.id
						] || 'from-accent-500/20 to-accent-600/20'} opacity-50"
					></div>
				{/if}

				<div class="relative flex items-center gap-4">
					<!-- Icon -->
					<div
						class="w-12 h-12 rounded-xl flex items-center justify-center transition-all duration-200
						{isSelected ? 'bg-accent-500/20 scale-110' : 'bg-base-800'}"
					>
						<span class="text-2xl">{categoryIcons[category.id] || '📁'}</span>
					</div>

					<!-- Content -->
					<div class="flex-1 min-w-0">
						<h3 class="font-semibold text-base-100 mb-0.5">{category.name}</h3>
						<p class="text-sm text-base-500">
							<span class="font-mono">{relevantCount}</span> compétences
						</p>
					</div>

					<!-- Checkbox -->
					<div
						class="w-6 h-6 rounded-lg border-2 flex items-center justify-center transition-all duration-200
						{isSelected
							? 'border-accent-500 bg-accent-500'
							: 'border-base-600 group-hover:border-base-500'}"
					>
						{#if isSelected}
							<svg
								class="w-4 h-4 text-white animate-scale-in"
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
						{/if}
					</div>
				</div>
			</button>
		{/each}
	</div>

	<!-- Summary and confirm -->
	{#if selected.size > 0}
		<div
			class="card p-6 {canContinue
				? 'border-accent-500/20 bg-accent-500/5'
				: 'border-amber-500/20 bg-amber-500/5'} animate-fade-in-up"
		>
			<div class="flex flex-col sm:flex-row items-center justify-between gap-4">
				<div class="flex items-center gap-4">
					<div
						class="w-12 h-12 rounded-xl {canContinue
							? 'bg-accent-500/20'
							: 'bg-amber-500/20'} flex items-center justify-center"
					>
						<span
							class="font-mono font-bold text-xl {canContinue
								? 'text-accent-400'
								: 'text-amber-400'}">{totalSkills}</span
						>
					</div>
					<div>
						<p class="font-medium text-base-100">compétences sélectionnées</p>
						{#if canContinue}
							<p class="text-sm text-base-500">
								Durée estimée : ~{estimatedMinutes} min
							</p>
						{:else}
							<p class="text-sm text-amber-400">
								Encore {remainingToSelect} domaine{remainingToSelect > 1
									? 's'
									: ''} à sélectionner pour le radar
							</p>
						{/if}
					</div>
				</div>
				<button
					on:click={confirm}
					disabled={!canContinue}
					class="btn btn-lg w-full sm:w-auto {canContinue
						? 'btn-primary shadow-glow'
						: 'btn-ghost opacity-50 cursor-not-allowed'}"
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
			</div>
		</div>
	{/if}
</div>
