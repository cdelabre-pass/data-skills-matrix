import ExcelJS from 'exceljs';

// ============================================
// Styling Constants (duplicated from ExportButtons)
// ============================================

const COLORS = {
	header: '3943B4',
	levels: {
		NC: 'E5E7EB',
		'0': 'FEE2E2',
		'1': 'FED7AA',
		'2': 'FEF08A',
		'3': '86EFAC',
		'4': '22C55E',
		'5': '3B82F6',
		'6': '8B5CF6',
	} as Record<string, string>,
	categories: {
		analytics: 'DBEAFE',
		engineering: 'DCFCE7',
		data_management: 'FEF3C7',
		business: 'FCE7F3',
		cloud: 'E0E7FF',
		machine_learning: 'F3E8FF',
		visualization: 'FFEDD5',
		soft_skills: 'F1F5F9',
	} as Record<string, string>,
	core: 'DCFCE7',
	secondary: 'F3F4F6',
	border: 'CCCCCC',
};

const BORDER_THIN: Partial<ExcelJS.Border> = {
	style: 'thin',
	color: { argb: COLORS.border },
};

const BORDERS_ALL: Partial<ExcelJS.Borders> = {
	top: BORDER_THIN,
	left: BORDER_THIN,
	bottom: BORDER_THIN,
	right: BORDER_THIN,
};

// ============================================
// Helper Functions
// ============================================

function getLevelFill(level: string | number): ExcelJS.Fill {
	const color = COLORS.levels[String(level)] || COLORS.levels['NC'];
	return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function getCategoryFill(categoryId: string): ExcelJS.Fill {
	const color = COLORS.categories[categoryId] || 'FFFFFF';
	return { type: 'pattern', pattern: 'solid', fgColor: { argb: color } };
}

function getHeaderFill(): ExcelJS.Fill {
	return {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: COLORS.header },
	};
}

function applyHeaderStyle(cell: ExcelJS.Cell) {
	cell.fill = getHeaderFill();
	cell.font = { bold: true, color: { argb: 'FFFFFF' } };
	cell.alignment = { horizontal: 'center', vertical: 'middle' };
	cell.border = BORDERS_ALL;
}

// ============================================
// Sheet Builders
// ============================================

/* eslint-disable @typescript-eslint/no-explicit-any */

function createNiveauxSheet(wb: ExcelJS.Workbook, skillsData: any) {
	const ws = wb.addWorksheet('Niveaux');

	ws.mergeCells('A1:C1');
	const titleCell = ws.getCell('A1');
	titleCell.value = 'Échelle de Compétences';
	titleCell.fill = getHeaderFill();
	titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

	const headerRow = ws.getRow(3);
	['Niveau', 'Description', 'Exemple'].forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		applyHeaderStyle(cell);
	});

	const allLevels = [
		...skillsData.skill_levels.standard,
		...skillsData.skill_levels.bonus,
	];
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
		row.getCell(3).value =
			`Compétences core: Niveau ${coreRange} | Secondaires: Niveau ${secRange}`;
		row.getCell(3).border = BORDERS_ALL;
		rowIdx++;
	}
	rowIdx += 2;

	const legendRow = ws.getRow(rowIdx);
	legendRow.getCell(1).value = 'Core vs Secondary Skills';
	legendRow.getCell(1).font = { bold: true, size: 12 };
	rowIdx += 2;

	const coreRow = ws.getRow(rowIdx);
	coreRow.getCell(1).value = 'C';
	coreRow.getCell(1).fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: COLORS.core },
	};
	coreRow.getCell(1).font = { bold: true };
	coreRow.getCell(1).alignment = { horizontal: 'center' };
	coreRow.getCell(2).value =
		'Core Skill - Compétence fondamentale pour le rôle';
	rowIdx++;

	const secRow = ws.getRow(rowIdx);
	secRow.getCell(1).value = 'S';
	secRow.getCell(1).fill = {
		type: 'pattern',
		pattern: 'solid',
		fgColor: { argb: COLORS.secondary },
	};
	secRow.getCell(1).alignment = { horizontal: 'center' };
	secRow.getCell(2).value = 'Secondary Skill - Compétence complémentaire';

	ws.getColumn(1).width = 15;
	ws.getColumn(2).width = 30;
	ws.getColumn(3).width = 50;
}

function createMatriceSheet(wb: ExcelJS.Workbook, skillsData: any) {
	const ws = wb.addWorksheet('Matrice Compétences');

	const headers = ['Catégorie', 'Compétence', 'Description'];
	for (const role of skillsData.roles) {
		headers.push(
			`${role.name} C/S`,
			`${role.name} Jr`,
			`${role.name} Cf`,
			`${role.name} Sr`,
			`${role.name} Ex`,
		);
	}

	const headerRow = ws.getRow(1);
	headerRow.height = 80;
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		applyHeaderStyle(cell);
		if (i >= 3) {
			cell.alignment = {
				horizontal: 'center',
				vertical: 'bottom',
				textRotation: 90,
				wrapText: true,
			};
		}
	});

	let rowIdx = 2;
	for (const category of skillsData.categories) {
		const categorySkills = skillsData.skills.filter(
			(s: any) => s.category === category.id,
		);

		for (const skill of categorySkills) {
			const row = ws.getRow(rowIdx);

			row.getCell(1).value = category.name;
			row.getCell(1).fill = getCategoryFill(category.id);
			row.getCell(1).border = BORDERS_ALL;

			row.getCell(2).value = skill.name;
			row.getCell(2).border = BORDERS_ALL;
			row.getCell(3).value = skill.description;
			row.getCell(3).border = BORDERS_ALL;

			let col = 4;
			for (const role of skillsData.roles) {
				const isCore = skill.core_roles?.includes(role.id);

				const csCell = row.getCell(col);
				csCell.value = isCore ? 'C' : 'S';
				csCell.alignment = { horizontal: 'center' };
				csCell.fill = {
					type: 'pattern',
					pattern: 'solid',
					fgColor: { argb: isCore ? COLORS.core : COLORS.secondary },
				};
				if (isCore) csCell.font = { bold: true };
				csCell.border = BORDERS_ALL;
				col++;

				const levels = skill.levels?.[role.id] || ['NC', 'NC', 'NC', 'NC'];
				for (let i = 0; i < 4; i++) {
					const level =
						levels[i] === null || levels[i] === undefined ? 'NC' : levels[i];
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

	ws.getColumn(1).width = 25;
	ws.getColumn(2).width = 35;
	ws.getColumn(3).width = 60;
	for (let i = 4; i <= headers.length; i++) {
		ws.getColumn(i).width = 8;
	}

	ws.views = [{ state: 'frozen', xSplit: 3, ySplit: 1 }];
}

function createDescriptionsSheet(wb: ExcelJS.Workbook, skillsData: any) {
	const ws = wb.addWorksheet('Descriptions par Niveau');

	const headers = [
		'Catégorie',
		'Compétence',
		'Niveau 0',
		'Niveau 1',
		'Niveau 2',
		'Niveau 3',
		'Niveau 4',
		'Ressources Internes',
	];
	const headerRow = ws.getRow(1);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		applyHeaderStyle(cell);
	});

	let rowIdx = 2;
	for (const category of skillsData.categories) {
		const categorySkills = skillsData.skills.filter(
			(s: any) => s.category === category.id,
		);

		for (const skill of categorySkills) {
			const row = ws.getRow(rowIdx);
			row.height = 60;

			row.getCell(1).value = category.name;
			row.getCell(1).fill = getCategoryFill(category.id);
			row.getCell(1).border = BORDERS_ALL;

			row.getCell(2).value = skill.name;
			row.getCell(2).border = BORDERS_ALL;

			for (let level = 0; level <= 4; level++) {
				const desc =
					skill.level_descriptions?.[level] ||
					skill.level_descriptions?.[String(level)] ||
					'';
				const cell = row.getCell(3 + level);
				cell.value = desc;
				cell.alignment = { wrapText: true, vertical: 'top' };
				cell.fill = getLevelFill(level);
				cell.border = BORDERS_ALL;
				if (level >= 3) {
					cell.font = { color: { argb: 'FFFFFF' } };
				}
			}

			const resources = skill.resources
				? Array.isArray(skill.resources)
					? skill.resources.map((r: any) => `• ${r.title}: ${r.url}`).join('\n')
					: skill.resources
				: '';
			row.getCell(8).value = resources;
			row.getCell(8).alignment = { wrapText: true, vertical: 'top' };
			row.getCell(8).border = BORDERS_ALL;

			rowIdx++;
		}
	}

	ws.getColumn(1).width = 25;
	ws.getColumn(2).width = 30;
	for (let i = 3; i <= 7; i++) ws.getColumn(i).width = 45;
	ws.getColumn(8).width = 50;

	ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 1 }];
}

function createReferenceSheet(wb: ExcelJS.Workbook, skillsData: any) {
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

	// Row 5+: skill data (same category/skill order as Mon Évaluation)
	let rowIdx = 5;
	for (const category of skillsData.categories) {
		const categorySkills = skillsData.skills.filter(
			(s: any) => s.category === category.id,
		);
		for (const skill of categorySkills) {
			ws.getCell(rowIdx, 1).value = skill.name;

			skillsData.roles.forEach((role: any, ri: number) => {
				const baseCol = 2 + ri * 5;
				const isCore = skill.core_roles?.includes(role.id);
				ws.getCell(rowIdx, baseCol).value = isCore ? 'C' : 'S';

				const levels = skill.levels?.[role.id] || ['NC', 'NC', 'NC', 'NC'];
				for (let li = 0; li < 4; li++) {
					const level = levels[li];
					ws.getCell(rowIdx, baseCol + 1 + li).value =
						level === null || level === undefined ? 'NC' : level;
				}
			});

			rowIdx++;
		}
	}
}

function createAssessmentSheet(wb: ExcelJS.Workbook, skillsData: any) {
	const ws = wb.addWorksheet('Mon Évaluation');
	const totalSkills = skillsData.skills.length;
	const lastRefRow = 4 + totalSkills;
	const refLastCol = 'AE'; // 1 + 6*5 = 31 columns

	// Title
	ws.mergeCells('A1:H1');
	const titleCell = ws.getCell('A1');
	titleCell.value = 'Auto-évaluation des Compétences';
	titleCell.fill = getHeaderFill();
	titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

	// Instructions
	ws.mergeCells('A2:H2');
	ws.getCell('A2').value =
		'Instructions: Choisissez votre rôle et niveau ci-dessous, puis évaluez chaque compétence (0-4 ou NC)';
	ws.getCell('A2').font = { italic: true };

	// Role selection (blank — user picks)
	ws.getCell('A3').value = 'Mon Rôle:';
	ws.getCell('A3').font = { bold: true };
	ws.getCell('B3').value = '';
	ws.getCell('B3').dataValidation = {
		type: 'list',
		allowBlank: true,
		formulae: [`"${skillsData.roles.map((r: any) => r.name).join(',')}"`],
	};

	ws.getCell('C3').value = 'Mon Niveau:';
	ws.getCell('C3').font = { bold: true };
	ws.getCell('D3').value = '';
	ws.getCell('D3').dataValidation = {
		type: 'list',
		allowBlank: true,
		formulae: [`"${skillsData.levels.map((l: any) => l.name).join(',')}"`],
	};

	ws.getCell('E3').value = 'Nom:';
	ws.getCell('E3').font = { bold: true };
	ws.getCell('F3').value = '';

	// Headers
	const headers = [
		'Catégorie',
		'Compétence',
		'Core/Sec',
		'Niveau Attendu',
		'Mon Niveau',
		'Écart',
		'Preuves/Exemples',
		'Commentaires Manager',
	];
	const headerRow = ws.getRow(5);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		applyHeaderStyle(cell);
	});

	// All skills with INDEX/MATCH formulas on Ref sheet
	let rowIdx = 6;
	const skillRows: number[] = [];

	for (const category of skillsData.categories) {
		const categorySkills = skillsData.skills.filter(
			(s: any) => s.category === category.id,
		);

		for (const skill of categorySkills) {
			const row = ws.getRow(rowIdx);

			row.getCell(1).value = category.name;
			row.getCell(1).fill = getCategoryFill(category.id);
			row.getCell(1).border = BORDERS_ALL;

			row.getCell(2).value = skill.name;
			row.getCell(2).border = BORDERS_ALL;

			// Core/Sec formula — INDEX/MATCH on Ref sheet
			row.getCell(3).value = {
				formula: `IFERROR(INDEX(Ref!B$5:${refLastCol}$${lastRefRow},MATCH(B${rowIdx},Ref!A$5:A$${lastRefRow},0),(MATCH(B$3,Ref!B$1:G$1,0)-1)*5+1),"")`,
			};
			row.getCell(3).alignment = { horizontal: 'center' };
			row.getCell(3).border = BORDERS_ALL;

			// Niveau Attendu formula — INDEX/MATCH on Ref sheet
			row.getCell(4).value = {
				formula: `IFERROR(INDEX(Ref!B$5:${refLastCol}$${lastRefRow},MATCH(B${rowIdx},Ref!A$5:A$${lastRefRow},0),(MATCH(B$3,Ref!B$1:G$1,0)-1)*5+1+MATCH(D$3,Ref!B$2:E$2,0)),"")`,
			};
			row.getCell(4).alignment = { horizontal: 'center' };
			row.getCell(4).border = BORDERS_ALL;

			// Mon Niveau — empty with dropdown validation
			row.getCell(5).value = '';
			row.getCell(5).alignment = { horizontal: 'center' };
			row.getCell(5).border = BORDERS_ALL;

			// Gap formula
			row.getCell(6).value = {
				formula: `IF(OR(E${rowIdx}="",D${rowIdx}="NC",D${rowIdx}="",E${rowIdx}="NC"),"",E${rowIdx}-D${rowIdx})`,
			};
			row.getCell(6).alignment = { horizontal: 'center' };
			row.getCell(6).border = BORDERS_ALL;

			// Preuves/Exemples
			row.getCell(7).value = '';
			row.getCell(7).border = BORDERS_ALL;

			// Commentaires Manager
			row.getCell(8).value = '';
			row.getCell(8).border = BORDERS_ALL;

			skillRows.push(rowIdx);
			rowIdx++;
		}
	}

	// Data validation for "Mon Niveau" column
	if (skillRows.length > 0) {
		for (const r of skillRows) {
			ws.getCell(`E${r}`).dataValidation = {
				type: 'list',
				allowBlank: true,
				formulae: ['"0,1,2,3,4,NC"'],
				errorTitle: 'Niveau invalide',
				error: 'Veuillez entrer un niveau valide (0-4 ou NC)',
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

	ws.views = [{ state: 'frozen', xSplit: 0, ySplit: 5 }];
}

function createProfilsParRoleSheet(wb: ExcelJS.Workbook, skillsData: any) {
	const ws = wb.addWorksheet('Profils par Rôle');
	const totalSkills = skillsData.skills.length;
	const lastRefRow = 4 + totalSkills;
	const refLastCol = 'AE';
	const totalCols = 2 + skillsData.roles.length + 1; // Cat + Skill + roles + Mon Niveau
	const monNiveauCol = totalCols;

	// Title
	ws.mergeCells(1, 1, 1, totalCols);
	const titleCell = ws.getCell('A1');
	titleCell.value = 'Profils par Rôle - Niveaux Attendus';
	titleCell.fill = getHeaderFill();
	titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

	// Instructions
	ws.mergeCells(2, 1, 2, totalCols);
	ws.getCell('A2').value =
		'Changez le niveau de carrière et le rôle ci-dessous pour comparer les profils. Mon Niveau vient de la feuille Mon Évaluation.';
	ws.getCell('A2').font = { italic: true, size: 10 };

	// Dropdowns for career level and role highlight
	ws.getCell('A3').value = 'Niveau de carrière:';
	ws.getCell('A3').font = { bold: true };
	ws.getCell('B3').value = 'Confirmé';
	ws.getCell('B3').dataValidation = {
		type: 'list',
		allowBlank: false,
		formulae: [`"${skillsData.levels.map((l: any) => l.name).join(',')}"`],
	};

	ws.getCell('C3').value = 'Mon Rôle:';
	ws.getCell('C3').font = { bold: true };
	ws.getCell('D3').value = '';
	ws.getCell('D3').dataValidation = {
		type: 'list',
		allowBlank: true,
		formulae: [`"${skillsData.roles.map((r: any) => r.name).join(',')}"`],
	};

	// Headers row 5
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

	// Data rows with INDEX/MATCH formulas
	let rowIdx = 6;
	for (const category of skillsData.categories) {
		const categorySkills = skillsData.skills.filter(
			(s: any) => s.category === category.id,
		);

		for (const skill of categorySkills) {
			const row = ws.getRow(rowIdx);

			row.getCell(1).value = category.name;
			row.getCell(1).fill = getCategoryFill(category.id);
			row.getCell(1).border = BORDERS_ALL;

			row.getCell(2).value = skill.name;
			row.getCell(2).border = BORDERS_ALL;

			// Per-role expected level formulas
			let col = 3;
			for (let ri = 0; ri < skillsData.roles.length; ri++) {
				const cell = row.getCell(col);
				// Formula: look up skill in Ref, get the level for this role at the selected career level
				// Role offset in Ref: ri*5+1 = C/S col, +MATCH(B$3,Ref!B$2:E$2,0) = career level offset
				const roleOffset = ri * 5 + 1;
				cell.value = {
					formula: `IFERROR(INDEX(Ref!B$5:${refLastCol}$${lastRefRow},MATCH(B${rowIdx},Ref!A$5:A$${lastRefRow},0),${roleOffset}+MATCH(B$3,Ref!B$2:E$2,0)),"NC")`,
				};
				cell.alignment = { horizontal: 'center' };
				cell.border = BORDERS_ALL;
				col++;
			}

			// Mon Niveau — reference Mon Évaluation!E column (same row order)
			const myCell = row.getCell(monNiveauCol);
			myCell.value = { formula: `'Mon Évaluation'!E${rowIdx}` };
			myCell.alignment = { horizontal: 'center' };
			myCell.border = BORDERS_ALL;

			rowIdx++;
		}
	}
	const lastDataRow = rowIdx - 1;

	// Radar summary section
	const summaryStart = lastDataRow + 3;
	ws.getCell(summaryStart, 1).value =
		'Résumé par catégorie (pour graphique radar)';
	ws.getCell(summaryStart, 1).font = { bold: true, size: 11 };

	const summaryHeaderRow = summaryStart + 1;
	['Catégorie', 'Niveau Attendu (moy.)', 'Mon Niveau (moy.)'].forEach(
		(h, i) => {
			const cell = ws.getCell(summaryHeaderRow, i + 1);
			cell.value = h;
			applyHeaderStyle(cell);
		},
	);

	const evalLastRow = 5 + totalSkills;
	const summaryDataStart = summaryHeaderRow + 1;
	skillsData.categories.forEach((cat: any, i: number) => {
		const r = summaryDataStart + i;
		ws.getCell(r, 1).value = cat.name;
		ws.getCell(r, 1).fill = getCategoryFill(cat.id);
		ws.getCell(r, 1).border = BORDERS_ALL;

		ws.getCell(r, 2).value = {
			formula: `IFERROR(AVERAGEIF('Mon Évaluation'!$A$6:$A$${evalLastRow},A${r},'Mon Évaluation'!$D$6:$D$${evalLastRow}),"")`,
		};
		ws.getCell(r, 2).alignment = { horizontal: 'center' };
		ws.getCell(r, 2).numFmt = '0.0';
		ws.getCell(r, 2).border = BORDERS_ALL;

		ws.getCell(r, 3).value = {
			formula: `IFERROR(AVERAGEIF('Mon Évaluation'!$A$6:$A$${evalLastRow},A${r},'Mon Évaluation'!$E$6:$E$${evalLastRow}),"")`,
		};
		ws.getCell(r, 3).alignment = { horizontal: 'center' };
		ws.getCell(r, 3).numFmt = '0.0';
		ws.getCell(r, 3).border = BORDERS_ALL;
	});

	// Column widths
	ws.getColumn(1).width = 25;
	ws.getColumn(2).width = 35;
	for (let i = 3; i <= totalCols; i++) {
		ws.getColumn(i).width = 15;
	}

	ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 5 }];
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
	ws.getCell('A2').value =
		"Choisissez un maximum de 4 compétences à développer sur l'année (privilégier les compétences Core)";
	ws.getCell('A2').font = { italic: true };

	// Headers
	const headers = [
		'Compétence à Développer',
		'Niveau Actuel',
		'Niveau Cible',
		'Formation / Actions',
		'Résultat Attendu',
		'Mesure de Succès',
		'Trimestre',
		'Statut',
	];
	const headerRow = ws.getRow(4);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		applyHeaderStyle(cell);
	});

	// 4 empty rows with borders and dropdowns
	for (let i = 0; i < 4; i++) {
		const row = ws.getRow(5 + i);

		for (let c = 1; c <= 8; c++) {
			row.getCell(c).value = '';
			row.getCell(c).border = BORDERS_ALL;
		}

		// Quarter validation
		row.getCell(7).dataValidation = {
			type: 'list',
			allowBlank: true,
			formulae: ['"Q1,Q2,Q3,Q4"'],
		};

		// Status validation
		row.getCell(8).dataValidation = {
			type: 'list',
			allowBlank: true,
			formulae: ['"Non démarré,En cours,Complété"'],
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

function createHistoriqueSheet(wb: ExcelJS.Workbook, skillsData: any) {
	const ws = wb.addWorksheet('Historique Évaluations');

	// Title
	ws.mergeCells('A1:N1');
	const titleCell = ws.getCell('A1');
	titleCell.value = 'Historique des Évaluations';
	titleCell.fill = getHeaderFill();
	titleCell.font = { bold: true, size: 14, color: { argb: 'FFFFFF' } };

	// Headers
	const headers = [
		'Catégorie',
		'Compétence',
		'Éval 1 Date',
		'Éval 1 Score',
		'Éval 1 Commentaires',
		'Éval 2 Date',
		'Éval 2 Score',
		'Éval 2 Commentaires',
		'Éval 3 Date',
		'Éval 3 Score',
		'Éval 3 Commentaires',
		'Éval 4 Date',
		'Éval 4 Score',
		'Éval 4 Commentaires',
	];
	const headerRow = ws.getRow(3);
	headers.forEach((h, i) => {
		const cell = headerRow.getCell(i + 1);
		cell.value = h;
		applyHeaderStyle(cell);
	});

	// All skills — empty rows
	let rowIdx = 4;
	for (const category of skillsData.categories) {
		const categorySkills = skillsData.skills.filter(
			(s: any) => s.category === category.id,
		);

		for (const skill of categorySkills) {
			const row = ws.getRow(rowIdx);

			row.getCell(1).value = category.name;
			row.getCell(1).fill = getCategoryFill(category.id);
			row.getCell(1).border = BORDERS_ALL;

			row.getCell(2).value = skill.name;
			row.getCell(2).border = BORDERS_ALL;

			for (let c = 3; c <= 14; c++) {
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

	ws.views = [{ state: 'frozen', xSplit: 2, ySplit: 3 }];
}

// ============================================
// Main Export Function
// ============================================

export async function exportTemplate(skillsData: any) {
	const wb = new ExcelJS.Workbook();
	wb.creator = 'Skills Matrix';
	wb.created = new Date();

	createNiveauxSheet(wb, skillsData);
	createMatriceSheet(wb, skillsData);
	createDescriptionsSheet(wb, skillsData);
	createReferenceSheet(wb, skillsData);
	createAssessmentSheet(wb, skillsData);
	createProfilsParRoleSheet(wb, skillsData);
	createPlanDeveloppementSheet(wb);
	createHistoriqueSheet(wb, skillsData);

	const buffer = await wb.xlsx.writeBuffer();
	const blob = new Blob([buffer], {
		type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
	});
	const url = URL.createObjectURL(blob);
	const a = document.createElement('a');
	a.href = url;
	a.download = `skills-matrix-template-${new Date().toISOString().split('T')[0]}.xlsx`;
	a.click();
	URL.revokeObjectURL(url);
}
