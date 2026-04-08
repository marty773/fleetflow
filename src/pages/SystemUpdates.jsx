import React, { useState, useEffect } from 'react';
import { base44 } from '@/api/base44Client';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Copy, Check, Zap, Save, Loader2 } from 'lucide-react';
import { toast } from 'sonner';

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
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [generatedPrompt, setGeneratedPrompt] = useState('');
  const [copied, setCopied] = useState(false);
  const [isAdmin, setIsAdmin] = useState(false);

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
          setVersionNumber(rec.version_number ?? '');
          setFeaturesSummary(rec.latest_features_summary ?? '');
        }
        setLoading(false);
      });
    });
  }, []);

  const handleSave = async () => {
    setSaving(true);
    const data = {
      version_number: parseInt(versionNumber) || 0,
      latest_features_summary: featuresSummary,
    };
    if (metadataId) {
      await base44.entities.AppMetadata.update(metadataId, data);
    } else {
      const rec = await base44.entities.AppMetadata.create(data);
      setMetadataId(rec.id);
    }
    setSaving(false);
    toast.success('Saved successfully');
  };

  const handleGenerate = () => {
    const itemFieldList = ITEM_FIELDS.join(', ');
    const vendorFieldList = VENDOR_FIELDS.join(', ');
    const prompt = `I am updating Fisher's Operations to version ${versionNumber || '[VERSION]'}. Please implement these new features from FleetFlow: ${featuresSummary || '[FEATURES]'}. Also, ensure the API mapping for 'Items' and 'Vendors' includes these specific fields:\n\nItems: ${itemFieldList}\n\nVendors: ${vendorFieldList}`;
    setGeneratedPrompt(prompt);
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

      <Card>
        <CardHeader>
          <CardTitle className="text-base">App Metadata</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="version">Version Number</Label>
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
            <Label htmlFor="features">Latest Features / Schema Changes</Label>
            <Textarea
              id="features"
              className="mt-1 min-h-[140px]"
              value={featuresSummary}
              onChange={e => setFeaturesSummary(e.target.value)}
              placeholder="List new features, schema changes, bug fixes..."
            />
          </div>
          <div className="flex gap-3">
            <Button onClick={handleSave} disabled={saving} variant="outline">
              {saving ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <Save className="w-4 h-4 mr-2" />}
              Save
            </Button>
            <Button onClick={handleGenerate} className="bg-amber-500 hover:bg-amber-600 text-white">
              <Zap className="w-4 h-4 mr-2" />
              Generate Update Prompt
            </Button>
          </div>
        </CardContent>
      </Card>

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
    </div>
  );
}