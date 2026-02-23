import { defineConfig } from 'vitest/config';
import { sveltekit } from '@sveltejs/kit/vite';
import { svelteTesting } from '@testing-library/svelte/vite';

export default defineConfig({
	plugins: [sveltekit(), svelteTesting()],
	test: {
		include: ['src/**/*.{test,spec}.{js,ts}'],
		globals: true,
		environment: 'jsdom',
		setupFiles: ['./src/test-setup.ts'],
		coverage: {
			provider: 'v8',
			reporter: ['text', 'lcov', 'html'],
			include: ['src/lib/**'],
			// Exclude complex files requiring browser/canvas APIs or extensive mocking
			exclude: [
				'src/lib/excel/**',
				'src/lib/components/ExportButtons.svelte',
				'src/lib/components/RadarChart.svelte',
				'src/lib/components/SkillGaps.svelte',
				'src/lib/components/SkillQuestion.svelte',
				'src/lib/components/ResultsSummary.svelte',
				'src/lib/components/RoleProfileByCategory.svelte',
				'src/lib/components/LevelSuggestion.svelte',
			],
			thresholds: {
				// Achievable overall threshold (excludes complex UI above)
				lines: 70,
				functions: 70,
				branches: 65,
				statements: 70,
			},
		},
	},
});
