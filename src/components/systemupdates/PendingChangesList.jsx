import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Plus, Trash2 } from 'lucide-react';
import { format } from 'date-fns';

const CATEGORY_COLORS = {
  feature: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
  bugfix: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
  schema: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
  ui: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300',
  other: 'bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300',
};

export default function PendingChangesList({ changes, onChange }) {
  const [newDesc, setNewDesc] = useState('');
  const [newCat, setNewCat] = useState('feature');

  const handleAdd = () => {
    if (!newDesc.trim()) return;
    const entry = {
      timestamp: new Date().toISOString(),
      description: newDesc.trim(),
      category: newCat,
    };
    onChange([...changes, entry]);
    setNewDesc('');
  };

  const handleRemove = (index) => {
    onChange(changes.filter((_, i) => i !== index));
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center justify-between">
          Pending Changes
          {changes.length > 0 && (
            <span className="text-xs font-normal bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 px-2 py-0.5 rounded-full">
              {changes.length} change{changes.length !== 1 ? 's' : ''} since last update
            </span>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {/* Add new change */}
        <div className="flex gap-2">
          <Select value={newCat} onValueChange={setNewCat}>
            <SelectTrigger className="w-32 shrink-0">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="feature">Feature</SelectItem>
              <SelectItem value="bugfix">Bug Fix</SelectItem>
              <SelectItem value="schema">Schema</SelectItem>
              <SelectItem value="ui">UI</SelectItem>
              <SelectItem value="other">Other</SelectItem>
            </SelectContent>
          </Select>
          <Input
            placeholder="Describe a change..."
            value={newDesc}
            onChange={e => setNewDesc(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && handleAdd()}
            className="flex-1"
          />
          <Button onClick={handleAdd} size="icon" variant="outline">
            <Plus className="w-4 h-4" />
          </Button>
        </div>

        {/* List */}
        {changes.length === 0 ? (
          <p className="text-sm text-slate-400 dark:text-slate-500 italic py-2">
            No pending changes logged yet. Add changes above or they'll be recorded automatically when you publish.
          </p>
        ) : (
          <ul className="space-y-1.5">
            {changes.map((c, i) => (
              <li key={i} className="flex items-start gap-2 text-sm">
                <span className={`mt-0.5 text-xs px-1.5 py-0.5 rounded font-medium shrink-0 ${CATEGORY_COLORS[c.category] || CATEGORY_COLORS.other}`}>
                  {c.category || 'other'}
                </span>
                <span className="flex-1 text-slate-700 dark:text-slate-300">{c.description}</span>
                <span className="text-xs text-slate-400 shrink-0">{format(new Date(c.timestamp), 'MMM d, h:mm a')}</span>
                <button
                  onClick={() => handleRemove(i)}
                  className="text-slate-300 hover:text-red-500 transition-colors shrink-0"
                  aria-label="Remove change"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}