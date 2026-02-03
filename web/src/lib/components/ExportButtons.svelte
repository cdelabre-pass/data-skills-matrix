<script lang="ts">
	import * as XLSX from 'xlsx';

	export let assessmentState: any;
	export let skillsData: any;

	// ============================================
	// Helper Functions
	// ============================================

	/**
	 * Get ALL skills relevant to the selected role (not just assessed)
	 */
	function getAllSkillsForRole(data: any, roleId: string): any[] {
		return data.skills.filter((skill: any) => {
			const hasLevels = skill.levels && skill.levels[roleId];
			const isCore = skill.core_roles?.includes(roleId);
			return hasLevels || isCore;
		});
	}

	/**
	 * Check if a skill is Core for a role
	 */
	function isSkillCore(skill: any, roleId: string): boolean {
		return skill.core_roles?.includes(roleId) ?? false;
	}

	/**
	 * Get expected level at Confirmé (career level index 1) for a skill/role
	 */
	function getExpectedLevel(skill: any, roleId: string): number | string {
		const levels = skill.levels?.[roleId];
		if (!levels || levels.length < 2) return 'NC';
		const level = levels[1]; // Index 1 = Confirmé
		return level === 'NC' || level === null ? 'NC' : level;
	}

	/**
	 * Calculate gap with proper display format
	 */
	function calculateGap(currentLevel: number | 'nc' | undefined, expectedLevel: number | string): string {
		if (currentLevel === undefined || currentLevel === 'nc') return '-';
		if (expectedLevel === 'NC' || typeof expectedLevel !== 'number') return '-';
		const gap = expectedLevel - currentLevel;
		if (gap === 0) return '0';
		return gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`;
	}

	/**
	 * Get top N gaps with improvement tips
	 */
	function getTopGaps(allSkills: any[], answers: Record<string, any>, roleId: string, limit: number = 10) {
		return allSkills
			.map(skill => {
				const answer = answers[skill.id];
				const expectedLevel = getExpectedLevel(skill, roleId);
				const currentLevel = answer?.level;

				if (currentLevel === undefined || currentLevel === 'nc') return null;
				if (expectedLevel === 'NC' || typeof expectedLevel !== 'number') return null;

				const gap = expectedLevel - currentLevel;
				if (gap <= 0) return null;

				// Get relevant improvement tip
				const nextTransition = `${currentLevel}→${currentLevel + 1}`;
				const tip = skill.improvement_tips?.[nextTransition] || '';

				return { skill, currentLevel, expectedLevel, gap, tip };
			})
			.filter(Boolean)
			.sort((a, b) => b!.gap - a!.gap)
			.slice(0, limit) as { skill: any; currentLevel: number; expectedLevel: number; gap: number; tip: string }[];
	}

	/**
	 * Get category name from category id
	 */
	function getCategoryName(categoryId: string): string {
		const category = skillsData.categories.find((c: any) => c.id === categoryId);
		return category?.name || categoryId;
	}

	// ============================================
	// Excel Export - Sheet Builders
	// ============================================

	function createResumeSheet(wb: XLSX.WorkBook, allSkillsForRole: any[]) {
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		// Only count answers for skills in this role
		const skillIdsForRole = new Set(allSkillsForRole.map((s: any) => s.id));
		const answeredCount = Object.values(assessmentState.answers).filter((a: any) => skillIdsForRole.has(a.skillId)).length;
		const completionRate = allSkillsForRole.length > 0
			? Math.round((answeredCount / allSkillsForRole.length) * 100)
			: 0;

		const data = [
			["Skills Matrix - Résumé d'Évaluation"],
			[''],
			['Nom', assessmentState.name || 'Non renseigné'],
			['Rôle', role?.name || assessmentState.role],
			["Date d'évaluation", new Date().toLocaleDateString('fr-FR')],
			[''],
			['Compétences du rôle', allSkillsForRole.length],
			['Compétences évaluées', answeredCount],
			['Taux de complétion', `${completionRate}%`],
		];

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [{ wch: 25 }, { wch: 30 }];
		XLSX.utils.book_append_sheet(wb, ws, 'Résumé');
	}

	function createNiveauxSheet(wb: XLSX.WorkBook) {
		const data: any[][] = [
			['Échelle de Compétences'],
			[''],
			['Niveau', 'Nom', 'Description'],
		];

		// Standard levels 0-4
		for (const sl of skillsData.skill_levels.standard) {
			data.push([sl.level, sl.name, sl.description]);
		}

		// Bonus levels 5-6
		data.push(['']);
		data.push(['Niveaux Bonus (optionnels)']);
		data.push(['Niveau', 'Nom', 'Description']);
		for (const sl of skillsData.skill_levels.bonus) {
			data.push([sl.level, sl.name, sl.description]);
		}

		// NC explanation
		data.push(['']);
		data.push(['NC', 'Non Concerné', 'Compétence non attendue pour ce rôle/niveau']);

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [{ wch: 10 }, { wch: 25 }, { wch: 60 }];
		XLSX.utils.book_append_sheet(wb, ws, 'Niveaux');
	}

	function createAttentesSheet(wb: XLSX.WorkBook) {
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);

		const data: any[][] = [
			[`Attentes pour le rôle ${role?.name || assessmentState.role}`],
			[''],
			['Niveau Carrière', 'Expérience', 'Description', 'Compétences Core', 'Compétences Secondaires'],
		];

		for (const level of skillsData.levels) {
			const coreRange = `Niveau ${level.core_expected[0]}-${level.core_expected[1]}`;
			const secRange = `Niveau ${level.secondary_expected[0]}-${level.secondary_expected[1]}`;
			data.push([level.name, level.experience, level.description, coreRange, secRange]);
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [{ wch: 15 }, { wch: 12 }, { wch: 40 }, { wch: 20 }, { wch: 25 }];
		XLSX.utils.book_append_sheet(wb, ws, 'Attentes par Rôle');
	}

	function createEvaluationSheet(wb: XLSX.WorkBook, allSkillsForRole: any[]) {
		const roleId = assessmentState.role;
		const answers = assessmentState.answers;

		const data: any[][] = [
			['Catégorie', 'Compétence', 'Description', 'Core/Sec', 'Attendu (Confirmé)', 'Mon Niveau', 'Écart'],
		];

		// Group by category for readability
		for (const category of skillsData.categories) {
			const categorySkills = allSkillsForRole.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const isCore = isSkillCore(skill, roleId);
				const expectedLevel = getExpectedLevel(skill, roleId);
				const answer = answers[skill.id];
				const currentLevel = answer
					? (answer.level === 'nc' ? 'NC' : answer.level)
					: 'Non évalué';
				const gap = calculateGap(answer?.level, expectedLevel);

				data.push([
					category.name,
					skill.name,
					skill.description,
					isCore ? 'Core' : 'Secondaire',
					expectedLevel === 'NC' ? 'NC' : expectedLevel,
					currentLevel,
					gap
				]);
			}
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [
			{ wch: 20 }, // Catégorie
			{ wch: 30 }, // Compétence
			{ wch: 50 }, // Description
			{ wch: 12 }, // Core/Sec
			{ wch: 15 }, // Attendu
			{ wch: 12 }, // Mon Niveau
			{ wch: 8 },  // Écart
		];
		XLSX.utils.book_append_sheet(wb, ws, 'Évaluation');
	}

	function createAxesAmeliorationSheet(wb: XLSX.WorkBook, allSkillsForRole: any[]) {
		const gaps = getTopGaps(allSkillsForRole, assessmentState.answers, assessmentState.role, 10);

		const data: any[][] = [
			["Axes d'Amélioration Prioritaires"],
			[''],
			['Compétence', 'Catégorie', 'Niveau Actuel', 'Niveau Attendu', 'Écart', 'Conseil pour progresser'],
		];

		for (const gap of gaps) {
			data.push([
				gap.skill.name,
				getCategoryName(gap.skill.category),
				gap.currentLevel,
				gap.expectedLevel,
				`-${gap.gap}`,
				gap.tip || ''
			]);
		}

		if (gaps.length === 0) {
			data.push(['Aucun axe d\'amélioration identifié - Bravo !']);
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [
			{ wch: 30 }, // Compétence
			{ wch: 20 }, // Catégorie
			{ wch: 15 }, // Actuel
			{ wch: 15 }, // Attendu
			{ wch: 8 },  // Écart
			{ wch: 60 }, // Conseil
		];
		XLSX.utils.book_append_sheet(wb, ws, 'Axes Amélioration');
	}

	/**
	 * Create the full skills matrix sheet (all skills × all roles × all career levels)
	 * Matches Python generator's create_matrix_sheet
	 */
	function createMatriceSheet(wb: XLSX.WorkBook) {
		// Build headers: Catégorie, Compétence, Description, then for each role: C/S, Jr, Cf, Sr, Ex
		const headers: string[] = ['Catégorie', 'Compétence', 'Description'];
		for (const role of skillsData.roles) {
			headers.push(`${role.abbreviation} C/S`);
			headers.push(`${role.abbreviation} Jr`);
			headers.push(`${role.abbreviation} Cf`);
			headers.push(`${role.abbreviation} Sr`);
			headers.push(`${role.abbreviation} Ex`);
		}

		const data: any[][] = [headers];

		// Add all skills grouped by category
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row: any[] = [category.name, skill.name, skill.description];

				for (const role of skillsData.roles) {
					// Core/Secondary
					const isCore = skill.core_roles?.includes(role.id);
					row.push(isCore ? 'C' : 'S');

					// Levels: Jr, Cf, Sr, Ex (indices 0-3)
					const levels = skill.levels?.[role.id] || ['NC', 'NC', 'NC', 'NC'];
					for (let i = 0; i < 4; i++) {
						const level = levels[i];
						row.push(level === null || level === undefined ? 'NC' : level);
					}
				}

				data.push(row);
			}
		}

		const ws = XLSX.utils.aoa_to_sheet(data);

		// Set column widths
		const cols: any[] = [
			{ wch: 20 }, // Catégorie
			{ wch: 30 }, // Compétence
			{ wch: 50 }, // Description
		];
		// Add widths for role columns (5 per role)
		for (let i = 0; i < skillsData.roles.length; i++) {
			cols.push({ wch: 6 }); // C/S
			cols.push({ wch: 5 }); // Jr
			cols.push({ wch: 5 }); // Cf
			cols.push({ wch: 5 }); // Sr
			cols.push({ wch: 5 }); // Ex
		}
		ws['!cols'] = cols;

		// Freeze panes at D2
		ws['!freeze'] = { xSplit: 3, ySplit: 1 };

		XLSX.utils.book_append_sheet(wb, ws, 'Matrice Compétences');
	}

	/**
	 * Create the level descriptions sheet
	 * Matches Python generator's create_level_descriptions_sheet
	 */
	function createDescriptionsSheet(wb: XLSX.WorkBook) {
		const headers = ['Catégorie', 'Compétence', 'Niveau 0', 'Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4', 'Ressources'];
		const data: any[][] = [headers];

		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row: any[] = [category.name, skill.name];

				// Level descriptions 0-4
				for (let level = 0; level <= 4; level++) {
					const desc = skill.level_descriptions?.[level] || skill.level_descriptions?.[String(level)] || '';
					row.push(desc);
				}

				// Resources (join if array, or empty)
				const resources = skill.resources
					? (Array.isArray(skill.resources)
						? skill.resources.map((r: any) => r.title || r).join(', ')
						: skill.resources)
					: '';
				row.push(resources);

				data.push(row);
			}
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [
			{ wch: 20 }, // Catégorie
			{ wch: 25 }, // Compétence
			{ wch: 40 }, // Niveau 0
			{ wch: 40 }, // Niveau 1
			{ wch: 40 }, // Niveau 2
			{ wch: 40 }, // Niveau 3
			{ wch: 40 }, // Niveau 4
			{ wch: 40 }, // Ressources
		];

		XLSX.utils.book_append_sheet(wb, ws, 'Descriptions par Niveau');
	}

	/**
	 * Create the radar chart data sheet for role profiles
	 * Matches Python generator's create_radar_data_sheet
	 */
	function createRadarDataSheet(wb: XLSX.WorkBook) {
		const data: any[][] = [
			['Profils de Compétences par Rôle (Expert - 10+ ans)'],
			[''],
		];

		// Headers: Compétence + each role name
		const headers = ['Compétence'];
		for (const role of skillsData.roles) {
			headers.push(role.name);
		}
		data.push(headers);

		// Select max 2 skills per category for readability (like Python)
		const selectedSkills: any[] = [];
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);
			selectedSkills.push(...categorySkills.slice(0, 2));
		}

		// Data: Expert level (index 3) for each role
		for (const skill of selectedSkills) {
			const row: any[] = [skill.name];
			for (const role of skillsData.roles) {
				const levels = skill.levels?.[role.id] || ['NC', 'NC', 'NC', 'NC'];
				const expertLevel = levels[3];
				row.push(expertLevel !== 'NC' && expertLevel !== null ? expertLevel : 0);
			}
			data.push(row);
		}

		data.push(['']);
		data.push(['Note: Ces données peuvent être utilisées pour créer des graphiques radar dans Excel']);

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [
			{ wch: 35 }, // Compétence
			...skillsData.roles.map(() => ({ wch: 15 })),
		];

		XLSX.utils.book_append_sheet(wb, ws, 'Profils Radar');
	}

	/**
	 * Create the development plan template sheet
	 * Matches Python generator's create_development_plan_sheet
	 */
	function createPlanDeveloppementSheet(wb: XLSX.WorkBook) {
		const data: any[][] = [
			['Plan de Développement Annuel'],
			[''],
			['Choisissez un maximum de 4 compétences à développer sur l\'année (privilégier les compétences Core)'],
			[''],
			['Compétence à Développer', 'Niveau Actuel', 'Niveau Cible', 'Formation / Actions', 'Résultat Attendu', 'Mesure de Succès', 'Trimestre', 'Statut'],
		];

		// Pre-fill with top 4 gaps if available
		const allSkillsForRole = getAllSkillsForRole(skillsData, assessmentState.role);
		const topGaps = getTopGaps(allSkillsForRole, assessmentState.answers, assessmentState.role, 4);

		for (let i = 0; i < 4; i++) {
			const gap = topGaps[i];
			if (gap) {
				data.push([
					gap.skill.name,
					gap.currentLevel,
					gap.expectedLevel,
					gap.tip || '',
					'',
					'',
					'',
					'Non démarré'
				]);
			} else {
				data.push(['', '', '', '', '', '', '', '']);
			}
		}

		data.push(['']);
		data.push(['Trimestres: Q1, Q2, Q3, Q4']);
		data.push(['Statuts: Non démarré, En cours, Complété']);

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [
			{ wch: 30 }, // Compétence
			{ wch: 12 }, // Actuel
			{ wch: 12 }, // Cible
			{ wch: 40 }, // Actions
			{ wch: 30 }, // Résultat
			{ wch: 25 }, // Mesure
			{ wch: 12 }, // Trimestre
			{ wch: 15 }, // Statut
		];

		XLSX.utils.book_append_sheet(wb, ws, 'Plan Développement');
	}

	/**
	 * Create the evaluation history template sheet
	 * Matches Python generator's create_history_sheet
	 */
	function createHistoriqueSheet(wb: XLSX.WorkBook, allSkillsForRole: any[]) {
		const data: any[][] = [
			['Historique des Évaluations'],
			[''],
			[
				'Catégorie', 'Compétence',
				'Éval 1 Date', 'Éval 1 Score', 'Éval 1 Commentaires',
				'Éval 2 Date', 'Éval 2 Score', 'Éval 2 Commentaires',
				'Éval 3 Date', 'Éval 3 Score', 'Éval 3 Commentaires',
				'Éval 4 Date', 'Éval 4 Score', 'Éval 4 Commentaires',
			],
		];

		const currentDate = new Date().toLocaleDateString('fr-FR');

		// Add skills with current assessment as Eval 1
		for (const category of skillsData.categories) {
			const categorySkills = allSkillsForRole.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const answer = assessmentState.answers[skill.id];
				const currentLevel = answer
					? (answer.level === 'nc' ? 'NC' : answer.level)
					: '';

				data.push([
					category.name,
					skill.name,
					currentLevel ? currentDate : '', // Éval 1 Date
					currentLevel, // Éval 1 Score
					'', // Éval 1 Commentaires
					'', '', '', // Éval 2
					'', '', '', // Éval 3
					'', '', '', // Éval 4
				]);
			}
		}

		const ws = XLSX.utils.aoa_to_sheet(data);
		ws['!cols'] = [
			{ wch: 20 }, // Catégorie
			{ wch: 30 }, // Compétence
			{ wch: 12 }, { wch: 10 }, { wch: 20 }, // Éval 1
			{ wch: 12 }, { wch: 10 }, { wch: 20 }, // Éval 2
			{ wch: 12 }, { wch: 10 }, { wch: 20 }, // Éval 3
			{ wch: 12 }, { wch: 10 }, { wch: 20 }, // Éval 4
		];

		XLSX.utils.book_append_sheet(wb, ws, 'Historique Évaluations');
	}

	// ============================================
	// Main Export Functions
	// ============================================

	function exportToExcel() {
		const wb = XLSX.utils.book_new();
		const allSkillsForRole = getAllSkillsForRole(skillsData, assessmentState.role);

		// Sheet order matches Python generator structure
		createNiveauxSheet(wb);                        // 1. Niveaux (reference)
		createMatriceSheet(wb);                        // 2. Matrice Compétences (full matrix)
		createDescriptionsSheet(wb);                   // 3. Descriptions par Niveau
		createEvaluationSheet(wb, allSkillsForRole);   // 4. Mon Évaluation
		createRadarDataSheet(wb);                      // 5. Profils Radar
		createPlanDeveloppementSheet(wb);              // 6. Plan Développement
		createHistoriqueSheet(wb, allSkillsForRole);   // 7. Historique Évaluations
		createAxesAmeliorationSheet(wb, allSkillsForRole); // 8. Axes Amélioration (bonus)
		createResumeSheet(wb, allSkillsForRole);       // 9. Résumé (bonus - at the end for quick access)

		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		const roleAbbr = role?.abbreviation || assessmentState.role;
		XLSX.writeFile(wb, `skills-matrix-${roleAbbr}-${new Date().toISOString().split('T')[0]}.xlsx`);
	}

	function exportToMarkdown() {
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		const roleName = role?.name || assessmentState.role;
		const roleAbbr = role?.abbreviation || assessmentState.role;
		const date = new Date().toLocaleDateString('fr-FR');
		const allSkillsForRole = getAllSkillsForRole(skillsData, assessmentState.role);
		// Only count answers for skills in this role
		const skillIdsForRole = new Set(allSkillsForRole.map((s: any) => s.id));
		const answeredCount = Object.values(assessmentState.answers).filter((a: any) => skillIdsForRole.has(a.skillId)).length;
		const completionRate = allSkillsForRole.length > 0
			? Math.round((answeredCount / allSkillsForRole.length) * 100)
			: 0;

		let md = '';

		// 1. Header with metadata
		md += `# Skills Matrix - Évaluation\n\n`;
		md += `**Nom:** ${assessmentState.name || 'Non renseigné'}\n`;
		md += `**Rôle:** ${roleName}\n`;
		md += `**Date:** ${date}\n`;
		md += `**Compétences évaluées:** ${answeredCount}/${allSkillsForRole.length} (${completionRate}%)\n\n`;
		md += `---\n\n`;

		// 2. Skill levels scale
		md += `## Échelle de compétences\n\n`;
		md += `| Niveau | Nom | Description |\n`;
		md += `|:------:|-----|-------------|\n`;
		for (const sl of skillsData.skill_levels.standard) {
			md += `| ${sl.level} | ${sl.name} | ${sl.description} |\n`;
		}
		md += `| NC | Non Concerné | Compétence non attendue pour ce rôle |\n`;
		md += `\n`;

		// 3. Career level expectations table
		md += `## Attentes pour ${roleName} par niveau de carrière\n\n`;
		md += `| Niveau | Expérience | Description | Core | Secondaires |\n`;
		md += `|--------|------------|-------------|:----:|:-----------:|\n`;
		for (const level of skillsData.levels) {
			md += `| ${level.name} | ${level.experience} | ${level.description} | ${level.core_expected[0]}-${level.core_expected[1]} | ${level.secondary_expected[0]}-${level.secondary_expected[1]} |\n`;
		}
		md += `\n`;

		// 4. Results by category - ALL skills for role
		md += `## Résultats par catégorie\n\n`;

		for (const category of skillsData.categories) {
			const categorySkills = allSkillsForRole.filter((s: any) => s.category === category.id);
			if (categorySkills.length === 0) continue;

			md += `### ${category.name}\n\n`;
			md += `| Compétence | Core/Sec | Attendu | Mon Niveau | Écart |\n`;
			md += `|------------|:--------:|:-------:|:----------:|:-----:|\n`;

			for (const skill of categorySkills) {
				const isCore = isSkillCore(skill, assessmentState.role);
				const expectedLevel = getExpectedLevel(skill, assessmentState.role);
				const answer = assessmentState.answers[skill.id];
				const currentLevel = answer
					? (answer.level === 'nc' ? 'NC' : answer.level)
					: '-';
				const gap = calculateGap(answer?.level, expectedLevel);

				md += `| ${skill.name} | ${isCore ? '**Core**' : 'Sec'} | ${expectedLevel} | ${currentLevel} | ${gap} |\n`;
			}
			md += `\n`;
		}

		// 5. Top 10 improvement areas with tips
		const gaps = getTopGaps(allSkillsForRole, assessmentState.answers, assessmentState.role, 10);

		if (gaps.length > 0) {
			md += `## Axes d'amélioration prioritaires\n\n`;

			for (const gap of gaps) {
				md += `### ${gap.skill.name}\n\n`;
				md += `- **Catégorie:** ${getCategoryName(gap.skill.category)}\n`;
				md += `- **Niveau actuel:** ${gap.currentLevel} → **Objectif:** ${gap.expectedLevel} (écart: -${gap.gap})\n`;

				if (gap.tip) {
					md += `- **Conseil:** ${gap.tip}\n`;
				}

				md += `\n`;
			}
		} else {
			md += `## Axes d'amélioration\n\n`;
			md += `Aucun axe d'amélioration identifié - Bravo !\n\n`;
		}

		// Footer
		md += `---\n\n`;
		md += `*Généré le ${date} via Skills Matrix*\n`;

		// Download
		const blob = new Blob([md], { type: 'text/markdown' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `skills-matrix-${roleAbbr}-${new Date().toISOString().split('T')[0]}.md`;
		a.click();
		URL.revokeObjectURL(url);
	}
</script>

<div class="card p-6">
	<h2 class="text-xl font-semibold text-base-100 mb-4">Exporter les résultats</h2>

	<div class="flex flex-wrap gap-4">
		<button on:click={exportToExcel} class="btn btn-primary flex items-center gap-2">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			Télécharger Excel
		</button>

		<button on:click={exportToMarkdown} class="btn btn-secondary flex items-center gap-2">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			Télécharger Markdown
		</button>
	</div>

	<p class="text-sm text-base-500 mt-4 flex items-center gap-2">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
		</svg>
		Vos données restent sur votre appareil. Aucune information n'est envoyée à un serveur.
	</p>
</div>
