export const RESEARCHER_QUALIFICATION_GROUPS = [
  {
    label: 'Doctorates',
    options: [
      'PhD',
      'DPhil',
      'EdD',
      'DBA',
      'DSc',
      'DLitt',
      'MD',
      'JD',
      'PsyD',
      'EngD',
    ],
  },
  {
    label: "Master's degrees",
    options: [
      'MSc',
      'MA',
      'MBA',
      'MPhil',
      'MEng',
      'MEd',
      'LLM',
      'MRes',
      'MPH',
      'MSW',
    ],
  },
  {
    label: "Bachelor's degrees",
    options: [
      'BSc',
      'BA',
      'BEng',
      'BBA',
      'LLB',
      'BEd',
      'BArch',
      'BNurs',
    ],
  },
  {
    label: 'Professorships',
    options: [
      'Professor',
      'Associate Professor',
      'Assistant Professor',
      'Emeritus Professor',
      'Visiting Professor',
      'Adjunct Professor',
    ],
  },
  {
    label: 'Titles & honorifics',
    options: ['Dr.', 'Prof.'],
  },
  {
    label: 'Research & academic roles',
    options: [
      'Research Fellow',
      'Senior Research Fellow',
      'Senior Researcher',
      'Research Scientist',
      'Principal Investigator',
      'Postdoctoral Researcher',
      'Research Associate',
      'Lecturer',
      'Senior Lecturer',
      'Reader',
      'Dean',
      'Department Head',
    ],
  },
  {
    label: 'Professional certifications',
    options: [
      'Fellow (Academy)',
      'Chartered Scientist',
      'Chartered Engineer',
      'Certified Research Professional',
    ],
  },
] as const;

export const RESEARCHER_QUALIFICATIONS = RESEARCHER_QUALIFICATION_GROUPS.flatMap(
  (group) => group.options
);

const qualificationSet = new Set<string>(RESEARCHER_QUALIFICATIONS);

export function isValidQualification(value: string): boolean {
  return qualificationSet.has(value);
}

export function filterValidQualifications(values: string[]): string[] {
  return values.filter(isValidQualification);
}

/** Normalize catalog + custom qualifications (dedupe, trim, length bounds). */
export function normalizeQualifications(values: unknown): string[] {
  if (!Array.isArray(values)) return [];
  const seen = new Set<string>();
  const result: string[] = [];
  for (const item of values) {
    if (typeof item !== 'string') continue;
    const trimmed = item.trim();
    if (trimmed.length < 2 || trimmed.length > 100) continue;
    const key = trimmed.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    const catalogMatch = RESEARCHER_QUALIFICATIONS.find(
      (qualification) => qualification.toLowerCase() === key
    );
    result.push(catalogMatch ?? trimmed);
  }
  return result;
}
