<script lang="ts">
	import { onMount, onDestroy } from 'svelte';
	import { fly, fade, scale } from 'svelte/transition';
	import { cubicOut, elasticOut } from 'svelte/easing';

	export let current: number;
	export let total: number;
	export let currentIndex: number;
	// Optional: group progress data for mini radar preview
	export let groupProgress: Record<string, { total: number; answered: number; name: string }> = {};

	// Animated display values
	let displayPercentage = 0;
	let displayCurrent = 0;

	// Milestone states
	let showMilestone = false;
	let milestoneType: 25 | 50 | 75 | 100 | null = null;
	let previousPercentage = -1; // -1 means not initialized yet
	let initialized = false;
	let confettiParticles: Array<{ id: number; x: number; y: number; color: string; rotation: number; scale: number }> = [];

	// Clamp values to valid ranges to handle edge cases
	$: rawPercentage = total > 0 ? Math.round((current / total) * 100) : 0;
	$: percentage = Math.max(0, Math.min(100, rawPercentage));
	$: positionPercentage = total > 0 ? Math.max(0, Math.min(100, (currentIndex / total) * 100)) : 0;

	// Progress color gradient based on percentage (cool to warm)
	$: progressColor = getProgressColor(percentage);

	function getProgressColor(pct: number): string {
		if (pct < 25) return 'from-blue-500 to-cyan-400';
		if (pct < 50) return 'from-cyan-400 to-emerald-400';
		if (pct < 75) return 'from-emerald-400 to-amber-400';
		return 'from-amber-400 to-rose-400';
	}

	// Check for milestones (only after initialization to avoid triggering on page load)
	$: {
		if (initialized && previousPercentage >= 0) {
			const milestones = [25, 50, 75, 100];
			for (const milestone of milestones) {
				if (previousPercentage < milestone && percentage >= milestone) {
					triggerMilestone(milestone as 25 | 50 | 75 | 100);
					break;
				}
			}
		}
		previousPercentage = percentage;
	}

	function triggerMilestone(type: 25 | 50 | 75 | 100) {
		milestoneType = type;
		showMilestone = true;

		// Generate confetti for 25% and 100%
		if (type === 25 || type === 100) {
			generateConfetti(type === 100 ? 30 : 12);
		}

		// Auto-hide milestone after animation
		setTimeout(() => {
			showMilestone = false;
			milestoneType = null;
			confettiParticles = [];
		}, type === 100 ? 3500 : 2500);
	}

	function generateConfetti(count: number) {
		const colors = ['#6366f1', '#8b5cf6', '#ec4899', '#f59e0b', '#10b981', '#06b6d4'];
		confettiParticles = Array.from({ length: count }, (_, i) => ({
			id: i,
			x: 50 + (Math.random() - 0.5) * 60,
			y: 50,
			color: colors[Math.floor(Math.random() * colors.length)],
			rotation: Math.random() * 360,
			scale: 0.5 + Math.random() * 0.5
		}));
	}

	// Track animation targets to avoid re-triggering on intermediate updates
	let percentageTarget: number | null = null;
	let currentTarget: number | null = null;
	let percentageAnimFrame: number;
	let currentAnimFrame: number;

	// Smooth number animation
	function animateValue(start: number, end: number, duration: number, callback: (v: number) => void, frameRef: 'percentage' | 'current') {
		const startTime = performance.now();

		function update(currentTime: number) {
			const elapsed = currentTime - startTime;
			const progress = Math.min(elapsed / duration, 1);
			const eased = cubicOut(progress);
			const value = Math.round(start + (end - start) * eased);
			callback(value);

			if (progress < 1) {
				const frame = requestAnimationFrame(update);
				if (frameRef === 'percentage') {
					percentageAnimFrame = frame;
				} else {
					currentAnimFrame = frame;
				}
			}
		}

		const frame = requestAnimationFrame(update);
		if (frameRef === 'percentage') {
			percentageAnimFrame = frame;
		} else {
			currentAnimFrame = frame;
		}
	}

	$: {
		if (typeof window !== 'undefined' && percentage !== percentageTarget) {
			if (percentageAnimFrame) {
				cancelAnimationFrame(percentageAnimFrame);
			}
			const startVal = displayPercentage;
			percentageTarget = percentage;
			animateValue(startVal, percentage, 400, (v) => displayPercentage = v, 'percentage');
		}
	}

	$: {
		if (typeof window !== 'undefined' && current !== currentTarget) {
			if (currentAnimFrame) {
				cancelAnimationFrame(currentAnimFrame);
			}
			const startVal = displayCurrent;
			currentTarget = current;
			animateValue(startVal, current, 400, (v) => displayCurrent = v, 'current');
		}
	}

	// Mini radar chart data from group progress
	$: radarData = Object.entries(groupProgress).map(([id, group]) => ({
		id,
		name: group.name,
		value: group.total > 0 ? group.answered / group.total : 0,
		total: group.total,
		answered: group.answered
	}));

	$: hasRadarData = radarData.length > 2;

	// Generate SVG radar chart points
	function generateRadarPath(data: typeof radarData, radius: number, centerX: number, centerY: number): string {
		if (data.length < 3) return '';

		const angleStep = (2 * Math.PI) / data.length;
		const points = data.map((d, i) => {
			const angle = i * angleStep - Math.PI / 2;
			const r = d.value * radius;
			return {
				x: centerX + r * Math.cos(angle),
				y: centerY + r * Math.sin(angle)
			};
		});

		return points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z';
	}

	function generateRadarGrid(levels: number, radius: number, centerX: number, centerY: number, points: number): string[] {
		const grids: string[] = [];
		for (let level = 1; level <= levels; level++) {
			const r = (radius * level) / levels;
			const angleStep = (2 * Math.PI) / points;
			const gridPoints = Array.from({ length: points }, (_, i) => {
				const angle = i * angleStep - Math.PI / 2;
				return { x: centerX + r * Math.cos(angle), y: centerY + r * Math.sin(angle) };
			});
			grids.push(gridPoints.map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`).join(' ') + ' Z');
		}
		return grids;
	}

	function generateAxisLines(centerX: number, centerY: number, radius: number, points: number): Array<{ x1: number; y1: number; x2: number; y2: number }> {
		const angleStep = (2 * Math.PI) / points;
		return Array.from({ length: points }, (_, i) => {
			const angle = i * angleStep - Math.PI / 2;
			return {
				x1: centerX,
				y1: centerY,
				x2: centerX + radius * Math.cos(angle),
				y2: centerY + radius * Math.sin(angle)
			};
		});
	}

	// Collapse pills when too many groups
	let showAllGroups = false;
	$: groupCount = Object.keys(groupProgress).length;
	$: shouldCollapse = groupCount > 6;
	$: visibleGroups = shouldCollapse && !showAllGroups
		? Object.entries(groupProgress).slice(0, 4)
		: Object.entries(groupProgress);

	onMount(() => {
		displayPercentage = percentage;
		displayCurrent = current;
		// Initialize animation targets to prevent animation on first render
		percentageTarget = percentage;
		currentTarget = current;
		// Initialize previousPercentage to current value to avoid triggering milestones on page load
		previousPercentage = percentage;
		// Small delay before enabling milestone detection to ensure initial state is set
		setTimeout(() => {
			initialized = true;
		}, 100);
	});

	onDestroy(() => {
		if (percentageAnimFrame) {
			cancelAnimationFrame(percentageAnimFrame);
		}
		if (currentAnimFrame) {
			cancelAnimationFrame(currentAnimFrame);
		}
	});

	// Milestone messages
	const milestoneMessages: Record<number, { title: string; subtitle: string }> = {
		25: { title: 'Bon départ !', subtitle: 'Vous avez complété 25% de l\'évaluation' },
		50: { title: 'À mi-chemin !', subtitle: 'Continuez, vous y êtes presque' },
		75: { title: 'Presque terminé !', subtitle: 'Plus que quelques compétences' },
		100: { title: 'Félicitations !', subtitle: 'Évaluation complète !' }
	};
</script>

<div class="card p-3 sm:p-4 border-base-700/50 relative overflow-hidden">
	<!-- Milestone celebration overlay -->
	{#if showMilestone && milestoneType}
		<div
			class="absolute inset-0 z-20 flex items-center justify-center bg-base-900/80 backdrop-blur-sm"
			transition:fade={{ duration: 300 }}
		>
			<!-- Confetti particles -->
			{#each confettiParticles as particle (particle.id)}
				<div
					class="absolute w-3 h-3 rounded-sm confetti-particle"
					style="
						left: {particle.x}%;
						top: {particle.y}%;
						background-color: {particle.color};
						transform: rotate({particle.rotation}deg) scale({particle.scale});
						--delay: {particle.id * 50}ms;
						--x-end: {(Math.random() - 0.5) * 200}px;
						--y-end: {100 + Math.random() * 100}px;
						--rotation-end: {particle.rotation + Math.random() * 720}deg;
					"
				></div>
			{/each}

			<!-- Milestone message -->
			<div
				class="text-center z-10"
				in:scale={{ duration: 500, easing: elasticOut, start: 0.5 }}
				out:fade={{ duration: 300 }}
			>
				<div class="text-3xl mb-2">
					{#if milestoneType === 25}
						<span class="animate-bounce inline-block">🚀</span>
					{:else if milestoneType === 50}
						<span class="animate-pulse inline-block">⭐</span>
					{:else if milestoneType === 75}
						<span class="animate-bounce inline-block">🎯</span>
					{:else}
						<span class="animate-bounce inline-block">🎉</span>
					{/if}
				</div>
				<h3 class="text-xl font-bold text-base-100 mb-1">
					{milestoneMessages[milestoneType].title}
				</h3>
				<p class="text-sm text-base-400">
					{milestoneMessages[milestoneType].subtitle}
				</p>
			</div>
		</div>
	{/if}

	<div class="flex items-center justify-between mb-2">
		<div class="flex items-center gap-2 sm:gap-3">
			<!-- Percentage display with animated counter -->
			<div class="relative w-10 h-10 sm:w-11 sm:h-11 rounded-lg bg-gradient-to-br {progressColor} p-[2px] transition-all duration-500">
				<div class="w-full h-full rounded-[7px] bg-base-900 flex items-center justify-center">
					<span class="font-mono font-bold text-transparent bg-clip-text bg-gradient-to-br {progressColor} text-sm sm:text-base tabular-nums">
						{Math.max(0, Math.min(100, displayPercentage))}%
					</span>
				</div>
			</div>
			<div>
				<p class="text-xs sm:text-sm font-medium text-base-100">Progression</p>
				<p class="text-xs text-base-500">
					<span class="font-mono tabular-nums">{Math.max(0, Math.min(total, displayCurrent))}</span> / {total} compétences évaluées
				</p>
			</div>
		</div>

		<!-- Mini radar preview (only show if we have enough data) -->
		{#if hasRadarData}
			<div class="hidden sm:block relative group">
				<svg
					width="64"
					height="64"
					viewBox="0 0 64 64"
					class="transition-transform duration-300 group-hover:scale-110"
				>
					<!-- Background grid -->
					{#each generateRadarGrid(3, 24, 32, 32, radarData.length) as gridPath, i}
						<path
							d={gridPath}
							fill="none"
							stroke="currentColor"
							stroke-width="0.5"
							class="text-base-700/50"
						/>
					{/each}

					<!-- Axis lines -->
					{#each generateAxisLines(32, 32, 24, radarData.length) as line}
						<line
							x1={line.x1}
							y1={line.y1}
							x2={line.x2}
							y2={line.y2}
							stroke="currentColor"
							stroke-width="0.5"
							class="text-base-700/30"
						/>
					{/each}

					<!-- Data shape -->
					<path
						d={generateRadarPath(radarData, 24, 32, 32)}
						fill="rgba(99, 102, 241, 0.2)"
						stroke="rgba(99, 102, 241, 0.8)"
						stroke-width="1.5"
						class="transition-all duration-500"
					/>

					<!-- Center dot -->
					<circle cx="32" cy="32" r="2" fill="rgba(99, 102, 241, 0.5)" />
				</svg>

				<!-- Tooltip on hover -->
				<div class="absolute -bottom-2 left-1/2 -translate-x-1/2 translate-y-full opacity-0 group-hover:opacity-100 transition-opacity duration-200 pointer-events-none z-30">
					<div class="bg-base-800 border border-base-700 rounded-lg px-2 py-1 text-xs whitespace-nowrap shadow-lg">
						<span class="text-base-400">Aperçu profil</span>
					</div>
				</div>
			</div>
		{/if}

		<!-- Mini stats -->
		<div class="hidden sm:flex items-center gap-4 text-xs">
			<div class="text-center">
				<p class="font-mono font-bold text-base-100 tabular-nums">{Math.max(0, total - current)}</p>
				<p class="text-base-500">restantes</p>
			</div>
		</div>
	</div>

	<!-- Progress track -->
	<div class="relative">
		<div class="progress-track h-2 rounded-full overflow-hidden bg-base-800/50">
			<!-- Background shimmer effect -->
			<div class="absolute inset-0 shimmer-bg opacity-30"></div>

			<!-- Main progress fill -->
			<div
				class="h-full rounded-full bg-gradient-to-r {progressColor} relative overflow-hidden progress-fill-animated"
				style="width: {percentage}%"
			>
				<!-- Animated shine effect -->
				<div class="absolute inset-0 shine-effect"></div>
			</div>
		</div>

		<!-- Milestone markers -->
		<div class="absolute inset-0 pointer-events-none">
			{#each [25, 50, 75] as milestone}
				<div
					class="absolute top-1/2 -translate-y-1/2 w-0.5 h-3 rounded-full transition-all duration-300
						{percentage >= milestone ? 'bg-white/30' : 'bg-base-600/30'}"
					style="left: {milestone}%"
				></div>
			{/each}
		</div>

		<!-- Position indicator -->
		{#if total > 0}
			<div
				class="absolute top-1/2 -translate-y-1/2 w-4 h-4 rounded-full bg-white shadow-lg transition-all duration-300 ease-out flex items-center justify-center"
				style="left: calc({positionPercentage}% - 8px)"
			>
				<div class="w-1.5 h-1.5 rounded-full bg-gradient-to-br {progressColor}"></div>
			</div>
		{/if}
	</div>

	<!-- Group progress pills (enhanced) -->
	{#if groupCount > 0}
		<div class="flex flex-wrap gap-1.5 mt-2 justify-center items-center">
			{#each visibleGroups as [groupId, group]}
				{@const isComplete = group.answered === group.total}
				{@const groupPct = group.total > 0 ? Math.round((group.answered / group.total) * 100) : 0}
				<div
					class="relative flex items-center gap-1 px-2 py-1 rounded-full text-xs font-medium transition-all duration-300 border overflow-hidden
						{isComplete ? 'bg-emerald-500/20 text-emerald-400 border-emerald-500/50' : 'bg-base-800/50 text-base-400 border-base-700/50'}"
					class:group-pill-complete={isComplete}
					title={group.name}
				>
					<!-- Mini progress bar inside pill -->
					<div
						class="absolute inset-0 bg-gradient-to-r from-accent-500/10 to-transparent transition-all duration-500"
						style="width: {groupPct}%"
					></div>

					<span class="relative z-10">
						{#if isComplete}
							<svg class="w-3 h-3" fill="currentColor" viewBox="0 0 24 24">
								<path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z" />
							</svg>
						{:else}
							<span class="font-mono tabular-nums">{group.answered}/{group.total}</span>
						{/if}
					</span>
					<span class="relative z-10 hidden sm:inline truncate max-w-[70px]">{group.name}</span>
				</div>
			{/each}

			<!-- Expand/collapse button when many groups -->
			{#if shouldCollapse}
				<button
					on:click={() => showAllGroups = !showAllGroups}
					class="px-2.5 py-1 rounded-full text-xs font-medium bg-base-700/50 text-base-400 hover:bg-base-600/50 hover:text-base-300 border border-base-600/50 transition-colors"
				>
					{#if showAllGroups}
						Réduire
					{:else}
						+{groupCount - 4} autres
					{/if}
				</button>
			{/if}
		</div>
	{/if}
</div>

<style>
	/* Confetti animation */
	.confetti-particle {
		animation: confetti-fall 1.5s ease-out forwards;
		animation-delay: var(--delay, 0ms);
	}

	@keyframes confetti-fall {
		0% {
			opacity: 1;
			transform: translateY(0) translateX(0) rotate(0deg) scale(var(--scale, 1));
		}
		100% {
			opacity: 0;
			transform: translateY(var(--y-end, 100px)) translateX(var(--x-end, 0)) rotate(var(--rotation-end, 360deg)) scale(0);
		}
	}

	/* Progress bar shine effect */
	.shine-effect {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.3),
			transparent
		);
		animation: shine 2s ease-in-out infinite;
	}

	@keyframes shine {
		0% {
			transform: translateX(-100%);
		}
		50%, 100% {
			transform: translateX(100%);
		}
	}

	/* Shimmer background */
	.shimmer-bg {
		background: linear-gradient(
			90deg,
			transparent,
			rgba(255, 255, 255, 0.05),
			transparent
		);
		background-size: 200% 100%;
		animation: shimmer 3s linear infinite;
	}

	@keyframes shimmer {
		0% {
			background-position: 200% 0;
		}
		100% {
			background-position: -200% 0;
		}
	}

	/* Progress fill animation */
	.progress-fill-animated {
		transition: width 0.5s cubic-bezier(0.4, 0, 0.2, 1);
	}

	/* Group pill complete pulse */
	.group-pill-complete {
		animation: pill-pulse 0.6s ease-out;
	}

	@keyframes pill-pulse {
		0% {
			transform: scale(1);
		}
		50% {
			transform: scale(1.05);
		}
		100% {
			transform: scale(1);
		}
	}

	/* Tabular numbers for consistent width */
	.tabular-nums {
		font-variant-numeric: tabular-nums;
	}
</style>
