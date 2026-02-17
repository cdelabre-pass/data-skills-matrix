<script lang="ts">
	import '../app.css';
	import { page } from '$app/stores';
	import { browser } from '$app/environment';
	import { assessmentStore } from '$lib/stores/assessment';
	import { theme } from '$lib/stores/theme';
	import { exportTemplate } from '$lib/excel/template';
	import { onMount } from 'svelte';
	import ThemeToggle from '$lib/components/ThemeToggle.svelte';

	let hasResults = false;
	let mobileMenuOpen = false;
	let isDownloadingTemplate = false;

	$: currentPath = $page.url.pathname;

	onMount(() => {
		if (browser) {
			assessmentStore.load();
			theme.init();
		}
	});

	async function downloadTemplate() {
		if (isDownloadingTemplate) return;
		isDownloadingTemplate = true;
		try {
			const res = await fetch('/data/skills-data.json');
			const skillsData = await res.json();
			await exportTemplate(skillsData);
		} catch (err) {
			console.error('Template download failed:', err);
		} finally {
			isDownloadingTemplate = false;
		}
	}

	// Check if assessment is in progress (has skills loaded AND user has set it up)
	$: hasActiveAssessment = $assessmentStore.skills.length > 0 && ($assessmentStore.role !== null || $assessmentStore.categories.length > 0);

	// Check if there are any answers to show results
	$: hasResults = Object.keys($assessmentStore.answers).length > 0;

	// Close mobile menu on navigation
	$: if (currentPath) {
		mobileMenuOpen = false;
	}

	function toggleMobileMenu() {
		mobileMenuOpen = !mobileMenuOpen;
	}

	function closeMobileMenu() {
		mobileMenuOpen = false;
	}
</script>

<div class="min-h-screen flex flex-col">
	<!-- Header -->
	<header class="fixed top-0 left-0 right-0 z-50 border-b border-theme backdrop-blur-xl bg-theme/80">
		<div class="max-w-6xl mx-auto px-4 sm:px-6">
			<div class="flex justify-between items-center h-16">
				<!-- Logo -->
				<a href="/" class="flex items-center gap-2 sm:gap-3 group">
					<div class="flex flex-col">
						<span class="font-bold text-theme tracking-tight text-sm sm:text-base">Data Compass</span>
						<span class="text-[9px] sm:text-[10px] text-theme-muted tracking-wider uppercase hidden xs:block">Faites le point</span>
					</div>
				</a>

				<!-- Desktop Navigation -->
				<nav class="hidden md:flex items-center gap-1">
					<a
						href="/"
						class="nav-link"
						class:active={currentPath === '/'}
					>
						Accueil
					</a>
					{#if hasActiveAssessment}
						<a
							href="/assessment"
							class="nav-link"
							class:active={currentPath === '/assessment'}
						>
							Évaluation
						</a>
					{/if}
					{#if hasResults}
						<a
							href="/results"
							class="nav-link"
							class:active={currentPath === '/results'}
						>
							Résultats
						</a>
					{/if}

					<!-- Template download -->
					<button
						on:click={downloadTemplate}
						class="nav-link flex items-center gap-1"
						disabled={isDownloadingTemplate}
						title="Télécharger le template Excel vierge"
					>
						<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						Template
					</button>

					<!-- Theme toggle -->
					<div class="ml-2 pl-2 border-l border-theme">
						<ThemeToggle />
					</div>
				</nav>

				<!-- Mobile menu button and theme toggle -->
				<div class="flex items-center gap-2 md:hidden">
					<ThemeToggle />
					<button
						on:click={toggleMobileMenu}
						class="w-11 h-11 flex items-center justify-center rounded-xl bg-theme-tertiary border border-theme transition-colors hover:bg-theme-secondary"
						aria-label={mobileMenuOpen ? 'Fermer le menu' : 'Ouvrir le menu'}
						aria-expanded={mobileMenuOpen}
					>
						{#if mobileMenuOpen}
							<svg class="w-6 h-6 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M6 18L18 6M6 6l12 12" />
							</svg>
						{:else}
							<svg class="w-6 h-6 text-theme" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
							</svg>
						{/if}
					</button>
				</div>
			</div>
		</div>

		<!-- Mobile Navigation Menu -->
		{#if mobileMenuOpen}
			<!-- Backdrop -->
			<button
				class="fixed inset-0 top-16 bg-black/50 backdrop-blur-sm md:hidden z-40"
				on:click={closeMobileMenu}
				aria-label="Fermer le menu"
			></button>

			<!-- Menu panel -->
			<nav class="absolute top-full left-0 right-0 bg-theme-secondary border-b border-theme md:hidden z-50 animate-fade-in-down">
				<div class="max-w-6xl mx-auto px-4 py-4 space-y-1">
					<a
						href="/"
						class="mobile-nav-link"
						class:active={currentPath === '/'}
						on:click={closeMobileMenu}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
						</svg>
						<span>Accueil</span>
					</a>
					{#if hasActiveAssessment}
						<a
							href="/assessment"
							class="mobile-nav-link"
							class:active={currentPath === '/assessment'}
							on:click={closeMobileMenu}
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
							</svg>
							<span>Évaluation</span>
						</a>
					{/if}
					{#if hasResults}
						<a
							href="/results"
							class="mobile-nav-link"
							class:active={currentPath === '/results'}
							on:click={closeMobileMenu}
						>
							<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
								<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
							</svg>
							<span>Résultats</span>
						</a>
					{/if}
					<button
						class="mobile-nav-link"
						on:click={() => { closeMobileMenu(); downloadTemplate(); }}
						disabled={isDownloadingTemplate}
					>
						<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
							<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
						</svg>
						<span>Template Excel</span>
					</button>
				</div>
			</nav>
		{/if}
	</header>

	<!-- Main content -->
	<main class="flex-1 pt-16">
		<slot />
	</main>

	<!-- Footer -->
	<footer class="border-t border-theme bg-theme/50">
		<div class="max-w-6xl mx-auto px-6 py-8">
			<div class="flex flex-col md:flex-row justify-between items-center gap-4">
				<div class="flex items-center gap-3">
					<p class="text-sm text-theme-muted">
						Data Compass · Faites le point sur vos compétences data
					</p>
				</div>
				<div class="flex items-center gap-6 text-xs text-theme-muted">
					<span class="font-mono">v1.0</span>
					<span>Pass Culture</span>
				</div>
			</div>
		</div>
	</footer>
</div>
