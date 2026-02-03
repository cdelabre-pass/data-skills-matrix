<script lang="ts">
	export let level: string;
	export let confidence: number;
	export let levels: Array<{ id: string; name: string }>;

	$: levelData = levels.find(l => l.id === level);
	$: levelIndex = levels.findIndex(l => l.id === level);

	const levelEmojis: Record<string, string> = {
		junior: '🌱',
		confirmed: '🌿',
		senior: '🌳',
		expert: '🏆'
	};

	// Confidence color based on value
	$: confidenceColor = confidence >= 70 ? 'text-green-400' : confidence >= 40 ? 'text-amber-400' : 'text-red-400';
</script>

<div class="card p-6">
	<h2 class="text-xl font-semibold text-base-100 mb-4">Niveau suggéré</h2>

	<div class="text-center mb-6">
		<span class="text-5xl mb-2 block">{levelEmojis[level] || '📊'}</span>
		<p class="text-2xl font-bold text-base-100">{levelData?.name || level}</p>
		<p class="text-sm {confidenceColor} mt-2 flex items-center justify-center gap-2">
			<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
			</svg>
			Confiance : {confidence}%
		</p>
	</div>

	<div class="relative pt-4">
		<div class="flex justify-between mb-2">
			{#each levels as l, i}
				<div class="flex flex-col items-center">
					<div
						class="w-4 h-4 rounded-full transition-all duration-300 {i <= levelIndex ? 'bg-accent-500 scale-110' : 'bg-base-700'}"
					></div>
					<span class="text-xs text-base-400 mt-1">{l.name}</span>
				</div>
			{/each}
		</div>
		<div class="absolute top-6 left-0 right-0 h-1 bg-base-700 -z-10 rounded-full overflow-hidden">
			<div
				class="h-full bg-gradient-to-r from-accent-600 to-accent-400 transition-all duration-500"
				style="width: {(levelIndex / (levels.length - 1)) * 100}%"
			></div>
		</div>
	</div>

	<p class="text-sm text-base-400 mt-6 text-center">
		Cette suggestion est basée sur vos réponses comparées aux attentes du rôle.
	</p>
</div>
