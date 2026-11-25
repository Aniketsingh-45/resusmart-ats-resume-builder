import React, { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { ResumeContent, ResumeSettings } from '../types';
import { cn } from '../utils/cn';
import { normalizeUrl, displayUrl } from '../utils/url';

interface ResumePreviewProps {
  content: ResumeContent;
  templateType: string;
  settings?: ResumeSettings;
  onScaleChange?: (scale: number) => void;
}

export const ResumePreview = React.memo(function ResumePreview({
  content,
  templateType,
  settings,
  onScaleChange,
}: ResumePreviewProps) {
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
  const profilePhoto = personalInfo.photo || personalInfo.photoUrl || '';

  // Font Map: applies both utility class and explicit font-family stack for accurate screen & vector PDF export
  const fontMap: Record<string, { cls: string; family: string }> = {
    sans:               { cls: 'font-sans',  family: '"Plus Jakarta Sans", "Inter", ui-sans-serif, sans-serif' },
    serif:              { cls: 'font-serif', family: '"Merriweather", Georgia, "Times New Roman", serif' },
    mono:               { cls: 'font-mono',  family: '"JetBrains Mono", ui-monospace, monospace' },
    system:             { cls: 'font-sans',  family: 'system-ui, -apple-system, sans-serif' },
    'Inter':            { cls: 'font-sans',  family: '"Inter", ui-sans-serif, sans-serif' },
    'Roboto':           { cls: 'font-sans',  family: '"Roboto", "Inter", ui-sans-serif, sans-serif' },
    'Outfit':           { cls: 'font-sans',  family: '"Outfit", "Inter", ui-sans-serif, sans-serif' },
    'Montserrat':       { cls: 'font-sans',  family: '"Montserrat", "Inter", ui-sans-serif, sans-serif' },
    'Source Sans Pro':  { cls: 'font-sans',  family: '"Source Sans 3", "Source Sans Pro", "Inter", ui-sans-serif, sans-serif' },
    'Playfair Display': { cls: 'font-serif', family: '"Playfair Display", Georgia, serif' },
    'Merriweather':     { cls: 'font-serif', family: '"Merriweather", Georgia, serif' },
    'JetBrains Mono':   { cls: 'font-mono',  family: '"JetBrains Mono", ui-monospace, monospace' },
  };

  const defaultFontForTemplate =
    templateType === 'tech-focused' ? 'JetBrains Mono' :
    templateType === 'ats-harvard-ivy' ? 'Merriweather' :
    'Inter';

  const fontKey = settings?.fontFamily || defaultFontForTemplate;
  const fontEntry = fontMap[fontKey];
  const fontFamily = fontEntry?.cls ?? 'font-sans';

  const isFitToOnePage = !!settings?.fitToOnePage;

  // Base font size in px — all child typography uses proportional `em` units so Font Scaling works across 100% of templates!
  const fontSizePx =
    settings?.fontSize === 'tiny'   ? 11 :
    settings?.fontSize === 'small'  ? 12 :
    settings?.fontSize === 'large'  ? 15.2 :
    settings?.fontSize === 'medium' ? 13.5 :
    isFitToOnePage ? 11 : 13.5;

  const fontStyle: React.CSSProperties = {
    fontFamily: fontEntry?.family ?? `"${fontKey}", sans-serif`,
    fontSize: `${fontSizePx}px`,
    lineHeight: isFitToOnePage || settings?.spacing === 'ultra-compact' ? 1.32 : 1.44,
  };

  // Spacing Density controls applied uniformly across all templates
  const spacingLevel = settings?.spacing || (isFitToOnePage ? 'ultra-compact' : 'compact');
  const spacingGapClass =
    spacingLevel === 'ultra-compact' ? 'space-y-2' :
    spacingLevel === 'compact'       ? 'space-y-3' :
    spacingLevel === 'loose'         ? 'space-y-6' :
    'space-y-4';

  const itemSpacingClass =
    spacingLevel === 'ultra-compact' ? 'space-y-1' :
    spacingLevel === 'compact'       ? 'space-y-2' :
    spacingLevel === 'loose'         ? 'space-y-4' :
    'space-y-2.5';

  const sectionGapEm =
    spacingLevel === 'ultra-compact' ? '0.65em' :
    spacingLevel === 'compact'       ? '0.95em' :
    spacingLevel === 'loose'         ? '1.65em' :
    '1.25em';

  // Page Margins / Printable Width Expansion
  const marginMode = settings?.margins || (isFitToOnePage ? 'compact' : 'normal');
  const marginDims =
    marginMode === 'compact' ? { y: 15, x: 20 } :
    marginMode === 'wide'    ? { y: 34, x: 42 } :
    { y: 24, x: 30 };

  const pagePadding = `${marginDims.y}px ${marginDims.x}px`;
  const sidebarPadding = `${marginDims.y}px ${Math.max(14, Math.round(marginDims.x * 0.72))}px`;

  // Project Layout (2-Column Grid vs Single Column)
  const isProjectGrid =
    settings?.projectLayout === 'grid' || (isFitToOnePage && projects.length >= 4);

  const isCompactMode = isFitToOnePage || settings?.fontSize === 'tiny' || spacingLevel === 'ultra-compact' || marginMode === 'compact';

  // Zero-Clipping Automatic 1-Page Proportional Scaler
  const scalerRef = useRef<HTMLDivElement>(null);
  const innerMeasureRef = useRef<HTMLDivElement>(null);
  const [fitScale, setFitScale] = useState(1);
  const fitScaleRef = useRef(1);
  const onScaleChangeRef = useRef(onScaleChange);
  onScaleChangeRef.current = onScaleChange;

  const recalibrateRef = useRef<() => void>(() => {});

  useLayoutEffect(() => {
    const scaler = scalerRef.current;
    const inner = innerMeasureRef.current;
    if (!scaler || !inner) return;

    const recalibrate = () => {
      if (!isFitToOnePage) {
        if (fitScaleRef.current !== 1) {
          fitScaleRef.current = 1;
          setFitScale(1);
        }
        onScaleChangeRef.current?.(1);
        return;
      }

      // 296.4mm at 96dpi = ~1120px; stay safely within 1110px so Blink print never creates a blank page 2
      const A4_HEIGHT_PX = 1110;

      const prevWidth = scaler.style.width;
      const prevTransform = scaler.style.transform;
      const prevInnerMinHeight = inner.style.minHeight;

      // Measure natural unscaled height at exact 210mm width
      scaler.style.width = '210mm';
      scaler.style.transform = 'none';
      inner.style.minHeight = '0px';

      const baseHeight = inner.scrollHeight;
      if (baseHeight <= 0) {
        scaler.style.width = prevWidth;
        scaler.style.transform = prevTransform;
        inner.style.minHeight = prevInnerMinHeight;
        return;
      }

      if (baseHeight <= A4_HEIGHT_PX + 2) {
        scaler.style.width = prevWidth;
        scaler.style.transform = prevTransform;
        inner.style.minHeight = prevInnerMinHeight;
        if (fitScaleRef.current !== 1) {
          fitScaleRef.current = 1;
          setFitScale(1);
        }
        onScaleChangeRef.current?.(1);
        return;
      }

      // Compute scale and do one widening check so wide reflow doesn't leave large empty space
      let nextScale = Math.max(0.56, Math.min(1, A4_HEIGHT_PX / baseHeight));
      scaler.style.width = `${100 / nextScale}%`;
      const widenedHeight = inner.scrollHeight;

      if (widenedHeight * nextScale < A4_HEIGHT_PX - 32 && nextScale < 0.98) {
        const refined = Math.max(nextScale, Math.min(1, A4_HEIGHT_PX / widenedHeight));
        const blended = (nextScale + refined) / 2;
        scaler.style.width = `${100 / blended}%`;
        if (inner.scrollHeight * blended <= A4_HEIGHT_PX) {
          nextScale = blended;
        }
      }

      // Verify worst case doesn't exceed A4 height
      scaler.style.width = `${100 / nextScale}%`;
      const finalCheck = inner.scrollHeight;
      if (finalCheck * nextScale > A4_HEIGHT_PX) {
        nextScale = Math.max(0.52, A4_HEIGHT_PX / finalCheck);
      }

      scaler.style.width = prevWidth;
      scaler.style.transform = prevTransform;
      inner.style.minHeight = prevInnerMinHeight;
      const rounded = Number(nextScale.toFixed(4));
      if (Math.abs(rounded - fitScaleRef.current) > 0.002) {
        fitScaleRef.current = rounded;
        setFitScale(rounded);
      }
      onScaleChangeRef.current?.(rounded);
    };

    recalibrateRef.current = recalibrate;
    recalibrate();
  }, [isFitToOnePage, templateType, content, settings]);

  useEffect(() => {
    const onBeforePrint = () => recalibrateRef.current();
    window.addEventListener('beforeprint', onBeforePrint);
    let mounted = true;
    document.fonts?.ready?.then(() => {
      if (mounted) recalibrateRef.current();
    }).catch(() => {});
    return () => {
      mounted = false;
      window.removeEventListener('beforeprint', onBeforePrint);
    };
  }, []);

  // Shared Indian / Traditional Details Block
  const renderIndianDetails = (isDark = false) => {
    const langs = Array.isArray(personalInfo.languages)
      ? personalInfo.languages.filter(Boolean).join(', ')
      : typeof personalInfo.languages === 'string'
      ? personalInfo.languages
      : '';
    const hobbies = Array.isArray(personalInfo.hobbies)
      ? personalInfo.hobbies.filter(Boolean).join(', ')
      : typeof personalInfo.hobbies === 'string'
      ? personalInfo.hobbies
      : '';

    const hasDetails =
      personalInfo.fatherName ||
      personalInfo.dob ||
      personalInfo.gender ||
      personalInfo.maritalStatus ||
      personalInfo.nationality ||
      personalInfo.domicile ||
      personalInfo.category ||
      personalInfo.aadhaar ||
      langs ||
      hobbies ||
      personalInfo.permanentAddress;

    if (!hasDetails) return null;

    return (
      <div
        className={cn(
          'grid grid-cols-2 gap-x-4 gap-y-1 text-[0.78em] mt-3 pt-2.5 border-t',
          isDark ? 'border-slate-700/80 text-slate-300' : 'border-slate-200 text-slate-600'
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
        {personalInfo.aadhaar && <p><span className="font-bold uppercase tracking-wider opacity-75">Aadhaar:</span> XXXX-XXXX-{String(personalInfo.aadhaar).slice(-4)}</p>}
        {langs && <p className="col-span-2"><span className="font-bold uppercase tracking-wider opacity-75">Languages:</span> {langs}</p>}
        {hobbies && <p className="col-span-2"><span className="font-bold uppercase tracking-wider opacity-75">Hobbies:</span> {hobbies}</p>}
        {personalInfo.permanentAddress && (
          <p className="col-span-2"><span className="font-bold uppercase tracking-wider opacity-75">Permanent Address:</span> {personalInfo.permanentAddress}</p>
        )}
      </div>
    );
  };

  // Shared Formal Declaration Block
  const renderDeclaration = (isDark = false) => {
    if (!content.declaration) return null;
    return (
      <div
        className={cn('pt-3 border-t', isDark ? 'border-slate-700/80' : 'border-slate-200')}
        style={{ marginTop: sectionGapEm, breakInside: 'avoid' }}
      >
        <h2 className="text-[0.82em] font-bold uppercase tracking-widest mb-1.5" style={{ color: primaryColor }}>Declaration</h2>
        <p className={cn('text-[0.88em] leading-relaxed italic', isDark ? 'text-slate-300' : 'text-slate-600')}>{content.declaration}</p>
        <div className="mt-4 flex justify-between items-end">
          <div className="space-y-0.5">
            <p className={cn('text-[0.76em] font-bold uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Date: {content.declarationDate || new Date().toLocaleDateString('en-IN')}
            </p>
            <p className={cn('text-[0.76em] font-bold uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-slate-500')}>
              Place: {content.declarationPlace || personalInfo.location || '___________'}
            </p>
          </div>
          <div className="text-center">
            <div className={cn('w-36 h-px mb-1.5', isDark ? 'bg-slate-700' : 'bg-slate-300')} />
            <p className={cn('text-[0.76em] font-bold uppercase tracking-wider', isDark ? 'text-slate-400' : 'text-slate-500')}>
              ({personalInfo.fullName || 'Authorized Signature'})
            </p>
          </div>
        </div>
      </div>
    );
  };

  // Helper: Stacked Sidebar Contact Block (for Modern, ModernPhoto, etc.)
  const renderContactStack = (opts: { isDark?: boolean; colorAccent?: boolean; showEmoji?: boolean } = {}) => {
    const { isDark = false, colorAccent = false, showEmoji = true } = opts;
    const linkColor = colorAccent ? primaryColor : isDark ? '#e2e8f0' : primaryColor;
    return (
      <div className={cn('space-y-1.5 text-[0.86em]', isDark ? 'text-slate-300' : 'text-slate-600')}>
        {personalInfo.email && (
          <a href={`mailto:${personalInfo.email}`} className="block break-all hover:underline font-medium" style={colorAccent ? { color: primaryColor } : undefined} title={personalInfo.email}>
            {showEmoji ? '✉️ ' : ''}{personalInfo.email}
          </a>
        )}
        {personalInfo.phone && (
          <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="block break-all hover:underline">
            {showEmoji ? '📱 ' : ''}{personalInfo.phone}
          </a>
        )}
        {personalInfo.location && <p className="wrap-break-word">{showEmoji ? '📍 ' : ''}{personalInfo.location}</p>}
        {personalInfo.linkedin && (
          <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="block break-all hover:underline font-semibold" style={{ color: linkColor }}>
            {showEmoji ? '🔗 ' : ''}{displayUrl(personalInfo.linkedin)}
          </a>
        )}
        {personalInfo.github && (
          <a href={normalizeUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer" className="block break-all hover:underline font-semibold" style={{ color: linkColor }}>
            {showEmoji ? '💻 ' : ''}{displayUrl(personalInfo.github)}
          </a>
        )}
        {personalInfo.website && (
          <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="block break-all hover:underline font-semibold" style={{ color: linkColor }}>
            {showEmoji ? '🌐 ' : ''}{displayUrl(personalInfo.website)}
          </a>
        )}
      </div>
    );
  };

  // Helper: Inline Centered/Left Contact Strip (for Classic, Minimalist, Harvard, Jake, ExecutivePro)
  const renderContactInline = (opts: { centered?: boolean; separator?: string; showPrefixes?: boolean; accentAllLinks?: boolean } = {}) => {
    const { centered = true, separator = '•', showPrefixes = false, accentAllLinks = true } = opts;
    const items: React.ReactNode[] = [];

    if (personalInfo.email) {
      items.push(
        <a key="email" href={`mailto:${personalInfo.email}`} className="break-all hover:underline font-semibold" style={accentAllLinks ? { color: primaryColor } : undefined}>
          {showPrefixes ? <span style={{ color: primaryColor }}>E: </span> : null}{personalInfo.email}
        </a>
      );
    }
    if (personalInfo.phone) {
      items.push(
        <a key="phone" href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="break-all hover:underline">
          {showPrefixes ? <span style={{ color: primaryColor }}>M: </span> : null}{personalInfo.phone}
        </a>
      );
    }
    if (personalInfo.location) {
      items.push(
        <span key="loc" className="wrap-break-word">
          {showPrefixes ? <span style={{ color: primaryColor }}>L: </span> : null}{personalInfo.location}
        </span>
      );
    }
    if (personalInfo.linkedin) {
      items.push(
        <a key="li" href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="break-all hover:underline font-semibold" style={{ color: accentAllLinks ? primaryColor : 'inherit' }}>
          {showPrefixes ? <span style={{ color: primaryColor }}>IN: </span> : null}{displayUrl(personalInfo.linkedin)}
        </a>
      );
    }
    if (personalInfo.github) {
      items.push(
        <a key="gh" href={normalizeUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer" className="break-all hover:underline font-semibold" style={{ color: accentAllLinks ? primaryColor : 'inherit' }}>
          {showPrefixes ? <span style={{ color: primaryColor }}>GH: </span> : null}{displayUrl(personalInfo.github)}
        </a>
      );
    }
    if (personalInfo.website) {
      items.push(
        <a key="web" href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="break-all hover:underline font-semibold" style={{ color: accentAllLinks ? primaryColor : 'inherit' }}>
          {showPrefixes ? <span style={{ color: primaryColor }}>W: </span> : null}{displayUrl(personalInfo.website)}
        </a>
      );
    }

    return (
      <div className={cn('flex flex-wrap gap-x-2 gap-y-0.5 text-[0.86em] text-slate-600', centered ? 'justify-center' : 'justify-start')}>
        {items.map((node, idx) => (
          <React.Fragment key={idx}>
            {idx > 0 && <span className="text-slate-400 select-none">{separator}</span>}
            {node}
          </React.Fragment>
        ))}
      </div>
    );
  };

  // Robust 2-Column Projects Grid (Zero text clipping, crisp Flexbox layout across screen & PDF)
  const renderProjectGrid = (
    styleVariant: 'classic' | 'modern' | 'minimalist' | 'tech' | 'executive' | 'creative' | 'ivy' = 'classic'
  ) => {
    return (
      <div
        className="resume-projects-grid flex flex-wrap gap-2 w-full"
        style={{
          display: 'flex',
          flexDirection: 'row',
          flexWrap: 'wrap',
          justifyContent: 'flex-start',
          alignItems: 'stretch',
          gap: '8px 10px',
          width: '100%',
          boxSizing: 'border-box',
        }}
      >
        {projects.map((project) => (
          <div
            key={project.id}
            className={cn(
              'resume-project-card flex flex-col justify-between min-w-0',
              styleVariant === 'tech'
                ? 'bg-white border border-slate-200 rounded-lg p-2.5 font-mono'
                : styleVariant === 'minimalist'
                ? 'bg-slate-50/70 border border-slate-200/80 rounded-md p-2'
                : styleVariant === 'ivy'
                ? 'bg-white border border-slate-300 rounded-sm p-2'
                : styleVariant === 'creative'
                ? 'bg-slate-50 border border-slate-200 rounded-xl p-2.5'
                : 'bg-slate-50/90 border border-slate-200/90 rounded-md p-2'
            )}
            style={{
              flex: '0 0 calc(50% - 5px)',
              maxWidth: 'calc(50% - 5px)',
              width: 'calc(50% - 5px)',
              minWidth: 0,
              boxSizing: 'border-box',
              breakInside: 'avoid',
              pageBreakInside: 'avoid',
              WebkitPrintColorAdjust: 'exact',
              printColorAdjust: 'exact',
            }}
          >
            <div>
              {/* Title + Link wrap naturally without truncating */}
              <div className="flex flex-wrap justify-between items-baseline gap-x-2 gap-y-0.5 min-w-0 w-full mb-0.5">
                <h3
                  className={cn(
                    'font-bold text-slate-900 leading-tight wrap-break-word min-w-0',
                    styleVariant === 'tech' ? 'text-[0.92em] font-mono' : 'text-[0.94em]'
                  )}
                >
                  {project.name}
                </h3>
                {project.link && (
                  <a
                    href={normalizeUrl(project.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={cn(
                      'font-semibold hover:underline max-w-full min-w-0 text-[0.76em] break-all leading-tight',
                      styleVariant === 'tech' && 'font-mono font-bold'
                    )}
                    style={{ color: primaryColor, overflowWrap: 'anywhere' }}
                  >
                    {displayUrl(project.link)} ↗
                  </a>
                )}
              </div>

              {project.description && (
                <p
                  className={cn(
                    'text-slate-600 leading-snug wrap-break-word mb-1',
                    styleVariant === 'tech' ? 'text-[0.82em] font-mono' : 'text-[0.85em]'
                  )}
                >
                  {project.description}
                </p>
              )}

              {project.keyFeatures && project.keyFeatures.length > 0 && (
                <ul className="list-disc ml-3.5 text-[0.8em] text-slate-600 space-y-0.5 mb-1">
                  {project.keyFeatures.map((feat, i) => (
                    <li key={i} className="leading-snug wrap-break-word">{feat}</li>
                  ))}
                </ul>
              )}
            </div>

            {project.technologies && project.technologies.length > 0 && (
              <div
                className={cn(
                  'text-slate-500 font-semibold leading-snug wrap-break-word min-w-0 mt-auto pt-0.5',
                  styleVariant === 'tech' ? 'text-[0.76em] font-mono' : 'text-[0.78em]'
                )}
              >
                <span className="text-slate-400 font-medium">Tech:</span> {project.technologies.join(', ')}
              </div>
            )}
          </div>
        ))}
      </div>
    );
  };

  // ==========================================
  // 1. CLASSIC CHRONOLOGICAL (100% ATS STANDARD)
  // ==========================================
  const renderClassic = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div
        className={cn('text-center border-b-2 border-slate-900', isCompactMode ? 'pb-2 mb-2.5 space-y-0.5' : 'pb-3.5 mb-4 space-y-1')}
        style={{ breakInside: 'avoid' }}
      >
        <h1 className="font-black uppercase tracking-tight text-[2em] leading-tight">{personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <h2 className="font-bold uppercase tracking-widest text-[0.95em]" style={{ color: primaryColor }}>{personalInfo.jobTitle}</h2>
        )}
        <div className="pt-0.5">
          {renderContactInline({ centered: true })}
        </div>
        {renderIndianDetails()}
      </div>

      <div className={spacingGapClass}>
        {summary && (
          <div className={itemSpacingClass} style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-b pb-0.5 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}40` }}>
              Professional Summary
            </h2>
            <p className="text-[0.94em] leading-snug text-slate-700 text-justify">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-b pb-0.5 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}40` }}>
              Experience
            </h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="experience-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-1.5">
                    <div className="flex flex-wrap items-baseline gap-1.5 flex-1 min-w-45">
                      <h3 className="font-bold text-[1.02em] text-slate-900">{exp.company}</h3>
                      <span className="text-slate-400 text-[0.85em]">|</span>
                      <span className="font-semibold text-[0.95em]" style={{ color: primaryColor }}>{exp.position}</span>
                    </div>
                    <span className="text-[0.85em] font-semibold text-slate-500 shrink-0">
                      {exp.startDate ? `${exp.startDate} — ` : ''}{exp.current ? 'Present' : exp.endDate}
                    </span>
                  </div>
                  <ul className="list-disc ml-4 text-slate-700 space-y-0.5">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.92em] leading-snug">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div className="space-y-1">
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-b pb-0.5 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}40` }}>
              Education
            </h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-baseline gap-1.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-45 text-[0.94em]">
                    <span className="font-bold text-slate-900">{edu.school}</span>
                    {edu.board && <span className="text-[0.88em] text-slate-500 ml-1">({edu.board})</span>}
                    <span className="text-slate-600"> — {edu.degree}{edu.field ? ` in ${edu.field}` : ''}</span>
                    {edu.score && <span className="text-[0.88em] font-bold ml-2" style={{ color: primaryColor }}>Score: {edu.score}</span>}
                  </div>
                  <span className="text-[0.85em] font-semibold text-slate-500 shrink-0">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div className="space-y-0.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-b pb-0.5 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}40` }}>
              Technical Skills
            </h2>
            <p className="text-[0.92em] leading-snug text-slate-700">{skills.join(', ')}</p>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="space-y-0.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-b pb-0.5 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}40` }}>
              Certifications
            </h2>
            <p className="text-[0.92em] leading-snug text-slate-700">{certifications.join(' • ')}</p>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-b pb-0.5 mb-1" style={{ color: primaryColor, borderColor: `${primaryColor}40` }}>
              Projects {projects.length > 0 && <span className="text-[0.85em] font-normal lowercase opacity-75">({projects.length} builds)</span>}
            </h2>
            {isProjectGrid ? (
              renderProjectGrid('classic')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="project-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-1.5">
                      <h3 className="font-bold text-[1em] flex-1 min-w-45 text-slate-900">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.86em] font-semibold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.92em] leading-snug text-slate-700">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc ml-4 space-y-0.5 mt-0.5 text-slate-600">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-[0.9em] leading-snug">{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <p className="text-[0.84em] text-slate-500 font-semibold mt-0.5">
                        <span className="text-slate-400">Tech Stack:</span> {project.technologies.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 2. MODERN PROFESSIONAL TEMPLATE (Dark Sidebar + Clean Main)
  // ==========================================
  const renderModern = () => (
    <div
      className={cn('resume-flex-shell flex flex-row bg-white text-slate-900 w-full items-stretch wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, boxSizing: 'border-box', minHeight: '100%' }}
    >
      {/* Left Sidebar */}
      <div
        className="w-[33%] bg-slate-900 text-white shrink-0 flex flex-col justify-between"
        style={{ padding: sidebarPadding, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className={spacingGapClass}>
          <div className="space-y-2">
            <h1 className="text-[1.85em] font-black leading-tight tracking-tight text-white">{personalInfo.fullName}</h1>
            {personalInfo.jobTitle && (
              <p className="text-[0.85em] font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
            )}
            <div className="pt-1">
              {renderContactStack({ isDark: true, showEmoji: true })}
            </div>
            {renderIndianDetails(true)}
          </div>

          {skills.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.85em] font-bold uppercase tracking-widest border-b border-slate-700 pb-1" style={{ color: primaryColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span key={i} className="bg-slate-800 text-slate-200 px-2 py-0.5 rounded text-[0.8em] font-medium border border-slate-700">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.85em] font-bold uppercase tracking-widest border-b border-slate-700 pb-1" style={{ color: primaryColor }}>Certifications</h2>
              <ul className="space-y-1 text-[0.84em] text-slate-300">
                {certifications.map((cert, i) => (
                  <li key={i} className="flex items-start gap-1.5 leading-snug">
                    <span className="text-slate-500 shrink-0">•</span>
                    <span>{cert}</span>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </div>

      {/* Main Content */}
      <div className={cn('flex-1 min-w-0', spacingGapClass)} style={{ padding: pagePadding }}>
        {summary && (
          <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[1.05em] font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-0.5 inline-block" style={{ borderColor: primaryColor }}>
              Professional Summary
            </h2>
            <p className="text-[0.94em] leading-relaxed text-slate-700">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[1.05em] font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-0.5 inline-block" style={{ borderColor: primaryColor }}>
              Experience
            </h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="experience-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-start gap-1.5">
                    <div className="flex-1 min-w-40">
                      <h3 className="font-bold text-[1.02em] text-slate-900">{exp.position}</h3>
                      <p className="text-[0.94em] font-semibold" style={{ color: primaryColor }}>{exp.company}</p>
                    </div>
                    <p className="text-[0.82em] font-bold text-slate-500 uppercase tracking-wider shrink-0">
                      {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                    </p>
                  </div>
                  <ul className="list-disc list-outside ml-4 space-y-0.5 mt-0.5">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.92em] text-slate-600 leading-snug">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {education.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[1.05em] font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-0.5 inline-block" style={{ borderColor: primaryColor }}>
              Education
            </h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-start gap-1.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-40">
                    <h3 className="font-bold text-[0.98em] text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-[0.92em] text-slate-600">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    {edu.score && <p className="text-[0.84em] font-bold mt-0.5" style={{ color: primaryColor }}>Score: {edu.score}</p>}
                  </div>
                  <p className="text-[0.82em] font-bold text-slate-500 uppercase tracking-wider shrink-0">{edu.graduationDate}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[1.05em] font-bold uppercase tracking-wider text-slate-900 border-b-2 pb-0.5 inline-block" style={{ borderColor: primaryColor }}>
              Projects
            </h2>
            {isProjectGrid ? (
              renderProjectGrid('modern')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="project-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-start gap-1.5">
                      <h3 className="font-bold text-[1em] text-slate-900 flex-1 min-w-40">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.85em] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.92em] text-slate-600 leading-snug">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc list-outside ml-4 space-y-0.5 mt-0.5">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-[0.9em] text-slate-600 leading-snug">{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1 mt-1">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="text-[0.76em] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 3. MINIMALIST CLEAN TEMPLATE (100% ATS STANDARD)
  // ==========================================
  const renderMinimalist = () => (
    <div
      className={cn('bg-white text-slate-800 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div
        className={cn('border-b-2 border-slate-800', isCompactMode ? 'pb-2.5 mb-3' : 'pb-4 mb-4')}
        style={{ breakInside: 'avoid' }}
      >
        <h1 className="text-[2em] font-bold tracking-tight text-slate-900 leading-tight">{personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <p className="text-[1em] font-medium text-slate-500 mt-0.5">{personalInfo.jobTitle}</p>
        )}
        <div className="mt-1.5">
          {renderContactInline({ centered: false, separator: '|' })}
        </div>
        {renderIndianDetails()}
      </div>

      <div className={spacingGapClass}>
        {summary && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-0.5 mb-1.5" style={{ color: primaryColor }}>Summary</h2>
            <p className="text-[0.94em] leading-relaxed text-slate-700">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div>
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-0.5 mb-2" style={{ color: primaryColor }}>Experience</h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="experience-item" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="font-bold text-slate-900 text-[0.98em]">{exp.position}</h3>
                    <span className="text-[0.82em] font-medium text-slate-400 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="text-[0.9em] font-semibold mb-1" style={{ color: primaryColor }}>{exp.company}</p>
                  <ul className="list-disc ml-4 space-y-0.5">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.92em] text-slate-600 leading-snug">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div>
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-0.5 mb-2" style={{ color: primaryColor }}>Projects</h2>
            {isProjectGrid ? (
              renderProjectGrid('minimalist')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="project-item" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2">
                      <h3 className="font-bold text-slate-900 text-[0.98em]">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.84em] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.92em] text-slate-600 leading-snug mt-0.5">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc ml-4 space-y-0.5 mt-0.5">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-[0.9em] text-slate-500 leading-snug">{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <p className="text-[0.8em] text-slate-400 font-semibold mt-0.5">
                        Tools: {project.technologies.join(', ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {education.length > 0 && (
          <div>
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-0.5 mb-1.5" style={{ color: primaryColor }}>Education</h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-baseline gap-2" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-45">
                    <span className="font-bold text-[0.96em] text-slate-900">{edu.school}</span>
                    {edu.board && <span className="text-[0.84em] text-slate-400 ml-1">({edu.board})</span>}
                    <p className="text-[0.9em] text-slate-600">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    {edu.score && <p className="text-[0.84em] font-bold" style={{ color: primaryColor }}>Score: {edu.score}</p>}
                  </div>
                  <span className="text-[0.84em] font-medium text-slate-400 shrink-0">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {skills.length > 0 && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-0.5 mb-1" style={{ color: primaryColor }}>Skills</h2>
            <p className="text-[0.92em] leading-relaxed text-slate-700">{skills.join(' • ')}</p>
          </div>
        )}

        {certifications.length > 0 && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.18em] border-b border-slate-200 pb-0.5 mb-1" style={{ color: primaryColor }}>Certifications</h2>
            <p className="text-[0.92em] leading-relaxed text-slate-700">{certifications.join(' • ')}</p>
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 4. HARVARD / IVY LEAGUE ATS (100% ATS STANDARD — NEW!)
  // ==========================================
  const renderHarvardIvy = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div className="text-center pb-2.5 mb-3 border-b border-slate-900" style={{ breakInside: 'avoid' }}>
        <h1 className="text-[2em] font-bold tracking-tight text-slate-950">{personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <p className="text-[0.92em] font-semibold uppercase tracking-widest mt-0.5" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
        )}
        <div className="mt-1">
          {renderContactInline({ centered: true, separator: '|', accentAllLinks: false })}
        </div>
        {renderIndianDetails()}
      </div>

      <div className={spacingGapClass}>
        {summary && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Executive Profile
            </h2>
            <p className="text-[0.93em] leading-snug text-slate-800">{summary}</p>
          </div>
        )}

        {education.length > 0 && (
          <div>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>
              Education
            </h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-baseline gap-2" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-50">
                    <div className="text-[0.98em]">
                      <span className="font-bold text-slate-950">{edu.school}</span>
                      {edu.board && <span className="text-slate-500 text-[0.88em] ml-1">({edu.board})</span>}
                    </div>
                    <p className="text-[0.92em] italic text-slate-700">
                      {edu.degree}{edu.field ? `, ${edu.field}` : ''}{edu.score ? ` — ${edu.score}` : ''}
                    </p>
                  </div>
                  <span className="text-[0.88em] font-semibold text-slate-700 shrink-0">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {experience.length > 0 && (
          <div>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>
              Professional Experience
            </h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="experience-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <span className="font-bold text-[1em] text-slate-950">{exp.company}</span>
                    <span className="text-[0.88em] font-semibold text-slate-700 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="text-[0.92em] font-semibold italic" style={{ color: primaryColor }}>{exp.position}</p>
                  <ul className="list-disc ml-4 space-y-0.5 text-slate-800">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.92em] leading-snug">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>
              Key Projects & Publications
            </h2>
            {isProjectGrid ? (
              renderProjectGrid('ivy')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="project-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2">
                      <span className="font-bold text-[0.96em] text-slate-950">{project.name}</span>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.84em] font-semibold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.92em] leading-snug text-slate-700">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc ml-4 space-y-0.5 text-slate-800">
                        {project.keyFeatures.map((feat, i) => (
                          <li key={i} className="text-[0.9em] leading-snug">{feat}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <p className="text-[0.84em] italic text-slate-600">Technologies: {project.technologies.join(', ')}</p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {skills.length > 0 && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Skills & Competencies
            </h2>
            <p className="text-[0.92em] leading-snug text-slate-800">{skills.join(' • ')}</p>
          </div>
        )}

        {certifications.length > 0 && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-900 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Certifications & Awards
            </h2>
            <p className="text-[0.92em] leading-snug text-slate-800">{certifications.join(' • ')}</p>
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 5. JAKE SWE PRO 100% ATS TEMPLATE (NEW!)
  // ==========================================
  const renderJakeClean = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div className="text-center mb-3" style={{ breakInside: 'avoid' }}>
        <h1 className="text-[2.1em] font-extrabold tracking-tight text-slate-950">{personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <p className="text-[0.9em] font-bold uppercase tracking-[0.18em] mt-0.5" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
        )}
        <div className="mt-1">
          {renderContactInline({ centered: true, separator: '|' })}
        </div>
        {renderIndianDetails()}
      </div>

      <div className={spacingGapClass}>
        {summary && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Summary
            </h2>
            <p className="text-[0.92em] leading-snug text-slate-700">{summary}</p>
          </div>
        )}

        {education.length > 0 && (
          <div>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Education
            </h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="flex flex-wrap justify-between items-baseline gap-2" style={{ breakInside: 'avoid' }}>
                  <div className="flex-1 min-w-50">
                    <p className="font-bold text-[0.96em] text-slate-900">
                      {edu.school}{edu.board ? ` (${edu.board})` : ''}
                    </p>
                    <p className="text-[0.9em] italic text-slate-600">
                      {edu.degree}{edu.field ? ` in ${edu.field}` : ''}{edu.score ? ` • ${edu.score}` : ''}
                    </p>
                  </div>
                  <span className="text-[0.86em] font-semibold text-slate-600 shrink-0">{edu.graduationDate}</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {experience.length > 0 && (
          <div>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Experience
            </h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="experience-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="font-bold text-[0.98em] text-slate-900">
                      {exp.position} <span className="font-normal text-slate-500">—</span> <span style={{ color: primaryColor }}>{exp.company}</span>
                    </h3>
                    <span className="text-[0.86em] font-semibold text-slate-600 shrink-0">{exp.startDate} – {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <ul className="list-disc ml-4 space-y-0.5 text-slate-700">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.91em] leading-snug">{bullet}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>
              Projects
            </h2>
            {isProjectGrid ? (
              renderProjectGrid('classic')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="project-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2">
                      <div className="flex flex-wrap items-baseline gap-1.5 flex-1 min-w-45">
                        <h3 className="font-bold text-[0.96em] text-slate-900">{project.name}</h3>
                        {project.technologies && project.technologies.length > 0 && (
                          <span className="text-[0.84em] italic text-slate-500">
                            | {project.technologies.join(', ')}
                          </span>
                        )}
                      </div>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.84em] font-semibold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.91em] leading-snug text-slate-700">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc ml-4 space-y-0.5 text-slate-700">
                        {project.keyFeatures.map((feat, i) => (
                          <li key={i} className="text-[0.9em] leading-snug">{feat}</li>
                        ))}
                      </ul>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {skills.length > 0 && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Technical Skills
            </h2>
            <p className="text-[0.91em] leading-snug text-slate-800">
              <span className="font-bold">Core Stack: </span>{skills.join(', ')}
            </p>
          </div>
        )}

        {certifications.length > 0 && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.92em] font-bold uppercase tracking-wider border-b border-slate-800 pb-0.5 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>
              Certifications
            </h2>
            <p className="text-[0.91em] leading-snug text-slate-800">{certifications.join(' • ')}</p>
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 6. STUDENT / ENTRY-LEVEL TEMPLATE
  // ==========================================
  const renderStudent = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div className={cn('flex flex-wrap justify-between items-start border-b-4 gap-3', isCompactMode ? 'pb-2.5 mb-3' : 'pb-4 mb-4')} style={{ borderColor: primaryColor, breakInside: 'avoid' }}>
        <div className="space-y-0.5 flex-1 min-w-50">
          <h1 className="text-[2.1em] font-black text-slate-900 tracking-tight leading-tight">{personalInfo.fullName}</h1>
          {personalInfo.jobTitle && (
            <p className="font-bold tracking-widest uppercase text-[0.88em]" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {renderContactStack({ isDark: false, colorAccent: true, showEmoji: true })}
        </div>
      </div>
      {renderIndianDetails()}

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', gap: isCompactMode ? '18px' : '26px', marginTop: isCompactMode ? '10px' : '16px', boxSizing: 'border-box', width: '100%' }}>
        {/* Main Student Column (Education FIRST) */}
        <div style={{ flex: '1 1 0', minWidth: 0 }} className={spacingGapClass}>
          {education.length > 0 && (
            <div>
              <h2 className="text-[0.88em] font-black uppercase tracking-widest flex items-center gap-2 mb-1.5" style={{ color: primaryColor }}>
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: primaryColor }} />
                Education
              </h2>
              <div className={itemSpacingClass}>
                {education.map((edu) => (
                  <div key={edu.id} className="space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-bold text-[1em] text-slate-900">{edu.school}</h3>
                    <p className="text-[0.94em] text-slate-700">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    {edu.board && <p className="text-[0.84em] text-slate-500 font-medium">{edu.board}</p>}
                    <div className="flex justify-between items-center text-[0.84em] pt-0.5">
                      <p className="font-bold text-slate-400">{edu.graduationDate}</p>
                      {edu.score && <p className="font-bold" style={{ color: primaryColor }}>Score: {edu.score}</p>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <h2 className="text-[0.88em] font-black uppercase tracking-widest flex items-center gap-2 mb-1.5" style={{ color: primaryColor }}>
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: primaryColor }} />
                Projects & Builds
              </h2>
              {isProjectGrid ? (
                renderProjectGrid('classic')
              ) : (
                <div className={itemSpacingClass}>
                  {projects.map((project) => (
                    <div key={project.id} className="project-item space-y-1" style={{ breakInside: 'avoid' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2">
                        <h3 className="font-bold text-[0.98em] text-slate-900 flex-1 min-w-37.5">{project.name}</h3>
                        {project.link && (
                          <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.84em] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                            {displayUrl(project.link)} ↗
                          </a>
                        )}
                      </div>
                      {project.description && <p className="text-slate-600 leading-snug text-[0.9em]">{project.description}</p>}
                      {project.keyFeatures && project.keyFeatures.length > 0 && (
                        <ul className="list-disc list-inside text-slate-600 space-y-0.5 ml-1 text-[0.88em]">
                          {project.keyFeatures.map((feature, i) => (
                            <li key={i} className="leading-snug">{feature}</li>
                          ))}
                        </ul>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 pt-0.5">
                          {project.technologies.map((tech, i) => (
                            <span key={i} className="text-[0.76em] font-bold bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 border border-slate-200">{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {experience.length > 0 && (
            <div>
              <h2 className="text-[0.88em] font-black uppercase tracking-widest flex items-center gap-2 mb-1.5" style={{ color: primaryColor }}>
                <span className="w-2 h-2 rounded-full inline-block shrink-0" style={{ backgroundColor: primaryColor }} />
                Experience / Internships
              </h2>
              <div className={itemSpacingClass}>
                {experience.map((exp) => (
                  <div key={exp.id} className="experience-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2">
                      <h3 className="font-bold text-[0.98em] text-slate-900 flex-1 min-w-40">{exp.position} @ {exp.company}</h3>
                      <span className="text-[0.8em] font-bold text-slate-400 uppercase shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <ul className="list-disc ml-4 space-y-0.5 text-[0.9em]">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-slate-600 leading-snug">{bullet}</li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Student Sidebar */}
        <div style={{ width: '175px', flexShrink: 0 }} className={spacingGapClass}>
          {summary && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-widest" style={{ color: primaryColor }}>Objective</h2>
              <p className="leading-snug text-[0.9em] text-slate-600 italic">"{summary}"</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-widest" style={{ color: primaryColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded-md text-[0.78em] font-bold border" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-widest" style={{ color: primaryColor }}>Certifications</h2>
              <div className="flex flex-col gap-1">
                {certifications.map((cert, i) => (
                  <span key={i} className="text-[0.86em] font-semibold text-slate-700 border-l-2 pl-2 leading-snug" style={{ borderColor: primaryColor }}>{cert}</span>
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
  // 7. CREATIVE VIBRANT TEMPLATE
  // ==========================================
  const renderCreative = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, boxSizing: 'border-box' }}
    >
      <div
        className="text-white relative shrink-0"
        style={{ backgroundColor: primaryColor, padding: `${marginDims.y}px ${marginDims.x}px`, overflow: 'hidden', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className="absolute top-0 right-0 w-56 h-56 rounded-full -mr-28 -mt-28" style={{ backgroundColor: 'rgba(255, 255, 255, 0.12)' }} />
        <div className="absolute bottom-0 left-0 w-44 h-44 rounded-full -ml-20 -mb-20" style={{ backgroundColor: 'rgba(0, 0, 0, 0.12)' }} />
        <div className="relative z-10">
          <div className="flex flex-wrap justify-between items-end gap-4">
            <div className="space-y-0.5 flex-1 min-w-50">
              <h1 className="text-[2.1em] font-black tracking-tight leading-tight">{personalInfo.fullName}</h1>
              {personalInfo.jobTitle && (
                <p className="font-bold uppercase tracking-[0.2em] text-[0.88em] opacity-90">{personalInfo.jobTitle}</p>
              )}
            </div>
            <div className="text-right text-[0.85em] space-y-0.5 opacity-95 shrink-0 font-medium">
              {personalInfo.email && <a href={`mailto:${personalInfo.email}`} className="block break-all hover:underline">✉️ {personalInfo.email}</a>}
              {personalInfo.phone && <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="block break-all hover:underline">📱 {personalInfo.phone}</a>}
              {personalInfo.location && <p className="wrap-break-word">📍 {personalInfo.location}</p>}
              {personalInfo.linkedin && (
                <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="block break-all hover:underline font-bold">🔗 {displayUrl(personalInfo.linkedin)}</a>
              )}
              {personalInfo.github && (
                <a href={normalizeUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer" className="block break-all hover:underline font-bold">💻 {displayUrl(personalInfo.github)}</a>
              )}
              {personalInfo.website && (
                <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="block break-all hover:underline font-bold">🌐 {displayUrl(personalInfo.website)}</a>
              )}
            </div>
          </div>
          {renderIndianDetails(true)}
        </div>
      </div>

      {/* Creative Body */}
      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box', padding: pagePadding, gap: `${Math.max(16, Math.round(marginDims.x * 0.8))}px` }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }} className={spacingGapClass}>
          {summary && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[1.05em] font-black border-b-2 pb-0.5" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>About Me</h2>
              <p className="text-slate-700 leading-relaxed font-medium italic text-[0.94em]">"{summary}"</p>
            </div>
          )}

          {experience.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[1.05em] font-black border-b-2 pb-0.5" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Experience</h2>
              <div className={itemSpacingClass}>
                {experience.map(exp => (
                  <div key={exp.id} className="experience-item relative pl-3.5 border-l-2 space-y-0.5" style={{ borderColor: `${primaryColor}30`, breakInside: 'avoid' }}>
                    <div className="absolute -left-1.25 top-1.5 w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="flex flex-wrap justify-between items-baseline">
                      <h3 className="font-bold text-[1em] text-slate-900">{exp.position}</h3>
                      <span className="text-[0.82em] font-bold text-slate-400">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <p className="font-bold text-[0.88em] mb-1" style={{ color: primaryColor }}>{exp.company}</p>
                    <ul className="space-y-0.5">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-[0.9em] text-slate-600 leading-snug flex gap-1.5">
                          <span className="mt-1.5 w-1.5 h-1.5 rounded-full shrink-0" style={{ backgroundColor: primaryColor }} />
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div className="space-y-2">
              <h2 className="text-[1.05em] font-black border-b-2 pb-0.5" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Projects</h2>
              {isProjectGrid ? (
                renderProjectGrid('creative')
              ) : (
                <div className={itemSpacingClass}>
                  {projects.map(project => (
                    <div key={project.id} className="project-item bg-slate-50 p-3 rounded-xl border border-slate-100" style={{ breakInside: 'avoid' }}>
                      <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                        <h3 className="font-bold text-[0.98em] text-slate-900">{project.name}</h3>
                        {project.link && (
                          <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.84em] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                            {displayUrl(project.link)} ↗
                          </a>
                        )}
                      </div>
                      {project.description && <p className="text-[0.9em] text-slate-600 mb-1.5 leading-snug">{project.description}</p>}
                      {project.keyFeatures && project.keyFeatures.length > 0 && (
                        <ul className="list-disc list-inside text-[0.88em] text-slate-600 space-y-0.5 mb-1.5">
                          {project.keyFeatures.map((feature, i) => (
                            <li key={i} className="leading-snug">{feature}</li>
                          ))}
                        </ul>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1">
                          {project.technologies.map((tech, i) => (
                            <span key={i} className="text-[0.76em] font-bold bg-white px-2 py-0.5 rounded border" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>

        {/* Sidebar */}
        <div style={{ width: '190px', flexShrink: 0 }} className={spacingGapClass}>
          {skills.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-wider border-b-2 pb-0.5" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Skills</h2>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span key={i} className="text-white px-2 py-0.5 rounded-md text-[0.78em] font-bold shadow-sm" style={{ backgroundColor: primaryColor }}>{skill}</span>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-wider border-b-2 pb-0.5" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Education</h2>
              <div className="space-y-2">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-bold text-[0.9em] text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-[0.84em] text-slate-600">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center text-[0.78em]">
                      <span className="font-bold text-slate-400">{edu.graduationDate}</span>
                      {edu.score && <span className="font-bold" style={{ color: primaryColor }}>{edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-wider border-b-2 pb-0.5" style={{ color: primaryColor, borderColor: `${primaryColor}30` }}>Certifications</h2>
              <div className="flex flex-col gap-1">
                {certifications.map((cert, i) => (
                  <span key={i} className="text-slate-700 text-[0.86em] font-semibold border-l-2 pl-2 leading-snug" style={{ borderColor: primaryColor }}>{cert}</span>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {content.declaration && (
        <div style={{ padding: `0 ${marginDims.x}px ${marginDims.y}px` }}>
          {renderDeclaration()}
        </div>
      )}
    </div>
  );

  // ==========================================
  // 8. EXECUTIVE MINIMAL TEMPLATE
  // ==========================================
  const renderExecutive = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div className={cn('flex flex-wrap justify-between items-start border-b-2 border-slate-900 gap-4', isCompactMode ? 'pb-3 mb-3' : 'pb-4 mb-5')} style={{ breakInside: 'avoid' }}>
        <div className="space-y-0.5 flex-1 min-w-50">
          <h1 className="text-[2em] font-light tracking-tight">{personalInfo.fullName}</h1>
          {personalInfo.jobTitle && (
            <p className="font-bold uppercase tracking-widest text-[0.88em]" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
          )}
        </div>
        <div className="text-right shrink-0">
          {renderContactStack({ isDark: false, colorAccent: true, showEmoji: false })}
        </div>
        {renderIndianDetails()}
      </div>

      <div className={spacingGapClass}>
        {summary && (
          <div style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-l-4 pl-2 mb-1" style={{ color: primaryColor, borderColor: primaryColor }}>Executive Summary</h2>
            <p className="text-[0.98em] leading-relaxed font-light italic text-slate-700">"{summary}"</p>
          </div>
        )}

        {experience.length > 0 && (
          <div>
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-l-4 pl-2 mb-2" style={{ color: primaryColor, borderColor: primaryColor }}>Professional Experience</h2>
            <div className={itemSpacingClass}>
              {experience.map(exp => (
                <div key={exp.id} className="experience-item" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="text-[1.04em] font-bold flex-1 min-w-45 text-slate-900">{exp.position}</h3>
                    <span className="text-[0.85em] font-bold text-slate-400 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="font-bold uppercase tracking-wider text-[0.86em] mb-1" style={{ color: primaryColor }}>{exp.company}</p>
                  <ul className="space-y-0.5">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.92em] text-slate-700 leading-snug flex gap-1.5">
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
          <div>
            <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-l-4 pl-2 mb-2" style={{ color: primaryColor, borderColor: primaryColor }}>Projects & Initiatives</h2>
            {isProjectGrid ? (
              renderProjectGrid('executive')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map(project => (
                  <div key={project.id} className="project-item" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-baseline gap-2">
                      <h3 className="text-[1em] font-bold flex-1 min-w-45 text-slate-900">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.86em] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.92em] text-slate-700 leading-snug mt-0.5">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="space-y-0.5 mt-1">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i} className="text-[0.9em] text-slate-600 leading-snug flex gap-1.5">
                            <span className="font-bold shrink-0" style={{ color: primaryColor }}>•</span>{feature}
                          </li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <p className="text-[0.8em] text-slate-400 font-bold uppercase tracking-wider mt-0.5">
                        Stack: {project.technologies.join(' • ')}
                      </p>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '20px', width: '100%' }}>
          {skills.length > 0 && (
            <div style={{ flex: '1 1 180px' }} className="min-w-0">
              <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-l-4 pl-2 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>Expertise</h2>
              <div className="grid grid-cols-2 gap-x-3 gap-y-0.5">
                {skills.map((skill, i) => (
                  <div key={i} className="flex items-center gap-1.5 text-[0.88em] text-slate-700">
                    <span className="w-1.5 h-1.5 rounded-full shrink-0 inline-block" style={{ backgroundColor: primaryColor }} />
                    <span>{skill}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div style={{ flex: '1 1 180px' }} className="min-w-0">
              <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-l-4 pl-2 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>Education</h2>
              <div className="space-y-1.5">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-bold text-[0.92em] text-slate-900">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-[0.86em] text-slate-600">{edu.school}{edu.board ? ` | ${edu.board}` : ''}</p>
                    <div className="flex justify-between items-center text-[0.8em]">
                      <span className="font-bold text-slate-400">{edu.graduationDate}</span>
                      {edu.score && <span className="font-bold" style={{ color: primaryColor }}>{edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div style={{ flex: '1 1 150px' }} className="min-w-0">
              <h2 className="text-[0.88em] font-bold uppercase tracking-widest border-l-4 pl-2 mb-1.5" style={{ color: primaryColor, borderColor: primaryColor }}>Certifications</h2>
              <div className="space-y-0.5">
                {certifications.map((cert, i) => (
                  <div key={i} className="text-[0.88em] text-slate-700 flex gap-1.5 leading-snug">
                    <span className="shrink-0 font-bold" style={{ color: primaryColor }}>•</span>{cert}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 9. TECH FOCUSED TEMPLATE
  // ==========================================
  const renderTech = () => (
    <div
      className={cn('bg-slate-50 text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, padding: pagePadding, boxSizing: 'border-box' }}
    >
      <div className={cn('bg-slate-900 rounded-2xl', isCompactMode ? 'p-4' : 'p-6')} style={{ color: primaryColor, breakInside: 'avoid', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}>
        <h1 className="text-[1.85em] font-bold mb-0.5">&gt; {personalInfo.fullName}</h1>
        {personalInfo.jobTitle && (
          <h2 className="text-[1.05em] opacity-85 mb-2">&gt; {personalInfo.jobTitle}</h2>
        )}
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-[0.86em] opacity-95 text-white mt-2">
          {personalInfo.email && (
            <p className="break-all">
              EMAIL:{' '}
              <a href={`mailto:${personalInfo.email}`} className="hover:underline font-bold" style={{ color: primaryColor }}>{personalInfo.email}</a>
            </p>
          )}
          {personalInfo.phone && (
            <p className="break-all">
              PHONE:{' '}
              <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="hover:underline">{personalInfo.phone}</a>
            </p>
          )}
          {personalInfo.location && <p className="wrap-break-word">LOC: {personalInfo.location}</p>}
          {personalInfo.linkedin && (
            <p className="break-all">
              LINKEDIN:{' '}
              <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: primaryColor }}>{displayUrl(personalInfo.linkedin)}</a>
            </p>
          )}
          {personalInfo.github && (
            <p className="break-all">
              GITHUB:{' '}
              <a href={normalizeUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: primaryColor }}>{displayUrl(personalInfo.github)}</a>
            </p>
          )}
          {personalInfo.website && (
            <p className="break-all">
              WEB:{' '}
              <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="hover:underline font-bold" style={{ color: primaryColor }}>{displayUrl(personalInfo.website)}</a>
            </p>
          )}
        </div>
        {renderIndianDetails(true)}
      </div>

      <div className={cn(spacingGapClass, isCompactMode ? 'mt-3' : 'mt-5')}>
        {summary && (
          <div className="space-y-1" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-0.5">System.Summary</h2>
            <p className="leading-snug text-slate-700 text-[0.92em]">{summary}</p>
          </div>
        )}

        {skills.length > 0 && (
          <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-0.5">System.Skills</h2>
            <div className="flex flex-wrap gap-1">
              {skills.map((skill, i) => (
                <span key={i} className="px-2 py-0.5 rounded text-[0.82em] font-bold border" style={{ backgroundColor: `${primaryColor}15`, color: primaryColor, borderColor: `${primaryColor}30` }}>{skill}</span>
              ))}
            </div>
          </div>
        )}

        {certifications.length > 0 && (
          <div className="space-y-1" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.88em] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-0.5">System.Certifications</h2>
            <div className="flex flex-col gap-0.5 text-[0.9em] text-slate-700">
              {certifications.map((cert, i) => (
                <div key={i}>&gt; {cert}</div>
              ))}
            </div>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[0.88em] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-0.5">System.Experience</h2>
            <div className={itemSpacingClass}>
              {experience.map((exp) => (
                <div key={exp.id} className="experience-item space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline gap-2">
                    <h3 className="font-bold text-slate-900 text-[0.98em] flex-1 min-w-45">[{exp.position}]</h3>
                    <span className="text-[0.82em] font-bold text-slate-400 shrink-0">{exp.startDate} - {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="font-bold text-[0.9em]" style={{ color: primaryColor }}>@ {exp.company}</p>
                  <ul className="space-y-0.5">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.9em] text-slate-600 leading-snug flex gap-1.5">
                        <span style={{ color: primaryColor }}>#</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[0.88em] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-0.5">System.Projects</h2>
            {isProjectGrid ? (
              renderProjectGrid('tech')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map((project) => (
                  <div key={project.id} className="project-item border border-slate-200 p-3 rounded-xl bg-white" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap items-center justify-between gap-2 mb-0.5">
                      <h3 className="font-bold text-slate-900 text-[0.96em]">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.84em] hover:underline font-bold" style={{ color: primaryColor }}>
                          [{displayUrl(project.link)} ↗]
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.9em] text-slate-600 mb-1 leading-snug">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc list-inside text-[0.88em] text-slate-600 space-y-0.5 mb-1.5">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i}>{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="text-[0.76em] bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {education.length > 0 && (
          <div className="space-y-1.5">
            <h2 className="text-[0.88em] font-bold text-slate-500 uppercase tracking-widest border-b border-slate-200 pb-0.5">System.Education</h2>
            <div className={itemSpacingClass}>
              {education.map((edu) => (
                <div key={edu.id} className="space-y-0.5" style={{ breakInside: 'avoid' }}>
                  <h3 className="font-bold text-slate-900 text-[0.96em]">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                  <p className="text-[0.9em] text-slate-600">{edu.school}{edu.board ? ` | ${edu.board}` : ''}</p>
                  <div className="flex justify-between items-center text-[0.82em]">
                    <p className="font-bold text-slate-400">{edu.graduationDate}</p>
                    {edu.score && <p className="font-bold" style={{ color: primaryColor }}>SCORE: {edu.score}</p>}
                  </div>
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
  // 10. MODERN CREATIVE STORY TEMPLATE
  // ==========================================
  const renderModernCreative = () => (
    <div
      className={cn('bg-slate-50 text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, boxSizing: 'border-box' }}
    >
      <div
        className="text-white relative shrink-0"
        style={{ backgroundColor: primaryColor, padding: `${marginDims.y}px ${marginDims.x}px`, overflow: 'hidden', WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className="absolute top-0 right-0 w-80 h-80 rounded-full -mr-40 -mt-40" style={{ backgroundColor: 'rgba(255,255,255,0.12)' }} />
        <div className="absolute bottom-0 left-0 w-56 h-56 rounded-full -ml-28 -mb-28" style={{ backgroundColor: 'rgba(0,0,0,0.12)' }} />
        <div className="relative z-10 flex flex-wrap justify-between items-center gap-4">
          <div className="space-y-0.5 flex-1 min-w-50">
            <h1 className="text-[2.15em] font-black tracking-tight leading-tight">{personalInfo.fullName}</h1>
            {personalInfo.jobTitle && <p className="font-black uppercase tracking-[0.2em] text-[0.86em] opacity-90">{personalInfo.jobTitle}</p>}
          </div>
          <div
            className="flex flex-col gap-0.5 text-[0.84em] font-semibold p-2.5 rounded-xl border"
            style={{ backgroundColor: 'rgba(0,0,0,0.22)', borderColor: 'rgba(255,255,255,0.2)', color: 'rgba(255,255,255,0.95)' }}
          >
            {personalInfo.email && <a href={`mailto:${personalInfo.email}`} className="break-all hover:underline">✉️ {personalInfo.email}</a>}
            {personalInfo.phone && <a href={`tel:${personalInfo.phone.replace(/[\s()-]/g, '')}`} className="break-all hover:underline">📱 {personalInfo.phone}</a>}
            {personalInfo.location && <p className="wrap-break-word">📍 {personalInfo.location}</p>}
            {personalInfo.linkedin && <a href={normalizeUrl(personalInfo.linkedin)} target="_blank" rel="noopener noreferrer" className="break-all hover:underline font-bold">🔗 {displayUrl(personalInfo.linkedin)}</a>}
            {personalInfo.github && <a href={normalizeUrl(personalInfo.github)} target="_blank" rel="noopener noreferrer" className="break-all hover:underline font-bold">💻 {displayUrl(personalInfo.github)}</a>}
            {personalInfo.website && <a href={normalizeUrl(personalInfo.website)} target="_blank" rel="noopener noreferrer" className="break-all hover:underline font-bold">🌐 {displayUrl(personalInfo.website)}</a>}
          </div>
        </div>
        {renderIndianDetails(true)}
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box', padding: pagePadding, gap: `${Math.max(16, Math.round(marginDims.x * 0.8))}px` }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }} className={spacingGapClass}>
          {summary && (
            <div style={{ breakInside: 'avoid' }}>
              <div className="flex items-center gap-2 mb-1">
                <h2 className="text-[1em] font-black text-slate-900 uppercase tracking-tight">Professional Story</h2>
                <div className="flex-1 h-0.5 rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
              </div>
              <p className="text-[0.92em] text-slate-600 leading-snug italic">"{summary}"</p>
            </div>
          )}

          {experience.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[1em] font-black text-slate-900 uppercase tracking-tight">Experience</h2>
                <div className="flex-1 h-0.5 rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
              </div>
              <div className={itemSpacingClass}>
                {experience.map((exp) => (
                  <div key={exp.id} className="experience-item relative pl-3.5 border-l-2" style={{ borderColor: `${primaryColor}40`, breakInside: 'avoid' }}>
                    <div className="absolute -left-1.25 top-1 w-2 h-2 rounded-full" style={{ backgroundColor: primaryColor }} />
                    <div className="flex flex-wrap justify-between items-start gap-2 mb-0.5">
                      <h3 className="font-black text-[0.96em]" style={{ color: primaryColor }}>{exp.position}</h3>
                      <span className="px-2 py-0.5 bg-slate-200/60 rounded-full text-[0.76em] font-black text-slate-600 uppercase tracking-wider shrink-0">
                        {exp.startDate} — {exp.current ? 'Present' : exp.endDate}
                      </span>
                    </div>
                    <p className="text-[0.84em] font-black uppercase tracking-wider text-slate-800 mb-1">{exp.company}</p>
                    <ul className="space-y-0.5">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-[0.9em] text-slate-600 leading-snug flex gap-1.5">
                          <span className="font-bold shrink-0" style={{ color: primaryColor }}>▹</span><span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <div className="flex items-center gap-2 mb-2">
                <h2 className="text-[1em] font-black text-slate-900 uppercase tracking-tight">Featured Projects</h2>
                <div className="flex-1 h-0.5 rounded-full" style={{ background: `linear-gradient(to right, ${primaryColor}, transparent)` }} />
              </div>
              {isProjectGrid ? (
                renderProjectGrid('creative')
              ) : (
                <div className={itemSpacingClass}>
                  {projects.map((project) => (
                    <div key={project.id} className="project-item bg-white p-3 rounded-xl shadow-sm border border-slate-200/80" style={{ breakInside: 'avoid' }}>
                      <div className="flex flex-wrap justify-between items-center gap-2 mb-0.5">
                        <h3 className="font-black text-[0.96em]" style={{ color: primaryColor }}>{project.name}</h3>
                        {project.link && (
                          <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="px-2 py-0.5 bg-slate-900 text-white rounded-full text-[0.76em] font-black uppercase tracking-wider shrink-0">
                            {displayUrl(project.link)} ↗
                          </a>
                        )}
                      </div>
                      {project.description && <p className="text-[0.9em] text-slate-600 leading-snug">{project.description}</p>}
                      {project.keyFeatures && project.keyFeatures.length > 0 && (
                        <ul className="space-y-0.5 mt-1">
                          {project.keyFeatures.map((feature, i) => (
                            <li key={i} className="text-[0.88em] text-slate-500 flex gap-1.5">
                              <span className="font-bold shrink-0" style={{ color: primaryColor }}>▹</span><span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1.5">
                          {project.technologies.map((tech, i) => (
                            <span key={i} className="px-1.5 py-0.5 bg-slate-100 text-slate-600 rounded text-[0.76em] font-bold uppercase border border-slate-200">{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {renderDeclaration()}
        </div>

        <div style={{ width: '190px', flexShrink: 0 }} className={spacingGapClass}>
          {skills.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.9em] font-black text-slate-900 uppercase tracking-tight border-b-2 pb-0.5" style={{ borderColor: primaryColor }}>Skills</h2>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span key={i} className="bg-white text-slate-800 px-2 py-0.5 rounded-md text-[0.8em] font-bold shadow-sm border border-slate-200">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.9em] font-black text-slate-900 uppercase tracking-tight border-b-2 pb-0.5" style={{ borderColor: primaryColor }}>Education</h2>
              <div className="space-y-2">
                {education.map(edu => (
                  <div key={edu.id} className="bg-white p-2.5 rounded-xl shadow-sm border border-slate-200" style={{ breakInside: 'avoid' }}>
                    <h3 className="font-black text-[0.88em] text-slate-900 leading-snug">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</h3>
                    <p className="text-[0.82em] text-slate-500 font-medium">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center mt-1 text-[0.76em]">
                      <span className="font-bold" style={{ color: primaryColor }}>{edu.graduationDate}</span>
                      {edu.score && <span className="font-bold text-slate-600">{edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.9em] font-black text-slate-900 uppercase tracking-tight border-b-2 pb-0.5" style={{ borderColor: primaryColor }}>Certifications</h2>
              <div className="space-y-1">
                {certifications.map((cert, i) => (
                  <div key={i} className="flex items-start gap-1.5 text-[0.84em] font-semibold text-slate-700 leading-snug">
                    <span className="w-1.5 h-1.5 rounded-full mt-1.5 shrink-0 inline-block" style={{ backgroundColor: primaryColor }} />
                    <span>{cert}</span>
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
  // 11. MODERN PHOTO PRO TEMPLATE
  // ==========================================
  const renderModernPhoto = () => (
    <div
      className={cn('resume-flex-shell flex flex-row bg-white text-slate-800 w-full items-stretch wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, boxSizing: 'border-box', minHeight: '100%' }}
    >
      {/* Photo Sidebar */}
      <div
        className="w-[33%] bg-slate-900 text-white flex flex-col gap-4 shrink-0 overflow-visible"
        style={{ padding: sidebarPadding, WebkitPrintColorAdjust: 'exact', printColorAdjust: 'exact' }}
      >
        <div className="flex flex-col items-center text-center gap-2.5">
          <div className={cn('rounded-full border-4 border-white/20 overflow-hidden bg-slate-800 shrink-0', isCompactMode ? 'w-24 h-24' : 'w-32 h-32')}>
            {profilePhoto ? (
              <img src={profilePhoto} alt="Profile" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center bg-slate-700">
                <span className="text-[2.4em] font-bold opacity-40">{personalInfo.fullName ? personalInfo.fullName.charAt(0) : 'U'}</span>
              </div>
            )}
          </div>
          <div className="space-y-0.5">
            <h1 className="text-[1.65em] font-black leading-tight uppercase tracking-tight text-white">{personalInfo.fullName}</h1>
            {personalInfo.jobTitle && (
              <p className="text-[0.84em] font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{personalInfo.jobTitle}</p>
            )}
          </div>
        </div>

        <div className={spacingGapClass}>
          <div className="space-y-2">
            <h2 className="text-[0.82em] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1">Contact</h2>
            {renderContactStack({ isDark: true, colorAccent: true, showEmoji: true })}
            {renderIndianDetails(true)}
          </div>

          {skills.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.82em] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1">Top Expertise</h2>
              <div className="flex flex-wrap gap-1">
                {skills.map((skill, i) => (
                  <span key={i} className="px-2 py-0.5 rounded bg-white/10 text-[0.78em] font-medium text-slate-200">{skill}</span>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-2" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.82em] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1">Education</h2>
              <div className="space-y-1.5">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5">
                    <p className="text-[0.88em] font-bold text-white leading-snug">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    <p className="text-[0.8em] opacity-80">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center text-[0.76em]">
                      <span className="font-bold" style={{ color: primaryColor }}>{edu.graduationDate}</span>
                      {edu.score && <span className="opacity-80">{edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.82em] font-black uppercase tracking-[0.2em] border-b border-white/10 pb-1">Certifications</h2>
              <div className="space-y-1">
                {certifications.map((cert, i) => (
                  <div key={i} className="text-[0.82em] text-slate-300 flex items-start gap-1.5 leading-snug">
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
      <div className={cn('flex-1 min-w-0 wrap-break-word overflow-visible', spacingGapClass)} style={{ padding: pagePadding }}>
        {summary && (
          <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
            <h2 className="text-[0.94em] font-black uppercase tracking-widest border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Profile Summary</h2>
            <p className="text-[0.92em] leading-snug text-slate-600 font-medium">{summary}</p>
          </div>
        )}

        {experience.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[0.94em] font-black uppercase tracking-widest border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Experience</h2>
            <div className={itemSpacingClass}>
              {experience.map(exp => (
                <div key={exp.id} className="experience-item relative pl-3.5 border-l-2 space-y-0.5" style={{ borderColor: `${primaryColor}30`, breakInside: 'avoid' }}>
                  <div className="flex flex-wrap justify-between items-baseline">
                    <h3 className="font-bold text-[1em] text-slate-900">{exp.position}</h3>
                    <span className="text-[0.8em] font-black text-slate-400">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                  </div>
                  <p className="text-[0.86em] font-black uppercase tracking-widest mb-1" style={{ color: primaryColor }}>{exp.company}</p>
                  <ul className="space-y-0.5">
                    {(exp.description || []).map((bullet, i) => (
                      <li key={i} className="text-[0.9em] text-slate-600 leading-snug flex gap-1.5">
                        <span className="text-[0.8em] opacity-50 shrink-0">•</span>
                        <span>{bullet}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
          </div>
        )}

        {projects.length > 0 && (
          <div className="space-y-2">
            <h2 className="text-[0.94em] font-black uppercase tracking-widest border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Key Projects</h2>
            {isProjectGrid ? (
              renderProjectGrid('modern')
            ) : (
              <div className={itemSpacingClass}>
                {projects.map(project => (
                  <div key={project.id} className="project-item bg-slate-50 p-3 rounded-xl border border-slate-200" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-center gap-2 mb-0.5">
                      <h3 className="font-bold text-[0.96em] text-slate-900">{project.name}</h3>
                      {project.link && (
                        <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.82em] font-bold hover:underline shrink-0" style={{ color: primaryColor }}>
                          {displayUrl(project.link)} ↗
                        </a>
                      )}
                    </div>
                    {project.description && <p className="text-[0.9em] text-slate-600 leading-snug mb-1">{project.description}</p>}
                    {project.keyFeatures && project.keyFeatures.length > 0 && (
                      <ul className="list-disc list-inside text-[0.88em] text-slate-600 space-y-0.5 mb-1">
                        {project.keyFeatures.map((feature, i) => (
                          <li key={i}>{feature}</li>
                        ))}
                      </ul>
                    )}
                    {project.technologies && project.technologies.length > 0 && (
                      <div className="flex flex-wrap gap-1">
                        {project.technologies.map((tech, i) => (
                          <span key={i} className="text-[0.76em] font-bold bg-white text-slate-600 px-1.5 py-0.5 rounded border border-slate-200">{tech}</span>
                        ))}
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {renderDeclaration()}
      </div>
    </div>
  );

  // ==========================================
  // 12. EXECUTIVE PRO HEADER TEMPLATE
  // ==========================================
  const renderExecutivePro = () => (
    <div
      className={cn('bg-white text-slate-900 w-full wrap-break-word overflow-visible', fontFamily)}
      style={{ ...fontStyle, boxSizing: 'border-box' }}
    >
      <div
        className="text-center border-b-4"
        style={{ borderColor: primaryColor, padding: `${marginDims.y}px ${marginDims.x}px`, breakInside: 'avoid' }}
      >
        <h1 className="text-[2.1em] font-black tracking-tight uppercase leading-none mb-1.5">{personalInfo.fullName}</h1>
        <div className="h-1 w-16 mx-auto mb-1.5" style={{ backgroundColor: primaryColor }} />
        {personalInfo.jobTitle && (
          <p className="text-[0.95em] font-bold uppercase tracking-[0.22em] text-slate-500 mb-2">{personalInfo.jobTitle}</p>
        )}
        {renderContactInline({ centered: true, separator: '|', showPrefixes: true, accentAllLinks: false })}
        {renderIndianDetails()}
      </div>

      <div style={{ display: 'flex', flexDirection: 'row', alignItems: 'flex-start', width: '100%', boxSizing: 'border-box', padding: pagePadding, gap: `${Math.max(18, Math.round(marginDims.x * 0.8))}px` }}>
        <div style={{ flex: '1 1 0', minWidth: 0 }} className={spacingGapClass}>
          {experience.length > 0 && (
            <div>
              <h2 className="text-[0.9em] font-black uppercase tracking-[0.22em] flex items-center gap-2 mb-2">
                Experience
                <div className="flex-1 h-px bg-slate-200" />
              </h2>
              <div className={itemSpacingClass}>
                {experience.map(exp => (
                  <div key={exp.id} className="experience-item" style={{ breakInside: 'avoid' }}>
                    <div className="flex flex-wrap justify-between items-end gap-2">
                      <div className="space-y-0.5">
                        <h3 className="text-[1em] font-black text-slate-900">{exp.position}</h3>
                        <p className="text-[0.86em] font-bold uppercase tracking-widest" style={{ color: primaryColor }}>{exp.company}</p>
                      </div>
                      <span className="text-[0.8em] font-black text-slate-400 shrink-0">{exp.startDate} — {exp.current ? 'Present' : exp.endDate}</span>
                    </div>
                    <ul className="space-y-0.5 mt-1">
                      {(exp.description || []).map((bullet, i) => (
                        <li key={i} className="text-[0.9em] text-slate-600 leading-snug flex gap-1.5">
                          <span className="font-black shrink-0" style={{ color: primaryColor }}>/</span><span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                ))}
              </div>
            </div>
          )}

          {projects.length > 0 && (
            <div>
              <h2 className="text-[0.9em] font-black uppercase tracking-[0.22em] flex items-center gap-2 mb-2">
                Key Initiatives
                <div className="flex-1 h-px bg-slate-200" />
              </h2>
              {isProjectGrid ? (
                renderProjectGrid('executive')
              ) : (
                <div className={itemSpacingClass}>
                  {projects.map(project => (
                    <div key={project.id} className="project-item" style={{ breakInside: 'avoid' }}>
                      <div className="flex flex-wrap justify-between items-center gap-2">
                        <h3 className="text-[0.96em] font-black text-slate-900">{project.name}</h3>
                        {project.link && (
                          <a href={normalizeUrl(project.link)} target="_blank" rel="noopener noreferrer" className="text-[0.82em] font-black uppercase tracking-wider hover:underline shrink-0" style={{ color: primaryColor }}>
                            {displayUrl(project.link)} ↗
                          </a>
                        )}
                      </div>
                      {project.description && <p className="text-[0.9em] text-slate-600 leading-snug mt-0.5">{project.description}</p>}
                      {project.keyFeatures && project.keyFeatures.length > 0 && (
                        <ul className="space-y-0.5 mt-0.5">
                          {project.keyFeatures.map((feature, i) => (
                            <li key={i} className="text-[0.88em] text-slate-500 flex gap-1.5">
                              <span className="font-black shrink-0" style={{ color: primaryColor }}>•</span><span>{feature}</span>
                            </li>
                          ))}
                        </ul>
                      )}
                      {project.technologies && project.technologies.length > 0 && (
                        <div className="flex flex-wrap gap-1 mt-1">
                          {project.technologies.map((tech, i) => (
                            <span key={i} className="text-[0.75em] font-bold uppercase tracking-wider text-slate-500 border border-slate-200 px-1.5 py-0.5 rounded">{tech}</span>
                          ))}
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {renderDeclaration()}
        </div>

        {/* Sidebar */}
        <div style={{ width: '195px', flexShrink: 0 }} className={spacingGapClass}>
          {summary && (
            <div className="space-y-1" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-[0.2em] border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>About</h2>
              <p className="text-[0.9em] leading-snug text-slate-600 italic">"{summary}"</p>
            </div>
          )}

          {skills.length > 0 && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-[0.2em] border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Core Skills</h2>
              <div className="flex flex-col gap-1">
                {skills.map((skill, i) => (
                  <div key={i} className="flex justify-between items-center gap-2 text-[0.86em]">
                    <span className="font-bold text-slate-700 uppercase tracking-wider leading-tight">{skill}</span>
                    <div className="w-7 h-1 rounded-full bg-slate-100 shrink-0">
                      <div className="h-full rounded-full" style={{ backgroundColor: primaryColor, width: '85%' }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {education.length > 0 && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-[0.2em] border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Academia</h2>
              <div className="space-y-1.5">
                {education.map(edu => (
                  <div key={edu.id} className="space-y-0.5">
                    <p className="text-[0.9em] font-black text-slate-900 leading-snug">{edu.degree}{edu.field ? ` in ${edu.field}` : ''}</p>
                    <p className="text-[0.82em] text-slate-600">{edu.school}{edu.board ? ` (${edu.board})` : ''}</p>
                    <div className="flex justify-between items-center text-[0.76em]">
                      <span className="font-bold" style={{ color: primaryColor }}>{edu.graduationDate}</span>
                      {edu.score && <span className="text-slate-500 font-bold">{edu.score}</span>}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {certifications.length > 0 && (
            <div className="space-y-1.5" style={{ breakInside: 'avoid' }}>
              <h2 className="text-[0.88em] font-black uppercase tracking-[0.2em] border-b-2 pb-0.5 inline-block" style={{ color: primaryColor, borderColor: primaryColor }}>Certifications</h2>
              <div className="flex flex-col gap-1">
                {certifications.map((cert, i) => (
                  <div key={i} className="text-[0.82em] font-bold text-slate-700 uppercase tracking-wider px-2 py-1 bg-slate-50 border-l-2 leading-snug" style={{ borderColor: primaryColor }}>{cert}</div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );

  const renderSelectedTemplate = () => {
    switch (templateType) {
      case 'modern-professional':   return renderModern();
      case 'classic-chronological': return renderClassic();
      case 'minimalist-clean':      return renderMinimalist();
      case 'ats-harvard-ivy':       return renderHarvardIvy();
      case 'ats-jake-clean':        return renderJakeClean();
      case 'student-entry':         return renderStudent();
      case 'creative-vibrant':      return renderCreative();
      case 'executive-minimal':     return renderExecutive();
      case 'tech-focused':          return renderTech();
      case 'modern-creative':       return renderModernCreative();
      case 'modern-photo':          return renderModernPhoto();
      case 'executive-pro':         return renderExecutivePro();
      default:                      return renderClassic();
    }
  };

  return (
    <div
      id="resume-preview-container"
      className={cn(
        'mx-auto bg-white shadow-2xl shrink-0 print:shadow-none print:m-0 overflow-visible',
        isFitToOnePage
          ? 'print:overflow-hidden! print:h-[296.4mm]! print:max-h-[296.4mm]!'
          : 'print:overflow-visible! print:min-h-[296.4mm]! print:h-auto!'
      )}
      style={{
        width: '210mm',
        minHeight: '296.4mm',
        height: isFitToOnePage ? '296.4mm' : 'auto',
        maxHeight: isFitToOnePage ? '296.4mm' : 'none',
        overflow: isFitToOnePage ? 'hidden' : 'visible',
        position: 'relative',
        boxSizing: 'border-box',
      }}
    >
      {/* 1-Page Locked Status Badge */}
      {isFitToOnePage && (
        <div className="print:hidden absolute top-2 right-2 z-20 bg-emerald-600 text-white text-[9px] font-bold px-2.5 py-0.5 rounded-full shadow pointer-events-none flex items-center gap-1">
          <span>1-Page {fitScale < 0.99 ? `Auto-Fit (${Math.round(fitScale * 100)}%)` : 'Locked'}</span>
        </div>
      )}

      {/* Visual Page 1 Boundary Guide Line in multi-page mode */}
      {!isFitToOnePage && (
        <div
          className="print:hidden absolute left-0 right-0 border-b-2 border-dashed border-rose-400 pointer-events-none z-20 flex justify-end px-3"
          style={{ top: '296.4mm' }}
        >
          <span className="text-[10px] bg-rose-600 text-white px-2 py-0.5 rounded shadow font-mono font-bold tracking-wider -translate-y-1/2">
            Page 1 Boundary (A4)
          </span>
        </div>
      )}

      <div
        id="resume-preview-content"
        className={cn(
          'w-full',
          isFitToOnePage
            ? 'h-full max-h-[296.4mm] overflow-hidden print:overflow-hidden!'
            : 'h-auto overflow-visible print:overflow-visible! print:h-auto!'
        )}
      >
        <div
          id="resume-fit-scaler"
          ref={scalerRef}
          style={{
            width: isFitToOnePage && fitScale < 1 ? `${100 / fitScale}%` : '100%',
            transform: isFitToOnePage && fitScale < 1 ? `scale(${fitScale})` : 'none',
            transformOrigin: 'top left',
            minHeight: isFitToOnePage ? `${296.4 / (fitScale || 1)}mm` : '296.4mm',
            display: 'flex',
            flexDirection: 'column',
            boxSizing: 'border-box',
          }}
        >
          <div
            ref={innerMeasureRef}
            style={{
              flex: '1 1 auto',
              width: '100%',
              display: 'flex',
              flexDirection: 'column',
              minHeight: 'inherit',
            }}
          >
            {renderSelectedTemplate()}
          </div>
        </div>
      </div>
    </div>
  );
});
