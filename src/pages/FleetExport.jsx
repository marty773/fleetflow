import React, { useState, useEffect, useCallback } from "react";
import { base44 } from "@/api/base44Client";
import { appParams } from "@/lib/app-params";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import {
  Github, Upload, Database, FileCode, Package,
  CheckCircle2, XCircle, AlertCircle, Loader2,
  ChevronDown, ChevronRight, Link, RefreshCw, Download
} from "lucide-react";
import { toast } from "sonner";

const CONNECTOR_ID = "69e7e9011ba9f171bc4e576e";

const CATEGORY_ICONS = {
  entities: Database,
  pages: FileCode,
  components: Package,
  functions: FileCode,
  hooks: FileCode,
  lib: FileCode,
};

const CATEGORY_LABELS = {
  entities: "Entity Schemas",
  pages: "Pages",
  components: "Components",
  functions: "Backend Functions",
  hooks: "Hooks",
  lib: "Library Files",
};

function FileGroup({ category, files, selected, onToggleAll, onToggle, results }) {
  const [open, setOpen] = useState(true);
  const Icon = CATEGORY_ICONS[category] || FileCode;
  const allSelected = files.every(f => selected.has(f));
  const someSelected = files.some(f => selected.has(f));

  return (
    <div className="border border-slate-200 dark:border-slate-700 rounded-lg overflow-hidden">
      <button
        className="w-full flex items-center justify-between px-4 py-3 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 transition-colors"
        onClick={() => setOpen(o => !o)}
      >
        <div className="flex items-center gap-3">
          <Checkbox
            checked={allSelected}
            ref={el => { if (el) el.indeterminate = !allSelected && someSelected; }}
            onCheckedChange={() => onToggleAll(category, files)}
            onClick={e => e.stopPropagation()}
          />
          <Icon className="w-4 h-4 text-slate-500" />
          <span className="font-medium text-slate-800 dark:text-slate-200">{CATEGORY_LABELS[category]}</span>
          <Badge variant="secondary">{files.length}</Badge>
        </div>
        {open ? <ChevronDown className="w-4 h-4 text-slate-400" /> : <ChevronRight className="w-4 h-4 text-slate-400" />}
      </button>
      {open && (
        <div className="divide-y divide-slate-100 dark:divide-slate-700/50">
          {files.map(file => {
            const result = results?.[file];
            return (
              <div key={file} className="flex items-center gap-3 px-4 py-2 hover:bg-slate-50 dark:hover:bg-slate-800/50">
                <Checkbox
                  checked={selected.has(file)}
                  onCheckedChange={() => onToggle(file)}
                />
                <span className="flex-1 text-sm text-slate-600 dark:text-slate-300 font-mono">{file}</span>
                {result === "success" && <CheckCircle2 className="w-4 h-4 text-green-500 shrink-0" />}
                {result === "error" && <XCircle className="w-4 h-4 text-red-500 shrink-0" />}
                {result === "pending" && <Loader2 className="w-4 h-4 text-amber-500 animate-spin shrink-0" />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default function FleetExport() {
  const [user, setUser] = useState(null);
  const [connected, setConnected] = useState(false);
  const [loading, setLoading] = useState(true);
  const [repos, setRepos] = useState([]);
  const [selectedRepo, setSelectedRepo] = useState("");
  const [targetPath, setTargetPath] = useState("fleet-module");
  const [fileGroups, setFileGroups] = useState({});
  const [selected, setSelected] = useState(new Set());
  const [pushResults, setPushResults] = useState({});
  const [pushing, setPushing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [exportingData, setExportingData] = useState(false);
  const [exportingPhotos, setExportingPhotos] = useState(false);
  const [owner, setOwner] = useState("");

  const fetchRepos = useCallback(async () => {
    try {
      const res = await base44.functions.invoke("githubExport", { action: "list_repos" });
      setRepos(res.data.repos || []);
      setOwner(res.data.owner || "");
      setConnected(true);

      const filesRes = await base44.functions.invoke("githubExport", { action: "list_files" });
      const groups = filesRes.data.files || {};
      setFileGroups(groups);

      // Build normalized file keys
      const allFiles = new Set();
      Object.entries(groups).forEach(([cat, files]) => {
        files.forEach(f => {
          const key = cat === "entities" ? `entities/${f}.json`
            : cat === "pages" ? `pages/${f}.jsx`
            : cat === "functions" ? `functions/${f}.js`
            : f;
          allFiles.add(key);
        });
      });
      setSelected(allFiles);
    } catch {
      setConnected(false);
    }
  }, []);

  useEffect(() => {
    base44.auth.isAuthenticated().then(async (authed) => {
      if (authed) {
        const me = await base44.auth.me();
        setUser(me);
        await fetchRepos();
      }
      setLoading(false);
    });
  }, [fetchRepos]);

  const handleConnect = async () => {
    const url = await base44.connectors.connectAppUser(CONNECTOR_ID);
    const popup = window.open(url, "_blank");
    const timer = setInterval(() => {
      if (!popup || popup.closed) {
        clearInterval(timer);
        fetchRepos();
      }
    }, 500);
  };

  const handleDisconnect = async () => {
    await base44.connectors.disconnectAppUser(CONNECTOR_ID);
    setConnected(false);
    setRepos([]);
  };

  const normalizeKey = (cat, file) => {
    if (cat === "entities") return `entities/${file}.json`;
    if (cat === "pages") return `pages/${file}.jsx`;
    if (cat === "functions") return `functions/${file}.js`;
    return file;
  };

  const handleToggle = (file) => {
    setSelected(prev => {
      const next = new Set(prev);
      next.has(file) ? next.delete(file) : next.add(file);
      return next;
    });
  };

  const handleToggleAll = (category, files) => {
    const keys = files.map(f => normalizeKey(category, f));
    const allSel = keys.every(k => selected.has(k));
    setSelected(prev => {
      const next = new Set(prev);
      keys.forEach(k => allSel ? next.delete(k) : next.add(k));
      return next;
    });
  };

  const handleSelectAll = () => {
    const allKeys = new Set();
    Object.entries(fileGroups).forEach(([cat, files]) => {
      files.forEach(f => allKeys.add(normalizeKey(cat, f)));
    });
    setSelected(allKeys);
  };

  const handleDeselectAll = () => setSelected(new Set());

  const handlePush = async () => {
    if (!selectedRepo) { toast.error("Please select a repository first"); return; }
    if (selected.size === 0) { toast.error("Please select at least one file"); return; }

    setPushing(true);
    setProgress(0);
    setPushResults({});

    const files = Array.from(selected);
    // Mark all pending
    const pending = {};
    files.forEach(f => (pending[f] = "pending"));
    setPushResults(pending);

    try {
      const [repoOwner, repoName] = selectedRepo.includes("/")
        ? selectedRepo.split("/")
        : [owner, selectedRepo];

      const res = await base44.functions.invoke("githubExport", {
        action: "push_files",
        repo: repoName,
        owner: repoOwner,
        targetPath,
        selectedFiles: files,
      });

      const resultsMap = {};
      (res.data.results || []).forEach(r => {
        resultsMap[r.file] = r.success ? "success" : "error";
      });
      setPushResults(resultsMap);
      setProgress(100);

      const { succeeded, failed } = res.data;
      if (failed === 0) {
        toast.success(`Successfully pushed ${succeeded} file${succeeded !== 1 ? "s" : ""} to GitHub!`);
      } else {
        toast.warning(`Pushed ${succeeded} files. ${failed} failed — check results below.`);
      }
    } catch (err) {
      toast.error("Push failed: " + err.message);
    } finally {
      setPushing(false);
    }
  };

  const handleExportPhotos = async () => {
    setExportingPhotos(true);
    try {
      const { appId, appBaseUrl, token } = appParams;
      const base = appBaseUrl || "";
      const v = appParams.functionsVersion || "v3";
      const url = `${base}/api/${v}/apps/${appId}/functions/exportBillPhotos`;
      const response = await fetch(url, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        credentials: "include",
        body: JSON.stringify({}),
      });
      if (!response.ok) {
        let msg = "Export failed";
        try { const j = await response.json(); msg = j.error || msg; } catch {}
        throw new Error(msg);
      }
      const blob = await response.blob();
      const dlUrl = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = dlUrl;
      a.download = `bill-photos-${new Date().toISOString().split("T")[0]}.zip`;
      a.click();
      URL.revokeObjectURL(dlUrl);
      toast.success("Bill photos ZIP downloaded!");
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExportingPhotos(false);
    }
  };

  const handleExportData = async () => {
    setExportingData(true);
    try {
      const res = await base44.functions.invoke("githubExport", { action: "export_data" });
      const data = res.data.data;
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: "application/json" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = `fleet-data-export-${new Date().toISOString().split("T")[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
      toast.success("Data exported successfully!");
    } catch (err) {
      toast.error("Export failed: " + err.message);
    } finally {
      setExportingData(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="w-8 h-8 animate-spin text-slate-400" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Button onClick={() => base44.auth.redirectToLogin()}>Sign in to continue</Button>
      </div>
    );
  }

  const totalFiles = Object.values(fileGroups).reduce((a, b) => a + b.length, 0);
  const succeededCount = Object.values(pushResults).filter(v => v === "success").length;
  const failedCount = Object.values(pushResults).filter(v => v === "error").length;

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
            <Github className="w-6 h-6" />
            Fleet Module Export
          </h1>
          <p className="text-slate-500 dark:text-slate-400 mt-1 text-sm">
            Push Fleet UI, logic and entity schemas to a GitHub repository for import into your new app.
          </p>
        </div>
        {connected && (
          <Button variant="outline" size="sm" onClick={fetchRepos}>
            <RefreshCw className="w-4 h-4 mr-1" /> Refresh
          </Button>
        )}
      </div>

      {/* GitHub Connection */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Link className="w-4 h-4" /> GitHub Connection
          </CardTitle>
        </CardHeader>
        <CardContent>
          {connected ? (
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-green-600 dark:text-green-400">
                <CheckCircle2 className="w-4 h-4" />
                <span className="text-sm font-medium">Connected as <strong>{owner}</strong></span>
              </div>
              <Button variant="outline" size="sm" onClick={handleDisconnect}>Disconnect</Button>
            </div>
          ) : (
            <div className="flex items-center justify-between">
              <p className="text-sm text-slate-500">Connect your GitHub account to push Fleet files.</p>
              <Button onClick={handleConnect} className="gap-2">
                <Github className="w-4 h-4" /> Connect GitHub
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

      {connected && (
        <>
          {/* Repository & Target Path */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Export Destination</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Target Repository
                </label>
                <select
                  value={selectedRepo}
                  onChange={e => setSelectedRepo(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                >
                  <option value="">— Select a repository —</option>
                  {repos.map(r => (
                    <option key={r.name} value={r.name}>{r.name} {r.private ? "🔒" : "🌐"}</option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-sm font-medium text-slate-700 dark:text-slate-300 mb-1 block">
                  Target Folder in Repo
                </label>
                <input
                  value={targetPath}
                  onChange={e => setTargetPath(e.target.value)}
                  className="w-full border border-slate-300 dark:border-slate-600 rounded-lg px-3 py-2 text-sm bg-white dark:bg-slate-900 text-slate-900 dark:text-slate-100"
                  placeholder="fleet-module"
                />
                <p className="text-xs text-slate-400 mt-1">Files will be placed under <code className="bg-slate-100 dark:bg-slate-800 px-1 rounded">{selectedRepo || "your-repo"}/{targetPath}/</code></p>
              </div>
            </CardContent>
          </Card>

          {/* File Selection */}
          <Card>
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <CardTitle className="text-base">Select Files to Export</CardTitle>
                <div className="flex items-center gap-2">
                  <Badge variant="secondary">{selected.size} / {totalFiles} selected</Badge>
                  <Button variant="ghost" size="sm" onClick={handleSelectAll}>All</Button>
                  <Button variant="ghost" size="sm" onClick={handleDeselectAll}>None</Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {Object.entries(fileGroups).map(([cat, files]) => (
                <FileGroup
                  key={cat}
                  category={cat}
                  files={files}
                  selected={selected}
                  onToggleAll={handleToggleAll}
                  onToggle={handleToggle}
                  results={pushResults}
                />
              ))}
            </CardContent>
          </Card>

          {/* Push Results Summary */}
          {Object.keys(pushResults).length > 0 && (
            <Card className="border-slate-200 dark:border-slate-700">
              <CardContent className="pt-4">
                {pushing && <Progress value={progress} className="mb-3" />}
                <div className="flex items-center gap-4 text-sm">
                  {succeededCount > 0 && (
                    <span className="flex items-center gap-1 text-green-600 dark:text-green-400">
                      <CheckCircle2 className="w-4 h-4" /> {succeededCount} pushed
                    </span>
                  )}
                  {failedCount > 0 && (
                    <span className="flex items-center gap-1 text-red-600 dark:text-red-400">
                      <XCircle className="w-4 h-4" /> {failedCount} failed
                    </span>
                  )}
                  {pushing && (
                    <span className="flex items-center gap-1 text-amber-600 dark:text-amber-400">
                      <Loader2 className="w-4 h-4 animate-spin" /> Pushing…
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Action Buttons */}
          <div className="flex items-center gap-3 flex-wrap">
            <Button
              onClick={handlePush}
              disabled={pushing || !selectedRepo || selected.size === 0}
              className="gap-2 flex-1 sm:flex-none"
            >
              {pushing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {pushing ? "Pushing to GitHub…" : `Push ${selected.size} File${selected.size !== 1 ? "s" : ""} to GitHub`}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportData}
              disabled={exportingData}
              className="gap-2 flex-1 sm:flex-none"
            >
              {exportingData ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingData ? "Exporting…" : "Export Entity Data (JSON)"}
            </Button>

            <Button
              variant="outline"
              onClick={handleExportPhotos}
              disabled={exportingPhotos}
              className="gap-2 flex-1 sm:flex-none"
            >
              {exportingPhotos ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
              {exportingPhotos ? "Zipping Photos…" : "Export Bill Photos (ZIP)"}
            </Button>
          </div>

          {/* Instructions */}
          <Card className="bg-amber-50 dark:bg-amber-950/30 border-amber-200 dark:border-amber-800">
            <CardContent className="pt-4">
              <div className="flex gap-3">
                <AlertCircle className="w-5 h-5 text-amber-600 dark:text-amber-400 shrink-0 mt-0.5" />
                <div className="text-sm text-amber-800 dark:text-amber-300 space-y-1">
                  <p className="font-semibold">After pushing to GitHub:</p>
                  <ol className="list-decimal list-inside space-y-1 text-amber-700 dark:text-amber-400">
                    <li>In your new Base44 app, connect the same GitHub repo via GitHub Sync.</li>
                    <li>Copy the entity JSON files into your new app's <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">entities/</code> folder and deploy the schema.</li>
                    <li>Add Fleet routes to your new app's <code className="bg-amber-100 dark:bg-amber-900 px-1 rounded">App.jsx</code>.</li>
                    <li>Set the same environment variables (Motive API keys, Google credentials) in the new app's dashboard.</li>
                    <li>Import the downloaded entity data JSON via the Base44 dashboard → Data → Import.</li>
                  </ol>
                </div>
              </div>
            </CardContent>
          </Card>
        </>
      )}
    </div>
  );
}