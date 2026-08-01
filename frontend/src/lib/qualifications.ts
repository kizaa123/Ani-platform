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

const qualificationKeys = new Set(
  RESEARCHER_QUALIFICATIONS.map((qualification) => qualification.toLowerCase())
);

export function isCatalogQualification(value: string): boolean {
  return qualificationKeys.has(value.toLowerCase());
}

export function formatQualifications(qualifications?: string[] | null): string {
  if (!qualifications?.length) return '';
  return qualifications.join(', ');
}
