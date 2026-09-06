import React from 'react';

interface MarkdownProps {
  children: string;
  className?: string;
}

export function Markdown({ children, className = '' }: MarkdownProps) {
  // Simple markdown parser for basic formatting
  const parseMarkdown = (text: string) => {
    // Convert headers
    text = text.replace(/^### (.*$)/gim, '<h3 class="text-lg font-semibold mt-4 mb-2">$1</h3>');
    text = text.replace(/^## (.*$)/gim, '<h2 class="text-xl font-semibold mt-4 mb-2">$1</h2>');
    text = text.replace(/^# (.*$)/gim, '<h1 class="text-2xl font-bold mt-4 mb-2">$1</h1>');
    
    // Convert bold
    text = text.replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>');
    
    // Convert italic
    text = text.replace(/\*(.*)\*/gim, '<em>$1</em>');
    
    // Convert line breaks
    text = text.replace(/\n/gim, '<br />');
    
    // Convert horizontal rules
    text = text.replace(/^---$/gim, '<hr class="my-4 border-border" />');
    
    return text;
  };

  return (
    <div 
      className={`prose prose-sm max-w-none ${className}`}
      dangerouslySetInnerHTML={{ __html: parseMarkdown(children) }}
    />
  );
}
