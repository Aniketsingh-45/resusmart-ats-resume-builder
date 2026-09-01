export interface UserProfile {
  uid: string;
  email: string;
  displayName: string;
  subscriptionTier: 'free' | 'pro' | 'enterprise';
  createdAt: string;
}

export interface ResumeContent {
  personalInfo: {
    fullName: string;
    jobTitle?: string; // 👇 NAYA FIELD ADD KIYA
    email: string;
    phone: string;
    location: string;
    permanentAddress?: string;
    linkedin?: string;
    website?: string;
    fatherName?: string;
    dob?: string;
    gender?: string;
    maritalStatus?: string;
    nationality?: string;
    category?: string;
    aadhaar?: string;
    domicile?: string;
    hobbies?: string[];
    languages?: string[];
    photo?: string;
  };
  summary: string;
  declaration?: string;
  declarationDate?: string;
  declarationPlace?: string;
  experience: Experience[];
  education: Education[];
  skills: string[];
  projects: Project[];
  certifications: string[];
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
  board?: string;
  degree: string;
  field: string;
  score?: string;
  graduationDate: string;
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

export interface Resume {
  id: string;
  userId: string;
  title: string;
  templateType: string;
  content: ResumeContent;
  settings?: ResumeSettings;
  atsScore: number;
  version: number;
  updatedAt: string;
  views?: number;
  downloads?: number;
  applications?: number;
  interviews?: number;
}

export interface Certification {
  id: string;
  name: string;
  provider: string;
  industryTags: string[];
  url: string;
  trendingScore: number;
  roi: string;
}
