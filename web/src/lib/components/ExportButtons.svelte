<script lang="ts">
	import ExcelJS from 'exceljs';

	export let assessmentState: any;
	export let skillsData: any;

	let showMergeModal = false;
	let mergeError = '';
	let uploadedFile: File | null = null;

	// ============================================
	// Styling Constants (matching Python styles.py)
	// ============================================

	const COLORS: {
		header: string;
		levels: Record<string, string>;
		categories: Record<string, string>;
		core: string;
		secondary: string;
		border: string;
	} = {
		header: '3943B4',      // Decathlon blue
		levels: {
			'NC': 'E5E7EB',    // Gray
			'0': 'FEE2E2',     // Red light
			'1': 'FED7AA',     // Orange light
			'2': 'FEF08A',     // Yellow light
			'3': '86EFAC',     // Green light
			'4': '22C55E',     // Green
			'5': '3B82F6',     // Blue (bonus)
			'6': '8B5CF6',     // Purple (bonus)
		},
		categories: {
			'analytics': 'DBEAFE',
			'engineering': 'DCFCE7',
			'data_management': 'FEF3C7',
			'business': 'FCE7F3',
			'cloud': 'E0E7FF',
			'machine_learning': 'F3E8FF',
			'visualization': 'FFEDD5',
			'soft_skills': 'F1F5F9',
		},
		core: 'DCFCE7',        // Green light
		secondary: 'F3F4F6',   // Gray light
		border: 'CCCCCC',
	};

	const BORDER_THIN: Partial<ExcelJS.Border> = {
		style: 'thin',
		color: { argb: COLORS.border }
	};

	const BORDERS_ALL: Partial<ExcelJS.Borders> = {
		top: BORDER_THIN,
		left: BORDER_THIN,
		bottom: BORDER_THIN,
		right: BORDER_THIN
	};

	// ============================================
	// Helper Functions
	// ============================================

	function getAllSkillsForRole(data: any, roleId: string): any[] {
		return data.skills.filter((skill: any) => {
			const hasLevels = skill.levels && skill.levels[roleId];
			const isCore = skill.core_roles?.includes(roleId);
			return hasLevels || isCore;
		});
	}

	function isSkillCore(skill: any, roleId: string): boolean {
		return skill.core_roles?.includes(roleId) ?? false;
	}

	function getExpectedLevel(skill: any, roleId: string): number | string {
		const levels = skill.levels?.[roleId];
		if (!levels || levels.length < 2) return 'NC';
		const level = levels[1];
		return level === 'NC' || level === null ? 'NC' : level;
	}

	function calculateGap(currentLevel: number | 'nc' | undefined, expectedLevel: number | string): string {
		if (currentLevel === undefined || currentLevel === 'nc') return '-';
		if (expectedLevel === 'NC' || typeof expectedLevel !== 'number') return '-';
		const gap = expectedLevel - currentLevel;
		if (gap === 0) return '0';
		return gap > 0 ? `-${gap}` : `+${Math.abs(gap)}`;
	}

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
				const nextTransition = `${currentLevel}→${currentLevel + 1}`;
				const tip = skill.improvement_tips?.[nextTransition] || '';
				return { skill, currentLevel, expectedLevel, gap, tip };
			})
			.filter(Boolean)
			.sort((a, b) => b!.gap - a!.gap)
			.slice(0, limit) as { skill: any; currentLevel: number; expectedLevel: number; gap: number; tip: string }[];
	}

	function getLevelFill(level: string | number): ExcelJS.Fill {
		const color = COLORS.levels[String(level)] || COLORS.levels['NC'];
		return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
	}

	function getCategoryFill(categoryId: string): ExcelJS.Fill {
		const color = COLORS.categories[categoryId] || 'FFFFFF';
		return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
	}

	function getHeaderFill(): ExcelJS.Fill {
		return { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.header } };
	}

	function applyHeaderStyle(cell: ExcelJS.Cell) {
		cell.fill = getHeaderFill();
		cell.font = { bold: true, color: { argb: 'FFFFFF' } };
		cell.alignment = { horizontal: 'center', vertical: 'middle' };
		cell.border = BORDERS_ALL;
	}

	// ============================================
	// Excel Export - Sheet Builders (matching Python)
	// ============================================

	function createNiveauxSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Niveaux');

		// Title
		ws.mergeCells('A1:C1');
		const titleCell = ws.getCell('A1');
		titleCell.value = 'Échelle de Compétences';
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Headers
		const headerRow = ws.getRow(3);
		['Niveau', 'Description', 'Exemple'].forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		// Standard levels 0-4 + bonus 5-6
		const allLevels = [...skillsData.skill_levels.standard, ...skillsData.skill_levels.bonus];
		let rowIdx = 4;

		for (const sl of allLevels) {
			const row = ws.getRow(rowIdx);
			row.getCell(1).value = sl.level;
			row.getCell(1).fill = getLevelFill(sl.level);
			row.getCell(1).alignment = { horizontal: 'center' };
			row.getCell(1).border = BORDERS_ALL;
			row.getCell(2).value = sl.name;
			row.getCell(2).border = BORDERS_ALL;
			row.getCell(3).value = sl.description;
			row.getCell(3).border = BORDERS_ALL;
			rowIdx++;
		}

		// NC level
		const ncRow = ws.getRow(rowIdx);
		ncRow.getCell(1).value = 'NC';
		ncRow.getCell(1).fill = getLevelFill('NC');
		ncRow.getCell(1).alignment = { horizontal: 'center' };
		ncRow.getCell(1).border = BORDERS_ALL;
		ncRow.getCell(2).value = 'Non Concerné';
		ncRow.getCell(2).border = BORDERS_ALL;
		ncRow.getCell(3).value = 'Compétence non attendue pour ce rôle/niveau';
		ncRow.getCell(3).border = BORDERS_ALL;
		rowIdx += 2;

		// Career levels section
		const sectionRow = ws.getRow(rowIdx);
		sectionRow.getCell(1).value = 'Niveaux attendus par Rôle';
		sectionRow.getCell(1).font = { bold: true, size: 12 };
		rowIdx += 2;

		const careerHeaderRow = ws.getRow(rowIdx);
		['Rôle', 'Expérience', 'Niveaux attendus'].forEach((h, i) => {
			const cell = careerHeaderRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});
		rowIdx++;

		for (const cl of skillsData.levels) {
			const row = ws.getRow(rowIdx);
			row.getCell(1).value = cl.name;
			row.getCell(1).border = BORDERS_ALL;
			row.getCell(2).value = cl.experience;
			row.getCell(2).border = BORDERS_ALL;
			const coreRange = `${cl.core_expected[0]}-${cl.core_expected[1]}`;
			const secRange = `${cl.secondary_expected[0]}-${cl.secondary_expected[1]}`;
			row.getCell(3).value = `Compétences core: Niveau ${coreRange} | Secondaires: Niveau ${secRange}`;
			row.getCell(3).border = BORDERS_ALL;
			rowIdx++;
		}
		rowIdx += 2;

		// Core vs Secondary legend
		const legendRow = ws.getRow(rowIdx);
		legendRow.getCell(1).value = 'Core vs Secondary Skills';
		legendRow.getCell(1).font = { bold: true, size: 12 };
		rowIdx += 2;

		const coreRow = ws.getRow(rowIdx);
		coreRow.getCell(1).value = 'C';
		coreRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.core } };
		coreRow.getCell(1).font = { bold: true };
		coreRow.getCell(1).alignment = { horizontal: 'center' };
		coreRow.getCell(2).value = 'Core Skill - Compétence fondamentale pour le rôle';
		rowIdx++;

		const secRow = ws.getRow(rowIdx);
		secRow.getCell(1).value = 'S';
		secRow.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.secondary } };
		secRow.getCell(1).alignment = { horizontal: 'center' };
		secRow.getCell(2).value = 'Secondary Skill - Compétence complémentaire';

		// Column widths
		ws.getColumn(1).width = 15;
		ws.getColumn(2).width = 30;
		ws.getColumn(3).width = 50;
	}

	function createMatriceSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Matrice Compétences');

		// Headers
		const headers = ['Catégorie', 'Compétence', 'Description'];
		for (const role of skillsData.roles) {
			headers.push(`${role.name} C/S`, `${role.name} Jr`, `${role.name} Cf`, `${role.name} Sr`, `${role.name} Ex`);
		}

		const headerRow = ws.getRow(1);
		headerRow.height = 80; // Taller header for vertical text
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
			if (i >= 3) {
				cell.alignment = { horizontal: 'center', vertical: 'bottom', textRotation: 90, wrapText: true };
			}
		});

		// Data
		let rowIdx = 2;
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row = ws.getRow(rowIdx);

				// Category
				row.getCell(1).value = category.name;
				row.getCell(1).fill = getCategoryFill(category.id);
				row.getCell(1).border = BORDERS_ALL;

				// Skill name and description
				row.getCell(2).value = skill.name;
				row.getCell(2).border = BORDERS_ALL;
				row.getCell(3).value = skill.description;
				row.getCell(3).border = BORDERS_ALL;

				// Levels per role
				let col = 4;
				for (const role of skillsData.roles) {
					const isCore = skill.core_roles?.includes(role.id);

					// C/S column
					const csCell = row.getCell(col);
					csCell.value = isCore ? 'C' : 'S';
					csCell.alignment = { horizontal: 'center' };
					csCell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isCore ? COLORS.core : COLORS.secondary } };
					if (isCore) csCell.font = { bold: true };
					csCell.border = BORDERS_ALL;
					col++;

					// Levels: Jr, Cf, Sr, Ex
					const levels = skill.levels?.[role.id] || ['NC', 'NC', 'NC', 'NC'];
					for (let i = 0; i < 4; i++) {
						const level = levels[i] === null || levels[i] === undefined ? 'NC' : levels[i];
						const cell = row.getCell(col);
						cell.value = String(level);
						cell.alignment = { horizontal: 'center' };
						cell.fill = getLevelFill(level);
						cell.border = BORDERS_ALL;
						if (level === 3 || level === 4) {
							cell.font = { bold: true, color: { argb: 'FFFFFF' } };
						}
						col++;
					}
				}
				rowIdx++;
			}
		}

		// Column widths
		ws.getColumn(1).width = 25;
		ws.getColumn(2).width = 35;
		ws.getColumn(3).width = 60;
		for (let i = 4; i <= headers.length; i++) {
			ws.getColumn(i).width = 8;
		}

		// Freeze panes
		ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];
	}

	function createDescriptionsSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Descriptions par Niveau');

		// Headers
		const headers = ['Catégorie', 'Compétence', 'Niveau 0', 'Niveau 1', 'Niveau 2', 'Niveau 3', 'Niveau 4', 'Ressources Internes'];
		const headerRow = ws.getRow(1);
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		// Data
		let rowIdx = 2;
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row = ws.getRow(rowIdx);
				row.height = 60;

				row.getCell(1).value = category.name;
				row.getCell(1).fill = getCategoryFill(category.id);
				row.getCell(1).border = BORDERS_ALL;

				row.getCell(2).value = skill.name;
				row.getCell(2).border = BORDERS_ALL;

				// Level descriptions 0-4
				for (let level = 0; level <= 4; level++) {
					const desc = skill.level_descriptions?.[level] || skill.level_descriptions?.[String(level)] || '';
					const cell = row.getCell(3 + level);
					cell.value = desc;
					cell.alignment = { wrapText: true, vertical: 'top' };
					cell.fill = getLevelFill(level);
					cell.border = BORDERS_ALL;
					if (level >= 3) {
						cell.font = { color: { argb: 'FFFFFF' } };
					}
				}

				// Resources
				const resources = skill.resources
					? (Array.isArray(skill.resources)
						? skill.resources.map((r: any) => `• ${r.title}: ${r.url}`).join('\n')
						: skill.resources)
					: '';
				row.getCell(8).value = resources;
				row.getCell(8).alignment = { wrapText: true, vertical: 'top' };
				row.getCell(8).border = BORDERS_ALL;

				rowIdx++;
			}
		}

		// Column widths
		ws.getColumn(1).width = 25;
		ws.getColumn(2).width = 30;
		for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 45;
		ws.getColumn(8).width = 50;

		// Freeze panes
		ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
	}

	function createAssessmentSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Mon Évaluation');
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);

		// Title
		ws.mergeCells('A1:H1');
		const titleCell = ws.getCell('A1');
		titleCell.value = 'Auto-évaluation des Compétences';
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Instructions
		ws.mergeCells('A2:H2');
		ws.getCell('A2').value = 'Instructions: Évaluez votre niveau (0-4) et fournissez des preuves concrètes (liens projets, PRs, dashboards)';
		ws.getCell('A2').font = { italic: true };

		// Role selection
		ws.getCell('A3').value = 'Mon Rôle:';
		ws.getCell('B3').value = role?.name || '';
		ws.getCell('B3').dataValidation = {
			type: 'list',
			allowBlank: true,
			formulae: [`"${skillsData.roles.map((r: any) => r.name).join(',')}"`]
		};

		ws.getCell('C3').value = 'Mon Niveau:';
		ws.getCell('D3').value = '';
		ws.getCell('D3').dataValidation = {
			type: 'list',
			allowBlank: true,
			formulae: [`"${skillsData.levels.map((l: any) => l.name).join(',')}"`]
		};

		// Headers
		const headers = ['Catégorie', 'Compétence', 'Core/Sec', 'Niveau Attendu', 'Mon Niveau', 'Écart', 'Preuves/Exemples', 'Commentaires Manager'];
		const headerRow = ws.getRow(5);
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		// Skills data
		let rowIdx = 6;
		const skillRows: number[] = [];

		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row = ws.getRow(rowIdx);
				const isCore = isSkillCore(skill, assessmentState.role);
				const expectedLevel = getExpectedLevel(skill, assessmentState.role);
				const answer = assessmentState.answers[skill.id];
				const currentLevel = answer ? (answer.level === 'nc' ? 'NC' : answer.level) : '';
				const gap = answer ? calculateGap(answer.level, expectedLevel) : '';

				row.getCell(1).value = category.name;
				row.getCell(1).fill = getCategoryFill(category.id);
				row.getCell(1).border = BORDERS_ALL;

				row.getCell(2).value = skill.name;
				row.getCell(2).border = BORDERS_ALL;

				row.getCell(3).value = isCore ? 'C' : 'S';
				row.getCell(3).alignment = { horizontal: 'center' };
				row.getCell(3).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: isCore ? COLORS.core : COLORS.secondary } };
				row.getCell(3).border = BORDERS_ALL;

				row.getCell(4).value = expectedLevel === 'NC' ? 'NC' : expectedLevel;
				row.getCell(4).alignment = { horizontal: 'center' };
				row.getCell(4).border = BORDERS_ALL;

				row.getCell(5).value = currentLevel;
				row.getCell(5).alignment = { horizontal: 'center' };
				row.getCell(5).border = BORDERS_ALL;

				// Gap formula - handle NC case
				row.getCell(6).value = { formula: `IF(OR(E${rowIdx}="",D${rowIdx}="NC",E${rowIdx}="NC"),"",E${rowIdx}-D${rowIdx})` };
				row.getCell(6).alignment = { horizontal: 'center' };
				row.getCell(6).border = BORDERS_ALL;

				row.getCell(7).value = '';
				row.getCell(7).border = BORDERS_ALL;

				row.getCell(8).value = '';
				row.getCell(8).border = BORDERS_ALL;

				skillRows.push(rowIdx);
				rowIdx++;
			}
		}

		// Data validation for "Mon Niveau" column
		if (skillRows.length > 0) {
			const firstRow = skillRows[0];
			const lastRow = skillRows[skillRows.length - 1];
			for (let r = firstRow; r <= lastRow; r++) {
				ws.getCell(`E${r}`).dataValidation = {
					type: 'list',
					allowBlank: true,
					formulae: ['"0,1,2,3,4,NC"'],
					errorTitle: 'Niveau invalide',
					error: 'Veuillez entrer un niveau valide (0-4 ou NC)'
				};
			}
		}

		// Column widths
		ws.getColumn(1).width = 25;
		ws.getColumn(2).width = 35;
		ws.getColumn(3).width = 10;
		ws.getColumn(4).width = 12;
		ws.getColumn(5).width = 12;
		ws.getColumn(6).width = 8;
		ws.getColumn(7).width = 50;
		ws.getColumn(8).width = 40;

		// Freeze panes
		ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];
	}

	function createRadarDataSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Profil Radar');
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		const roleName = role?.name || assessmentState.role;

		// Title
		ws.mergeCells('A1:D1');
		const titleCell = ws.getCell('A1');
		titleCell.value = `Mon Profil de Compétences - ${roleName}`;
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Subtitle with user name
		ws.mergeCells('A2:D2');
		ws.getCell('A2').value = assessmentState.name || 'Non renseigné';
		ws.getCell('A2').font = { italic: true };

		// Headers
		const headers = ['Catégorie', 'Compétence', 'Niveau Attendu', 'Mon Niveau'];
		const headerRow = ws.getRow(4);
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		// Get skills for user's role, grouped by category (max 3 per category for radar readability)
		let rowIdx = 5;
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills
				.filter((s: any) => s.category === category.id)
				.filter((s: any) => {
					const hasLevels = s.levels && s.levels[assessmentState.role];
					const isCore = s.core_roles?.includes(assessmentState.role);
					return hasLevels || isCore;
				})
				.slice(0, 3); // Max 3 skills per category for radar chart

			for (const skill of categorySkills) {
				const row = ws.getRow(rowIdx);
				const expectedLevel = getExpectedLevel(skill, assessmentState.role);
				const answer = assessmentState.answers[skill.id];
				const currentLevel = answer ? (answer.level === 'nc' ? 0 : answer.level) : '';

				row.getCell(1).value = category.name;
				row.getCell(1).fill = getCategoryFill(category.id);
				row.getCell(1).border = BORDERS_ALL;

				row.getCell(2).value = skill.name;
				row.getCell(2).border = BORDERS_ALL;

				row.getCell(3).value = expectedLevel === 'NC' ? 0 : expectedLevel;
				row.getCell(3).alignment = { horizontal: 'center' };
				row.getCell(3).border = BORDERS_ALL;

				row.getCell(4).value = currentLevel;
				row.getCell(4).alignment = { horizontal: 'center' };
				row.getCell(4).border = BORDERS_ALL;
				if (currentLevel !== '') {
					row.getCell(4).fill = getLevelFill(currentLevel);
				}

				rowIdx++;
			}
		}

		// Instructions
		rowIdx += 2;
		ws.getCell(`A${rowIdx}`).value = 'Comment créer un graphique radar:';
		ws.getCell(`A${rowIdx}`).font = { bold: true };
		rowIdx++;
		ws.getCell(`A${rowIdx}`).value = '1. Sélectionnez les colonnes B, C et D (Compétence, Attendu, Mon Niveau)';
		rowIdx++;
		ws.getCell(`A${rowIdx}`).value = '2. Insertion → Graphique → Radar';
		rowIdx++;
		ws.getCell(`A${rowIdx}`).value = '3. Le graphique compare votre niveau actuel vs attendu';

		// Column widths
		ws.getColumn(1).width = 25;
		ws.getColumn(2).width = 35;
		ws.getColumn(3).width = 15;
		ws.getColumn(4).width = 15;
	}

	function createPlanDeveloppementSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Plan Développement');

		// Title
		ws.mergeCells('A1:H1');
		const titleCell = ws.getCell('A1');
		titleCell.value = 'Plan de Développement Annuel';
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Instructions
		ws.mergeCells('A2:H2');
		ws.getCell('A2').value = "Choisissez un maximum de 4 compétences à développer sur l'année (privilégier les compétences Core)";
		ws.getCell('A2').font = { italic: true };

		// Headers
		const headers = ['Compétence à Développer', 'Niveau Actuel', 'Niveau Cible', 'Formation / Actions', 'Résultat Attendu', 'Mesure de Succès', 'Trimestre', 'Statut'];
		const headerRow = ws.getRow(4);
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		// Pre-fill with top 4 gaps
		const allSkillsForRole = getAllSkillsForRole(skillsData, assessmentState.role);
		const topGaps = getTopGaps(allSkillsForRole, assessmentState.answers, assessmentState.role, 4);

		for (let i = 0; i < 4; i++) {
			const row = ws.getRow(5 + i);
			const gap = topGaps[i];

			if (gap) {
				row.getCell(1).value = gap.skill.name;
				row.getCell(2).value = gap.currentLevel;
				row.getCell(3).value = gap.expectedLevel;
				row.getCell(4).value = gap.tip || '';
				row.getCell(8).value = 'Non démarré';
			}

			// Apply borders and validation
			for (let c = 1; c <= 8; c++) {
				row.getCell(c).border = BORDERS_ALL;
			}

			// Quarter validation
			row.getCell(7).dataValidation = {
				type: 'list',
				allowBlank: true,
				formulae: ['"Q1,Q2,Q3,Q4"']
			};

			// Status validation
			row.getCell(8).dataValidation = {
				type: 'list',
				allowBlank: true,
				formulae: ['"Non démarré,En cours,Complété"']
			};
		}

		// Column widths
		ws.getColumn(1).width = 35;
		ws.getColumn(2).width = 12;
		ws.getColumn(3).width = 12;
		ws.getColumn(4).width = 45;
		ws.getColumn(5).width = 35;
		ws.getColumn(6).width = 30;
		ws.getColumn(7).width = 12;
		ws.getColumn(8).width = 15;
	}

	function createHistoriqueSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Historique Évaluations');

		// Title
		ws.mergeCells('A1:N1');
		const titleCell = ws.getCell('A1');
		titleCell.value = 'Historique des Évaluations';
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Headers
		const headers = [
			'Catégorie', 'Compétence',
			'Éval 1 Date', 'Éval 1 Score', 'Éval 1 Commentaires',
			'Éval 2 Date', 'Éval 2 Score', 'Éval 2 Commentaires',
			'Éval 3 Date', 'Éval 3 Score', 'Éval 3 Commentaires',
			'Éval 4 Date', 'Éval 4 Score', 'Éval 4 Commentaires',
		];
		const headerRow = ws.getRow(3);
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		const currentDate = new Date().toLocaleDateString('fr-FR');

		// Data
		let rowIdx = 4;
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row = ws.getRow(rowIdx);
				const answer = assessmentState.answers[skill.id];
				const currentLevel = answer ? (answer.level === 'nc' ? 'NC' : answer.level) : '';

				row.getCell(1).value = category.name;
				row.getCell(1).fill = getCategoryFill(category.id);
				row.getCell(1).border = BORDERS_ALL;

				row.getCell(2).value = skill.name;
				row.getCell(2).border = BORDERS_ALL;

				// Éval 1 (current)
				row.getCell(3).value = currentLevel !== '' ? currentDate : '';
				row.getCell(3).border = BORDERS_ALL;
				row.getCell(4).value = currentLevel;
				row.getCell(4).alignment = { horizontal: 'center' };
				row.getCell(4).border = BORDERS_ALL;
				row.getCell(5).value = '';
				row.getCell(5).border = BORDERS_ALL;

				// Éval 2-4 (empty)
				for (let c = 6; c <= 14; c++) {
					row.getCell(c).value = '';
					row.getCell(c).border = BORDERS_ALL;
				}

				rowIdx++;
			}
		}

		// Column widths
		ws.getColumn(1).width = 25;
		ws.getColumn(2).width = 35;
		for (let i = 3; i <= 14; i++) {
			ws.getColumn(i).width = 15;
		}

		// Freeze panes
		ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
	}

	// ============================================
	// Main Export Function
	// ============================================

	async function exportToExcel() {
		const wb = new ExcelJS.Workbook();
		wb.creator = 'Skills Matrix';
		wb.created = new Date();

		// Create sheets in Python order
		createNiveauxSheet(wb);
		createMatriceSheet(wb);
		createDescriptionsSheet(wb);
		createAssessmentSheet(wb);
		createRadarDataSheet(wb);
		createPlanDeveloppementSheet(wb);
		createHistoriqueSheet(wb);

		// Generate and download
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		const roleAbbr = role?.abbreviation || assessmentState.role;
		const buffer = await wb.xlsx.writeBuffer();
		const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `skills-matrix-${roleAbbr}-${new Date().toISOString().split('T')[0]}.xlsx`;
		a.click();
		URL.revokeObjectURL(url);
	}

	// ============================================
	// Merge/Update Template Functions
	// ============================================

	function openMergeModal() {
		showMergeModal = true;
		mergeError = '';
		uploadedFile = null;
	}

	function closeMergeModal() {
		showMergeModal = false;
		mergeError = '';
		uploadedFile = null;
	}

	function handleFileUpload(event: Event) {
		const input = event.target as HTMLInputElement;
		if (input.files && input.files.length > 0) {
			uploadedFile = input.files[0];
			mergeError = '';
		}
	}

	async function mergeAndDownload() {
		if (!uploadedFile) {
			mergeError = 'Veuillez sélectionner un fichier Excel';
			return;
		}

		try {
			const arrayBuffer = await uploadedFile.arrayBuffer();
			const wb = new ExcelJS.Workbook();
			await wb.xlsx.load(arrayBuffer);

			// Verify required sheets
			const requiredSheets = ['Historique Évaluations', 'Mon Évaluation'];
			const sheetNames = wb.worksheets.map(ws => ws.name);
			const missingSheets = requiredSheets.filter(name => !sheetNames.includes(name));

			if (missingSheets.length > 0) {
				mergeError = `Fichier invalide. Feuilles manquantes: ${missingSheets.join(', ')}`;
				return;
			}

			const currentDate = new Date().toLocaleDateString('fr-FR');

			// Process Historique Évaluations
			const histoSheet = wb.getWorksheet('Historique Évaluations');
			if (histoSheet) {
				histoSheet.eachRow((row, rowNumber) => {
					if (rowNumber <= 3) return; // Skip headers

					const skillName = row.getCell(2).value?.toString();
					if (!skillName) return;

					const skill = skillsData.skills.find((s: any) => s.name === skillName);
					if (!skill) return;

					const answer = assessmentState.answers[skill.id];
					const currentLevel = answer ? (answer.level === 'nc' ? 'NC' : answer.level) : '';

					// Shift Eval 3 → Eval 4
					row.getCell(12).value = row.getCell(9).value;
					row.getCell(13).value = row.getCell(10).value;
					row.getCell(14).value = row.getCell(11).value;

					// Shift Eval 2 → Eval 3
					row.getCell(9).value = row.getCell(6).value;
					row.getCell(10).value = row.getCell(7).value;
					row.getCell(11).value = row.getCell(8).value;

					// Shift Eval 1 → Eval 2
					row.getCell(6).value = row.getCell(3).value;
					row.getCell(7).value = row.getCell(4).value;
					row.getCell(8).value = row.getCell(5).value;

					// New Eval 1
					row.getCell(3).value = currentLevel !== '' ? currentDate : '';
					row.getCell(4).value = currentLevel;
					row.getCell(5).value = '';
				});
			}

			// Process Mon Évaluation
			const evalSheet = wb.getWorksheet('Mon Évaluation');
			if (evalSheet) {
				evalSheet.eachRow((row, rowNumber) => {
					if (rowNumber <= 5) return; // Skip headers

					const skillName = row.getCell(2).value?.toString();
					if (!skillName) return;

					const skill = skillsData.skills.find((s: any) => s.name === skillName);
					if (!skill) return;

					const isCore = isSkillCore(skill, assessmentState.role);
					const expectedLevel = getExpectedLevel(skill, assessmentState.role);
					const answer = assessmentState.answers[skill.id];
					const currentLevel = answer ? (answer.level === 'nc' ? 'NC' : answer.level) : '';

					// Update columns (preserve 7 and 8: proofs and manager comments)
					row.getCell(3).value = isCore ? 'C' : 'S';
					row.getCell(4).value = expectedLevel === 'NC' ? 'NC' : expectedLevel;
					row.getCell(5).value = currentLevel;
					// Update formula - handle NC case
					row.getCell(6).value = { formula: `IF(OR(E${rowNumber}="",D${rowNumber}="NC",E${rowNumber}="NC"),"",E${rowNumber}-D${rowNumber})` };
				});
			}

			// Download updated file
			const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
			const roleAbbr = role?.abbreviation || assessmentState.role;
			const buffer = await wb.xlsx.writeBuffer();
			const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = `skills-matrix-${roleAbbr}-${new Date().toISOString().split('T')[0]}-updated.xlsx`;
			a.click();
			URL.revokeObjectURL(url);

			closeMergeModal();
		} catch (error) {
			console.error('Merge error:', error);
			mergeError = `Erreur lors de la fusion: ${error instanceof Error ? error.message : 'Erreur inconnue'}`;
		}
	}

</script>

<div class="card p-6">
	<h2 class="text-xl font-semibold text-base-100 mb-4">Exporter les résultats</h2>

	<div class="flex flex-wrap gap-4">
		<button on:click={exportToExcel} class="btn btn-primary flex items-center gap-2">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
			</svg>
			Nouveau fichier Excel
		</button>

		<button on:click={openMergeModal} class="btn btn-secondary flex items-center gap-2">
			<svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
				<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-8l-4-4m0 0L8 8m4-4v12" />
			</svg>
			Mettre à jour mon fichier
		</button>
	</div>

	<p class="text-sm text-base-500 mt-4 flex items-center gap-2">
		<svg class="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
			<path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
		</svg>
		Vos données restent sur votre appareil. Aucune information n'est envoyée à un serveur.
	</p>
</div>

<!-- Merge Modal -->
{#if showMergeModal}
<div class="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
	<div class="bg-white rounded-lg p-6 max-w-md w-full mx-4 shadow-xl">
		<h3 class="text-lg font-semibold mb-4">Mettre à jour mon fichier</h3>

		<p class="text-sm text-gray-600 mb-4">
			Uploadez votre fichier Excel existant. Vos nouvelles évaluations seront fusionnées
			et l'historique sera mis à jour automatiquement.
		</p>

		<div class="mb-4">
			<label for="excel-file-upload" class="block text-sm font-medium text-gray-700 mb-2">
				Fichier Excel existant
			</label>
			<input
				id="excel-file-upload"
				type="file"
				accept=".xlsx,.xls"
				on:change={handleFileUpload}
				class="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
			/>
		</div>

		{#if mergeError}
		<div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-md text-red-700 text-sm">
			{mergeError}
		</div>
		{/if}

		<div class="bg-blue-50 p-3 rounded-md mb-4">
			<p class="text-sm text-blue-800">
				<strong>Ce qui sera mis à jour:</strong>
			</p>
			<ul class="text-sm text-blue-700 mt-1 list-disc list-inside">
				<li>Mon Évaluation: nouveaux scores (commentaires manager préservés)</li>
				<li>Historique: décalage Éval 1→2→3→4, nouvelle évaluation en Éval 1</li>
				<li>Plan Développement: nouveaux axes prioritaires</li>
			</ul>
		</div>

		<div class="flex justify-end gap-3">
			<button
				on:click={closeMergeModal}
				class="btn btn-ghost"
			>
				Annuler
			</button>
			<button
				on:click={mergeAndDownload}
				class="btn btn-primary"
				disabled={!uploadedFile}
			>
				Fusionner et télécharger
			</button>
		</div>
	</div>
</div>
{/if}
