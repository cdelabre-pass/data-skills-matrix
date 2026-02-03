<script lang="ts">
	export let answers: Record<string, any>;
	export let skills: any[];
	export let skillsData: any;

	interface CategoryProfile {
		categoryId: string;
		categoryName: string;
		bestRole: string;
		bestRoleName: string;
		matchScore: number;
		suggestedLevel: string;
		suggestedLevelName: string;
		avgScore: number;
		skillCount: number;
	}

	const categoryNames: Record<string, string> = {
		'analytics': 'Analytics',
		'engineering': 'Engineering',
		'ml': 'Machine Learning',
		'ops': 'Data Ops',
		'compliance': 'Compliance',
		'business': 'Business'
	};

	const categoryIcons: Record<string, string> = {
		'analytics': '📊',
		'engineering': '⚙️',
		'ml': '🤖',
		'ops': '🔧',
		'compliance': '🔒',
		'business': '💼'
	};

	function calculateCategoryProfiles(): CategoryProfile[] {
		const roles = skillsData?.roles || [];
		const careerLevels = skillsData?.levels || [];

		// Group skills by category
		const skillsByCategory: Record<string, any[]> = {};
		for (const skill of skills) {
			if (!skillsByCategory[skill.category]) {
				skillsByCategory[skill.category] = [];
			}
			skillsByCategory[skill.category].push(skill);
		}

		const profiles: CategoryProfile[] = [];

		for (const [categoryId, categorySkills] of Object.entries(skillsByCategory)) {
			// Calculate average score for this category
			let totalScore = 0;
			let answeredCount = 0;

			for (const skill of categorySkills) {
				const answer = answers[skill.id];
				if (answer && answer.level !== 'nc') {
					totalScore += answer.level;
					answeredCount++;
				}
			}

			if (answeredCount === 0) continue;

			const avgScore = totalScore / answeredCount;

			// Find best matching role for this category
			let bestRole = roles[0]?.id || 'data_analyst';
			let bestRoleName = roles[0]?.name || 'Data Analyst';
			let bestMatchScore = 0;

			for (const role of roles) {
				let roleMatchScore = 0;
				let roleSkillCount = 0;

				for (const skill of categorySkills) {
					const answer = answers[skill.id];
					if (!answer || answer.level === 'nc') continue;

					const expectedLevels = skill.levels?.[role.id];
					if (!expectedLevels) continue;

					// Use "confirmed" level (index 1) as baseline for comparison
					const expectedLevel = expectedLevels[1]; // Confirmed level
					if (expectedLevel === 'NC' || expectedLevel === null) continue;

					roleSkillCount++;
					// Score based on how well user matches this role's expectations
					const diff = Math.abs(answer.level - expectedLevel);
					const skillScore = Math.max(0, 1 - diff * 0.25); // Penalty for difference
					roleMatchScore += skillScore;
				}

				if (roleSkillCount > 0) {
					const normalizedScore = roleMatchScore / roleSkillCount;
					if (normalizedScore > bestMatchScore) {
						bestMatchScore = normalizedScore;
						bestRole = role.id;
						bestRoleName = role.name;
					}
				}
			}

			// Determine suggested career level based on average score
			let suggestedLevel = careerLevels[0]?.id || 'junior';
			let suggestedLevelName = careerLevels[0]?.name || 'Junior';

			for (let i = 0; i < careerLevels.length; i++) {
				const level = careerLevels[i];
				const expectedRange = level.core_expected || [i, i + 1];
				const midExpected = (expectedRange[0] + expectedRange[1]) / 2;

				if (avgScore >= midExpected - 0.5) {
					suggestedLevel = level.id;
					suggestedLevelName = level.name;
				}
			}

			profiles.push({
				categoryId,
				categoryName: categoryNames[categoryId] || categoryId,
				bestRole,
				bestRoleName,
				matchScore: Math.round(bestMatchScore * 100),
				suggestedLevel,
				suggestedLevelName,
				avgScore: Math.round(avgScore * 10) / 10,
				skillCount: answeredCount
			});
		}

		// Sort by skill count (most answered first)
		profiles.sort((a, b) => b.skillCount - a.skillCount);

		return profiles;
	}

	$: categoryProfiles = calculateCategoryProfiles();
</script>

<div class="card p-6 animate-fade-in">
	<div class="flex items-center gap-3 mb-6">
		<div class="w-10 h-10 rounded-xl bg-gradient-to-br from-accent-500/20 to-purple-500/20 flex items-center justify-center">
			<span class="text-lg">🎯</span>
		</div>
		<div>
			<h2 class="text-xl font-semibold text-base-100">Profil par domaine</h2>
			<p class="text-sm text-base-400">Votre profil de rôle le plus proche dans chaque domaine</p>
		</div>
	</div>

	{#if categoryProfiles.length === 0}
		<p class="text-base-400 text-center py-8">Pas assez de données pour calculer les profils.</p>
	{:else}
		<div class="space-y-4">
			{#each categoryProfiles as profile}
				<div class="p-4 rounded-xl bg-base-800/50 border border-base-700/50 hover:border-base-600/50 transition-colors">
					<div class="flex items-start gap-4">
						<!-- Category icon -->
						<div class="w-12 h-12 rounded-xl bg-base-700/50 flex items-center justify-center flex-shrink-0">
							<span class="text-xl">{categoryIcons[profile.categoryId] || '📁'}</span>
						</div>

						<div class="flex-1 min-w-0">
							<!-- Category name and match -->
							<div class="flex items-center justify-between gap-2 mb-2">
								<h3 class="font-semibold text-base-100">{profile.categoryName}</h3>
								<span class="text-xs text-base-500">{profile.skillCount} compétences</span>
							</div>

							<!-- Role and level -->
							<div class="flex flex-wrap items-center gap-2 mb-3">
								<span class="px-3 py-1 rounded-full text-sm font-medium bg-accent-500/20 text-accent-400">
									{profile.bestRoleName}
								</span>
								<span class="px-3 py-1 rounded-full text-sm font-medium bg-base-700 text-base-300">
									{profile.suggestedLevelName}
								</span>
							</div>

							<!-- Score bar -->
							<div class="flex items-center gap-3">
								<div class="flex-1 h-2 bg-base-700 rounded-full overflow-hidden">
									<div
										class="h-full bg-gradient-to-r from-accent-600 to-accent-400 transition-all duration-500"
										style="width: {profile.matchScore}%"
									></div>
								</div>
								<span class="text-sm font-mono text-base-400 w-12 text-right">
									{profile.avgScore}/4
								</span>
							</div>
						</div>
					</div>
				</div>
			{/each}
		</div>

		<!-- Legend -->
		<div class="mt-6 pt-4 border-t border-base-700/50">
			<p class="text-xs text-base-500 text-center">
				Le rôle affiché correspond au profil dont les attentes sont les plus proches de vos réponses pour ce domaine.
			</p>
		</div>
	{/if}
</div>
