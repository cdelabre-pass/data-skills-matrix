<script lang="ts">
	import { createEventDispatcher } from 'svelte';

	export let roles: Array<{
		id: string;
		name: string;
		description?: string;
	}>;

	const dispatch = createEventDispatcher<{ select: string | null }>();

	const roleIcons: Record<string, string> = {
		data_analyst: '📊',
		analytics_eng: '🔧',
		data_engineer: '⚙️',
		ml_engineer: '🤖',
		data_scientist: '🔬',
		backend: '💻',
	};

	const roleDescriptions: Record<string, string> = {
		data_analyst: 'Analyse de données, insights business et reporting',
		analytics_eng: 'Modélisation de données et transformation avec dbt',
		data_engineer: 'Pipelines de données et infrastructure',
		data_scientist: 'Analyse statistique et modèles ML',
		ml_engineer: 'Systèmes ML et déploiement de modèles',
		backend: 'APIs et services backend',
	};

	const roleColors: Record<string, string> = {
		data_analyst: 'from-blue-500/20 to-cyan-500/20 hover:border-blue-500/50',
		analytics_eng:
			'from-violet-500/20 to-purple-500/20 hover:border-violet-500/50',
		data_engineer:
			'from-orange-500/20 to-amber-500/20 hover:border-orange-500/50',
		data_scientist:
			'from-emerald-500/20 to-teal-500/20 hover:border-emerald-500/50',
		ml_engineer: 'from-rose-500/20 to-pink-500/20 hover:border-rose-500/50',
		backend: 'from-slate-500/20 to-zinc-500/20 hover:border-slate-500/50',
	};

	function selectRole(roleId: string | null) {
		dispatch('select', roleId);
	}

	function getDescription(role: { id: string; description?: string }): string {
		return role.description || roleDescriptions[role.id] || '';
	}
</script>

<div class="space-y-8">
	<div class="text-center">
		<h2 class="text-2xl md:text-3xl font-bold text-base-100 mb-3">
			Sélectionnez votre rôle
		</h2>
		<p class="text-base-400">
			Choisissez le rôle qui correspond le mieux à votre poste actuel.
		</p>
	</div>

	<!-- Role-agnostic option -->
	<button
		on:click={() => selectRole(null)}
		class="group relative card card-interactive p-6 w-full text-left overflow-hidden border-2 border-dashed border-base-600 hover:border-accent-500/50"
	>
		<div
			class="absolute inset-0 bg-gradient-to-br from-accent-500/10 to-purple-500/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300"
		></div>

		<div class="relative flex items-center gap-4">
			<div
				class="w-14 h-14 rounded-2xl bg-gradient-to-br from-accent-500/20 to-purple-500/20 border border-accent-500/30 flex items-center justify-center group-hover:scale-110 transition-all duration-300"
			>
				<span class="text-2xl">🎯</span>
			</div>

			<div class="flex-1">
				<div class="flex items-center gap-2 mb-1">
					<h3
						class="font-bold text-lg text-base-100 group-hover:text-white transition-colors"
					>
						Évaluer tous les domaines
					</h3>
					<span
						class="px-2 py-0.5 text-xs font-medium bg-accent-500/20 text-accent-400 rounded-full"
						>Nouveau</span
					>
				</div>
				<p
					class="text-sm text-base-400 group-hover:text-base-300 transition-colors"
				>
					Pas de rôle précis ? Évaluez vos compétences et découvrez votre profil
					par domaine.
				</p>
			</div>

			<svg
				class="w-5 h-5 text-base-500 group-hover:text-accent-400 group-hover:translate-x-1 transition-all flex-shrink-0"
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
		</div>
	</button>

	<div class="relative flex items-center gap-4 py-2">
		<div class="flex-1 border-t border-base-700"></div>
		<span class="text-sm text-base-500">ou choisissez un rôle spécifique</span>
		<div class="flex-1 border-t border-base-700"></div>
	</div>

	<div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
		{#each roles as role, i}
			<button
				on:click={() => selectRole(role.id)}
				class="group relative card card-interactive p-6 text-left overflow-hidden stagger-{i +
					1} opacity-0 animate-fade-in-up"
				style="animation-delay: {i * 80}ms"
			>
				<!-- Gradient background on hover -->
				<div
					class="absolute inset-0 bg-gradient-to-br {roleColors[role.id] ||
						'from-accent-500/20 to-accent-600/20'} opacity-0 group-hover:opacity-100 transition-opacity duration-300"
				></div>

				<div class="relative flex flex-col h-full">
					<!-- Icon -->
					<div
						class="w-14 h-14 rounded-2xl bg-base-800/80 border border-base-700/50 flex items-center justify-center mb-4 group-hover:scale-110 group-hover:border-base-600 transition-all duration-300"
					>
						<span class="text-2xl">{roleIcons[role.id] || '💼'}</span>
					</div>

					<!-- Content -->
					<h3
						class="font-bold text-lg text-base-100 mb-2 group-hover:text-white transition-colors"
					>
						{role.name}
					</h3>
					<p
						class="text-sm text-base-400 group-hover:text-base-300 transition-colors flex-1"
					>
						{getDescription(role)}
					</p>

					<!-- Arrow indicator -->
					<div
						class="flex items-center gap-2 mt-4 text-sm font-medium text-base-500 group-hover:text-accent-400 transition-colors"
					>
						<span>Sélectionner</span>
						<svg
							class="w-4 h-4 transform group-hover:translate-x-1 transition-transform"
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
					</div>
				</div>
			</button>
		{/each}
	</div>
</div>
