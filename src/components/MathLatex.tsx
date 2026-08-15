import React, { useMemo } from 'react';
import katex from 'katex';

interface MathLatexProps {
  tex: string;
  block?: boolean;
  className?: string;
  style?: React.CSSProperties;
}

export const MathLatex: React.FC<MathLatexProps> = ({
  tex,
  block = false,
  className = '',
  style
}) => {
  const html = useMemo(() => {
    try {
      return katex.renderToString(tex, {
        displayMode: block,
        throwOnError: false,
        output: 'html'
      });
    } catch (e) {
      console.error('KaTeX rendering error:', e);
      return `<span class="text-amber-400 font-mono">${tex}</span>`;
    }
  }, [tex, block]);

  if (block) {
    return (
      <div
        className={`katex-block my-2 overflow-x-auto p-2 bg-[#0d1117] border border-[#30363d] rounded-lg text-center text-white ${className}`}
        style={style}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    );
  }

  return (
    <span
      className={`katex-inline inline-flex items-center px-1 text-white font-sans ${className}`}
      style={style}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
};

interface MathTextProps {
  text: string;
  className?: string;
}

/**
 * MathText parses strings containing inline $...$ or block $$...$$ TeX math
 * and renders KaTeX for LaTeX parts and regular text for others.
 */
export const MathText: React.FC<MathTextProps> = ({ text, className = '' }) => {
  const parts = useMemo(() => {
    if (!text) return [];
    // Split by $$...$$ or $...$
    const regex = /(\$\$.*?\$\$|\$.*?\$)/g;
    const split = text.split(regex);
    return split.map((part, index) => {
      if (part.startsWith('$$') && part.endsWith('$$') && part.length > 4) {
        return {
          id: index,
          isBlock: true,
          tex: part.slice(2, -2).trim()
        };
      }
      if (part.startsWith('$') && part.endsWith('$') && part.length > 2) {
        return {
          id: index,
          isInline: true,
          tex: part.slice(1, -1).trim()
        };
      }
      return { id: index, text: part };
    });
  }, [text]);

  return (
    <span className={className}>
      {parts.map((p) => {
        if ('tex' in p && p.isBlock) {
          return <MathLatex key={p.id} tex={p.tex} block={true} />;
        }
        if ('tex' in p && p.isInline) {
          return <MathLatex key={p.id} tex={p.tex} block={false} />;
        }
        return <span key={p.id}>{p.text}</span>;
      })}
    </span>
  );
};

export default MathLatex;
