export type CandidateExperienceType = 'internship' | 'work';

export type CandidateExperience = {
  id: string;
  type: CandidateExperienceType;
  company: string;
  position: string;
  location: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string;
  highlights: string[];
};

export type CandidateEducation = {
  id: string;
  institution: string;
  degree: string;
  field: string;
  startDate: string;
  endDate: string;
  gpa: string;
  description: string;
};

export type CandidateProject = {
  id: string;
  name: string;
  role: string;
  startDate: string;
  endDate: string;
  description: string;
  technologies: string[];
  highlights: string[];
  url: string;
};

export type CandidateProfileData = {
  isSample: boolean;
  personalInfo: {
    fullName: string;
    jobTitle: string;
    email: string;
    phone: string;
    wechat: string;
    location: string;
    website: string;
    github: string;
    linkedin: string;
    links?: { id: string; label: string; url: string }[];
  };
  summary: string;
  experiences: CandidateExperience[];
  education: CandidateEducation[];
  projects: CandidateProject[];
  skills: { id: string; name: string; skills: string[] }[];
  certifications: { id: string; name: string; issuer: string; date: string }[];
  languages: { id: string; language: string; proficiency: string; description: string }[];
  preferences: {
    targetRoles: string[];
    targetIndustries: string[];
    preferredLocations: string[];
  };
};

export type CandidateProfileRecord = {
  id: string;
  userId: string;
  data: CandidateProfileData;
  version: number;
  createdAt: Date | string | number;
  updatedAt: Date | string | number;
};

