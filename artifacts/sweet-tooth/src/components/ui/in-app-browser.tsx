import React, { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "./dialog";
import { Globe, Lock, ExternalLink, RefreshCw, Copy, Check, X } from "lucide-react";

interface InAppBrowserProps {
  url: string | null;
  title?: string;
  isOpen: boolean;
  onClose: () => void;
}

export function InAppBrowserModal({ url, title, isOpen, onClose }: InAppBrowserProps) {
  const [copied, setCopied] = useState(false);
  const [key, setKey] = useState(0);
  const [loading, setLoading] = useState(true);

  if (!url) return null;

  const handleCopy = () => {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRefresh = () => {
    setLoading(true);
    setKey((prev) => prev + 1);
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-4xl w-[95vw] h-[85vh] p-0 gap-0 overflow-hidden flex flex-col rounded-2xl border border-border shadow-2xl bg-background">
        {/* Browser Top Navigation Bar */}
        <div className="flex items-center justify-between px-4 py-2.5 bg-muted/60 border-b border-border shrink-0 select-none">
          <div className="flex items-center gap-2 max-w-[60%] truncate">
            <Globe className="w-4 h-4 text-primary shrink-0" />
            <span className="text-xs font-semibold truncate text-foreground">
              {title || "In-App Browser"}
            </span>
          </div>

          {/* Omnibox / URL Bar */}
          <div className="flex-1 max-w-md mx-3 px-3 py-1 bg-background/80 border border-border/60 rounded-full flex items-center gap-2 shadow-inner text-xs text-muted-foreground truncate">
            <Lock className="w-3 h-3 text-emerald-500 shrink-0" />
            <span className="truncate font-mono text-[11px] select-all">{url}</span>
          </div>

          {/* Action Icons */}
          <div className="flex items-center gap-1">
            <button
              onClick={handleRefresh}
              title="Refresh Page"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            </button>

            <button
              onClick={handleCopy}
              title="Copy URL"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
            >
              {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
            </button>

            <a
              href={url}
              target="_blank"
              rel="noreferrer"
              title="Open in System Browser"
              className="p-1.5 rounded-lg hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            >
              <ExternalLink className="w-3.5 h-3.5" />
            </a>

            <button
              onClick={onClose}
              title="Close Browser"
              className="p-1.5 rounded-lg hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors ml-1 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Browser Content Area */}
        <div className="relative flex-1 w-full bg-white dark:bg-zinc-950 overflow-hidden">
          {loading && (
            <div className="absolute inset-0 z-10 flex flex-col items-center justify-center bg-background/80 backdrop-blur-xs gap-3">
              <div className="w-8 h-8 border-3 border-primary border-t-transparent rounded-full animate-spin" />
              <p className="text-xs font-semibold text-muted-foreground">Loading preview...</p>
            </div>
          )}

          <iframe
            key={key}
            src={url}
            title={title || "In-App Browser Preview"}
            className="w-full h-full border-0"
            onLoad={() => setLoading(false)}
            sandbox="allow-scripts allow-same-origin allow-forms allow-popups"
          />
        </div>
      </DialogContent>
    </Dialog>
  );
}
