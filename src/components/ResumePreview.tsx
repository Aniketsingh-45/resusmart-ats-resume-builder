import React from 'react';
import { ResumeContent, ResumeSettings } from '../types';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

interface ResumePreviewProps {
  content: ResumeContent;
  templateType: string;
  settings?: ResumeSettings;
}

// 🔗 Link Normalizer: Ensures external URLs have https:// so clicking in preview or PDF navigates properly
const normalizeUrl = (url?: string): string => {
  if (!url) return '';
  const trimmed = url.trim();
  if (!trimmed) return '';
  if (/^https?:\/\//i.test(trimmed) || /^mailto:/i.test(trimmed) || /^tel:/i.test(trimmed)) return trimmed;
  return `https://${trimmed}`;
};

// ✂️ Display URL Helper: Cleans URL for compact visual presentation (e.g. "linkedin.com/in/user")
const displayUrl = (url?: string): string => {
  if (!url) return '';
  return url.trim().replace(/^https?:\/\//i, '').replace(/^www\./i, '').replace(/\/$/, '');
};

export function ResumePreview({ content, templateType, settings }: ResumePreviewProps) {
  const { 
    personalInfo = {} as any, 
    summary = '', 
    experience = [], 
    education = [], 
    skills = [], 
    projects = [], 
    certifications = [] 
  } = content || {};

  const primaryColor = settings?.primaryColor || '#2563eb';
  
  // ✅ Font: applied as BOTH a Tailwind class AND inline style for Google Fonts to render
  const fontMap: Record<string, { cls: string; family: string }> = {
    // Legacy abstract keys (backward compat)
    sans:   { cls: 'font-sans',  family: '"Plus Jakarta Sans", ui-sans-serif, sans-serif' },
    serif:  { cls: 'font-serif', family: 'Georgia, "Times New Roman", serif' },
    mono:   { cls: 'font-mono',  family: '"JetBrains Mono", ui-monospace, monospace' },
    system: { cls: 'font-sans',  family: 'system-ui, -apple-system, sans-serif' },
    // Premium typography fonts (from Design panel)
    'Inter':              { cls: 'font-sans', family: '"Inter", ui-sans-serif, sans-serif' },
    'Roboto':             { cls: 'font-sans', family: '"Roboto", ui-sans-serif, sans-serif' },
    'Outfit':             { cls: 'font-sans', family: '"Outfit", ui-sans-serif, sans-serif' },
    'Montserrat':         { cls: 'font-sans', family: '"Montserrat", ui-sans-serif, sans-serif' },
    'Source Sans Pro':    { cls: 'font-sans', family: '"Source Sans Pro", ui-sans-serif, sans-serif' },
    'Playfair Display':   { cls: 'font-serif', family: '"Playfair Display", Georgia, serif' },
    'Merriweather':       { cls: 'font-serif', family: '"Merriweather", Georgia, serif' },
    'JetBrains Mono':     { cls: 'font-mono',  family: '"JetBrains Mono", ui-monospace, monospace' },
  };

  const fontKey = settings?.fontFamily || 'Inter';
  const fontEntry = fontMap[fontKey];
  const fontFamily = fontEntry?.cls ?? 'font-sans';
  const fontStyle: React.CSSProperties = { fontFamily: fontEntry?.family ?? `"${fontKey}", sans-serif` };
  
  const fontSizeClass = 
    settings?.fontSize === 'small' ? 'text-[13px]' : 
    settings?.fontSize === 'large' ? 'text-[17px]' : 
    'text-[15px]';

  const spacingClass = 
    settings?.spacing === 'compact' ? 'space-y-4' : 
    settings?.spacing === 'loose' ? 'space-y-10' : 
    'space-y-7';

  const itemSpacingClass = 
    settings?.spacing === 'compact' ? 'space-y-1' : 
    settings?.spacing === 'loose' ? 'space-y-4' : 
    'space-y-2';

  // 🇮🇳 Traditional & Personal Details Block (Adjustable & Conditional)
  const renderIndianDetails = (isDark = false) => {
    const hasDetails = 
      personalInfo.fatherName || 
      personalInfo.dob || 
      personalInfo.gender || 
      personalInfo.maritalStatus || 
      personalInfo.nationality || 
      personalInfo.domicile || 
      personalInfo.category || 
      personalInfo.aadhaar || 
      (personalInfo.languages && personalInfo.languages.length > 0) || 
      (personalInfo.hobbies && personalInfo.hobbies.length > 0) || 
      personalInfo.permanentAddress;

    if (!hasDetails) return null;

    return (
      <div 
        className={cn(
          "grid grid-cols-2 gap-x-4 gap-y-1.5 text-[10px] mt-4 pt-4 border-t",
          isDark ? "border-slate-700/80 text-slate-300" : "border-slate-200 text-slate-600"
        )}
        style={{ breakInside: 'avoid' }}
      >
        {personalInfo.fatherName && <p><span className="font-bold uppercase tracking-wider opacity-75">Father:</span> {personalInfo.fatherName}</p>}
        {personalInfo.dob && <p><span className="font-bold uppercase tracking-wider opacity-75">DOB:</span> {personalInfo.dob}</p>}
        {personalInfo.gender && <p><span className="font-bold uppercase tracking-wider opacity-75">Gender:</span> {personalInfo.gender}</p>}
        {personalInfo.maritalStatus && <p><span className="font-bold uppercase tracking-wider opacity-75">Status:</span> {personalInfo.maritalStatus}</p>}
        {personalInfo.nationality && <p><span className="font-bold uppercase tracking-wider opacity-75">Nationality:</span> {personalInfo.nationality}</p>}
        {personalInfo.domicile && <p><span className="font-bold uppercase tracking-wider opacity-75">Domicile:</span> {personalInfo.domicile}</p>}
        {personalInfo.category && <p><span className="font-bold uppercase tracking-wider opacity-75">Category:</span> {personalInfo.category}</p>}
        {personalInfo.aadhaar && <p><span className="font-bold uppercase tracking-wider opacity-75">Aadhaar:</span> XXXX-XXXX-{personalInfo.aadhaar.slice(-4)}</p>}
        {personalInfo.languages && personalInfo.languages.length > 0 && (
          <p className="col-span-2"><span className="font-bold uppercase tracking-wider opacity-75">Languages:</span> {personalInfo.languages.filter(Boolean).join(', ')}</p>
        )}
        {personalInfo.hobbies && personalInfo.hobbies.length > 0 && (
          <p className="col-span-2"><span className="font-bold uppercase tracking-wider opacity-75">Hobbies:</span> {personalInfo.hobbies.filter(Boolean).join(', ')}</p>
        )}
        {personalInfo.permanentAddress && (
          <p className="col-span-2"><span className="font-bold uppercase tracking-wider opacity-75">Permanent Address:</span> {personalInfo.permanentAddress}</p>
        )}
      </div>
    );
  };

  // 📝 Formal Declaration Block (Adjustable & Conditional)
  const renderDeclaration = (isDark = false) => {
    if (!content.declaration) return null;
    return (
      <div 
        className={cn("mt-8 pt-5 border-t", isDark ? "border-slate-700/80" : "border-slate-200")} 
        style={{ breakInside: 'avoid' }}
      >
        <h2 className={cn("text-xs font-bold uppercase tracking-widest mb-2", isDark ? "text-brand-300" : "text-brand-700")} style={{ color: primaryColor }}>Declaration</h2>
        <p className={cn("text-xs leading-relaxed italic", isDark ? "text-slate-300" : "text-slate-600")}>{content.declaration}</p>
        <div className="mt-6 flex justify-between items-end">
          <div className="space-y-1">
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>
              Date: {content.declarationDate || new Date().toLocaleDateString('en-IN')}
            </p>
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>
              Place: {content.declarationPlace || personalInfo.location || '___________'}
            </p>
          </div>
          <div className="text-center">
            <div className={cn("w-36 h-px mb-2", isDark ? "bg-slate-700" : "bg-slate-300")} />
            <p className={cn("text-[10px] font-bold uppercase tracking-wider", isDark ? "text-slate-400" : "text-slate-500")}>({personalInfo.fullName || 'Authorized Signature'})</p>
          </div>
        </div>
      </div>
    );
  };

  // ==========================================
  // 1. MODERN PROFESSIONAL TEMPLATE
  // ==========================================
  const renderModern = () => (
    <div className={cn('flex flex-row bg-white text-slate-900 overflow-x-hidden min-h-full items-stretch', fontFamily, fontSizeClass)} style={{ ...fontStyle, minHeight: '297mm', boxSizing: 'border-box' }}>
      {/* Left Sidebar */}
      <div className="w-1/3 bg-slate-900 text-white p-6 space-y-6 shrink-0 flex flex-col justify-between">
        <div className="space-y-6">
          <div className="space-y-3">
            <h1 className="text-3xl font-black leading-tight tracking-tight">{personalInfo.fullName}</h1>
            {personalInfo.jobTitle && (
              <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
            )}
            <div className="space-y-2 text-slate-300 text-xs pt-1">
              {personalInfo.email && (
                <a href={`mailto:${personalInfo.email}`} className="block truncate hover:underline hover:text-white transition-colors" title={personalInfo.email}>
                  ✉️ {personalInfo.email}
                </a>
              )}
              {personalInfo.phone && (
                <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="block truncate hover:underline hover:text-white transition-colors">
                  📱 {personalInfo.phone}
                </a>
              )}
              {personalInfo.location && <p className="truncate">📍 {personalInfo.location}</p>}
              {personalInfo.linkedin && (
                <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="block truncate hover:underline hover:text-white transition-colors font-medium">
                  🔗 {displayUrl(personalInfo.linkedin)}
                </a>
              )}
              {personalInfo.website && (
                <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="block truncate hover:underline hover:text-white transition-colors font-medium">
                  🌐 {displayUrl(personalInfo.website)}
                </a>
              )}
            </div>
            {renderIndianDetails(true)}
          </div>

          {skills.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-700 pb-1.5" style={{ color: primaryColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, i) => (
                  <span key={i} className="bg-slate-800 text-slate-200 px-2.5 py-1 rounded text-xs font-medium border border-slate-700">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-700 pb-1.5" style={{ color: primaryColor }}>Certifications</h2>
              <ul className="space-y-1.5 text-xs text-slate-300">
                {certifications.map((cert, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-slate-500">•</span>
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={cn("flex-1 p-8 min-w-0", spacingClass)}>
        {summary && (
          <div className="space-y-2" style={{ breakInside: 'avoid' }}>
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-1 inline-block" style={{ borderColor: primaryColor }}>Professional Summary</h2>
            <p className="leading-relaxed text-slate-700">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-1 inline-block" style={{ borderColor: primaryColor }}>Experience</h2>
            <div className={spacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className={itemSpacingClass} style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <div className="flex-1 min-w-[200px]">
                      <h3 className="font-bold text-slate-900">{exp.position}</h3>
                      <p className="text-sm font-semibold" style={{ color: primaryColor }}>{exp.company}</p>
                    </div>
                    <p className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">
                      {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                    </p>
                  </div>
                  <ul className="list-disc list-outside ml-4 space-y-1 mt-1">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-slate-600 leading-relaxed">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-1 inline-block" style={{ borderColor: primaryColor }}>Education</h2>
            <div className={spacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-start gap-2" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-[200px]">
                    <h3 className="font-bold text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-sm text-slate-600">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    {edu.score && <p className="text-xs font-bold mt-0.5" style={{ color: primaryColor }}>Score: {edu.score}</p>}
                  </div>
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider shrink-0">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-base font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-1 inline-block" style={{ borderColor: primaryColor }}>Projects</h2>
            <div className={spacingClass}>
              {projects.map((project) => (
                <div key={project.id} className={itemSpacingClass} style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-start gap-2">
                    <h3 className="font-bold text-slate-900 flex-1 min-w-[200px]">{project.name}</h3>
                    {project.link && (
                      <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline shrink-0 flex items-center gap-1" style={{ color: primaryColor }}>
                        {displayUrl(project.link)} ↗
                      </a>
                    )}
                  </div>
                  {project.description && <p className="text-slate-600 leading-relaxed">{project.description}</p>}
                  {project.keyFeatures && project.keyFeatures.length > 0 && (
                    <ul className="list-disc list-outside ml-4 space-y-1 mt-1">
                      {project.keyFeatures.map((feature, i) => (
                        <li key={i} className="text-slate-600 leading-relaxed">{feature}</li>
                      ))}
                    </ul>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mt-2">
                      {project.technologies.map((tech, i) => (
                        <span key={i} className="text-[10px] font-bold bg-slate-100 text-slate-600 px-2 py-0.5 rounded border border-slate-200">{tech}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 2. CLASSIC CHRONOLOGICAL TEMPLATE
  // ==========================================
  const renderClassic = () => (
    <div className={cn('bg-white text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass)} style={{ ...fontStyle, padding: '36px', minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="text-center space-y-2 border-b-2 border-slate-900 pb-5 mb-6" style={{ breakInside: 'avoid' }}>
        <h1 className="text-4xl font-bold uppercase tracking-tight">{personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <h2 className="text-base font-semibold text-slate-600 uppercase tracking-widest mt-1" style={{ color: primaryColor }}>{personalInfo.jobTitle}</h2>
        )}
        <div className="flex justify-center flex-wrap gap-x-3 gap-y-1 text-xs font-medium text-slate-600 pt-2">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="hover:underline font-semibold" style={{ color: primaryColor }}>
              {personalInfo.email}
            </a>
          )}
          {personalInfo.email && personalInfo.phone && <span>•</span>}
          {personalInfo.phone && (
            <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="hover:underline">
              {personalInfo.phone}
            </a>
          )}
          {personalInfo.location && <><span>•</span><span>{personalInfo.location}</span></>}
          {personalInfo.linkedin && (
            <>
              <span>•</span>
              <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: primaryColor }}>
                LinkedIn
              </a>
            </>
          )}
          {personalInfo.website && (
            <>
              <span>•</span>
              <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: primaryColor }}>
                {displayUrl(personalInfo.website)}
              </a>
            </>
          )}
        </div>
        {renderIndianDetails()}
      </div>

      <div className={spacingClass}>
        {summary && (
          <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1" style={{ color: primaryColor }}>Professional Summary</h2>
            <p className="leading-relaxed text-slate-700">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1" style={{ color: primaryColor }}>Experience</h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="space-y-1" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="font-bold flex-1 min-w-[200px] text-slate-900">{exp.company}</h3>
                    <span className="text-xs font-bold text-slate-500 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="font-bold text-xs" style={{ color: primaryColor }}>{exp.position}</p>
                  <ul className="list-disc ml-5 space-y-1 text-slate-700">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="leading-relaxed">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1" style={{ color: primaryColor }}>Education</h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-baseline gap-2" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-[200px]">
                    <span className="font-bold text-slate-900">{edu.school}</span>
                    {edu.board && <span className="text-xs text-slate-500 ml-1">({edu.board})</span>}
                    <span className="text-slate-600"> — {edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                    {edu.score && <span className="text-xs font-bold ml-2" style={{ color: primaryColor }}>Score: {edu.score}</span>}
                  </div>
                  <span className="text-xs font-bold text-slate-500 shrink-0">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1" style={{ color: primaryColor }}>Skills</h2>
            <p className="leading-relaxed text-slate-700">{skills.join(', ')}</p>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1" style={{ color: primaryColor }}>Certifications</h2>
            <p className="leading-relaxed text-slate-700">{certifications.join(', ')}</p>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold uppercase tracking-widest border-b border-slate-300 pb-1" style={{ color: primaryColor }}>Projects</h2>
            <div className={itemSpacingClass}>
              {projects.map((project) => (
                <div key={project.id} className="space-y-1" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="font-bold flex-1 min-w-[200px] text-slate-900">{project.name}</h3>
                    {project.link && (
                      <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                        {displayUrl(project.link)} ↗
                      </a>
                    )}
                  </div>
                  {project.description && <p className="leading-relaxed text-slate-700">{project.description}</p>}
                  {project.keyFeatures && project.keyFeatures.length > 0 && (
                    <ul className="list-disc ml-5 space-y-0.5 mt-1 text-slate-600">
                      {project.keyFeatures.map((feature, i) => (
                        <li key={i} className="leading-relaxed">{feature}</li>
                      ))}
                    </ul>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <p className="text-xs text-slate-500 font-semibold mt-1">
                      <span className="text-slate-400">Tech Stack:</span> {project.technologies.join(', ')}
                    </p>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 3. STUDENT / ENTRY-LEVEL TEMPLATE
  // ==========================================
  const renderStudent = () => (
    <div className={cn('bg-white text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass, spacingClass)} style={{ ...fontStyle, padding: '36px', minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="flex flex-wrap justify-between items-start border-b-4 pb-4 gap-4" style={{ borderColor: primaryColor, breakInside: 'avoid' }}>
        <div className="space-y-1 flex-1 min-w-[220px]">
          <h1 className="text-4xl font-black text-slate-900 tracking-tight">{personalInfo.fullName}</h1>
          {personalInfo.jobTitle && (
            <p className="font-bold tracking-widest uppercase text-xs" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
          )}
        </div>
        <div className="text-right text-xs font-medium text-slate-600 space-y-1 shrink-0">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="block hover:underline font-semibold" style={{ color: primaryColor }}>
              ✉️ {personalInfo.email}
            </a>
          )}
          {personalInfo.phone && (
            <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="block hover:underline">
              📱 {personalInfo.phone}
            </a>
          )}
          {personalInfo.location && <p>📍 {personalInfo.location}</p>}
          {personalInfo.linkedin && (
            <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="block hover:underline font-semibold" style={{ color: primaryColor }}>
              🔗 {displayUrl(personalInfo.linkedin)}
            </a>
          )}
          {personalInfo.website && (
            <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="block hover:underline font-semibold" style={{ color: primaryColor }}>
              🌐 {displayUrl(personalInfo.website)}
            </a>
          )}
          {renderIndianDetails()}
        </div>
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: '28px', marginTop: '20px', boxSizing: 'border-box' }}>
        {/* Main Student Column (Education FIRST) */}
        <div style={{ flex: '1 1 0', minWidth: 0 }}>
          {education.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: primaryColor }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                Education
              </h2>
              <div className={spacingClass}>
                {education.map((edu) => (
                  <div key={edu.id} className="space-y-1" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-bold text-slate-900">{edu.school}</h3>
                    <p className="text-sm text-slate-700">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    {edu.board && <p className="text-xs text-slate-500 font-medium">{edu.board}</p>}
                    <div className="flex justify-between items-center text-xs pt-0.5">
                      <p className="font-bold text-slate-400">{edu.graduationDate}</p>
                      {edu.score && <p className="font-bold" style={{ color: primaryColor }}>Score: {edu.score}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: primaryColor }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                Projects & Builds
              </h2>
              <div className={spacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="space-y-1.5" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <h3 className="font-bold text-slate-900 flex-1 min-w-[160px]">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-slate-600 leading-relaxed text-xs">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc list-inside text-slate-600 space-y-1 ml-1 text-xs">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="leading-relaxed">{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 pt-1">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-600 border border-slate-200">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {experience.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-xs font-black uppercase tracking-widest flex items-center gap-2" style={{ color: primaryColor }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                Experience / Internships
              </h2>
              <div className={spacingClass}>
                {experience.map((exp) => (
                  <div key={exp.id} className={itemSpacingClass} style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2">
                      <h3 className="font-bold text-slate-900 flex-1 min-w-[180px]">{exp.position} @ {exp.company}</h3>
                      <span className="text-[10px] font-bold text-slate-400 uppercase shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <ul className="list-disc ml-4 space-y-1 text-xs">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-slate-600 leading-relaxed">{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Student Sidebar */}
        <div style={{ width: '180px', flexShrink: 0 }} className="space-y-5">
          {summary && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>Objective</h2>
              <p className="leading-relaxed text-xs text-slate-600 italic">"{summary}"</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, i) => (
                  <span key={i} className="px-2.5 py-1 rounded-md text-[10px] font-bold border" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-widest" style={{ color: primaryColor }}>Certifications</h2>
              <div className="flex flex-col gap-1.5">
                {certifications.map((cert, i) => (
                  <span key={i} className="text-xs font-semibold text-slate-700 border-l-2 pl-2" style={{ borderColor: primaryColor }}>{cert}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {renderDeclaration()}
    </div>
  );

  // ==========================================
  // 4. CREATIVE VIBRANT TEMPLATE
  // ==========================================
  const renderCreative = () => (
    <div className={cn('bg-white text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass)} style={{ ...fontStyle, minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="px-8 py-7 text-white relative shrink-0" style={{ backgroundColor: primaryColor, overflow: 'hidden' }}>
        <div className="absolute top-0 right-0 w-64 h-64 rounded-full -mr-32 -mt-32" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
        <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full -ml-24 -mb-24" style={{ backgroundColor: 'rgba(0, 0, 0, 0.12)' }} />
        <div className="relative z-10">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="space-y-1 flex-1 min-w-[200px]">
              <h1 className="text-4xl font-black tracking-tight">{personalInfo.fullName}</h1>
              {personalInfo.jobTitle && (
                <p className="font-bold uppercase tracking-[0.2em] text-xs opacity-90">{personalInfo.jobTitle}</p>
              )}
            </div>
            <div className="text-right text-xs space-y-1 opacity-95 shrink-0 font-medium">
              {personalInfo.email && (
                <a href={`mailto:${personalInfo.email}`} className="block hover:underline">
                  ✉️ {personalInfo.email}
                </a>
              )}
              {personalInfo.phone && (
                <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="block hover:underline">
                  📱 {personalInfo.phone}
                </a>
              )}
              {personalInfo.location && <p>📍 {personalInfo.location}</p>}
              {personalInfo.linkedin && (
                <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="block hover:underline font-bold">
                  🔗 {displayUrl(personalInfo.linkedin)}
                </a>
              )}
              {personalInfo.website && (
                <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="block hover:underline font-bold">
                  🌐 {displayUrl(personalInfo.website)}
                </a>
              )}
            </div>
          </div>
          {renderIndianDetails(true)}
        </div>
      </div>

      {/* Creative Body */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Main column */}
        <div style={{ flex: '1 1 0', minWidth: 0, padding: '24px 20px 28px 28px' }}>
          {summary && (
            <div className="space-y-2 mb-6" style={{ breakInside: 'avoid' }}>
              <h2 className="text-base font-black border-b-2 pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>About Me</h2>
              <p className="text-slate-700 leading-relaxed font-medium italic text-sm">"{summary}"</p>
            </div>
          )}

          {experience.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-base font-black border-b-2 pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Experience</h2>
              <div className={spacingClass}>
                {experience.map(exp => (
                  <div key={exp.id} className={cn('relative pl-4 border-l-2', itemSpacingClass)} style={{ borderColor: `${primaryColor}30`, breakInside: 'avoid' }}>
                    <div className="absolute -left-[5px] top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="flex flex-wrap justify-between items-baseline mb-0.5">
                       <h3 className="font-bold text-sm text-slate-900">{exp.position}</h3>
                       <span className="text-xs font-bold text-slate-400">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <p className="font-bold text-xs mb-2" style={{ color: primaryColor }}>{exp.company}</p>
                    <ul className="space-y-1">
                       {(exp.description || []).map((bullet, i) => (
                         <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                           <span className="mt-1 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                           {bullet}
                         </li>
                       ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="space-y-4 mb-6">
              <h2 className="text-base font-black border-b-2 pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Projects</h2>
              <div className="space-y-3">
                {projects.map(project => (
                  <div key={project.id} className="bg-slate-50 p-4 rounded-2xl border border-slate-100" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-1">
                      <h3 className="font-bold text-sm text-slate-900">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-xs text-slate-600 mb-2 leading-relaxed">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 mb-2">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="leading-relaxed">{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="text-[9px] font-bold bg-white px-2 py-0.5 rounded-md border" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: '200px', flexShrink: 0, padding: '24px 20px 28px 0' }} className="space-y-6">
          {skills.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-wider border-b-2 pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Skills</h2>
              <div className="flex flex-wrap gap-1.5">
                {skills.map((skill, i) => (
                  <span key={i} className="text-white px-2.5 py-1 rounded-lg text-[10px] font-bold shadow-sm" style={{ backgroundColor: primaryColor }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-wider border-b-2 pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Education</h2>
              <div className="space-y-2.5">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-bold text-xs text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-[11px] text-slate-600">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center text-[10px]">
                      <span className="font-bold text-slate-400">{edu.graduationDate}</span>
                      {edu.score && <span className="font-bold" style={{ color: primaryColor }}>{edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-3" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-wider border-b-2 pb-1" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Certifications</h2>
              <div className="flex flex-col gap-1.5">
                {certifications.map((cert, i) => (
                  <span key={i} className="text-slate-700 text-xs font-semibold border-l-2 pl-2" style={{ borderColor: primaryColor }}>{cert}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      <div className="px-8 pb-8">
        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 5. EXECUTIVE MINIMAL TEMPLATE
  // ==========================================
  const renderExecutive = () => (
    <div className={cn('bg-white text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass)} style={{ ...fontStyle, padding: '36px 44px', minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="flex flex-wrap justify-between items-start border-b-2 border-slate-900 pb-5 mb-6 gap-4" style={{ breakInside: 'avoid' }}>
        <div className="space-y-1 flex-1 min-w-[220px]">
          <h1 className="text-3xl font-light tracking-tight">{personalInfo.fullName}</h1>
          {personalInfo.jobTitle && (
            <p className="font-bold uppercase tracking-widest text-xs" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
          )}
        </div>
        <div className="text-right text-xs space-y-0.5 shrink-0">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="font-semibold block hover:underline" style={{ color: primaryColor }}>
              {personalInfo.email}
            </a>
          )}
          {personalInfo.phone && (
            <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="text-slate-600 block hover:underline">
              {personalInfo.phone}
            </a>
          )}
          {personalInfo.location && <p className="text-slate-600">{personalInfo.location}</p>}
          {personalInfo.linkedin && (
            <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="block hover:underline font-semibold" style={{ color: primaryColor }}>
              LinkedIn ↗
            </a>
          )}
          {personalInfo.website && (
            <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="block hover:underline font-semibold" style={{ color: primaryColor }}>
              {displayUrl(personalInfo.website)} ↗
            </a>
          )}
        </div>
        {renderIndianDetails()}
      </div>

      {summary && (
        <div className="mb-6" style={{ breakInside: 'avoid' }}>
          <h2 className="text-xs font-bold uppercase tracking-widest border-l-4 pl-2.5 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>Executive Summary</h2>
          <p className="text-sm leading-relaxed font-light italic text-slate-700">"{summary}"</p>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest border-l-4 pl-2.5 mb-3" style={{ color: primaryColor, borderColor: primaryColor }}>Professional Experience</h2>
          <div className="space-y-4">
            {experience.map(exp => (
              <div key={exp.id} style={{ breakInside: 'avoid' }}>
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <h3 className="text-base font-bold flex-1 min-w-[200px] text-slate-900">{exp.position}</h3>
                  <span className="text-xs font-bold text-slate-400 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                </div>
                <p className="font-bold uppercase tracking-wider text-xs mb-1.5" style={{ color: primaryColor }}>{exp.company}</p>
                <ul className="space-y-1">
                  {(exp.description || []).map((bullet, i) => (
                    <li key={i} className="text-xs text-slate-700 leading-relaxed flex gap-2">
                      <span className="font-bold shrink-0" style={{ color: primaryColor }}>/</span>{bullet}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-6">
          <h2 className="text-xs font-bold uppercase tracking-widest border-l-4 pl-2.5 mb-3" style={{ color: primaryColor, borderColor: primaryColor }}>Projects & Initiatives</h2>
          <div className="space-y-3">
            {projects.map(project => (
              <div key={project.id} style={{ breakInside: 'avoid' }}>
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <h3 className="text-sm font-bold flex-1 min-w-[200px] text-slate-900">{project.name}</h3>
                  {project.link && (
                    <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-xs font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                      {displayUrl(project.link)} ↗
                    </a>
                  )}
                </div>
                {project.description && <p className="text-xs text-slate-700 leading-relaxed mt-0.5">{project.description}</p>}
                {project.keyFeatures && project.keyFeatures.length > 0 && (
                  <ul className="space-y-0.5 mt-1">
                    {project.keyFeatures.map((feature, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                        <span className="font-bold shrink-0" style={{ color: primaryColor }}>•</span>{feature}
                      </li>
                    ))}
                  </ul>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mt-1">
                    Stack: {project.technologies.join(' • ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Skills, Education, Certifications flex row */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '24px', breakInside: 'avoid' }}>
        {skills.length > 0 && (
          <div style={{ flex: '1 1 180px' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest border-l-4 pl-2.5 mb-2" style={{ color: primaryColor, borderColor: primaryColor }}>Expertise</h2>
            <div className="grid grid-cols-2 gap-x-3 gap-y-1">
              {skills.map((skill, i) => (
                <div key={i} className="flex items-center gap-1.5 text-xs text-slate-700">
                  <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                  {skill}
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div style={{ flex: '1 1 180px' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest border-l-4 pl-2.5 mb-2" style={{ color: primaryColor, borderColor: primaryColor }}>Education</h2>
            <div className="space-y-2">
              {education.map(edu => (
                <div key={edu.id} className="space-y-0.5">
                  <h3 className="font-bold text-xs text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                  <p className="text-[11px] text-slate-600">{edu.school}{edu.board ? ` | ${edu.board}` : ''}</p>
                  <div className="flex justify-between items-center text-[10px]">
                    <span className="font-bold text-slate-400">{edu.graduationDate}</span>
                    {edu.score && <span className="font-bold" style={{ color: primaryColor }}>{edu.score}</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div style={{ flex: '1 1 160px' }}>
            <h2 className="text-xs font-bold uppercase tracking-widest border-l-4 pl-2.5 mb-2" style={{ color: primaryColor, borderColor: primaryColor }}>Certifications</h2>
            <div className="space-y-1">
              {certifications.map((cert, i) => (
                <div key={i} className="text-xs text-slate-700 flex gap-1.5">
                  <span className="shrink-0 font-bold" style={{ color: primaryColor }}>•</span>{cert}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {renderDeclaration()}
    </div>
  );

  // ==========================================
  // 6. MINIMALIST CLEAN TEMPLATE
  // ==========================================
  const renderMinimalist = () => (
    <div className={cn('bg-white text-slate-800 overflow-x-hidden min-h-full', fontFamily, fontSizeClass)} style={{ ...fontStyle, padding: '36px 44px', minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="border-b-2 border-slate-800 pb-4 mb-5" style={{ breakInside: 'avoid' }}>
        <h1 className="text-3xl font-bold tracking-tight text-slate-900">{personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <p className="text-sm font-medium text-slate-500 mt-0.5">{personalInfo.jobTitle}</p>
        )}
        <div className="flex flex-wrap gap-x-3 gap-y-1 text-xs text-slate-600 mt-2">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="hover:underline font-semibold" style={{ color: primaryColor }}>
              {personalInfo.email}
            </a>
          )}
          {personalInfo.email && personalInfo.phone && <span className="text-slate-300">|</span>}
          {personalInfo.phone && (
            <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="hover:underline" style={{ color: primaryColor }}>
              {personalInfo.phone}
            </a>
          )}
          {personalInfo.location && <><span className="text-slate-300">|</span><span>{personalInfo.location}</span></>}
          {personalInfo.linkedin && (
            <>
              <span className="text-slate-300">|</span>
              <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: primaryColor }}>
                LinkedIn
              </a>
            </>
          )}
          {personalInfo.website && (
            <>
              <span className="text-slate-300">|</span>
              <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="hover:underline font-semibold" style={{ color: primaryColor }}>
                {displayUrl(personalInfo.website)}
              </a>
            </>
          )}
        </div>
        {renderIndianDetails()}
      </div>

      {summary && (
        <div className="mb-5" style={{ breakInside: 'avoid' }}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-1 mb-1.5" style={{ color: primaryColor }}>Summary</h2>
          <p className="text-xs leading-relaxed text-slate-700">{summary}</p>
        </div>
      )}

      {experience.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-1 mb-2.5" style={{ color: primaryColor }}>Experience</h2>
          <div className="space-y-3">
            {experience.map((exp) => (
              <div key={exp.id} style={{ breakInside: 'avoid' }}>
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <h3 className="font-bold text-slate-900 text-xs">{exp.position}</h3>
                  <span className="text-[10px] font-medium text-slate-400 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                </div>
                <p className="text-[11px] font-semibold mb-1" style={{ color: primaryColor }}>{exp.company}</p>
                <ul className="list-disc ml-4 space-y-0.5">
                  {(exp.description || []).map((bullet, i) => (
                    <li key={i} className="text-xs text-slate-600 leading-relaxed">{bullet}</li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      )}

      {projects.length > 0 && (
        <div className="mb-5">
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-1 mb-2.5" style={{ color: primaryColor }}>Projects</h2>
          <div className="space-y-3">
            {projects.map((project) => (
              <div key={project.id} style={{ breakInside: 'avoid' }}>
                <div className="flex flex-wrap justify-between items-baseline gap-2">
                  <h3 className="font-bold text-slate-900 text-xs">{project.name}</h3>
                  {project.link && (
                    <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                      {displayUrl(project.link)} ↗
                    </a>
                  )}
                </div>
                {project.description && <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{project.description}</p>}
                {project.keyFeatures && project.keyFeatures.length > 0 && (
                  <ul className="list-disc ml-4 space-y-0.5 mt-0.5">
                    {project.keyFeatures.map((feature, i) => (
                      <li key={i} className="text-xs text-slate-500 leading-relaxed">{feature}</li>
                    ))}
                  </ul>
                )}
                {project.technologies && project.technologies.length > 0 && (
                  <p className="text-[9px] text-slate-400 font-semibold mt-0.5">
                    Tools: {project.technologies.join(', ')}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {education.length > 0 && (
        <div className="mb-5" style={{ breakInside: 'avoid' }}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-1 mb-2" style={{ color: primaryColor }}>Education</h2>
          <div className="space-y-2">
            {education.map((edu) => (
              <div key={edu.id} className="flex flex-wrap justify-between items-baseline gap-2">
                <div className="flex-1 min-w-[180px]">
                  <span className="font-bold text-xs text-slate-900">{edu.school}</span>
                  {edu.board && <span className="text-[10px] text-slate-400 ml-1">({edu.board})</span>}
                  <p className="text-xs text-slate-600">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                  {edu.score && <p className="text-[10px] font-bold" style={{ color: primaryColor }}>Score: {edu.score}</p>}
                </div>
                <span className="text-[10px] font-medium text-slate-400 shrink-0">{edu.graduationDate}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {skills.length > 0 && (
        <div className="mb-5" style={{ breakInside: 'avoid' }}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-1 mb-1.5" style={{ color: primaryColor }}>Skills</h2>
          <p className="text-xs leading-relaxed text-slate-700">{skills.join(' • ')}</p>
        </div>
      )}

      {certifications.length > 0 && (
        <div className="mb-5" style={{ breakInside: 'avoid' }}>
          <h2 className="text-[10px] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-1 mb-1.5" style={{ color: primaryColor }}>Certifications</h2>
          <p className="text-xs leading-relaxed text-slate-700">{certifications.join(' • ')}</p>
        </div>
      )}

      {renderDeclaration()}
    </div>
  );

  // ==========================================
  // 7. TECH FOCUSED TEMPLATE
  // ==========================================
  const renderTech = () => (
    <div className={cn('bg-slate-50 text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass, spacingClass)} style={{ ...fontStyle, padding: '36px', minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="bg-slate-900 p-6 rounded-2xl" style={{ color: primaryColor, breakInside: 'avoid' }}>
        <h1 className="text-2xl font-bold mb-0.5">&gt; {personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <h2 className="text-base font-mono opacity-80 mb-3">&gt; {personalInfo.jobTitle}</h2>
        )}
        <div className="grid grid-cols-2 gap-2 text-xs opacity-90 text-white mt-3 font-mono">
          {personalInfo.email && (
            <p>
              EMAIL:{' '}
              <a href={`mailto:${personalInfo.email}`} className="hover:underline font-bold" style={{ color: primaryColor }}>
                {personalInfo.email}
              </a>
            </p>
          )}
          {personalInfo.phone && (
            <p>
              PHONE:{' '}
              <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="hover:underline">
                {personalInfo.phone}
              </a>
            </p>
          )}
          {personalInfo.location && <p>LOC: {personalInfo.location}</p>}
          {personalInfo.linkedin && (
            <p>
              LINKEDIN:{' '}
              <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: primaryColor }}>
                {displayUrl(personalInfo.linkedin)}
              </a>
            </p>
          )}
          {personalInfo.website && (
            <p className="col-span-2">
              WEB:{' '}
              <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: primaryColor }}>
                {displayUrl(personalInfo.website)}
              </a>
            </p>
          )}
        </div>
        {renderIndianDetails(true)}
      </div>

      <div className="space-y-6 mt-6">
        {summary && (
          <div className="space-y-2" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest border-b border-slate-200 pb-1">System.Summary</h2>
            <p className="leading-relaxed text-slate-700 text-xs font-mono">{summary}</p>
          </div>
        )}

        {skills.length > 0 && (
          <div className="space-y-2" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest border-b border-slate-200 pb-1">System.Skills</h2>
            <div className="flex flex-wrap gap-1.5">
              {skills.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-xs font-mono font-bold border" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="space-y-2" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest border-b border-slate-200 pb-1">System.Certifications</h2>
            <div className="flex flex-col gap-1 text-xs text-slate-700 font-mono">
              {certifications.map((cert, i) => (
                 <div key={i}>&gt; {cert}</div>
              ))}
            </div>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest border-b border-slate-200 pb-1">System.Experience</h2>
            <div className={spacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className={itemSpacingClass} style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="font-bold text-slate-900 text-xs flex-1 min-w-[200px]">[{exp.position}]</h3>
                    <span className="text-[10px] font-bold text-slate-400 shrink-0">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="font-bold text-xs font-mono" style={{ color: primaryColor }}>@ {exp.company}</p>
                  <ul className="space-y-1">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                        <span style={{ color: primaryColor }}>#</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest border-b border-slate-200 pb-1">System.Projects</h2>
            <div className="grid grid-cols-1 gap-3">
              {projects.map((project) => (
                <div key={project.id} className="border border-slate-200 p-4 rounded-xl bg-white" style={{ breakInside: 'avoid' }}>
                  <div className="flex items-center justify-between gap-2 mb-1">
                    <h3 className="font-bold text-slate-900 text-xs font-mono">{project.name}</h3>
                    {project.link && (
                      <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-mono hover:underline font-bold" style={{ color: primaryColor }}>
                        [LINK ↗]
                      </a>
                    )}
                  </div>
                  {project.description && <p className="text-xs text-slate-600 mb-1.5">{project.description}</p>}
                  {project.keyFeatures && project.keyFeatures.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 mb-2 font-mono">
                      {project.keyFeatures.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech, i) => (
                        <span key={i} className="text-[9px] bg-slate-100 text-slate-500 px-1.5 py-0.5 rounded font-mono">{tech}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div className="space-y-3">
            <h2 className="text-xs font-bold text-slate-500 font-mono uppercase tracking-widest border-b border-slate-200 pb-1">System.Education</h2>
            <div className={spacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <h3 className="font-bold text-slate-900 text-xs font-mono">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                  <p className="text-xs text-slate-600 font-mono">{edu.school}{edu.board ? ` | ${edu.board}` : ''}</p>
                  <div className="flex justify-between items-center text-[10px] font-mono">
                    <p className="font-bold text-slate-400">{edu.graduationDate}</p>
                    {edu.score && <p className="font-bold" style={{ color: primaryColor }}>SCORE: {edu.score}</p>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      <div className="pt-4">
        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 8. MODERN CREATIVE TEMPLATE
  // ==========================================
  const renderModernCreative = () => (
    <div className={cn('bg-slate-50 text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass)} style={{ ...fontStyle, minHeight: '297mm', boxSizing: 'border-box' }}>
      <div className="px-8 py-7 text-white relative shrink-0" style={{ backgroundColor: primaryColor, overflow: 'hidden' }}>
        <div className="absolute top-0 right-0 w-96 h-96 rounded-full -mr-48 -mt-48" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <div className="absolute bottom-0 left-0 w-64 h-64 rounded-full -ml-32 -mb-32" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }} />
        <div className="relative z-10 flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-1 flex-1 min-w-[200px]">
            <h1 className="text-4xl font-black tracking-tight leading-tight">{personalInfo.fullName}</h1>
            {personalInfo.jobTitle && <p className="font-black uppercase tracking-[0.2em] text-xs opacity-90">{personalInfo.jobTitle}</p>}
          </div>
          <div
            className="flex flex-col gap-1 text-xs font-semibold p-3 rounded-2xl border backdrop-blur-sm"
            style={{ backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.95)', maxWidth: '240px' }}
          >
            {personalInfo.email && (
              <a href={`mailto:${personalInfo.email}`} className="truncate hover:underline">
                ✉️ {personalInfo.email}
              </a>
            )}
            {personalInfo.phone && (
              <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="truncate hover:underline">
                📱 {personalInfo.phone}
              </a>
            )}
            {personalInfo.location && <p className="truncate">📍 {personalInfo.location}</p>}
            {personalInfo.linkedin && (
              <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="truncate hover:underline font-bold">
                🔗 {displayUrl(personalInfo.linkedin)}
              </a>
            )}
            {personalInfo.website && (
              <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="truncate hover:underline font-bold">
                🌐 {displayUrl(personalInfo.website)}
              </a>
            )}
          </div>
        </div>
        {renderIndianDetails(true)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Main column */}
        <div style={{ flex: '1 1 0', minWidth: 0, padding: '24px 20px 28px 28px' }}>
          {summary && (
            <div className="mb-6" style={{ breakInside: 'avoid' }}>
              <div className="flex items-center gap-2 mb-1.5">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Professional Story</h2>
                <div className="flex-1 h-[2px] rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
              </div>
              <p className="text-xs text-slate-600 leading-relaxed italic">"{summary}"</p>
            </div>
          )}

          {experience.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Experience</h2>
                <div className="flex-1 h-[2px] rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
              </div>
              <div className="space-y-4">
                {experience.map((exp) => (
                  <div key={exp.id} className="relative pl-4 border-l-2" style={{ borderColor: `${primaryColor}40`, breakInside: 'avoid' }}>
                    <div className="absolute -left-[5px] top-1 w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-0.5">
                      <h3 className="font-black text-xs" style={{ color: primaryColor }}>{exp.position}</h3>
                      <span className="px-2 py-0.5 bg-slate-200/60 rounded-full text-[9px] font-black text-slate-600 uppercase tracking-wider shrink-0">
                        {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>
                    <p className="text-[10px] font-black uppercase tracking-wider text-slate-800 mb-1">{exp.company}</p>
                    <ul className="space-y-1">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                          <span className="font-bold shrink-0" style={{ color: primaryColor }}>▹</span>{bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <h2 className="text-sm font-black text-slate-900 uppercase tracking-tight">Featured Projects</h2>
                <div className="flex-1 h-[2px] rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
              </div>
              <div className="space-y-3">
                {projects.map((project) => (
                  <div key={project.id} className="bg-white p-4 rounded-2xl shadow-sm border border-slate-200/80" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                      <h3 className="font-black text-xs" style={{ color: primaryColor }}>{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-slate-900 text-white rounded-full text-[9px] font-black uppercase tracking-wider shrink-0 hover:bg-slate-800">
                          Live ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-xs text-slate-600 leading-relaxed">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="space-y-0.5 mt-1">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-xs text-slate-500 flex gap-2">
                            <span className="font-bold shrink-0" style={{ color: primaryColor }}>▹</span>{feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-2">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[9px] font-bold uppercase border border-slate-200">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderDeclaration()}
        </div>

        {/* Sidebar */}
        <div style={{ width: '200px', flexShrink: 0, padding: '24px 20px 28px 0' }} className="space-y-5">
          {skills.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight border-b-2 pb-1" style={{ borderColor: primaryColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span key={i} className="bg-white text-slate-800 px-2 py-0.5 rounded-lg text-[10px] font-bold shadow-sm border border-slate-200">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight border-b-2 pb-1" style={{ borderColor: primaryColor }}>Education</h2>
              <div className="space-y-2">
                {education.map(edu => (
                  <div key={edu.id} className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-black text-[10px] text-slate-900 leading-snug">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-[10px] text-slate-500 font-medium">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center mt-1 text-[9px]">
                      <span className="font-bold" style={{ color: primaryColor }}>{edu.graduationDate}</span>
                      {edu.score && <span className="font-bold text-slate-600">Score: {edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black text-slate-900 uppercase tracking-tight border-b-2 pb-1" style={{ borderColor: primaryColor }}>Certifications</h2>
              <div className="space-y-1">
                {certifications.map((cert, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[10px] font-semibold text-slate-700">
                    <div className="w-1.5 h-1.5 rounded-full mt-1 shrink-0" style={{ backgroundColor: primaryColor }} />
                    {cert}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  // ==========================================
  // 9. MODERN PROFESSIONAL PHOTO TEMPLATE
  // ==========================================
  const renderModernPhoto = () => (
    <div className={cn('flex flex-row bg-white text-slate-800 overflow-x-hidden min-h-full items-stretch', fontFamily, fontSizeClass)} style={{ ...fontStyle, minHeight: '297mm', boxSizing: 'border-box' }}>
      {/* Sidebar for photo and contact info */}
      <div className="w-[280px] bg-slate-900 text-white p-8 flex flex-col gap-6 shrink-0 print:bg-slate-900">
        <div className="flex flex-col items-center text-center gap-3">
          <div className="w-36 h-36 rounded-full border-4 border-white/20 overflow-hidden bg-slate-800 shrink-0">
            {personalInfo.photo ? (
              <img src={personalInfo.photo} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <span className="text-4xl font-bold opacity-30">{personalInfo.fullName ? personalInfo.fullName.charAt(0) : 'U'}</span>
              </div>
            )}
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl font-black leading-tight uppercase tracking-tight">{personalInfo.fullName}</h1>
            {personalInfo.jobTitle && (
              <p className="text-xs font-bold uppercase tracking-widest text-slate-400" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
            )}
          </div>
        </div>

        <div className="space-y-6">
          <div className="space-y-2.5">
            <h2 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Contact</h2>
            <div className="space-y-2 text-xs opacity-90 font-medium">
              {personalInfo.email && (
                <a href={`mailto:${personalInfo.email}`} className="flex items-center gap-2 hover:underline truncate" title={personalInfo.email}>
                  <span>✉️</span> {personalInfo.email}
                </a>
              )}
              {personalInfo.phone && (
                <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="flex items-center gap-2 hover:underline truncate">
                  <span>📱</span> {personalInfo.phone}
                </a>
              )}
              {personalInfo.location && <p className="flex items-center gap-2 truncate"><span>📍</span> {personalInfo.location}</p>}
              {personalInfo.linkedin && (
                <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline truncate font-bold" style={{ color: primaryColor }}>
                  <span>🔗</span> {displayUrl(personalInfo.linkedin)}
                </a>
              )}
              {personalInfo.website && (
                <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-2 hover:underline truncate font-bold" style={{ color: primaryColor }}>
                  <span>🌐</span> {displayUrl(personalInfo.website)}
                </a>
              )}
            </div>
            {renderIndianDetails(true)}
          </div>

          {skills.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Top Expertise</h2>
              <div className="flex flex-col gap-1.5">
                {skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-2 text-xs font-medium">
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                    {skill}
                  </div>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Education</h2>
              <div className="space-y-2">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5">
                    <p className="text-xs font-bold text-white">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    <p className="text-[10px] opacity-75">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="font-bold" style={{ color: primaryColor }}>{edu.graduationDate}</span>
                      {edu.score && <span className="opacity-75">Score: {edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[10px] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1.5">Certifications</h2>
              <div className="space-y-1">
                {certifications.map((cert, i) => (
                  <div key={i} className="text-xs text-slate-300 flex items-start gap-1.5">
                    <span>•</span>
                    <span>{cert}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div className={cn("flex-1 p-8 min-w-0", spacingClass)}>
        {summary && (
          <div className="space-y-2" style={{ breakInside: 'avoid' }}>
            <h2 className="text-xs font-black uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Profile Summary</h2>
            <p className="text-xs leading-relaxed text-slate-600 font-medium">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Experience</h2>
            <div className={spacingClass}>
              {experience.map(exp => (
                <div key={exp.id} className={cn('relative pl-4 border-l-2', itemSpacingClass)} style={{ borderColor: `${primaryColor}30`, breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline mb-0.5">
                    <h3 className="font-bold text-sm text-slate-900">{exp.position}</h3>
                    <span className="text-[10px] font-black text-slate-400">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="text-xs font-black uppercase tracking-widest mb-1.5" style={{ color: primaryColor }}>{exp.company}</p>
                  <ul className="space-y-1">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                        <span className="text-[8px] mt-1 opacity-40">•</span>
                        {bullet}
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-4">
            <h2 className="text-xs font-black uppercase tracking-widest border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Key Projects</h2>
            <div className="grid gap-3">
              {projects.map(project => (
                <div key={project.id} className="bg-slate-50 p-4 rounded-xl border border-slate-200" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-center gap-2 mb-1">
                    <h3 className="font-bold text-xs text-slate-900">{project.name}</h3>
                    {project.link && (
                      <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                        {displayUrl(project.link)} ↗
                      </a>
                    )}
                  </div>
                  {project.description && <p className="text-xs text-slate-600 leading-relaxed mb-1.5">{project.description}</p>}
                  {project.keyFeatures && project.keyFeatures.length > 0 && (
                    <ul className="list-disc list-inside text-xs text-slate-600 space-y-0.5 mb-1.5">
                      {project.keyFeatures.map((feature, i) => (
                        <li key={i}>{feature}</li>
                      ))}
                    </ul>
                  )}
                  {project.technologies && project.technologies.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {project.technologies.map((tech, i) => (
                        <span key={i} className="text-[9px] font-bold bg-white text-slate-600 px-2 py-0.5 rounded border border-slate-200">{tech}</span>
                      ))}
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 10. EXECUTIVE PRO TEMPLATE
  // ==========================================
  const renderExecutivePro = () => (
    <div className={cn('bg-white text-slate-900 overflow-x-hidden min-h-full', fontFamily, fontSizeClass)} style={{ ...fontStyle, minHeight: '297mm', boxSizing: 'border-box' }}>
      {/* Centred Header */}
      <div className="text-center px-10 pt-10 pb-6 border-b-4" style={{ borderColor: primaryColor, breakInside: 'avoid' }}>
        <h1 className="text-4xl font-black tracking-tight uppercase leading-none mb-2">{personalInfo.fullName}</h1>
        <div className="h-1 w-16 mx-auto mb-2" style={{ backgroundColor: primaryColor }} />
        {personalInfo.jobTitle && (
          <p className="text-sm font-bold uppercase tracking-[0.25em] text-slate-500 mb-3">{personalInfo.jobTitle}</p>
        )}
        <div className="flex justify-center flex-wrap gap-x-5 gap-y-1 text-xs font-bold uppercase tracking-wider text-slate-500">
          {personalInfo.email && (
            <a href={`mailto:${personalInfo.email}`} className="flex items-center gap-1 hover:underline">
              <span style={{ color: primaryColor }}>E:</span> {personalInfo.email}
            </a>
          )}
          {personalInfo.phone && (
            <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="flex items-center gap-1 hover:underline">
              <span style={{ color: primaryColor }}>M:</span> {personalInfo.phone}
            </a>
          )}
          {personalInfo.location && (
            <div className="flex items-center gap-1">
              <span style={{ color: primaryColor }}>L:</span> {personalInfo.location}
            </div>
          )}
          {personalInfo.linkedin && (
            <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
              <span style={{ color: primaryColor }}>IN:</span> LinkedIn ↗
            </a>
          )}
          {personalInfo.website && (
            <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="flex items-center gap-1 hover:underline">
              <span style={{ color: primaryColor }}>W:</span> {displayUrl(personalInfo.website)} ↗
            </a>
          )}
        </div>
        {renderIndianDetails()}
      </div>

      {/* Main & Sidebar Layout */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', maxWidth: '100%', boxSizing: 'border-box' }}>
        {/* Main column */}
        <div style={{ flex: '1 1 0', minWidth: 0, padding: '28px 20px 28px 36px' }}>
          {experience.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] flex items-center gap-2 mb-3">
                Experience
                <div className="flex-1 h-px bg-slate-200" />
              </h2>
              <div className="space-y-4">
                {experience.map(exp => (
                  <div key={exp.id} style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-end gap-2">
                      <div className="space-y-0.5">
                        <h3 className="text-sm font-black text-slate-900">{exp.position}</h3>
                        <p className="text-xs font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{exp.company}</p>
                      </div>
                      <span className="text-[10px] font-black text-slate-400 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-1 mt-1.5">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-xs text-slate-600 leading-relaxed flex gap-2">
                          <span className="font-black shrink-0" style={{ color: primaryColor }}>/</span>{bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="mb-6">
              <h2 className="text-xs font-black uppercase tracking-[0.25em] flex items-center gap-2 mb-3">
                Key Initiatives
                <div className="flex-1 h-px bg-slate-200" />
              </h2>
              <div className="space-y-3">
                {projects.map(project => (
                  <div key={project.id} style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-center gap-2">
                      <h3 className="text-xs font-black text-slate-900">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[10px] font-black uppercase tracking-wider hover:underline" style={{ color: primaryColor }}>
                          Direct Access ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-xs text-slate-600 leading-relaxed mt-0.5">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="space-y-0.5 mt-1">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-xs text-slate-500 flex gap-2">
                            <span className="font-black shrink-0" style={{ color: primaryColor }}>•</span>{feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1.5">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="text-[8px] font-bold uppercase tracking-wider text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}

          {renderDeclaration()}
        </div>

        {/* Sidebar */}
        <div style={{ width: '210px', flexShrink: 0, padding: '28px 36px 28px 0' }} className="space-y-5">
          {summary && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>About</h2>
              <p className="text-xs leading-relaxed text-slate-600 italic">"{summary}"</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Core Skills</h2>
              <div className="flex flex-col gap-1.5">
                {skills.map((skill, i) => (
                  <div key={i} className="flex justify-between items-center text-xs">
                    <span className="font-bold text-slate-700 uppercase tracking-wider text-[10px]">{skill}</span>
                    <div className="w-8 h-1 rounded-full bg-slate-100">
                      <div className="h-full rounded-full" style={{ backgroundColor: primaryColor, width: '80%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-2.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Academia</h2>
              <div className="space-y-2">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5">
                    <p className="text-xs font-black text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    <p className="text-[10px] text-slate-600">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center text-[9px]">
                      <span className="font-bold" style={{ color: primaryColor }}>{edu.graduationDate}</span>
                      {edu.score && <span className="text-slate-500 font-bold">Score: {edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-xs font-black uppercase tracking-[0.2em] border-b-2 pb-1 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Certifications</h2>
              <div className="flex flex-col gap-1">
                {certifications.map((cert, i) => (
                  <div key={i} className="text-[10px] font-bold text-slate-700 uppercase tracking-wider px-2 py-1 bg-slate-50 border-l-2" style={{ borderColor: primaryColor }}>{cert}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  return (
    <div 
      id="resume-preview-container" 
      className="mx-auto bg-white shadow-2xl shrink-0 print:shadow-none print:m-0 print:!overflow-visible"
      style={{ 
        width: '210mm', 
        minHeight: '297mm', /* Minimum 1 page banayega */
        height: 'auto',     /* Content lamba hone par Page 2 automatic banayega */
        position: 'relative'
      }}
    >
      <div 
        id="resume-preview-content" 
        className="h-auto w-full print:!overflow-visible print:!h-auto"
      >
        {templateType === 'modern-professional' && renderModern()}
        {templateType === 'classic-chronological' && renderClassic()}
        {templateType === 'student-entry' && renderStudent()}
        {templateType === 'creative-vibrant' && renderCreative()}
        {templateType === 'executive-minimal' && renderExecutive()}
        {templateType === 'minimalist-clean' && renderMinimalist()}
        {templateType === 'tech-focused' && renderTech()}
        {templateType === 'modern-creative' && renderModernCreative()}
        {templateType === 'modern-photo' && renderModernPhoto()}
        {templateType === 'executive-pro' && renderExecutivePro()}
      </div>
    </div>
  );
}