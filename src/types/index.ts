export type Year = "1" | "2" | "3";
export type Formation = "FA" | "FI";
export type Parcours = "A" | "B";

interface Ressource {
  id: string;
  nom: string;
}

interface UE {
  ue: string;
  nom: string;
  coeff: number;
  ects: number;
  c: Record<string, number>;
}

export interface SemesterData {
  ressources: Ressource[];
  ues: UE[];
  totaux: { coeff: number };
}

export type YearData = Record<string, SemesterData>;

export type AllData = Record<Year, Record<Formation, Record<Parcours, YearData | null>>>;

export interface Config {
  year: Year;
  formation: Formation;
  parcours: Parcours;
  but1Validated: boolean;
}

export type UEStatus = "ACQ" | "NACQ" | "DEF";

export interface UEResult {
  ue: string;
  nom: string;
  moy: number | null;
  ects: number;
  statut: UEStatus | null;
  ectsAcquis: number;
  color: string;
}

export interface SemesterResult {
  sem: string;
  moyGenerale: number | null;
  ueDetails: UEResult[];
  uesTotal: number;
  uesACQ: number;
  uesNACQ: number;
  uesDEF: number;
  ectsAcquis: number;
  notesCount: number;
  totalNotes: number;
  semestreValide: boolean;
  hasData: boolean;
}

type DecisionCode = "ADM" | "AJAC" | "AJ" | "--";
type DecisionType = "adm" | "ajac" | "aj" | "";

export interface DecisionResult {
  code: DecisionCode;
  desc: string;
  type: DecisionType;
}

export interface CompetenceResult {
  nom: string;
  moy: number;
  valide: boolean;
}

export interface MessageInfo {
  type: "success" | "error" | "warning" | "info" | "neutral";
  text: string;
}
