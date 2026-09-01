import { ResumeContent } from "../types";

const OPENROUTER_API_KEY = import.meta.env.VITE_AI_API_KEY || "";
const OPENROUTER_BASE_URL = import.meta.env.VITE_AI_BASE_URL || "https://openrouter.ai/api/v1";
const AI_MODEL = import.meta.env.VITE_AI_MODEL || "openai/gpt-4o-mini";

const ai = {
  models: {
    generateContent: async ({ model, config, contents }: any) => {
      const headers = {
        "Authorization": `Bearer ${OPENROUTER_API_KEY}`,
        "Content-Type": "application/json",
      };

      let formattedContent: any = contents;
      if (Array.isArray(contents)) {
        formattedContent = contents.map((item: any) => {
          if (typeof item === 'string') return { type: 'text', text: item };
          if (item.text) return { type: 'text', text: item.text };
          if (item.inlineData) {
            return { 
              type: 'image_url', 
              image_url: { url: `data:${item.inlineData.mimeType};base64,${item.inlineData.data}` } 
            };
          }
          return item;
        });
      }

      const body: any = {
        model: AI_MODEL,
        messages: [{ role: "user", content: formattedContent }]
      };

      if (config?.responseMimeType === "application/json") {
        body.response_format = { type: "json_object" };
        if (typeof formattedContent === 'string' && !formattedContent.toLowerCase().includes('json')) {
            body.messages[0].content += "\nReturn a JSON object.";
        } else if (Array.isArray(formattedContent)) {
            const hasJsonMention = formattedContent.some((c: any) => c.type === 'text' && c.text.toLowerCase().includes('json'));
            if (!hasJsonMention) {
                formattedContent.push({ type: 'text', text: "\nReturn a JSON object." });
            }
        }
      }

      const response = await fetch(`${OPENROUTER_BASE_URL}/chat/completions`, {
        method: "POST",
        headers,
        body: JSON.stringify(body)
      });

      if (!response.ok) {
        const errData = await response.text();
        throw new Error(`API error: ${response.status} ${errData}`);
      }

      const data = await response.json();
      return {
        text: data.choices?.[0]?.message?.content || ""
      };
    }
  }
};
async function retryWithBackoff<T>(fn: () => Promise<T>, retries = 5, delay = 2000): Promise<T> {
  try {
    return await fn();
  } catch (error: any) {
    if (retries > 0 && (error.status === 429 || error.message?.includes("429"))) {
      console.warn(`Rate limited, retrying in ${delay}ms... (${retries} retries left)`);
      await new Promise(resolve => setTimeout(resolve, delay));
      return retryWithBackoff(fn, retries - 1, delay * 2);
    }
    throw error;
  }
}

export async function analyzeResumeATS(resumeContent: any, jobDescription?: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: `Analyze this resume for ATS optimization and job description alignment. 
      Resume: ${JSON.stringify(resumeContent)}
      ${jobDescription ? `Job Description: ${jobDescription}` : ""}
      
      Provide a detailed JSON response with:
      - score: 0-100 (ATS score based on formatting, keywords, and JD alignment)
      - successProbability: 0-100 (Predict chances of getting shortlisted based on resume quality, job match %, and skills demand)
      - readinessScore: 0-100 (How ready the candidate is for the target role)
      - targetRole: string (The inferred or provided target role, e.g., "Data Analyst")
      - missingSkills: string[] (Specific skills missing compared to industry demand)
      - recommendedCourses: string[] (Specific courses to bridge the skill gap)
      - recommendedCertifications: string[] (Specific certifications to boost profile)
      - missingKeywords: string[] (Specific keywords from the JD that are missing in the resume)
      - formattingIssues: string[] (Technical issues like non-standard fonts, complex tables, or images)
      - contentSuggestions: { section: string, suggestion: string, priority: 'high' | 'medium' | 'low' }[] (Actionable tips to improve specific sections)
      - keywordDensity: { keyword: string, count: number, status: 'good' | 'low' | 'high', recommendedCount: number }[] (Analysis of existing keywords)
      - jdAlignment: { match: number, strengths: string[], weaknesses: string[] } (How well the resume matches the specific job description)
      - suggestedPhrases: string[] (Specific impactful phrases or bullet points to add based on the JD)`
    });
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse ATS analysis:", response.text);
    return {};
  }
}

export async function enhanceAchievement(achievement: string, industry: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Rewrite this resume achievement to be more action-oriented, outcome-focused, and ATS-friendly for the ${industry} industry. Use strong action verbs and quantify results where possible.
      Original: ${achievement}`
    });
  });

  return response.text;
}

export async function recommendCertifications(skills: string[], jobTitle: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: `Based on these skills: ${skills.join(", ")} and target job title: ${jobTitle}, recommend 5 high-impact certifications.
      Provide a JSON array of objects with:
      - name: string
      - provider: string
      - why: string (reason for recommendation)
      - impact: string (high/medium/low)
      - freeSource: string (URL if available)`
    });
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse certifications:", response.text);
    return [];
  }
}

export async function generateProjectFeatures(name: string, description: string, technologies: string[]) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: `Based on this project:
      Name: ${name}
      Description: ${description}
      Technologies: ${technologies.join(", ")}
      
      Generate 3-4 highly impactful, ATS-friendly key features or achievements for this project. 
      Use strong action verbs, quantify results where possible, and highlight the technical complexity or business value.
      Return a JSON array of strings.`
    });
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse project features:", response.text);
    return [];
  }
}

export async function generateResumeContent(prompt: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: `Generate a professional resume content based on this prompt: "${prompt}".
      The response must be a valid JSON object matching this structure:
      {
        "personalInfo": { "fullName": string, "email": string, "phone": string, "location": string, "linkedin": string },
        "summary": string,
        "experience": [
          { "id": string, "company": string, "position": string, "startDate": string, "endDate": string, "current": boolean, "description": string[] }
        ],
        "education": [
          { "id": string, "school": string, "degree": string, "field": string, "graduationDate": string, "score": string }
        ],
        "skills": string[],
        "projects": [
          { "id": string, "name": string, "description": string, "technologies": string[] }
        ]
      }
      Make it realistic and professional.`
    });
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse generated resume:", response.text);
    return {};
  }
}

export async function generateSummary(resumeContent: any) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Generate a professional, impactful resume summary (3-4 sentences) based on the following resume data. Focus on key skills, years of experience, and major achievements.
      Resume Data: ${JSON.stringify(resumeContent)}`
    });
  });

  return response.text;
}

export async function parseResumeText(text: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: `Parse the following raw resume text into a structured JSON format.
      Extract the personal info, summary, experience, education, skills, and projects.
      
      Text:
      ${text}
      
      The response must be a valid JSON object matching this structure:
      {
        "personalInfo": { "fullName": string, "email": string, "phone": string, "location": string, "linkedin": string },
        "summary": string,
        "experience": [
          { "id": string, "company": string, "position": string, "startDate": string, "endDate": string, "current": boolean, "description": string[] }
        ],
        "education": [
          { "id": string, "school": string, "degree": string, "field": string, "graduationDate": string, "score": string }
        ],
        "skills": string[],
        "projects": [
          { "id": string, "name": string, "description": string, "technologies": string[], "link": string, "keyFeatures": string[] }
        ]
      }`
    });
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse resume text:", response.text);
    return {};
  }
}

export async function extractTextFromImage(base64Image: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-1.5-flash",
      contents: [
        {
          inlineData: {
            mimeType: "image/jpeg",
            data: base64Image.split(",")[1],
          },
        },
        "Extract all the text from this resume image. Keep the formatting as close as possible to the original. Just return the text, no extra commentary.",
      ],
    });
  });

  return response.text || "";
}

export async function parseResumeFromImage(base64Image: string, mimeType: string = "image/jpeg") {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: [
        {
          inlineData: {
            data: base64Image.split(',')[1] || base64Image,
            mimeType: mimeType as any
          }
        },
        {
          text: `You are a professional resume parser. Look at this resume image and extract all information into a structured JSON format.
          Extract the personal info, summary, experience, education, skills, and projects.
          
          The response must be a valid JSON object matching this structure:
          {
            "personalInfo": { "fullName": string, "email": string, "phone": string, "location": string, "linkedin": string },
            "summary": string,
            "experience": [
              { "id": string, "company": string, "position": string, "startDate": string, "endDate": string, "current": boolean, "description": string[] }
            ],
            "education": [
              { "id": string, "school": string, "degree": string, "field": string, "graduationDate": string, "score": string }
            ],
            "skills": string[],
            "projects": [
              { "id": string, "name": string, "description": string, "technologies": string[], "link": string, "keyFeatures": string[] }
            ]
          }`
        }
      ]
    });
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse resume image:", response.text);
    return {};
  }
}

export async function importFromGitHub(username: string) {
  try {
    const [userRes, reposRes] = await Promise.all([
      fetch(`https://api.github.com/users/${username}`),
      fetch(`https://api.github.com/users/${username}/repos?sort=updated&per_page=10`)
    ]);

    if (!userRes.ok || !reposRes.ok) throw new Error('Failed to fetch GitHub data');

    const user = await userRes.json();
    const repos = await reposRes.json();

    const projects = repos
      .filter((repo: any) => !repo.fork)
      .map((repo: any) => ({
        id: Math.random().toString(36).substr(2, 9),
        name: repo.name,
        description: repo.description || '',
        technologies: repo.language ? [repo.language] : [],
        url: repo.html_url,
        features: []
      }));

    return {
      personalInfo: {
        fullName: user.name || username,
        location: user.location || '',
        website: user.blog || user.html_url,
        linkedin: '',
        email: user.email || '',
        phone: ''
      },
      summary: user.bio || '',
      projects: projects
    };
  } catch (error) {
    console.error("GitHub import failed:", error);
    throw error;
  }
}

export async function importFromLinkedIn(url: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
        tools: [{ googleSearch: {} }]
      },
      contents: `Search for the LinkedIn profile at this URL: ${url}. 
      Extract the person's professional information and return it in this exact JSON format:
      {
        "personalInfo": {
          "fullName": "Name",
          "location": "Location",
          "linkedin": "URL"
        },
        "summary": "Professional summary",
        "experience": [
          {
            "company": "Company Name",
            "position": "Job Title",
            "startDate": "Start Date",
            "endDate": "End Date or Present",
            "current": true,
            "description": ["Bullet point 1", "Bullet point 2"]
          }
        ],
        "education": [
          {
            "institution": "School Name",
            "degree": "Degree",
            "field": "Field of Study",
            "startDate": "Start Date",
            "endDate": "End Date"
          }
        ]
      }
      If you cannot find the exact profile, do your best to extract what you can or return empty arrays.`
    });
  });

  let text = response.text || "{}";
  // Remove markdown formatting if present
  text = text.replace(/```json\n?/g, '').replace(/```\n?/g, '').trim();
  
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse LinkedIn data:", text);
    throw new Error("Failed to parse LinkedIn data");
  }
}

export async function improveGrammar(text: string) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      contents: `Improve the grammar, clarity, and professional tone of the following text. Make it impactful and result-oriented.
      Original Text: ${text}`
    });
  });

  return response.text;
}

export async function optimizeResumeATS(resume: ResumeContent) {
  const response = await retryWithBackoff(async () => {
    return await ai.models.generateContent({
      model: "gemini-2.5-flash",
      config: {
        responseMimeType: "application/json",
      },
      contents: `You are an expert ATS (Applicant Tracking System) optimizer and executive recruiter.
      Take the following resume JSON and optimize it to be the "best of the best" for ATS systems.
      - Rewrite experience bullets to start with strong action verbs and quantify achievements (e.g., increased X by Y%).
      - Improve the professional summary to be highly impactful and keyword-rich.
      - Ensure skills are standardized and relevant.
      - Fix any grammatical errors and improve professional tone.
      - DO NOT hallucinate fake jobs or degrees, but enhance the existing descriptions significantly.

      Original Resume JSON:
      ${JSON.stringify(resume)}

      Return ONLY a valid JSON object matching this structure:
      {
        "personalInfo": { "fullName": string, "email": string, "phone": string, "location": string, "linkedin": string },
        "summary": string,
        "experience": [
          { "id": string, "company": string, "position": string, "startDate": string, "endDate": string, "current": boolean, "description": string[] }
        ],
        "education": [
          { "id": string, "school": string, "degree": string, "field": string, "graduationDate": string, "score": string }
        ],
        "skills": string[],
        "projects": [
          { "id": string, "name": string, "description": string, "technologies": string[], "link": string, "keyFeatures": string[] }
        ]
      }`
    });
  });

  let text = response.text || "{}";
  if (text.startsWith("\`\`\`json")) {
    text = text.replace(/\`\`\`json/g, "").replace(/\`\`\`/g, "");
  }
  try {
    return JSON.parse(text);
  } catch (e) {
    console.error("Failed to parse optimized resume:", text);
    return resume; // Return original resume if parsing fails
  }
}
