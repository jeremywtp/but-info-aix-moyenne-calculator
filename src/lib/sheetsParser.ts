import type { YearData, SemesterData, Year } from "@/types";

/**
 * Parse une ligne CSV en respectant les champs entre guillemets
 */
function parseCSVRow(line: string): string[] {
  const cells: string[] = [];
  let current = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i++;
      } else {
        inQuotes = !inQuotes;
      }
    } else if (ch === "," && !inQuotes) {
      cells.push(current);
      current = "";
    } else {
      current += ch;
    }
  }
  cells.push(current);
  return cells;
}

/**
 * Normalise un ID de ressource (corrige les double-points du xlsx)
 * "S4.A..01" → "S4.A.01"
 */
function normalizeId(id: string): string {
  return id.replace(/\.{2,}/g, ".").trim();
}

/**
 * Extrait le nom court d'une UE depuis le libelle
 * "UE3.1 Réaliser" → "Réaliser"
 */
function extractUEName(label: string): string {
  return label.replace(/^UE\d+\.\d+\s*/, "").trim();
}

/**
 * Parse le CSV d'un onglet Google Sheets en YearData
 * Structure attendue par onglet :
 *   Ligne titre → "B.U.T. Informatique Aix Année X..."
 *   "SEMESTRE N" → debut d'un bloc semestre
 *   Ligne IDs ressources → col4+ contient les identifiants (S3.A.01, R3.01, Portfolio, etc.)
 *   Ligne labels → contient "Coefficients / UE" et "ECTS"
 *   Lignes COMPETENCE → col0="COMPETENCE N", col1="UE X.Y", col2=libelle court, col4+=coefficients
 *   Ligne totaux → "Coefficient de chaque..."
 */
export function parseSheetCSV(csvText: string, year: Year): YearData {
  const cleanText = csvText.replace(/^\ufeff/, "");
  const rows = cleanText
    .split("\n")
    .map(l => l.replace(/\r$/, ""))
    .filter(l => l.length > 0)
    .map(parseCSVRow);

  const semKeys = year === "1" ? ["s1", "s2"] : year === "2" ? ["s3", "s4"] : ["s5", "s6"];
  const result: YearData = {};
  let semIdx = 0;
  let i = 0;

  while (i < rows.length && semIdx < 2) {
    const firstCell = rows[i][0]?.trim() || "";

    if (firstCell.startsWith("SEMESTRE")) {
      // Ligne suivante : en-tete des IDs de ressources
      const headerRow = rows[i + 1] || [];

      // Detecter si la ligne i+2 est une ligne de noms (optionnelle)
      // ou directement la ligne de labels (contient "Coefficients" ou "Libellé")
      let namesRow: string[] | null = null;
      let labelRowIdx = i + 2;
      const candidateRow = rows[i + 2] || [];
      const candidateFirst = candidateRow.slice(0, 4).join("").trim();
      const hasLabelsMarker = candidateFirst.includes("Libellé") || candidateFirst.includes("Coefficients");
      if (!hasLabelsMarker && rows[i + 3]) {
        // La ligne i+2 n'est pas les labels → c'est une ligne de noms
        namesRow = candidateRow;
        labelRowIdx = i + 3;
      }

      const labelRow = rows[labelRowIdx] || [];

      let coeffTotalCol = -1;
      let ectsCol = -1;
      for (let j = 0; j < labelRow.length; j++) {
        const val = labelRow[j]?.trim();
        if (val && val.includes("Coefficients") && val.includes("UE")) {
          coeffTotalCol = j;
        }
        if (val === "ECTS") {
          ectsCol = j;
        }
      }

      // Extraire les IDs de ressources (col 4 jusqu'a coeffTotalCol, en sautant les vides)
      const resourceIds: { col: number; id: string }[] = [];
      const endCol = coeffTotalCol > 0 ? coeffTotalCol : headerRow.length;
      for (let j = 4; j < endCol; j++) {
        const val = headerRow[j]?.trim();
        if (val) {
          resourceIds.push({ col: j, id: normalizeId(val) });
        }
      }

      // Parser les lignes COMPETENCE (a partir de la ligne apres les labels)
      const ues: Array<{
        ue: string;
        nom: string;
        coeff: number;
        ects: number;
        c: Record<string, number>;
      }> = [];

      let k = labelRowIdx + 1;
      while (k < rows.length && rows[k][0]?.trim().startsWith("COMPETENCE")) {
        const row = rows[k];
        const ueId = row[1]?.trim() || "";
        const shortLabel = row[2]?.trim() || "";
        const nom = extractUEName(shortLabel);

        // Mapper les coefficients par position de colonne → ID de ressource
        const c: Record<string, number> = {};
        for (const { col, id } of resourceIds) {
          const val = parseFloat(row[col]);
          if (!isNaN(val) && val > 0) {
            c[id] = val;
          }
        }

        const coeff = coeffTotalCol >= 0 ? parseFloat(row[coeffTotalCol]) || 0 : 0;
        const ects = ectsCol >= 0 ? parseFloat(row[ectsCol]) || 0 : 0;

        ues.push({ ue: ueId, nom, coeff, ects, c });
        k++;
      }

      // Construire la liste de ressources avec noms si disponibles
      const ressources = resourceIds.map(r => {
        const nom = namesRow ? (namesRow[r.col]?.trim() || r.id) : r.id;
        return { id: r.id, nom };
      });
      const totalCoeff = ues.reduce((sum, ue) => sum + ue.coeff, 0);

      result[semKeys[semIdx]] = {
        ressources,
        ues,
        totaux: { coeff: totalCoeff },
      };

      semIdx++;
      i = k;
      continue;
    }

    i++;
  }

  return result;
}
