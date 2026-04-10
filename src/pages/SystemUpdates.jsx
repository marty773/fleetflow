import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Zap, Save, Loader2, History, Bot, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import PendingChangesList from '@/components/systemupdates/PendingChangesList';
import VersionHistoryList from '@/components/systemupdates/VersionHistoryList';

// Auto-populated build version: uses Vite build timestamp as an integer (YYYYMMDDHHMI)
const BUILD_VERSION = parseInt(
  (import.meta.env.VITE_BUILD_TIME || new Date().toISOString())
    .replace(/[-T:Z.]/g, '')
    .slice(0, 12)
) || 0;

const ITEM_FIELDS = [
  'Name', 'Item Number (SKU)', 'Description', 'Vendor', 'Unit Price',
  'Quantity on Hand', 'Low Stock Threshold', 'Photo URL', 'Company'
];

const VENDOR_FIELDS = [
  'Name', 'Contact Person', 'Email', 'Phone', 'Address', 'City',
  'State', 'Zip', 'Category', 'Notes', 'Company'
];

export default function SystemUpdates() {
  const [metadataId, setMetadataId] = useState(null);
  const [versionNumber, setVersionNumber] = useState('');
  const [featuresSummary, setFeaturesSummary] = useState('');
  const [pendingChanges, setPendingChanges] = useState([]);
  const [versionHistory, setVersionHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);
  const [aiInput, setAiInput] = useState('');
  const [aiParsing, setAiParsing] = useState(false);

  useEffect(() => {
    base44.auth.me().then(user => {
      if (user?.role !== 'admin') {
        setIsAdmin(false);
        setLoading(false);
        return;
      }
      setIsAdmin(true);
      base44.entities.AppMetadata.list().then(records => {
        if (records.length > 0) {
          const rec = records[0];
          setMetadataId(rec.id);
          setVersionNumber(rec.version_number || BUILD_VERSION);
          setFeaturesSummary(rec.latest_features_summary ?? '');
          setPendingChanges(rec.pending_changes ?? []);
          setVersionHistory(rec.version_history ?? []);
        } else {
          setVersionNumber(BUILD_VERSION);
        }
        setLoading(false);
      });
    });
  }, []);

  const saveToDb = async (overrides = {}) => {
    const data = {
      version_number: parseInt(versionNumber) || 0,
      latest_features_summary: featuresSummary,
      pending_changes: pendingChanges,
      version_history: versionHistory,
      ...overrides,
    };
    if (metadataId) {
      await base44.entities.AppMetadata.update(metadataId, data);
    } else {
      const rec = await base44.entities.AppMetadata.create(data);
      setMetadataId(rec.id);
    }
  };

  const handleSave = async () => {
    setSaving(true);
    await saveToDb();
    setSaving(false);
    toast.success('Saved successfully');
  };

  const handlePendingChangesChange = (newChanges) => {
    setPendingChanges(newChanges);
  };

  const handleGenerate = async () => {
    const version = parseInt(versionNumber) || BUILD_VERSION;
    const itemFieldList = ITEM_FIELDS.join(', ');
    const vendorFieldList = VENDOR_FIELDS.join(', ');

    // Build change log section from pending changes
    const changeLog = pendingChanges.length > 0
      ? '\n\nDetailed changes in this version:\n' +
        pendingChanges.map(c => `- [${c.category}] ${c.description}`).join('\n')
      : '';

    const prompt = `I am updating Fisher's Operations to version ${version}. Please implement these new features from FleetFlow: ${featuresSummary || '[FEATURES]'}.${changeLog}\n\nAlso, ensure the API mapping for 'Items' and 'Vendors' includes these specific fields:\n\nItems: ${itemFieldList}\n\nVendors: ${vendorFieldList}`;
    setGeneratedPrompt(prompt);

    // Publish this as a new version in history
    const newEntry = {
      version,
      published_at: new Date().toISOString(),
      summary: featuresSummary,
      changes: [...pendingChanges],
    };

    // Avoid duplicate versions — replace if same version number exists
    const updatedHistory = [
      ...versionHistory.filter(h => h.version !== version),
      newEntry,
    ];

    setVersionHistory(updatedHistory);
    setPendingChanges([]); // Clear pending after publishing
    setVersionNumber(version + 1); // Bump version for next update

    await saveToDb({
      version_number: version + 1,
      version_history: updatedHistory,
      pending_changes: [],
    });

    toast.success(`v${version} published to history`);
  };

  const handleImportFromAI = async () => {
    if (!aiInput.trim()) return;
    setAiParsing(true);
    const result = await base44.integrations.Core.InvokeLLM({
      prompt: `You are a changelog parser. Given the following description of changes made to a fleet management web app called FleetFlow, extract individual changes and classify each one.

Text to parse:
${aiInput}

Return a JSON array of change objects. Each object must have:
- "description": concise 1-sentence description of the change (start with a verb, e.g. "Added", "Fixed", "Updated")
- "category": one of: "feature", "bugfix", "schema", "ui", "other"

Only include actual changes to the app (ignore meta-commentary). Return 3-15 items max.`,
      response_json_schema: {
        type: 'object',
        properties: {
          changes: {
            type: 'array',
            items: {
              type: 'object',
              properties: {
                description: { type: 'string' },
                category: { type: 'string' }
              }
            }
          }
        }
      }
    });
    const parsed = result?.changes || [];
    const newEntries = parsed.map(c => ({
      timestamp: new Date().toISOString(),
      description: c.description,
      category: ['feature', 'bugfix', 'schema', 'ui', 'other'].includes(c.category) ? c.category : 'other',
    }));
    const merged = [...pendingChanges, ...newEntries];
    setPendingChanges(merged);
    await saveToDb({ pending_changes: merged });
    setAiInput('');
    setAiParsing(false);
    toast.success(`Imported ${newEntries.length} change${newEntries.length !== 1 ? 's' : ''} from AI session`);
  };

  const handleRollback = async (entry) => {
    const confirmed = window.confirm(
      `Restore settings to v${entry.version}? This will set the current version and summary back to that snapshot. No data will be deleted.`
    );
    if (!confirmed) return;

    setVersionNumber(entry.version);
    setFeaturesSummary(entry.summary ?? '');
    setPendingChanges([]);

    await saveToDb({
      version_number: entry.version,
      latest_features_summary: entry.summary ?? '',
      pending_changes: [],
    });

    toast.success(`Restored to v${entry.version}`);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(generatedPrompt);
    setCopied(true);
    toast.success('Copied to clipboard');
    setTimeout(() => setCopied(false), 2000);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!isAdmin) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-slate-500 dark:text-slate-400">Access denied. Admin only.</p>
      </div>
    );
  }

  return (
    <div className="p-6 max-w-2xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold text-slate-900 dark:text-white">System Updates</h1>

      {/* App Metadata */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">App Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="version">Next Version Number</Label>
            <Input
              id="version"
              type="number"
              className="mt-1 w-40"
              value={versionNumber}
              onChange={e => setVersionNumber(e.target.value)}
              placeholder="e.g. 12"
            />
          </div>
          <div>
            <Label htmlFor="features">Features / Summary for This Release</Label>
            <Textarea
              id="features"
              className="mt-1 min-h-[120px]"
              value={featuresSummary}
              onChange={e => setFeaturesSummary(e.target.value)}
              placeholder="High-level description of what's in this update..."
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} variant="outline">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save Draft
            </Button>
            <Button onClick={handleGenerate} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Publish & Generate Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Import from AI Chat */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base flex items-center gap-2">
            <Bot className="w-4 h-4 text-blue-500" />
            Import from AI Chat
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-slate-500 dark:text-slate-400">
            Paste the AI assistant's response or a description of the changes made in this session. The AI will parse it into categorized change entries automatically.
          </p>
          <textarea
            className="w-full min-h-[120px] rounded-md border border-input bg-transparent px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring dark:border-slate-700 dark:bg-slate-950 dark:text-white"
            placeholder="Paste AI response here, e.g.: 'Map markers now show a green rotating arrow for moving vehicles. The Moving badge was removed. Fault codes badge is now clickable and opens a detail dialog...'"
            value={aiInput}
            onChange={e => setAiInput(e.target.value)}
          />
          <Button
            onClick={handleImportFromAI}
            disabled={aiParsing || !aiInput.trim()}
            className="bg-blue-600 hover:bg-blue-700 text-white gap-2"
          >
            {aiParsing
              ? <><Loader2 className="w-4 h-4 animate-spin" /> Parsing...</>
              : <><Sparkles className="w-4 h-4" /> Parse & Add to Pending Changes</>
            }
          </Button>
        </CardContent>
      </Card>

      {/* Pending Changes */}
      <PendingChangesList
        changes={pendingChanges}
        onChange={handlePendingChangesChange}
      />

      {/* Generated Prompt */}
      {generatedPrompt && (
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-base">Generated Prompt</CardTitle>
            <Button size="sm" variant="outline" onClick={handleCopy}>
              {copied ? <Check className="w-4 h-4 mr-1 text-green-600" /> : <Copy className="w-4 h-4 mr-1" />}
              {copied ? 'Copied!' : 'Copy'}
            </Button>
          </CardHeader>
          <CardContent>
            <pre className="whitespace-pre-wrap text-sm bg-slate-50 dark:bg-slate-800 rounded-lg p-4 text-slate-700 dark:text-slate-300 border border-slate-200 dark:border-slate-700 leading-relaxed">
              {generatedPrompt}
            </pre>
          </CardContent>
        </Card>
      )}

      {/* Version History */}
      <div>
        <h2 className="text-lg font-semibold text-slate-900 dark:text-white flex items-center gap-2 mb-3">
          <History className="w-5 h-5 text-slate-400" />
          Version History
        </h2>
        <VersionHistoryList
          history={versionHistory}
          onRollback={handleRollback}
        />
      </div>
    </div>
  );
}