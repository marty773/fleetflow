import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ChevronDown, ChevronUp, RotateCcw, Clock } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  bugfix: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  schema: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ui: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

function VersionEntry({ entry, onRollback, isLatest }) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800/60 hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors text-left"
        onClick={() => setExpanded(e => !e)}
      >
        <div className="flex items-center gap-3">
          <span className="font-semibold text-slate-900 dark:text-white text-sm">v{entry.version}</span>
          {isLatest && (
            <span className="text-xs bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full font-medium">
              Current
            </span>
          )}
          <span className="text-xs text-slate-500 dark:text-slate-400 flex items-center gap-1">
            <Clock className="w-3 h-3" />
            {entry.published_at ? format(new Date(entry.published_at), 'MMM d, yyyy h:mm a') : 'Unknown'}
          </span>
          {entry.changes?.length > 0 && (
            <span className="text-xs text-slate-400">({entry.changes.length} change{entry.changes.length !== 1 ? 's' : ''})</span>
          )}
        </div>
        <div className="flex items-center gap-2">
          {!isLatest && (
            <Button
              size="sm"
              variant="outline"
              className="text-xs h-7 px-2"
              onClick={e => { e.stopPropagation(); onRollback(entry); }}
            >
              <RotateCcw className="w-3 h-3 mr-1" />
              Restore
            </Button>
          )}
          {expanded ? <ChevronUp className="w-4 h-4 text-slate-400" /> : <ChevronDown className="w-4 h-4 text-slate-400" />}
        </div>
      </button>

      {expanded && (
        <div className="px-4 py-3 space-y-3 bg-white dark:bg-slate-900">
          {entry.summary && (
            <p className="text-sm text-slate-700 dark:text-slate-300 bg-slate-50 dark:bg-slate-800 rounded p-2 italic">
              {entry.summary}
            </p>
          )}
          {entry.changes?.length > 0 ? (
            <ul className="space-y-1.5">
              {entry.changes.map((c, i) => (
                <li key={i} className="flex items-start gap-2 text-sm text-slate-700 dark:text-slate-300">
                  <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other}`}>
                    {c.category || 'other'}
                  </span>
                  <span className="flex-1">{c.description}</span>
                  {c.timestamp && (
                    <span className="text-xs text-slate-400 shrink-0">{format(new Date(c.timestamp), 'MMM d, h:mm a')}</span>
                  )}
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-slate-400 italic">No detailed change log for this version.</p>
          )}
        </div>
      )}
    </div>
  );
}

export default function VersionHistoryList({ history, onRollback }) {
  if (!history || history.length === 0) {
    return (
      <Card>
        <CardContent className="py-10 text-center text-slate-400 dark:text-slate-500 text-sm">
          No published versions yet. Generate and publish your first update above.
        </CardContent>
      </Card>
    );
  }

  const sorted = [...history].sort((a, b) => b.version - a.version);
  const latestVersion = sorted[0]?.version;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Version History</CardTitle>
      </CardHeader>
      <CardContent className="space-y-2">
        {sorted.map(entry => (
          <VersionEntry
            key={entry.version}
            entry={entry}
            onRollback={onRollback}
            isLatest={entry.version === latestVersion}
          />
        ))}
      </CardContent>
    </Card>
  );
}