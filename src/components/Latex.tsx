import React, { useEffect, useRef } from 'react';
import katex from 'katex';

interface LatexProps {
  math: string;
  block?: boolean;
}

export const Latex: React.FC<LatexProps> = ({ math, block = false }) => {
  const containerRef = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      try {
        katex.render(math, containerRef.current, {
          displayMode: block,
          throwOnError: false,
          trust: true
        });
      } catch (err) {
        containerRef.current.textContent = math;
      }
    }
  }, [math, block]);

  return <span ref={containerRef} className="latex-math inline-block" />;
};
