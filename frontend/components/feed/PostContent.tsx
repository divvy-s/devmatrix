"use client";
import { useState } from "react";

export function PostContent({ content }: { content: string }) {
  const [expanded, setExpanded] = useState(false);
  const isLong = content.length > 150;
  const displayContent = !isLong || expanded ? content : content.slice(0, 150) + "...";

  const renderContent = () => {
    return displayContent.split(/(\s+)/).map((word, i) => {
      if (word.startsWith("#") && word.length > 1) {
        return <span key={i} className="text-purple-400">{word}</span>;
      }
      return <span key={i}>{word}</span>;
    });
  };

  return (
    <div className="text-sm text-zinc-300 leading-relaxed font-sans whitespace-pre-wrap">
      {renderContent()}
      {isLong && (
        <button 
          onClick={() => setExpanded(!expanded)} 
          className="ml-2 text-zinc-500 hover:text-zinc-300 font-medium transition-colors"
        >
          {expanded ? "Show less" : "Read more"}
        </button>
      )}
    </div>
  );
}
