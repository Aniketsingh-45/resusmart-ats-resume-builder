import { ResumeContent, ResumeSettings } from '../types';

export const ANIKET_RESUME_CONTENT: ResumeContent = {
  personalInfo: {
    fullName: "ANIKET SINGH",
    jobTitle: "STUDENT",
    email: "aniketsingh4500@gmail.com",
    phone: "+91 9608869170",
    location: "Patna, Bihar, India",
    linkedin: "https://linkedin.com/in/aniketsingh-45",
    github: "https://github.com/Aniketsingh-45",
  },
  summary: "B.Tech Computer Science student passionate about Artificial Intelligence and Machine Learning, with a strong interest in building intelligent, real-world applications. Skilled in Python and web technologies, with hands-on experience developing practical projects. A quick learner, eager to explore emerging AI technologies, strengthen problem-solving skills, and build a career in AI/ML.",
  experience: [
    {
      id: "exp-cdac",
      company: "CDAC Patna",
      position: "Summer Intern",
      startDate: "2026-06-08",
      endDate: "2026-07-10",
      current: false,
      description: [
        "Completed an intensive Training-cum-Internship focused on the Foundations of Artificial Intelligence & Machine Learning, gaining hands-on expertise in building predictive models.",
        "Developed AAPDA-MITRA, an AI-powered flood prediction dashboard for 5 high-risk districts in Bihar using Python, TensorFlow, and Streamlit."
      ]
    },
    {
      id: "exp-bmsk",
      company: "Bihar Mausam Seva Kendra",
      position: "Full Stack Developer",
      startDate: "2026",
      endDate: "2 Months",
      current: false,
      description: [
        "Contributed to the development of Megh Mitra, a web-based help desk platform providing weather and agriculture-related assistance to users.",
        "Contributed to full-stack development, including frontend functionality and backend integration.",
        "Worked on a call management system where incoming user calls display caller information, helping operators provide area-specific weather and agricultural guidance.",
        "Full Stack Development, UI/UX Design, Weather API Integration, Frontend Development, Backend Integration."
      ]
    }
  ],
  education: [
    {
      id: "edu-rp",
      school: "RP Sharma Institute Of Technology",
      board: "BEU",
      degree: "B.Tech in Computer Science",
      field: "",
      graduationDate: "2024 - 2028",
      score: "7.65 CGPA"
    }
  ],
  skills: [
    "C", "Python", "Java", "React", "Tailwind CSS", "Vite", "FastAPI", "PostgreSQL",
    "Docker", "TensorFlow", "Pandas", "NumPy", "Scikit-Learn", "Git & GitHub",
    "Problem Solving", "Critical Thinking", "Firebase", "HTML5/CSS3", "REST APIs",
    "Machine Learning", "XGBoost", "Streamlit", "VS Code", "Jupyter Notebook", "NLP"
  ],
  certifications: [
    "Foundations of AI & Machine Learning - C-DAC",
    "AI-Machine Learning Engineer Certificate - Reliance Foundation Skilling Academy",
    "Python Essentials 1 - Cisco Networking Academy",
    "Career Edge - TCS iON"
  ],
  projects: [
    {
      id: "proj-resusmart",
      name: "ResuSmart",
      link: "https://github.com/Aniketsingh-45/resusmart-ats-resume-builder",
      description: "An AI-powered web application designed to help users build Applicant Tracking System (ATS)-friendly resumes, enhancing job application success rates.",
      technologies: ["AI-Assisted Prototyping", "Frontend Tech"]
    },
    {
      id: "proj-survibe",
      name: "Sur Vibe – SubhRK | Personal Music Streaming Platform",
      link: "https://subhrkbuzz.com",
      description: "Independently developed and currently managing Sur Vibe, a professional music streaming platform, overseeing end-to-end development, Firebase integration, user authentication, song management, platform maintenance, and continuous improvements.",
      technologies: ["Firebase", "Full Stack Development", "User Auth"]
    },
    {
      id: "proj-life-expectancy",
      name: "End-to-End Life Expectancy Predictor",
      link: "https://github.com/Aniketsingh-45/Life-expectancy-",
      description: "Developed a containerized machine learning pipeline using XGBoost and SHAP for predictive modeling, deployed via a FastAPI backend and an interactive Streamlit UI.",
      technologies: ["Python", "XGBoost", "SHAP", "FastAPI", "Docker"]
    },
    {
      id: "proj-whatsapp-analyzer",
      name: "WhatsApp Chat Analyzer",
      link: "https://github.com/Aniketsingh-45/whatsapp_chat_analysis",
      description: "Developed a Python-based WhatsApp Chat Analyzer to extract conversation insights, analyze user activity, message patterns, word frequency, and emoji usage through interactive visualizations.",
      technologies: ["Python", "Pandas & NumPy", "Data Analysis", "Streamlit", "NLP"]
    },
    {
      id: "proj-class-map",
      name: "Class Map – AI-Powered FLN Diagnostic & Teacher Co-Pilot",
      link: "https://github.com/Aniketsingh-45/class-map",
      description: "Developed an AI-powered educational platform that assesses children's Hindi reading and mathematical skills using speech recognition and handwritten slate analysis, identifies learning gaps, and generates personalized learning plans for teachers.",
      technologies: ["AI Education", "Speech Recognition", "Computer Vision", "Streamlit"]
    },
    {
      id: "proj-freshguard",
      name: "FreshGuard – AI-Powered Fact Verification & Freshness Gateway",
      link: "https://github.com/Aniketsingh-45/FreshGuard",
      description: "Developed an AI-powered verification system that detects outdated or inaccurate information in LLM-generated responses using real-time web search, evidence-based reasoning, and automated freshness scoring.",
      technologies: ["LLM Verification", "Web Search API", "FastAPI", "NLP"]
    }
  ]
};

export const ANIKET_RESUME_SETTINGS: ResumeSettings = {
  primaryColor: "#2563eb",
  fontFamily: "Inter",
  fontSize: "tiny",
  spacing: "ultra-compact",
  margins: "compact",
  projectLayout: "grid",
  fitToOnePage: true
};
