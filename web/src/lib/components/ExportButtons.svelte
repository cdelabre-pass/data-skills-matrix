<script lang="ts">
	import ExcelJS from 'exceljs';
	import JSZip from 'jszip';

	export let assessmentState: any;
	export let skillsData: any;
	export let suggestedLevelIndex: number = 1;

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
			'analytics': 'DBEAFE',     // Blue light
			'business': 'FCE7F3',      // Pink light
			'compliance': 'FEF3C7',    // Yellow light
			'engineering': 'DCFCE7',   // Green light
			'ml': 'F3E8FF',            // Purple light
			'ops': 'E0E7FF',           // Indigo light
			'soft_skills': 'F1F5F9',   // Slate light
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

	function getExpectedLevel(skill: any, roleId: string, levelIndex: number = suggestedLevelIndex): number | string {
		const levels = skill.levels?.[roleId];
		if (!levels || levels.length <= levelIndex) return 'NC';
		const level = levels[levelIndex];
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

	function createReferenceSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Ref');
		ws.state = 'veryHidden';

		// Row 1: Role names in B1:G1
		skillsData.roles.forEach((role: any, i: number) => {
			ws.getCell(1, i + 2).value = role.name;
		});

		// Row 2: Career level names in B2:E2
		skillsData.levels.forEach((level: any, i: number) => {
			ws.getCell(2, i + 2).value = level.name;
		});

		// Row 3: empty (separator)
		// Row 4: header
		ws.getCell(4, 1).value = 'Compétence';
		skillsData.roles.forEach((role: any, ri: number) => {
			const baseCol = 2 + ri * 5;
			ws.getCell(4, baseCol).value = `${role.name} C/S`;
			ws.getCell(4, baseCol + 1).value = `${role.name} Jr`;
			ws.getCell(4, baseCol + 2).value = `${role.name} Cf`;
			ws.getCell(4, baseCol + 3).value = `${role.name} Sr`;
			ws.getCell(4, baseCol + 4).value = `${role.name} Ex`;
		});

		// Row 5+: skill data (same order as Mon Évaluation)
		let rowIdx = 5;
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);
			for (const skill of categorySkills) {
				ws.getCell(rowIdx, 1).value = skill.name;

				skillsData.roles.forEach((role: any, ri: number) => {
					const baseCol = 2 + ri * 5;
					const isCore = skill.core_roles?.includes(role.id);
					ws.getCell(rowIdx, baseCol).value = isCore ? 'C' : 'S';

					const levels = skill.levels?.[role.id] || ['NC', 'NC', 'NC', 'NC'];
					for (let li = 0; li < 4; li++) {
						const level = levels[li];
						ws.getCell(rowIdx, baseCol + 1 + li).value = (level === null || level === undefined) ? 'NC' : level;
					}
				});

				rowIdx++;
			}
		}
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
		ws.getCell('D3').value = skillsData.levels[suggestedLevelIndex]?.name || '';
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
		const totalSkills = skillsData.skills.length;
		const lastRefRow = 4 + totalSkills; // Ref data starts at row 5
		// Ref layout: col A = skill name, then per role: 5 cols [C/S, Jr, Cf, Sr, Ex]
		// Last data column in Ref = 1 + roles.length * 5 = 31 (col AE)
		const refLastCol = 'AE';

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

				// Core/Sec formula - INDEX/MATCH on Ref sheet
				row.getCell(3).value = { formula: `IFERROR(INDEX(Ref!B$5:${refLastCol}$${lastRefRow},MATCH(B${rowIdx},Ref!A$5:A$${lastRefRow},0),(MATCH(B$3,Ref!B$1:G$1,0)-1)*5+1),"S")` };
				row.getCell(3).alignment = { horizontal: 'center' };
				row.getCell(3).border = BORDERS_ALL;

				// Niveau Attendu formula - INDEX/MATCH on Ref sheet
				row.getCell(4).value = { formula: `IFERROR(INDEX(Ref!B$5:${refLastCol}$${lastRefRow},MATCH(B${rowIdx},Ref!A$5:A$${lastRefRow},0),(MATCH(B$3,Ref!B$1:G$1,0)-1)*5+1+MATCH(D$3,Ref!B$2:E$2,0)),"NC")` };
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
					formulae: ['"0,1,2,3,4,5,6,NC"'],
					errorTitle: 'Niveau invalide',
					error: 'Veuillez entrer un niveau valide (0-6 ou NC)'
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

	function createProfilsParRoleSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Profils par Rôle');
		const levelName = skillsData.levels[suggestedLevelIndex]?.name || 'Confirmé';
		const totalCols = 2 + skillsData.roles.length + 1; // Cat + Skill + roles + Mon Niveau
		const monNiveauCol = totalCols; // Last column = Mon Niveau

		// Title
		ws.mergeCells(1, 1, 1, totalCols);
		const titleCell = ws.getCell('A1');
		titleCell.value = `Profils par Rôle - Niveaux Attendus (${levelName})`;
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Note
		ws.mergeCells(2, 1, 2, totalCols);
		ws.getCell('A2').value = assessmentState.name || 'Non renseigné';
		ws.getCell('A2').font = { italic: true };

		ws.mergeCells(3, 1, 3, totalCols);
		ws.getCell('A3').value = `Niveau de carrière affiché : ${levelName}. Cellules vertes = compétence core pour ce rôle.`;
		ws.getCell('A3').font = { italic: true, size: 10 };

		// Headers
		const headers = ['Catégorie', 'Compétence'];
		for (const role of skillsData.roles) {
			headers.push(role.name);
		}
		headers.push('Mon Niveau');

		const headerRow = ws.getRow(5);
		headers.forEach((h, i) => {
			const cell = headerRow.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		// Data - skills in same order as Mon Évaluation (both iterate categories then skills)
		let rowIdx = 6;
		const evalLastRow = 5 + skillsData.skills.length; // Mon Évaluation data ends here
		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const row = ws.getRow(rowIdx);

				row.getCell(1).value = category.name;
				row.getCell(1).fill = getCategoryFill(category.id);
				row.getCell(1).border = BORDERS_ALL;

				row.getCell(2).value = skill.name;
				row.getCell(2).border = BORDERS_ALL;

				// Expected level per role
				let col = 3;
				for (const role of skillsData.roles) {
					const expected = getExpectedLevel(skill, role.id, suggestedLevelIndex);
					const isCore = skill.core_roles?.includes(role.id);
					const cell = row.getCell(col);
					cell.value = expected === 'NC' ? 'NC' : expected;
					cell.alignment = { horizontal: 'center' };
					cell.border = BORDERS_ALL;
					if (isCore && expected !== 'NC') {
						cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: COLORS.core } };
						cell.font = { bold: true };
					} else if (expected !== 'NC' && typeof expected === 'number') {
						cell.fill = getLevelFill(expected);
					}
					col++;
				}

				// Mon Niveau - formula referencing Mon Évaluation column E
				const myCell = row.getCell(monNiveauCol);
				myCell.value = { formula: `'Mon Évaluation'!E${rowIdx}` };
				myCell.alignment = { horizontal: 'center' };
				myCell.border = BORDERS_ALL;

				rowIdx++;
			}
		}
		const lastDataRow = rowIdx - 1;

		// --- Radar chart summary section (AVERAGEIF formulas) ---
		const summaryStart = lastDataRow + 3;
		ws.getCell(summaryStart, 1).value = 'Données du graphique radar';
		ws.getCell(summaryStart, 1).font = { bold: true, size: 11 };

		const summaryHeaderRow = summaryStart + 1;
		['Catégorie', 'Niveau Attendu', 'Mon Niveau'].forEach((h, i) => {
			const cell = ws.getCell(summaryHeaderRow, i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});

		const summaryDataStart = summaryHeaderRow + 1;
		skillsData.categories.forEach((cat: any, i: number) => {
			const r = summaryDataStart + i;
			ws.getCell(r, 1).value = cat.name;
			ws.getCell(r, 1).fill = getCategoryFill(cat.id);
			ws.getCell(r, 1).border = BORDERS_ALL;
			// Average expected level (from Mon Évaluation col D, skips "NC" text automatically)
			ws.getCell(r, 2).value = { formula: `AVERAGEIF('Mon Évaluation'!$A$6:$A$${evalLastRow},A${r},'Mon Évaluation'!$D$6:$D$${evalLastRow})` };
			ws.getCell(r, 2).alignment = { horizontal: 'center' };
			ws.getCell(r, 2).numFmt = '0.0';
			ws.getCell(r, 2).border = BORDERS_ALL;
			// Average Mon Niveau (from Mon Évaluation col E, skips empty/NC automatically)
			ws.getCell(r, 3).value = { formula: `AVERAGEIF('Mon Évaluation'!$A$6:$A$${evalLastRow},A${r},'Mon Évaluation'!$E$6:$E$${evalLastRow})` };
			ws.getCell(r, 3).alignment = { horizontal: 'center' };
			ws.getCell(r, 3).numFmt = '0.0';
			ws.getCell(r, 3).border = BORDERS_ALL;
		});
		const summaryDataEnd = summaryDataStart + skillsData.categories.length - 1;

		// Column widths
		ws.getColumn(1).width = 25;
		ws.getColumn(2).width = 35;
		for (let i = 3; i <= totalCols; i++) {
			ws.getColumn(i).width = 15;
		}

		// Freeze panes
		ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 5 }];

		return { ws, lastDataRow, summaryHeaderRow, summaryDataStart, summaryDataEnd };
	}

	// ============================================
	// Native Excel Radar Chart Injection (via OOXML)
	// ============================================

	async function injectNativeRadarChart(
		xlsxBuffer: ArrayBuffer,
		sheetName: string,
		summaryHeaderRow: number,
		summaryDataStart: number,
		summaryDataEnd: number
	): Promise<ArrayBuffer> {
		const zip = await JSZip.loadAsync(xlsxBuffer);

		// 1. Find the worksheet file for the target sheet
		const workbookXml = await zip.file('xl/workbook.xml')!.async('string');
		const sheetMatch = workbookXml.match(new RegExp(`name="${sheetName.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*r:id="(rId\\d+)"`));
		if (!sheetMatch) return xlsxBuffer;
		const sheetRId = sheetMatch[1];

		const workbookRels = await zip.file('xl/_rels/workbook.xml.rels')!.async('string');
		const targetMatch = workbookRels.match(new RegExp(`Id="${sheetRId}"[^>]*Target="([^"]+)"`));
		if (!targetMatch) return xlsxBuffer;
		const sheetFile = targetMatch[1]; // e.g., "worksheets/sheet6.xml"
		const sheetFileName = sheetFile.split('/').pop()!; // e.g., "sheet6.xml"

		// Escaped sheet name for formulas
		const sn = `'${sheetName}'`;

		// 2. Generate chart XML
		const chartXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<c:chartSpace xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<c:chart>
<c:title><c:tx><c:rich><a:bodyPr/><a:lstStyle/><a:p><a:pPr><a:defRPr sz="1200" b="1"/></a:pPr><a:r><a:rPr lang="fr-FR" sz="1200" b="1"/><a:t>Profil de Compétences</a:t></a:r></a:p></c:rich></c:tx><c:overlay val="0"/></c:title>
<c:autoTitleDeleted val="0"/>
<c:plotArea>
<c:layout/>
<c:radarChart>
<c:radarStyle val="marker"/>
<c:varyColors val="0"/>
<c:ser>
<c:idx val="0"/><c:order val="0"/>
<c:tx><c:strRef><c:f>${sn}!$B$${summaryHeaderRow}</c:f></c:strRef></c:tx>
<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="6366F1"/></a:solidFill></a:ln><a:effectLst/></c:spPr>
<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="6366F1"/></a:solidFill></c:spPr></c:marker>
<c:cat><c:strRef><c:f>${sn}!$A$${summaryDataStart}:$A$${summaryDataEnd}</c:f></c:strRef></c:cat>
<c:val><c:numRef><c:f>${sn}!$B$${summaryDataStart}:$B$${summaryDataEnd}</c:f></c:numRef></c:val>
</c:ser>
<c:ser>
<c:idx val="1"/><c:order val="1"/>
<c:tx><c:strRef><c:f>${sn}!$C$${summaryHeaderRow}</c:f></c:strRef></c:tx>
<c:spPr><a:ln w="28575"><a:solidFill><a:srgbClr val="22C55E"/></a:solidFill></a:ln><a:effectLst/></c:spPr>
<c:marker><c:symbol val="circle"/><c:size val="5"/><c:spPr><a:solidFill><a:srgbClr val="22C55E"/></a:solidFill></c:spPr></c:marker>
<c:cat><c:strRef><c:f>${sn}!$A$${summaryDataStart}:$A$${summaryDataEnd}</c:f></c:strRef></c:cat>
<c:val><c:numRef><c:f>${sn}!$C$${summaryDataStart}:$C$${summaryDataEnd}</c:f></c:numRef></c:val>
</c:ser>
<c:axId val="111111111"/><c:axId val="222222222"/>
</c:radarChart>
<c:catAx><c:axId val="111111111"/><c:scaling><c:orientation val="minMax"/></c:scaling><c:delete val="0"/><c:axPos val="b"/><c:crossAx val="222222222"/></c:catAx>
<c:valAx><c:axId val="222222222"/><c:scaling><c:orientation val="minMax"/><c:max val="4"/><c:min val="0"/></c:scaling><c:delete val="0"/><c:axPos val="l"/><c:crossAx val="111111111"/><c:numFmt formatCode="0" sourceLinked="0"/></c:valAx>
</c:plotArea>
<c:legend><c:legendPos val="b"/></c:legend>
<c:plotVisOnly val="1"/>
</c:chart>
</c:chartSpace>`;

		// 3. Generate drawing XML (positions the chart on the sheet)
		const chartCol = 2 + skillsData.roles.length + 2; // After Mon Niveau + 1 gap col
		const drawingXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<xdr:wsDr xmlns:xdr="http://schemas.openxmlformats.org/drawingml/2006/spreadsheetDrawing" xmlns:a="http://schemas.openxmlformats.org/drawingml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">
<xdr:twoCellAnchor>
<xdr:from><xdr:col>${chartCol}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>4</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:from>
<xdr:to><xdr:col>${chartCol + 8}</xdr:col><xdr:colOff>0</xdr:colOff><xdr:row>28</xdr:row><xdr:rowOff>0</xdr:rowOff></xdr:to>
<xdr:graphicFrame macro="">
<xdr:nvGraphicFramePr><xdr:cNvPr id="2" name="Chart 1"/><xdr:cNvGraphicFramePr><a:graphicFrameLocks noGrp="1"/></xdr:cNvGraphicFramePr></xdr:nvGraphicFramePr>
<xdr:xfrm><a:off x="0" y="0"/><a:ext cx="0" cy="0"/></xdr:xfrm>
<a:graphic><a:graphicData uri="http://schemas.openxmlformats.org/drawingml/2006/chart"><c:chart xmlns:c="http://schemas.openxmlformats.org/drawingml/2006/chart" r:id="rId1"/></a:graphicData></a:graphic>
</xdr:graphicFrame>
<xdr:clientData/>
</xdr:twoCellAnchor>
</xdr:wsDr>`;

		// 4. Add files to zip
		zip.file('xl/charts/chart1.xml', chartXml);
		zip.file('xl/drawings/drawing1.xml', drawingXml);
		zip.file('xl/drawings/_rels/drawing1.xml.rels',
			`<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/chart" Target="../charts/chart1.xml"/>
</Relationships>`);

		// 5. Add/update sheet relationships (link sheet to drawing)
		const sheetRelsPath = `xl/worksheets/_rels/${sheetFileName}.rels`;
		const existingRels = zip.file(sheetRelsPath);
		let sheetRelsXml: string;
		let drawingRId = 'rId1';
		if (existingRels) {
			sheetRelsXml = await existingRels.async('string');
			// Find highest existing rId
			const rIdMatches = [...sheetRelsXml.matchAll(/Id="rId(\d+)"/g)];
			const maxId = rIdMatches.reduce((max, m) => Math.max(max, parseInt(m[1])), 0);
			drawingRId = `rId${maxId + 1}`;
			sheetRelsXml = sheetRelsXml.replace('</Relationships>',
				`<Relationship Id="${drawingRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/></Relationships>`);
		} else {
			sheetRelsXml = `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>
<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">
<Relationship Id="${drawingRId}" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/drawing" Target="../drawings/drawing1.xml"/>
</Relationships>`;
		}
		zip.file(sheetRelsPath, sheetRelsXml);

		// 6. Add <drawing> element to the sheet XML
		let sheetXml = await zip.file(`xl/${sheetFile}`)!.async('string');
		sheetXml = sheetXml.replace('</worksheet>', `<drawing r:id="${drawingRId}"/></worksheet>`);
		zip.file(`xl/${sheetFile}`, sheetXml);

		// 7. Update [Content_Types].xml
		let contentTypes = await zip.file('[Content_Types].xml')!.async('string');
		contentTypes = contentTypes.replace('</Types>',
			`<Override PartName="/xl/charts/chart1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawingml.chart+xml"/>` +
			`<Override PartName="/xl/drawings/drawing1.xml" ContentType="application/vnd.openxmlformats-officedocument.drawing+xml"/>` +
			`</Types>`);
		zip.file('[Content_Types].xml', contentTypes);

		return await zip.generateAsync({ type: 'arraybuffer' });
	}

	interface GapItem {
		skill: any;
		category: any;
		currentLevel: number;
		expectedLevel: number;
		gap: number;
		isCore: boolean;
		tip: string;
		priority: 'Haute' | 'Moyenne' | 'Basse';
	}

	function getExhaustiveGaps(): { currentLevelGaps: GapItem[]; nextLevelGaps: GapItem[] } {
		const roleId = assessmentState.role;
		const currentLevelGaps: GapItem[] = [];
		const nextLevelGaps: GapItem[] = [];
		const currentLevelGapSkillIds = new Set<string>();

		for (const category of skillsData.categories) {
			const categorySkills = skillsData.skills.filter((s: any) => s.category === category.id);

			for (const skill of categorySkills) {
				const answer = assessmentState.answers[skill.id];
				if (!answer || answer.level === 'nc') continue;

				const currentLevel = answer.level as number;
				const levels = skill.levels?.[roleId];
				if (!levels) continue;

				const isCore = skill.core_roles?.includes(roleId) ?? false;
				const expected = levels[suggestedLevelIndex];

				// Section 1: current < expected at suggestedLevelIndex
				if (expected !== 'NC' && expected !== null && expected !== undefined && typeof expected === 'number' && currentLevel < expected) {
					const gap = expected - currentLevel;
					const nextTransition = `${currentLevel}\u2192${currentLevel + 1}`;
					const tip = skill.improvement_tips?.[nextTransition] || '';
					const priority = getPriority(isCore, gap);

					currentLevelGaps.push({
						skill,
						category,
						currentLevel,
						expectedLevel: expected,
						gap,
						isCore,
						tip,
						priority
					});
					currentLevelGapSkillIds.add(skill.id);
				}

				// Section 2: meets current level but gap at next level (no duplicates)
				if (!currentLevelGapSkillIds.has(skill.id) && suggestedLevelIndex + 1 < levels.length) {
					const nextExpected = levels[suggestedLevelIndex + 1];
					if (nextExpected !== 'NC' && nextExpected !== null && nextExpected !== undefined && typeof nextExpected === 'number' && currentLevel < nextExpected) {
						const gap = nextExpected - currentLevel;
						const nextTransition = `${currentLevel}\u2192${currentLevel + 1}`;
						const tip = skill.improvement_tips?.[nextTransition] || '';
						const priority = getPriority(isCore, gap);

						nextLevelGaps.push({
							skill,
							category,
							currentLevel,
							expectedLevel: nextExpected,
							gap,
							isCore,
							tip,
							priority
						});
					}
				}
			}
		}

		// Sort: core first, then by gap descending
		const sortGaps = (a: GapItem, b: GapItem) => {
			if (a.isCore !== b.isCore) return a.isCore ? -1 : 1;
			return b.gap - a.gap;
		};
		currentLevelGaps.sort(sortGaps);
		nextLevelGaps.sort(sortGaps);

		return { currentLevelGaps, nextLevelGaps };
	}

	function getPriority(isCore: boolean, gap: number): 'Haute' | 'Moyenne' | 'Basse' {
		if ((isCore && gap >= 2) || gap >= 3) return 'Haute';
		if ((isCore && gap === 1) || gap === 2) return 'Moyenne';
		return 'Basse';
	}

	const PRIORITY_COLORS: Record<string, string> = {
		'Haute': 'FECACA',    // red light
		'Moyenne': 'FED7AA',  // orange light
		'Basse': 'FEF08A',    // yellow light
	};

	function createPlanDeveloppementSheet(wb: ExcelJS.Workbook) {
		const ws = wb.addWorksheet('Plan Développement');
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		const roleName = role?.name || assessmentState.role;
		const levelName = skillsData.levels[suggestedLevelIndex]?.name || 'Confirmé';
		const nextLevelName = skillsData.levels[suggestedLevelIndex + 1]?.name || '';

		const headers = ['Priorité', 'Core/Sec', 'Compétence', 'Catégorie', 'Niveau Actuel', 'Niveau Cible', 'Écart', 'Conseils Progression', 'Actions Planifiées', 'Trimestre', 'Statut'];
		const totalCols = headers.length;

		// Title
		ws.mergeCells(1, 1, 1, totalCols);
		const titleCell = ws.getCell('A1');
		titleCell.value = 'Plan de Développement Annuel';
		titleCell.fill = getHeaderFill();
		titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

		// Subtitle
		ws.mergeCells(2, 1, 2, totalCols);
		ws.getCell('A2').value = `Rôle: ${roleName} | Niveau: ${levelName}`;
		ws.getCell('A2').font = { italic: true, size: 11 };

		const { currentLevelGaps, nextLevelGaps } = getExhaustiveGaps();

		let rowIdx = 4;

		// === SECTION 1 ===
		ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
		const sec1Cell = ws.getCell(rowIdx, 1);
		sec1Cell.value = `=== SECTION 1 : Écarts au niveau actuel (${levelName}) ===`;
		sec1Cell.font = { bold: true, size: 12, color: { argb: '1E40AF' } };
		sec1Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'DBEAFE' } };
		rowIdx++;

		// Headers
		const headerRow1 = ws.getRow(rowIdx);
		headers.forEach((h, i) => {
			const cell = headerRow1.getCell(i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		});
		rowIdx++;

		// Data section 1
		rowIdx = writeGapRows(ws, currentLevelGaps, rowIdx, headers.length);

		if (currentLevelGaps.length === 0) {
			ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
			ws.getCell(rowIdx, 1).value = 'Aucun écart identifié à ce niveau.';
			ws.getCell(rowIdx, 1).font = { italic: true };
			rowIdx++;
		}

		rowIdx += 3; // Blank rows between sections

		// === SECTION 2 ===
		if (nextLevelName) {
			ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
			const sec2Cell = ws.getCell(rowIdx, 1);
			sec2Cell.value = `=== SECTION 2 : Progression vers ${nextLevelName} ===`;
			sec2Cell.font = { bold: true, size: 12, color: { argb: '7C3AED' } };
			sec2Cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: 'F3E8FF' } };
			rowIdx++;

			// Headers
			const headerRow2 = ws.getRow(rowIdx);
			headers.forEach((h, i) => {
				const cell = headerRow2.getCell(i + 1);
				cell.value = h;
				applyHeaderStyle(cell);
			});
			rowIdx++;

			// Data section 2
			rowIdx = writeGapRows(ws, nextLevelGaps, rowIdx, headers.length);

			if (nextLevelGaps.length === 0) {
				ws.mergeCells(rowIdx, 1, rowIdx, totalCols);
				ws.getCell(rowIdx, 1).value = 'Aucun écart identifié pour ce niveau.';
				ws.getCell(rowIdx, 1).font = { italic: true };
				rowIdx++;
			}
		}

		// Column widths
		ws.getColumn(1).width = 12;  // Priorité
		ws.getColumn(2).width = 10;  // Core/Sec
		ws.getColumn(3).width = 35;  // Compétence
		ws.getColumn(4).width = 20;  // Catégorie
		ws.getColumn(5).width = 12;  // Niveau Actuel
		ws.getColumn(6).width = 12;  // Niveau Cible
		ws.getColumn(7).width = 8;   // Écart
		ws.getColumn(8).width = 50;  // Conseils
		ws.getColumn(9).width = 40;  // Actions
		ws.getColumn(10).width = 12; // Trimestre
		ws.getColumn(11).width = 15; // Statut
	}

	function writeGapRows(ws: ExcelJS.Worksheet, gaps: GapItem[], startRow: number, colCount: number): number {
		let rowIdx = startRow;

		for (const item of gaps) {
			const row = ws.getRow(rowIdx);

			// A: Priorité
			row.getCell(1).value = item.priority;
			row.getCell(1).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: PRIORITY_COLORS[item.priority] } };
			row.getCell(1).alignment = { horizontal: 'center' };
			row.getCell(1).font = { bold: true };
			row.getCell(1).border = BORDERS_ALL;

			// B: Core/Sec
			row.getCell(2).value = item.isCore ? 'C' : 'S';
			row.getCell(2).fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: item.isCore ? COLORS.core : COLORS.secondary } };
			row.getCell(2).alignment = { horizontal: 'center' };
			if (item.isCore) row.getCell(2).font = { bold: true };
			row.getCell(2).border = BORDERS_ALL;

			// C: Compétence
			row.getCell(3).value = item.skill.name;
			row.getCell(3).border = BORDERS_ALL;

			// D: Catégorie
			row.getCell(4).value = item.category.name;
			row.getCell(4).fill = getCategoryFill(item.category.id);
			row.getCell(4).border = BORDERS_ALL;

			// E: Niveau Actuel
			row.getCell(5).value = item.currentLevel;
			row.getCell(5).fill = getLevelFill(item.currentLevel);
			row.getCell(5).alignment = { horizontal: 'center' };
			row.getCell(5).border = BORDERS_ALL;

			// F: Niveau Cible
			row.getCell(6).value = item.expectedLevel;
			row.getCell(6).alignment = { horizontal: 'center' };
			row.getCell(6).border = BORDERS_ALL;

			// G: Écart
			row.getCell(7).value = item.gap;
			row.getCell(7).alignment = { horizontal: 'center' };
			row.getCell(7).font = { bold: true, color: { argb: item.gap >= 2 ? 'DC2626' : 'F59E0B' } };
			row.getCell(7).border = BORDERS_ALL;

			// H: Conseils
			row.getCell(8).value = item.tip;
			row.getCell(8).alignment = { wrapText: true, vertical: 'top' };
			row.getCell(8).border = BORDERS_ALL;

			// I: Actions Planifiées (empty)
			row.getCell(9).value = '';
			row.getCell(9).border = BORDERS_ALL;

			// J: Trimestre
			row.getCell(10).value = '';
			row.getCell(10).dataValidation = {
				type: 'list',
				allowBlank: true,
				formulae: ['"Q1,Q2,Q3,Q4"']
			};
			row.getCell(10).border = BORDERS_ALL;

			// K: Statut
			row.getCell(11).value = 'Non démarré';
			row.getCell(11).dataValidation = {
				type: 'list',
				allowBlank: true,
				formulae: ['"Non démarré,En cours,Complété"']
			};
			row.getCell(11).border = BORDERS_ALL;

			rowIdx++;
		}

		return rowIdx;
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

		// Create sheets in order
		createNiveauxSheet(wb);
		createMatriceSheet(wb);
		createDescriptionsSheet(wb);
		createReferenceSheet(wb);
		createAssessmentSheet(wb);
		const profilResult = createProfilsParRoleSheet(wb);
		createPlanDeveloppementSheet(wb);
		createHistoriqueSheet(wb);

		// Generate and download
		const role = skillsData.roles.find((r: any) => r.id === assessmentState.role);
		const roleAbbr = role?.abbreviation || assessmentState.role;
		let buffer = await wb.xlsx.writeBuffer();

		// Inject native Excel radar chart into the xlsx
		try {
			buffer = await injectNativeRadarChart(
				buffer as ArrayBuffer,
				'Profils par Rôle',
				profilResult.summaryHeaderRow,
				profilResult.summaryDataStart,
				profilResult.summaryDataEnd
			);
		} catch (e) {
			console.warn('Could not inject radar chart:', e);
		}

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

					const answer = assessmentState.answers[skill.id];
					const currentLevel = answer ? (answer.level === 'nc' ? 'NC' : answer.level) : '';

					// Only update Mon Niveau (col E) - preserve C and D formulas, 7 and 8 (proofs/manager)
					row.getCell(5).value = currentLevel;
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
