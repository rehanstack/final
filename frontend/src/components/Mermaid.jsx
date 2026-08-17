import React, { useEffect, useRef } from 'react';
import mermaid from 'mermaid';

mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  securityLevel: 'loose',
  fontFamily: 'inherit'
});

export default function Mermaid({ chart }) {
  const containerRef = useRef(null);

  useEffect(() => {
    if (containerRef.current && chart) {
      const id = `mermaid-${Math.random().toString(36).substr(2, 9)}`;
      try {
        mermaid.render(id, chart).then(({ svg }) => {
          if (containerRef.current) {
            containerRef.current.innerHTML = svg;
          }
        }).catch(err => {
          console.error('Mermaid render error:', err);
          if (containerRef.current) {
            containerRef.current.innerHTML = `<div class="text-red-400 p-4 border border-red-500/30 rounded-lg bg-red-500/10">Failed to render diagram</div>`;
          }
        });
      } catch (err) {
        console.error('Mermaid exception:', err);
      }
    }
  }, [chart]);

  return <div ref={containerRef} className="flex justify-center my-8 p-4 bg-dark-900/50 rounded-xl border border-white/5 overflow-x-auto custom-scrollbar" />;
}
