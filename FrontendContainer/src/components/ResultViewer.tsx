import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../utils/cn';
import { Button } from './ui/Button';

interface ResultViewerProps {
  result: any;
  isLive?: boolean;
  className?: string;
}

// PUBLIC_INTERFACE
export function ResultViewer({ result, isLive = false, className }: ResultViewerProps): JSX.Element {
  /** Result viewer with auto-scroll for live updates and log display. */
  const [autoScroll, setAutoScroll] = useState(true);
  const logEndRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (autoScroll && logEndRef.current) {
      logEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [result, autoScroll]);

  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const element = e.currentTarget;
    const isAtBottom = Math.abs(
      element.scrollHeight - element.scrollTop - element.clientHeight
    ) < 10;
    
    if (isAtBottom !== autoScroll) {
      setAutoScroll(isAtBottom);
    }
  };

  const scrollToBottom = () => {
    setAutoScroll(true);
    logEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const copyToClipboard = () => {
    const text = JSON.stringify(result, null, 2);
    navigator.clipboard.writeText(text);
  };

  return (
    <div className={cn('relative', className)}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <h3 className="text-sm font-semibold text-text">Results</h3>
          {isLive && (
            <span className="flex items-center gap-1.5 text-xs text-accent">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-accent opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-accent" />
              </span>
              Live
            </span>
          )}
        </div>
        <div className="flex gap-2">
          {!autoScroll && (
            <Button
              variant="ghost"
              size="sm"
              onClick={scrollToBottom}
              aria-label="Scroll to bottom"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
              </svg>
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            onClick={copyToClipboard}
            aria-label="Copy to clipboard"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
            </svg>
          </Button>
        </div>
      </div>
      
      <div
        ref={containerRef}
        onScroll={handleScroll}
        className="bg-bg border border-border rounded-lg p-4 max-h-96 overflow-y-auto font-mono text-xs text-muted"
        role="log"
        aria-live={isLive ? 'polite' : 'off'}
        aria-atomic="false"
      >
        <pre className="whitespace-pre-wrap break-words">
          {JSON.stringify(result, null, 2)}
        </pre>
        <div ref={logEndRef} />
      </div>
      
      {!autoScroll && (
        <div className="absolute bottom-2 left-1/2 transform -translate-x-1/2 bg-accent text-white px-3 py-1 rounded-full text-xs shadow-lg">
          Auto-scroll paused
        </div>
      )}
    </div>
  );
}
