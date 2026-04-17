"use client";

import { useState } from "react";
import { 
  CheckCircle2, 
  FileText, 
  AlertTriangle, 
  ChevronLeft, 
  ChevronRight, 
  Save, 
  XCircle,
  Hash,
  Building2,
  CalendarDays,
  Coins
} from "lucide-react";
import { Card } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import type { ExtractedDocument, ReconciliationRun } from "@/lib/domain/types";
import { formatCurrency } from "@/lib/utils";

interface OcrReviewWorkspaceProps {
  run: ReconciliationRun;
}

export function OcrReviewWorkspace({ run }: OcrReviewWorkspaceProps) {
  const [documents, setDocuments] = useState(run.documents);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [isSaving, setIsSaving] = useState(false);

  const currentDoc = documents[currentIndex];
  const currency = currentDoc?.currency || run.defaultCurrency || "GBP";

  const handleUpdateField = (field: keyof ExtractedDocument, value: any) => {
    setDocuments(prev => prev.map((doc, idx) => 
      idx === currentIndex ? { ...doc, [field]: value } : doc
    ));
  };

  const handleSave = async () => {
    setIsSaving(true);
    // Real implementation would POST to /api/runs/[runId]/documents/[docId]
    setTimeout(() => {
      setIsSaving(false);
    }, 1000);
  };

  if (!currentDoc) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <XCircle className="h-12 w-12 text-[var(--color-muted-foreground)] opacity-20" />
        <h3 className="mt-4 text-lg font-semibold">No documents found</h3>
        <p className="text-sm text-[var(--color-muted-foreground)]">Your extraction run didn't yield any results.</p>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-6 lg:h-[calc(100vh-240px)]">
      {/* Header / Navigation */}
      <div className="flex items-center justify-between bg-white p-4 rounded-2xl border border-[var(--color-border)] shadow-sm">
        <div className="flex items-center gap-4">
          <Button 
            variant="ghost" 
            className="w-10 p-0"
            onClick={() => setCurrentIndex(c => Math.max(0, c - 1))}
            disabled={currentIndex === 0}
          >
            <ChevronLeft className="h-5 w-5" />
          </Button>
          <div className="text-sm font-medium">
            Document {currentIndex + 1} <span className="text-[var(--color-muted-foreground)] font-normal">of {documents.length}</span>
          </div>
          <Button 
            variant="ghost" 
            className="w-10 p-0"
            onClick={() => setCurrentIndex(c => Math.min(documents.length - 1, c + 1))}
            disabled={currentIndex === documents.length - 1}
          >
            <ChevronRight className="h-5 w-5" />
          </Button>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:flex flex-col items-end mr-4">
            <span className="text-[10px] font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">Status</span>
            <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-600">
              <CheckCircle2 className="h-3 w-3" /> Ready for Review
            </div>
          </div>
          <Button onClick={handleSave} disabled={isSaving} className="rounded-xl gap-2 h-9">
            {isSaving ? "Saving..." : <><Save className="h-4 w-4" /> Save Changes</>}
          </Button>
        </div>
      </div>

      <div className="flex-1 grid lg:grid-cols-2 gap-6 min-h-0">
        {/* Left: Preview */}
        <Card className="p-0 overflow-hidden flex flex-col bg-[var(--color-panel)] border-dashed border-2">
          <div className="p-3 border-b border-[var(--color-border)] bg-white flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-widest text-[var(--color-muted-foreground)] flex items-center gap-2">
              <FileText className="h-3.5 w-3.5" /> Source Preview
            </span>
            <span className="text-[10px] text-[var(--color-muted-foreground)]">
              {currentDoc.fileName}
            </span>
          </div>
          <div className="flex-1 relative flex items-center justify-center p-8 overflow-auto">
            {/* Simulation of a document preview */}
            <div className="w-full max-w-[400px] aspect-[1/1.4] bg-white rounded-md shadow-2xl p-8 flex flex-col gap-6 transform rotate-1 select-none pointer-events-none">
               <div className="flex justify-between">
                  <div className="h-4 w-24 bg-slate-100 rounded" />
                  <div className="h-10 w-10 bg-slate-50 rounded-full" />
               </div>
               <div className="h-2 w-full bg-slate-50 rounded" />
               <div className="h-2 w-3/4 bg-slate-50 rounded" />
               <div className="mt-8 space-y-3">
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-full bg-slate-100 rounded" />
                  <div className="h-3 w-2/3 bg-slate-100 rounded" />
               </div>
               <div className="mt-auto pt-8 border-t border-slate-100">
                  <div className="flex justify-between">
                     <div className="h-4 w-20 bg-slate-100 rounded" />
                     <div className="h-6 w-24 bg-slate-800 rounded opacity-20" />
                  </div>
               </div>
            </div>
            
            {/* Region highlight simulation */}
            <div className="absolute top-[20%] right-[15%] w-32 h-8 bg-amber-400/20 border-2 border-amber-400 rounded animate-pulse" />
          </div>
          
          {/* Extracted Raw Text (Collapsible/Mini) */}
          <div className="bg-white p-3 border-t border-[var(--color-border)]">
             <details className="cursor-pointer">
                <summary className="text-[10px] font-bold text-[var(--color-muted-foreground)] uppercase">View Raw Extraction</summary>
                <pre className="mt-2 p-2 bg-[var(--color-panel)] rounded text-[10px] whitespace-pre-wrap max-h-32 overflow-y-auto border border-[var(--color-border)]">
                  {currentDoc.rawExtractedText || "No raw text available."}
                </pre>
             </details>
          </div>
        </Card>

        {/* Right: Data Form */}
        <div className="flex flex-col gap-4 overflow-y-auto">
          <Card className="p-6 space-y-6">
            <div className="flex items-center justify-between">
               <h3 className="text-lg font-bold">Extraction Review</h3>
               <div className="flex items-center gap-2 px-2 py-1 bg-amber-50 text-amber-700 rounded-lg text-xs font-bold ring-1 ring-amber-200">
                  <AlertTriangle className="h-3.5 w-3.5" />
                  Confidence: {((currentDoc.confidence || 0.65) * 100).toFixed(0)}%
               </div>
            </div>

            <div className="grid gap-6">
              <div className="space-y-2">
                <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-2">
                  <Building2 className="h-3 w-3" /> Supplier Name
                </label>
                <Input 
                  value={currentDoc.supplier || ""} 
                  onChange={(e) => handleUpdateField('supplier', e.target.value)}
                  className="rounded-xl h-11 border-2 focus:border-[var(--color-accent)] focus:ring-4 focus:ring-[var(--color-accent-soft)] transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-2">
                    <CalendarDays className="h-3 w-3" /> Issue Date
                  </label>
                  <Input 
                    type="date"
                    value={currentDoc.issueDate ? new Date(currentDoc.issueDate).toISOString().split('T')[0] : ""} 
                    onChange={(e) => handleUpdateField('issueDate', e.target.value)}
                    className="rounded-xl h-11"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-2">
                    <Hash className="h-3 w-3" /> Invoice #
                  </label>
                  <Input 
                    value={currentDoc.documentNumber || ""} 
                    onChange={(e) => handleUpdateField('documentNumber', e.target.value)}
                    className="rounded-xl h-11"
                    placeholder="e.g. INV-123"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4 p-4 bg-[var(--color-panel)] rounded-2xl border border-[var(--color-border)]">
                 <div className="space-y-2">
                  <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)] flex items-center gap-2">
                    <Coins className="h-3 w-3" /> Gross Amount
                  </label>
                  <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold opacity-40">{currency}</div>
                    <Input 
                      type="number"
                      value={currentDoc.gross || ""} 
                      onChange={(e) => handleUpdateField('gross', Number(e.target.value))}
                      className="rounded-xl h-11 pl-12 font-bold text-lg"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                   <label className="text-xs font-bold uppercase tracking-wider text-[var(--color-muted-foreground)]">VAT Amount</label>
                   <div className="relative">
                    <div className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-bold opacity-40">{currency}</div>
                    <Input 
                      type="number"
                      value={currentDoc.vat || ""} 
                      onChange={(e) => handleUpdateField('vat', Number(e.target.value))}
                      className="rounded-xl h-11 pl-12"
                    />
                  </div>
                </div>
              </div>
            </div>
          </Card>

          {/* Tax Lines Section */}
          <Card className="p-6">
             <div className="flex items-center justify-between mb-4">
                <h4 className="text-sm font-bold uppercase tracking-widest text-[var(--color-muted-foreground)]">Tax Breakdown</h4>
                <Button variant="ghost" className="text-xs h-7 px-2">+ Add Line</Button>
             </div>
             <div className="space-y-3">
                {currentDoc.taxLines.length === 0 ? (
                  <p className="text-xs text-[var(--color-muted-foreground)] bg-white border border-dashed p-4 rounded-xl text-center">
                    No specific tax lines detected.
                  </p>
                ) : (
                  currentDoc.taxLines.map(line => (
                    <div key={line.id} className="flex items-center gap-3 p-3 bg-white border border-[var(--color-border)] rounded-xl group hover:border-[var(--color-accent)] transition-colors">
                       <span className="flex h-8 w-8 items-center justify-center rounded-lg bg-[var(--color-panel)] text-[10px] font-bold text-[var(--color-muted-foreground)]">
                          {line.rate}%
                       </span>
                       <div className="flex-1">
                          <div className="text-xs font-semibold">{line.label || "Standard Rate"}</div>
                          <div className="text-[10px] text-[var(--color-muted-foreground)]">{formatCurrency(line.netAmount, currency)} net</div>
                       </div>
                       <div className="text-sm font-bold">{formatCurrency(line.taxAmount, currency)}</div>
                    </div>
                  ))
                )}
             </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
