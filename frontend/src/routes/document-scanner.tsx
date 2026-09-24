import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useState, useRef, useCallback, useEffect, useSyncExternalStore } from "react";
import { AppShell } from "@/components/AppShell";
import { app, useApp } from "@/lib/store";
import { mapDocTypeToDocKey, DOCUMENT_KEYS, DOCUMENT_LABELS, type DocKey } from "@/lib/data";
import { useUserProfile } from "@/lib/userProfileStore";
import { API_BASE_URL } from "@/lib/api";
import { z } from "zod";

const scannerSearchSchema = z.object({
  target: z.string().optional(),
  reset: z.union([z.boolean(), z.string()]).optional(),
});

export const Route = createFileRoute("/document-scanner")({
  validateSearch: scannerSearchSchema,
  head: () => ({ meta: [{ title: "Document Scanner — WelfareIntel" }] }),
  component: DocumentScannerPage,
});

/* ------------------------------------------------------------------ */
/*  Types                                                              */
/* ------------------------------------------------------------------ */

type ScannedField = {
  key: string;
  label: string;
  value: string;
  confidence?: "high" | "medium" | "low";
};

type ScanResult = {
  success: boolean;
  document_type: string;
  document_type_label: string;
  fields: ScannedField[];
  photo: string | null;
  preview_url?: string | null;
  error?: string;
};

const SCAN_CATEGORY_OPTIONS: { key: string; en: string; ta: string }[] = [
  { key: "aadhaar", en: "Aadhaar Card", ta: "ஆதார் அட்டை" },
  { key: "nativity", en: "Nativity Certificate", ta: "பூர்வீக சான்றிதழ்" },
  { key: "community", en: "Community Certificate", ta: "சமூக சான்றிதழ்" },
  { key: "income", en: "Income Certificate", ta: "வருமான சான்றிதழ்" },
  { key: "marksheet10", en: "Class 10 Marksheet", ta: "10ம் வகுப்பு மதிப்பெண் சான்று" },
  { key: "marksheet12", en: "Class 12 Marksheet", ta: "12ம் வகுப்பு மதிப்பெண் சான்று" },
  { key: "tc", en: "Transfer Certificate (TC)", ta: "மாற்று சான்றிதழ்" },
  { key: "bonafide", en: "Bonafide Student Certificate", ta: "மாணவர் உண்மைச் சான்று" },
  { key: "emis", en: "School EMIS ID Certificate", ta: "பள்ளி EMIS எண்" },
  { key: "firstGraduate", en: "First Graduate Certificate", ta: "முதல் பட்டதாரி சான்றிதழ்" },
  { key: "bankPassbook", en: "Bank Passbook", ta: "வங்கி கணக்கு புத்தகம்" },
  { key: "pan", en: "PAN Card", ta: "பான் கார்டு" },
  { key: "smart_card", en: "Ration / Smart Card", ta: "குடும்ப அட்டை / ஸ்மார்ட் கார்டு" },
  { key: "voter_id", en: "Voter ID Card", ta: "வாக்காளர் அடையாள அட்டை" },
  { key: "driving_license", en: "Driving License", ta: "ஓட்டுநர் உரிமம்" },
  { key: "other", en: "Other Official Document", ta: "பிற ஆவணம்" },
];

function DocumentPreviewBox({
  src,
  fileName,
  className,
}: {
  src?: string | null;
  fileName?: string;
  className?: string;
}) {
  if (!src && !fileName) return null;

  const isPdfDataUrl = src?.startsWith("data:application/pdf");
  const isPdfFile = fileName?.toLowerCase().endsWith(".pdf");

  if (isPdfDataUrl || (isPdfFile && (!src || !src.startsWith("data:image")))) {
    return (
      <div className={`flex flex-col items-center justify-center gap-3 bg-primary/5 p-6 rounded-2xl border border-primary/20 ${className || ""}`}>
        <div className="grid h-16 w-16 place-items-center rounded-2xl bg-red-500/10 text-red-500 border border-red-500/20 shadow-sm">
          <span className="text-xl font-bold">PDF</span>
        </div>
        <div className="text-xs font-semibold text-foreground text-center break-all max-w-[200px]">
          📄 {fileName || "Document.pdf"}
        </div>
      </div>
    );
  }

  return (
    <img
      src={src || ""}
      alt={fileName || "Scanned document"}
      className={className || "w-full object-contain"}
    />
  );
}

type ScanStep = "upload" | "scanning" | "results";

/* ------------------------------------------------------------------ */
/*  Global State for Background Scanning                               */
/* ------------------------------------------------------------------ */

type ScannerState = {
  step: ScanStep;
  file: File | null;
  preview: string | null;
  result: ScanResult | null;
  editedFields: ScannedField[];
  selectedCategory: string;
  photoAccepted: boolean | null;
  error: string | null;
  saved: boolean;
  targetDocKey: string | null;
};

const INITIAL_SCANNER_STATE: ScannerState = {
  step: "upload",
  file: null,
  preview: null,
  result: null,
  editedFields: [],
  selectedCategory: "other",
  photoAccepted: null,
  error: null,
  saved: false,
  targetDocKey: null,
};

let scannerState = { ...INITIAL_SCANNER_STATE };
const scannerListeners = new Set<() => void>();

const scannerStore = {
  subscribe(listener: () => void) {
    scannerListeners.add(listener);
    return () => scannerListeners.delete(listener);
  },
  getSnapshot() {
    return scannerState;
  },
  update(partial: Partial<ScannerState>) {
    scannerState = { ...scannerState, ...partial };
    scannerListeners.forEach((l) => l());
  },
  reset(targetDocKey: string | null = null) {
    scannerState = {
      ...INITIAL_SCANNER_STATE,
      targetDocKey: targetDocKey || null,
      selectedCategory: targetDocKey || "other",
    };
    scannerListeners.forEach((l) => l());
  },
};

/* ------------------------------------------------------------------ */
/*  Page                                                               */
/* ------------------------------------------------------------------ */

function DocumentScannerPage() {
  const { lang, user, uploadedDocs } = useApp();
  const search = Route.useSearch();
  const [showExistingConflict, setShowExistingConflict] = useState(false);
  const state = useSyncExternalStore(
    scannerStore.subscribe,
    scannerStore.getSnapshot,
    scannerStore.getSnapshot,
  );
  const inputRef = useRef<HTMLInputElement>(null);

  const {
    step,
    file,
    preview,
    result,
    editedFields,
    selectedCategory,
    photoAccepted,
    error,
    saved,
    targetDocKey,
  } = state;

  // React to search params navigation (e.g. from [Scan Document] on another card)
  useEffect(() => {
    const isReset = search.reset === true || search.reset === "true";
    if (isReset || (search.target && search.target !== targetDocKey)) {
      scannerStore.reset(search.target || null);
    }
  }, [search.target, search.reset, targetDocKey]);

  /* ---------- file handling ---------- */

  const handleFile = useCallback((f: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      scannerStore.update({
        file: f,
        error: null,
        saved: false,
        photoAccepted: null,
        preview: e.target?.result as string,
      });
    };
    reader.readAsDataURL(f);
  }, []);

  const handleDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      const f = e.dataTransfer.files?.[0];
      if (f) handleFile(f);
    },
    [handleFile],
  );

  const handleClearFile = useCallback(() => {
    scannerStore.update({
      file: null,
      preview: null,
      error: null,
    });
    if (inputRef.current) {
      inputRef.current.value = "";
    }
  }, []);

  /* ---------- scan ---------- */

  const handleScan = async () => {
    if (!file) return;
    scannerStore.update({ step: "scanning", error: null });

    try {
      const form = new FormData();
      form.append("file", file);

      const res = await fetch(`${API_BASE_URL}/api/scan-document`, {
        method: "POST",
        body: form,
      });

      const data: ScanResult = await res.json();

      if (!data.success) {
        scannerStore.update({
          error: data.error || "Scanning failed. Please try again.",
          step: "upload",
        });
        return;
      }

      const detectedKey = mapDocTypeToDocKey(data.document_type) || data.document_type || "other";
      const initialCategory = targetDocKey || detectedKey || "other";

      scannerStore.update({
        result: data,
        editedFields: data.fields.map((f) => ({ ...f })),
        selectedCategory: initialCategory,
        step: "results",
        preview: data.preview_url || preview,
      });
    } catch (err) {
      console.error(err);
      scannerStore.update({
        error: "Could not connect to the scanner service. Make sure the backend is running.",
        step: "upload",
      });
    }
  };

  /* ---------- save ---------- */

  const targetCategoryKey = selectedCategory || (result ? mapDocTypeToDocKey(result.document_type) : null) || "other";
  const existingDoc = targetCategoryKey && targetCategoryKey !== "other" ? (uploadedDocs as any)[targetCategoryKey] : null;

  const handleSave = () => {
    if (!result) return;
    if (existingDoc && !showExistingConflict) {
      setShowExistingConflict(true);
      return;
    }
    executeSave(true);
  };

  const executeSave = (replaceExisting: boolean) => {
    if (!result) return;
    const finalKey = selectedCategory || (targetDocKey ? targetDocKey : result.document_type);
    const docKey = finalKey === "other" ? `custom_${Date.now()}` : finalKey;

    const matchedOption = SCAN_CATEGORY_OPTIONS.find((o) => o.key === finalKey);
    const categoryLabel = matchedOption ? matchedOption[lang] : (result.document_type_label || finalKey);

    if (replaceExisting) {
      app.saveScannedDocument(docKey, {
        owner: user?.email,
        documentType: finalKey,
        documentTypeLabel: categoryLabel,
        fields: editedFields,
        photo: photoAccepted && result.photo ? result.photo : undefined,
        preview: preview || undefined,
        scannedAt: Date.now(),
      });
    }

    if (photoAccepted && result.photo) {
      app.acceptDocumentPhoto(result.photo);
    }

    const profileUpdates: Record<string, string> = {};
    editedFields.forEach((f) => {
      if (f.key === "name") profileUpdates["fullName"] = f.value;
      else if (f.key === "dob") profileUpdates["dateOfBirth"] = f.value;
      else if (f.key === "gender") profileUpdates["gender"] = f.value;
      else if (f.key === "aadhaar_number") profileUpdates["aadhaarNumber"] = f.value;
      else if (f.key === "pan_number") profileUpdates["panNumber"] = f.value;
      else if (f.key === "mobile_number") profileUpdates["mobileNumber"] = f.value;
      else if (f.key === "annual_income") profileUpdates["annualIncome"] = f.value;
      else if (f.key === "certificate_number") profileUpdates["certificateNumber"] = f.value;
      else if (f.key === "smart_card_number") profileUpdates["smartCardNumber"] = f.value;
      else if (f.key === "epic_number") profileUpdates["voterIdNumber"] = f.value;
      else if (f.key === "dl_number") profileUpdates["drivingLicenseNumber"] = f.value;
      else profileUpdates[f.key] = f.value;
    });
    useUserProfile.getState().updateProfile(profileUpdates);

    setShowExistingConflict(false);
    scannerStore.update({ saved: true });
  };

  /* ---------- reset ---------- */

  const handleReset = () => {
    scannerStore.reset(null);
  };

  return (
    <AppShell>
      {/* Hero header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-2 rounded-full bg-accent/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              <ScannerIcon className="h-3.5 w-3.5" />
              {lang === "en" ? "AI Document Scanner" : "AI ஆவண ஸ்கேனர்"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              {lang === "en" ? "Scan & Auto-Fill" : "ஸ்கேன் & தானியங்கு நிரப்பு"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {lang === "en"
                ? "Upload any document — Aadhaar, certificates, marksheets — local Qwen AI reads it, extracts fields, and saves it directly to your Document Vault."
                : "எந்த ஆவணத்தையும் பதிவேற்றுங்கள் — ஆதார், சான்றிதழ்கள், மதிப்பெண் சான்றுகள் — AI படித்து, தானாகவே நிரப்பும்."}
            </p>
          </div>
          {step !== "upload" && (
            <div className="flex items-center gap-2">
              <button
                onClick={handleReset}
                className="rounded-xl border border-border bg-card px-4 py-2 text-sm font-semibold text-foreground hover:bg-surface-muted transition flex items-center gap-1.5 shadow-sm"
              >
                <span>↻</span>
                <span>{lang === "en" ? "Scan New Document" : "புதிதாக ஸ்கேன்"}</span>
              </button>
              <Link
                to="/upgrade"
                className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-2 text-sm font-semibold text-primary hover:bg-primary/20 transition flex items-center gap-1.5"
              >
                <span>📂</span>
                <span>{lang === "en" ? "Document Vault" : "ஆவண பெட்டகம்"}</span>
              </Link>
            </div>
          )}
        </div>

        {/* Step indicator */}
        <div className="mt-6 flex items-center gap-2">
          {(["upload", "scanning", "results"] as ScanStep[]).map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={`grid h-8 w-8 place-items-center rounded-full text-xs font-bold transition-all duration-300 ${
                  step === s
                    ? "gradient-hero text-primary-foreground shadow-glow scale-110"
                    : i < ["upload", "scanning", "results"].indexOf(step)
                      ? "bg-success text-success-foreground"
                      : "bg-surface-muted text-muted-foreground"
                }`}
              >
                {i < ["upload", "scanning", "results"].indexOf(step) ? "✓" : i + 1}
              </div>
              <span
                className={`text-xs font-medium ${
                  step === s ? "text-foreground" : "text-muted-foreground"
                }`}
              >
                {s === "upload"
                  ? lang === "en" ? "Upload" : "பதிவேற்று"
                  : s === "scanning"
                    ? lang === "en" ? "Scanning" : "ஸ்கேனிங்"
                    : lang === "en" ? "Results" : "முடிவுகள்"}
              </span>
              {i < 2 && (
                <div
                  className={`h-0.5 w-8 rounded-full transition-colors duration-300 ${
                    i < ["upload", "scanning", "results"].indexOf(step)
                      ? "bg-success"
                      : "bg-surface-muted"
                  }`}
                />
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Error toast */}
      <AnimatePresence>
        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            className="mt-4 rounded-2xl border border-destructive/30 bg-destructive/10 px-5 py-3 text-sm text-destructive flex items-center justify-between"
          >
            <span>⚠ {error}</span>
            <button
              onClick={() => scannerStore.update({ error: null })}
              className="text-xs underline ml-4 hover:opacity-80"
            >
              Dismiss
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Content area */}
      <div className="mt-8">
        <AnimatePresence mode="wait">
          {step === "upload" && (
            <UploadStep
              key="upload"
              lang={lang}
              preview={preview}
              file={file}
              targetDocKey={targetDocKey}
              inputRef={inputRef}
              onFile={handleFile}
              onDrop={handleDrop}
              onScan={handleScan}
              onClearFile={handleClearFile}
            />
          )}
          {step === "scanning" && (
            <ScanningStep key="scanning" lang={lang} preview={preview} />
          )}
          {step === "results" && result && (
            <ResultsStep
              key="results"
              lang={lang}
              result={result}
              preview={preview}
              selectedCategory={selectedCategory}
              onCategoryChange={(cat) => scannerStore.update({ selectedCategory: cat })}
              editedFields={editedFields}
              setEditedFields={(update) => {
                const newFields = typeof update === "function" ? update(editedFields) : update;
                scannerStore.update({ editedFields: newFields });
              }}
              photoAccepted={photoAccepted}
              setPhotoAccepted={(val) => scannerStore.update({ photoAccepted: val })}
              onSave={handleSave}
              onScanAnother={handleReset}
              saved={saved}
            />
          )}
        </AnimatePresence>
      </div>

      {/* Existing document conflict modal */}
      <AnimatePresence>
        {showExistingConflict && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong border border-border shadow-2xl rounded-3xl p-6 max-w-md w-full"
            >
              <div className="flex items-center gap-3 mb-3 text-amber-500">
                <span className="text-2xl">⚠️</span>
                <h3 className="font-display font-bold text-lg text-foreground">
                  {lang === "en" ? "An existing document is already available." : "ஏற்கனவே ஒரு ஆவணம் உள்ளது."}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                {lang === "en"
                  ? `An existing document "${existingDoc?.name}" is already available for this category. Do you want to keep the existing document or replace it with this newly scanned one?`
                  : `இந்த வகைக்கு "${existingDoc?.name}" ஏற்கனவே உள்ளது. பழைய ஆவணத்தை வைத்திருக்க விரும்புகிறீர்களா அல்லது புதியதுடன் மாற்ற விரும்புகிறீர்களா?`}
              </p>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={() => executeSave(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                >
                  {lang === "en" ? "Keep Existing" : "இருப்பதை வை"}
                </button>
                <button
                  onClick={() => executeSave(true)}
                  className="rounded-xl gradient-hero px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition"
                >
                  {lang === "en" ? "Replace with New" : "புதியதுடன் மாற்று"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

/* ================================================================== */
/*  Step 1 — Upload                                                    */
/* ================================================================== */

function UploadStep({
  lang,
  preview,
  file,
  targetDocKey,
  inputRef,
  onFile,
  onDrop,
  onScan,
  onClearFile,
}: {
  lang: "en" | "ta";
  preview: string | null;
  file: File | null;
  targetDocKey: string | null;
  inputRef: React.RefObject<HTMLInputElement | null>;
  onFile: (f: File) => void;
  onDrop: (e: React.DragEvent) => void;
  onScan: () => void;
  onClearFile: () => void;
}) {
  const [dragOver, setDragOver] = useState(false);
  const targetLabel = targetDocKey ? DOCUMENT_LABELS[targetDocKey as DocKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      {/* Targeted banner if user clicked scan from a specific card in upgrade */}
      {targetLabel && (
        <div className="mb-5 flex items-center justify-between rounded-2xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-primary shadow-sm">
          <div className="flex items-center gap-2.5">
            <span className="text-base">🎯</span>
            <div>
              <div className="font-semibold text-foreground">
                {lang === "en" ? "Scanning for:" : "இலக்கு ஆவணம்:"}{" "}
                <span className="text-primary font-bold">{targetLabel[lang]}</span>
              </div>
              <div className="text-[11px] text-muted-foreground">
                {lang === "en"
                  ? "This document will be saved directly into this card in your Document Vault."
                  : "இந்த ஆவணம் உங்கள் ஆவண பெட்டகத்தில் இந்த அட்டைக்கு நேரடியாக சேமிக்கப்படும்."}
              </div>
            </div>
          </div>
          <button
            onClick={() => scannerStore.reset(null)}
            className="rounded-lg bg-surface px-2.5 py-1 text-[11px] font-semibold text-muted-foreground hover:text-foreground transition border border-border"
          >
            {lang === "en" ? "✕ Clear target" : "✕ நீக்கு"}
          </button>
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Drop zone */}
        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={(e) => {
            setDragOver(false);
            onDrop(e);
          }}
          onClick={() => inputRef.current?.click()}
          className={`group relative cursor-pointer rounded-3xl border-2 border-dashed p-10 text-center transition-all duration-300 ${
            dragOver
              ? "border-primary bg-primary/5 scale-[1.01]"
              : preview
                ? "border-success/40 bg-success/5"
                : "border-border bg-surface-muted/30 hover:border-primary/50 hover:bg-surface-muted/50"
          }`}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf"
            className="hidden"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) onFile(f);
              e.currentTarget.value = "";
            }}
          />

          {preview ? (
            <div className="flex flex-col items-center gap-3">
              <div className="relative overflow-hidden rounded-2xl shadow-card">
                <DocumentPreviewBox
                  src={preview}
                  fileName={file?.name}
                  className="max-h-72 w-auto object-contain"
                />
                <div className="absolute inset-0 rounded-2xl ring-2 ring-success/30" />
              </div>
              <div className="text-sm font-medium text-success">
                ✓ {file?.name || "Document Ready"}
              </div>
              <div className="text-xs text-muted-foreground">
                {lang === "en"
                  ? "Click or drop another file to replace"
                  : "மாற்ற கிளிக் அல்லது கோப்பை இழுக்கவும்"}
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center gap-4 py-8">
              <div className="grid h-20 w-20 place-items-center rounded-3xl bg-primary-soft text-primary transition-transform group-hover:scale-110">
                <UploadIcon className="h-10 w-10" />
              </div>
              <div>
                <div className="font-display text-lg font-semibold">
                  {lang === "en"
                    ? "Drop your document here"
                    : "ஆவணத்தை இங்கே வைக்கவும்"}
                </div>
                <div className="mt-1 text-sm text-muted-foreground">
                  {lang === "en"
                    ? "or click to browse — JPG, PNG, PDF supported"
                    : "அல்லது உலாவ கிளிக் — JPG, PNG, PDF"}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Quick Sample Test Documents */}
        <div className="rounded-2xl border border-dashed border-primary/30 bg-primary/5 p-4">
          <div className="flex items-center justify-between mb-2.5">
            <span className="text-xs font-bold text-primary flex items-center gap-1.5">
              <span>🧪</span>
              <span>{lang === "en" ? "Quick Test with Dummy Files (1-Click)" : "மாதிரி கோப்புடன் விரைவு சோதனை"}</span>
            </span>
            <span className="text-[11px] text-muted-foreground">
              {lang === "en" ? "Realistic government documents for demo" : "டெமோவுக்கான மாதிரி ஆவணங்கள்"}
            </span>
          </div>
          <div className="flex flex-wrap gap-2">
            {[
              { id: "01_aadhaar_card.jpg", label: "📄 Aadhaar Card" },
              { id: "02_community_certificate.jpg", label: "📜 Community Cert" },
              { id: "03_income_certificate.jpg", label: "💰 Income Cert" },
              { id: "05_class_10_marksheet.jpg", label: "🎓 10th Marksheet" },
              { id: "06_class_12_marksheet.jpg", label: "🎓 12th Marksheet" },
              { id: "11_bank_passbook.jpg", label: "💳 Bank Passbook" },
              { id: "04_nativity_certificate.jpg", label: "📍 Nativity Cert" },
              { id: "08_bonafide_certificate.jpg", label: "🏫 Bonafide Cert" },
            ].map((s) => (
              <button
                key={s.id}
                type="button"
                onClick={async (e) => {
                  e.stopPropagation();
                  try {
                    const res = await fetch(`${API_BASE_URL}/sample-documents/${s.id}`);
                    const blob = await res.blob();
                    const sampleFile = new File([blob], s.id, { type: "image/jpeg" });
                    onFile(sampleFile);
                  } catch (err) {
                    console.error("Failed to load sample doc", err);
                  }
                }}
                className="rounded-xl border border-border bg-card/90 px-3 py-1.5 text-xs font-medium text-foreground hover:border-primary hover:text-primary transition flex items-center gap-1.5"
              >
                <span>{s.label}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Info panel */}
        <div className="flex flex-col gap-4">
          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold mb-4">
              {lang === "en" ? "How it works" : "எப்படி வேலை செய்கிறது"}
            </h3>
            <div className="space-y-3">
              {[
                {
                  icon: "📤",
                  en: "Upload any document (Aadhaar, Marksheets, Certificates)",
                  ta: "எந்த ஆவணத்தையும் பதிவேற்றுங்கள்",
                },
                {
                  icon: "🤖",
                  en: "Local Qwen Vision reads and extracts all fields privately",
                  ta: "உள்ளூர் Qwen Vision ஆவணத்தை படித்து புலங்களை பிரித்தெடுக்கிறது",
                },
                {
                  icon: "✏️",
                  en: "Review, edit, and confirm the document category",
                  ta: "மதிப்பாய்வு செய்து ஆவண வகையை உறுதிப்படுத்தவும்",
                },
                {
                  icon: "💾",
                  en: "Saved instantly to your Document Vault for auto-filling",
                  ta: "தானியங்கு நிரப்புதலுக்கு உங்கள் பெட்டகத்தில் சேமிக்கப்படும்",
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="flex items-start gap-3 rounded-2xl bg-surface-muted/60 p-3"
                >
                  <span className="mt-0.5 grid h-8 w-8 shrink-0 place-items-center rounded-xl bg-primary-soft text-sm">
                    {item.icon}
                  </span>
                  <span className="text-sm">{item[lang]}</span>
                </div>
              ))}
            </div>
          </div>

          <div className="glass rounded-3xl p-6">
            <h3 className="font-display text-base font-semibold mb-3">
              {lang === "en" ? "Supported documents" : "ஆதரிக்கப்படும் ஆவணங்கள்"}
            </h3>
            <div className="flex flex-wrap gap-2">
              {[
                "Aadhaar Card",
                "Community Certificate",
                "Income Certificate",
                "Nativity Certificate",
                "Class 10 Marksheet",
                "Class 12 Marksheet",
                "Transfer Certificate (TC)",
                "Bonafide Certificate",
                "EMIS Number",
                "Bank Passbook",
                "PAN Card",
              ].map((doc) => (
                <span
                  key={doc}
                  className="rounded-full bg-surface-muted px-2.5 py-1 text-[11px] font-medium text-muted-foreground"
                >
                  {doc}
                </span>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* Scan and Clear buttons */}
      {preview && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-6 flex flex-wrap items-center justify-center gap-4"
        >
          <motion.button
            whileHover={{ scale: 1.03 }}
            whileTap={{ scale: 0.97 }}
            onClick={onScan}
            className="gradient-hero flex items-center gap-3 rounded-2xl px-10 py-4 text-base font-semibold text-primary-foreground shadow-glow"
          >
            <ScannerIcon className="h-5 w-5" />
            {lang === "en" ? "Scan Document with AI" : "AI மூலம் ஆவணத்தை ஸ்கேன் செய்"}
          </motion.button>

          <button
            onClick={onClearFile}
            className="rounded-2xl border border-border bg-card px-5 py-3.5 text-sm font-semibold text-muted-foreground hover:text-destructive hover:border-destructive/30 transition flex items-center gap-1.5 shadow-sm"
          >
            <span>✕</span>
            <span>{lang === "en" ? "Choose Different File" : "வேறு கோப்பை தேர்வு செய்"}</span>
          </button>
        </motion.div>
      )}
    </motion.div>
  );
}

/* ================================================================== */
/*  Step 2 — Scanning Animation                                        */
/* ================================================================== */

function ScanningStep({
  lang,
  preview,
}: {
  lang: "en" | "ta";
  preview: string | null;
}) {
  return (
    <motion.div
      initial={{ opacity: 0, scale: 0.96 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.96 }}
      transition={{ duration: 0.3 }}
      className="flex flex-col items-center gap-8"
    >
      {/* Scanning preview */}
      <div className="relative overflow-hidden rounded-3xl shadow-card">
        {preview && (
          <DocumentPreviewBox
            src={preview}
            className="max-h-96 w-auto object-contain opacity-80"
          />
        )}
        {/* Scanner line */}
        <motion.div
          className="absolute left-0 right-0 h-1 bg-gradient-to-r from-transparent via-primary to-transparent shadow-[0_0_20px_var(--color-primary)]"
          initial={{ top: "0%" }}
          animate={{ top: ["0%", "100%", "0%"] }}
          transition={{
            duration: 2.5,
            repeat: Infinity,
            ease: "easeInOut",
          }}
        />
        {/* Glassmorphism overlay */}
        <div className="absolute inset-0 bg-gradient-to-b from-primary/5 via-transparent to-primary/5 backdrop-blur-[1px]" />
        {/* Corner markers */}
        <div className="absolute top-3 left-3 h-6 w-6 border-t-2 border-l-2 border-primary rounded-tl-lg" />
        <div className="absolute top-3 right-3 h-6 w-6 border-t-2 border-r-2 border-primary rounded-tr-lg" />
        <div className="absolute bottom-3 left-3 h-6 w-6 border-b-2 border-l-2 border-primary rounded-bl-lg" />
        <div className="absolute bottom-3 right-3 h-6 w-6 border-b-2 border-r-2 border-primary rounded-br-lg" />
      </div>

      {/* Status */}
      <div className="flex flex-col items-center gap-3">
        <div className="flex items-center gap-3">
          <motion.div
            className="h-3 w-3 rounded-full bg-primary"
            animate={{ scale: [1, 1.4, 1], opacity: [1, 0.5, 1] }}
            transition={{ duration: 1.2, repeat: Infinity }}
          />
          <span className="font-display text-lg font-semibold">
            {lang === "en" ? "Local AI is reading your document..." : "உள்ளூர் AI உங்கள் ஆவணத்தைப் படிக்கிறது..."}
          </span>
        </div>
        <div className="flex flex-wrap justify-center gap-2">
          {[
            { en: "Analyzing visual structure", ta: "காட்சி அமைப்பை பகுப்பாய்வு செய்கிறது", delay: 0 },
            { en: "Extracting text fields with Qwen", ta: "Qwen மூலம் புலங்களை பிரித்தெடுக்கிறது", delay: 1 },
            { en: "Formatting data for profile", ta: "சுயவிவரத்திற்காக வடிவமைக்கிறது", delay: 2 },
          ].map((item, i) => (
            <motion.span
              key={i}
              initial={{ opacity: 0.3 }}
              animate={{ opacity: [0.3, 1, 0.3] }}
              transition={{
                duration: 2,
                repeat: Infinity,
                delay: item.delay * 0.8,
              }}
              className="rounded-full bg-surface-muted px-3 py-1 text-xs text-muted-foreground"
            >
              {item[lang]}
            </motion.span>
          ))}
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Step 3 — Results                                                   */
/* ================================================================== */

function ResultsStep({
  lang,
  result,
  preview,
  selectedCategory,
  onCategoryChange,
  editedFields,
  setEditedFields,
  photoAccepted,
  setPhotoAccepted,
  onSave,
  onScanAnother,
  saved,
}: {
  lang: "en" | "ta";
  result: ScanResult;
  preview: string | null;
  selectedCategory: string;
  onCategoryChange: (cat: string) => void;
  editedFields: ScannedField[];
  setEditedFields: React.Dispatch<React.SetStateAction<ScannedField[]>>;
  photoAccepted: boolean | null;
  setPhotoAccepted: (v: boolean | null) => void;
  onSave: () => void;
  onScanAnother: () => void;
  saved: boolean;
}) {
  const updateField = (idx: number, value: string) => {
    setEditedFields((prev) =>
      prev.map((f, i) => (i === idx ? { ...f, value } : f)),
    );
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 16 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -16 }}
      transition={{ duration: 0.3 }}
    >
      {/* Document type detection and category selector */}
      <div className="mb-6 rounded-3xl border border-border/80 bg-card/60 p-5 backdrop-blur-md shadow-card">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3.5">
            <div className="grid h-12 w-12 place-items-center rounded-2xl gradient-hero text-xl text-primary-foreground shadow-glow">
              📄
            </div>
            <div>
              <div className="font-display text-xl font-bold">
                {result.document_type_label || "Detected Document"}{" "}
                <span className="text-sm font-normal text-success">
                  {lang === "en" ? "— AI Detected" : "— AI கண்டறியப்பட்டது"}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-0.5">
                {editedFields.length}{" "}
                {lang === "en" ? "fields extracted and ready to verify" : "புலங்கள் பிரித்தெடுக்கப்பட்டு சரிபார்க்க தயார்"}
              </div>
            </div>
          </div>

          {/* Target Category Selector */}
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-2">
            <label className="text-xs font-semibold text-muted-foreground">
              {lang === "en" ? "Assign to Vault Card:" : "பெட்டக அட்டைக்கு ஒதுக்கு:"}
            </label>
            <select
              value={selectedCategory}
              onChange={(e) => onCategoryChange(e.target.value)}
              className="rounded-xl border border-primary/30 bg-surface px-3 py-2 text-xs font-semibold text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20 shadow-sm"
            >
              {SCAN_CATEGORY_OPTIONS.map((opt) => (
                <option key={opt.key} value={opt.key}>
                  {opt[lang]}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Left: Document preview */}
        <div className="lg:col-span-1 flex flex-col gap-4">
          {/* Document image preview */}
          {preview && (
            <div className="glass shadow-card rounded-3xl p-4">
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-sm">
                  🖼️
                </div>
                <span className="text-sm font-semibold">
                  {lang === "en" ? "Document Preview" : "ஆவண முன்னோட்டம்"}
                </span>
              </div>
              <div className="overflow-hidden rounded-2xl border border-border">
                <DocumentPreviewBox
                  src={preview}
                  className="w-full object-contain"
                />
              </div>
            </div>
          )}

          {/* Extracted photo */}
          {result.photo && (
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2 }}
              className="glass shadow-card rounded-3xl p-4"
            >
              <div className="mb-3 flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-sm">
                  👤
                </div>
                <span className="text-sm font-semibold">
                  {lang === "en" ? "Photo Found" : "புகைப்படம் கண்டறியப்பட்டது"}
                </span>
              </div>
              <div className="flex justify-center">
                <div className="relative overflow-hidden rounded-2xl border-2 border-primary/30 shadow-card">
                  <img
                    src={result.photo}
                    alt="Extracted face"
                    className="h-32 w-32 object-cover"
                  />
                </div>
              </div>
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {lang === "en"
                  ? "Use this photo for all forms?"
                  : "இந்த புகைப்படத்தை எல்லா படிவங்களிலும் பயன்படுத்தவா?"}
              </p>
              {photoAccepted === null ? (
                <div className="mt-3 flex gap-2">
                  <button
                    onClick={() => setPhotoAccepted(true)}
                    className="flex-1 rounded-xl bg-success/15 px-3 py-2 text-xs font-semibold text-success hover:bg-success/25 transition"
                  >
                    ✓ {lang === "en" ? "Accept" : "ஏற்கவும்"}
                  </button>
                  <button
                    onClick={() => setPhotoAccepted(false)}
                    className="flex-1 rounded-xl bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                  >
                    ✕ {lang === "en" ? "Reject" : "நிராகரி"}
                  </button>
                </div>
              ) : (
                <div
                  className={`mt-3 rounded-xl p-2 text-center text-xs font-semibold ${
                    photoAccepted
                      ? "bg-success/15 text-success"
                      : "bg-surface-muted text-muted-foreground"
                  }`}
                >
                  {photoAccepted
                    ? lang === "en" ? "✓ Photo accepted" : "✓ புகைப்படம் ஏற்றுக்கொள்ளப்பட்டது"
                    : lang === "en" ? "Photo will not be used" : "புகைப்படம் பயன்படுத்தப்படாது"}
                </div>
              )}
            </motion.div>
          )}
        </div>

        {/* Right: Editable fields */}
        <div className="lg:col-span-2">
          <div className="glass shadow-card rounded-3xl p-6">
            <div className="mb-5 flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="grid h-8 w-8 place-items-center rounded-lg bg-primary-soft text-sm">
                  ✏️
                </div>
                <span className="font-display text-base font-semibold">
                  {lang === "en" ? "Extracted Fields" : "பிரித்தெடுக்கப்பட்ட புலங்கள்"}
                </span>
              </div>
              <span className="text-[11px] text-muted-foreground">
                {lang === "en" ? "All fields are editable" : "எல்லா புலங்களும் திருத்தக்கூடியவை"}
              </span>
            </div>

            <div className="space-y-3">
              {editedFields.map((field, idx) => (
                <motion.div
                  key={field.key}
                  initial={{ opacity: 0, x: -12 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="group rounded-2xl border border-border bg-surface-muted/30 p-4 transition hover:border-primary/30"
                >
                  <div className="mb-2 flex items-center justify-between">
                    <label className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                      {field.label}
                    </label>
                    {field.confidence && (
                      <span
                        className={`rounded-full px-2 py-0.5 text-[10px] font-semibold ${
                          field.confidence === "high"
                            ? "bg-success/15 text-success"
                            : field.confidence === "medium"
                              ? "bg-warning/15 text-warning"
                              : "bg-destructive/10 text-destructive"
                        }`}
                      >
                        {field.confidence === "high"
                          ? "✓ High"
                          : field.confidence === "medium"
                            ? "~ Medium"
                            : "⚠ Low"}
                      </span>
                    )}
                  </div>
                  <input
                    type="text"
                    value={field.value}
                    onChange={(e) => updateField(idx, e.target.value)}
                    className="w-full rounded-xl border border-border bg-card px-4 py-2.5 text-sm font-medium text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/20"
                  />
                </motion.div>
              ))}
            </div>

            {/* Save button and Next Actions */}
            <div className="mt-6 flex flex-col items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                onClick={onSave}
                disabled={saved}
                className={`w-full rounded-2xl px-8 py-3.5 text-base font-semibold shadow-glow transition ${
                  saved
                    ? "bg-success text-success-foreground cursor-default"
                    : "gradient-hero text-primary-foreground"
                }`}
              >
                {saved
                  ? lang === "en"
                    ? "✓ Saved to Profile & Vault!"
                    : "✓ சுயவிவரம் மற்றும் பெட்டகத்தில் சேமிக்கப்பட்டது!"
                  : lang === "en"
                    ? "Save to Profile & Document Vault"
                    : "சுயவிவரத்தில் சேமி"}
              </motion.button>

              {saved ? (
                <motion.div
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="w-full flex flex-col items-center gap-3 pt-2"
                >
                  <div className="rounded-2xl bg-success/15 border border-success/30 px-4 py-3 text-xs text-success font-medium text-center w-full">
                    {lang === "en"
                      ? "✓ Document saved successfully! Matching welfare schemes will now be auto-filled."
                      : "✓ ஆவணம் வெற்றிகரமாக சேமிக்கப்பட்டது! திட்டங்களில் தானாக நிரப்பப்படும்."}
                  </div>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-2">
                    <button
                      onClick={onScanAnother}
                      className="rounded-2xl border-2 border-primary bg-primary/10 hover:bg-primary/20 text-primary px-5 py-3.5 text-sm font-semibold transition flex items-center justify-center gap-2 shadow-sm"
                    >
                      <span>↻</span>
                      <span>{lang === "en" ? "Scan Another Document" : "அடுத்த ஆவணத்தை ஸ்கேன் செய்"}</span>
                    </button>

                    <Link
                      to="/upgrade"
                      className="rounded-2xl gradient-hero text-primary-foreground px-5 py-3.5 text-sm font-semibold transition flex items-center justify-center gap-2 shadow-glow"
                    >
                      <span>📂</span>
                      <span>{lang === "en" ? "Go to Document Vault" : "ஆவண பெட்டகத்திற்கு செல்"}</span>
                    </Link>
                  </div>
                </motion.div>
              ) : (
                <div className="flex items-center justify-between w-full pt-2">
                  <button
                    onClick={onScanAnother}
                    className="text-xs text-muted-foreground hover:text-foreground transition underline flex items-center gap-1"
                  >
                    <span>↻</span>
                    <span>{lang === "en" ? "Discard and scan new" : "புதியதை ஸ்கேன் செய்"}</span>
                  </button>
                  <Link
                    to="/upgrade"
                    className="text-xs text-muted-foreground hover:text-foreground transition underline flex items-center gap-1"
                  >
                    <span>📂</span>
                    <span>{lang === "en" ? "Cancel and return to vault" : "பெட்டகத்திற்கு திரும்பு"}</span>
                  </Link>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

/* ================================================================== */
/*  Icons                                                              */
/* ================================================================== */

function ScannerIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M3 7V5a2 2 0 0 1 2-2h2" />
      <path d="M17 3h2a2 2 0 0 1 2 2v2" />
      <path d="M21 17v2a2 2 0 0 1-2 2h-2" />
      <path d="M7 21H5a2 2 0 0 1-2-2v-2" />
      <line x1="7" y1="12" x2="17" y2="12" />
    </svg>
  );
}

function UploadIcon({ className = "" }: { className?: string }) {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
    >
      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
      <polyline points="17 8 12 3 7 8" />
      <line x1="12" y1="3" x2="12" y2="15" />
    </svg>
  );
}
