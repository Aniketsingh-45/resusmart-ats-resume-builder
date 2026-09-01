export interface PersonalInfo {
  fullName: string;
  email: string;
  phone: string;
  location: string;
  title?: string;
  jobTitle?: string;
  website?: string;
  linkedin?: string;
  github?: string;
  photo?: string;
  photoUrl?: string;
  // Traditional & Indian Resume Details
  fatherName?: string;
  dob?: string;
  gender?: string;
  nationality?: string;
  domicile?: string;
  category?: string;
  aadhaar?: string;
  languages?: string | string[] | any;
  maritalStatus?: string;
  permanentAddress?: string;
  hobbies?: string | string[] | any;
}

export interface Experience {
  id: string;
  company: string;
  position: string;
  startDate: string;
  endDate: string;
  current: boolean;
  description: string[];
}

export interface Education {
  id: string;
  school: string;
  degree: string;
  field: string;
  graduationDate: string;
  score?: string; // GPA or percentage
  board?: string; // State board/CBSE/University
}

export interface Project {
  id: string;
  name: string;
  description: string;
  technologies: string[];
  link?: string;
  keyFeatures?: string[];
}

export interface ResumeSettings {
  primaryColor?: string;
  fontFamily?: string;
  fontSize?: 'small' | 'medium' | 'large';
  spacing?: 'compact' | 'normal' | 'loose';
}

export interface ResumeContent {
  personalInfo: PersonalInfo;
  summary: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications?: string[];
  declaration?: string;
  declarationDate?: string;
  declarationPlace?: string;
}

export interface Resume {
  id?: string;
  userId: string;
  title: string;
  templateType: string;
  content: ResumeContent;
  atsScore?: number;
  version: number;
  updatedAt: string;
  settings?: ResumeSettings;
  applications?: number;
  interviews?: number;
  views?: number;
  downloads?: number;
}

export interface ATSAnalysis {
  score: number;
  feedback: {
    section: string;
    status: 'good' | 'warning' | 'error';
    message: string;
  }[];
  matchedKeywords: string[];
  missingKeywords: string[];
}

export interface Certification {
  id: string;
  name: string;
  provider: string;
  industryTags: string[];
  url?: string;
  trendingScore: number; // 1-100
  roi: string; // e.g. "+15% Salary"
  difficulty?: string;
}

export interface UserProfile {
  uid: string;
  email: string;
  displayName?: string;
  subscriptionTier?: 'free' | 'pro' | 'enterprise';
  resumesCount?: number;
  downloadsCount?: number;
  createdAt?: string;
}
