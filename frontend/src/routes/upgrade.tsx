import { createFileRoute, Link } from "@tanstack/react-router";
import { motion, AnimatePresence } from "framer-motion";
import { useRef, useState } from "react";
import { AppShell } from "@/components/AppShell";
import { DOCUMENT_KEYS, DOCUMENT_LABELS, type DocKey } from "@/lib/data";
import { app, useApp } from "@/lib/store";

export const Route = createFileRoute("/upgrade")({
  head: () => ({ meta: [{ title: "Document Vault — WelfareIntel" }] }),
  component: UpgradePage,
});

import { useUserProfile } from "@/lib/userProfileStore";

function UpgradePage() {
  const { lang, uploadedDocs } = useApp();
  const uploaded = DOCUMENT_KEYS.filter((d) => uploadedDocs[d]).length;
  const pct = Math.round((uploaded / DOCUMENT_KEYS.length) * 100);

  const [showDummyModal, setShowDummyModal] = useState(false);
  const [dummyList, setDummyList] = useState<any[]>([]);

  const handlePopulateDemo = () => {
    app.populateDemoVault();
    useUserProfile.getState().updateProfile({
      fullName: "Selvan Vijay Kumar",
      dateOfBirth: "15/08/2004",
      gender: "Male",
      aadhaarNumber: "5489 1234 8912",
      annualIncome: "72000",
      community: "BC",
      schoolName: "Government Higher Secondary School, Coimbatore",
      schoolType: "Government",
      mobileNumber: "9876543210",
      emailAddress: "vijay.kumar@example.com",
      address: "42, Anna Salai, Gandhipuram, Coimbatore - 641012, Tamil Nadu",
      currentStandard: "2nd Year B.Sc. Computer Science",
      mediumOfInstruction: "Tamil & English",
      emisNumber: "330208012345",
      bankAccountNumber: "39820194812",
      bankIfsc: "SBIN0001234",
      certificateNumber: "TN-COMM-2026-44819",
    });
  };

  const handleOpenDummyModal = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api/sample-documents");
      if (res.ok) {
        const data = await res.json();
        setDummyList(data);
      }
    } catch (e) {
      console.error(e);
    }
    setShowDummyModal(true);
  };

  return (
    <AppShell>
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="glass-strong rounded-3xl p-8"
      >
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <span className="inline-block rounded-full bg-accent/40 px-3 py-0.5 text-[11px] font-semibold uppercase tracking-wide text-primary">
              {lang === "en" ? "Registration Automation" : "தானியங்கி பதிவு"}
            </span>
            <h1 className="mt-3 font-display text-3xl font-bold md:text-4xl">
              {lang === "en" ? "Document Vault" : "ஆவணக் காப்பகம்"}
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-muted-foreground">
              {lang === "en"
                ? "Upload or scan your documents once. WelfareIntel auto-fills government welfare forms and scholarship applications seamlessly on your device."
                : "ஆவணங்களை ஒரே முறை பதிவேற்றுங்கள் அல்லது ஸ்கேன் செய்யுங்கள். WelfareIntel தானாகவே படிவங்களை நிரப்பும்."}
            </p>
          </div>
          <div className="w-full max-w-xs">
            <div className="mb-1 flex items-center justify-between text-xs text-muted-foreground">
              <span>{lang === "en" ? "Vault readiness" : "தயார்நிலை"}</span>
              <span className="font-semibold text-foreground">{pct}%</span>
            </div>
            <div className="h-2.5 overflow-hidden rounded-full bg-surface-muted">
              <motion.div
                className="h-full gradient-hero"
                initial={{ width: 0 }}
                animate={{ width: `${pct}%` }}
                transition={{ duration: 0.6, ease: "easeOut" }}
              />
            </div>
          </div>
        </div>

        {/* Quick Demo Controls */}
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2.5">
            <span className="text-xl">⚡</span>
            <div>
              <div className="text-xs font-bold text-foreground">
                {lang === "en" ? "Hackathon Testing & Demo Controls" : "சோதனை & டெமோ கட்டுப்பாடுகள்"}
              </div>
              <div className="text-[11px] text-muted-foreground">
                {lang === "en"
                  ? "Pre-fill all 11 document cards with verified dummy files, or view & download sample test documents."
                  : "அனைத்து 11 ஆவண அட்டைகளையும் மாதிரி கோப்புகளுடன் நிரப்பவும்."}
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2">
            <button
              onClick={handlePopulateDemo}
              className="rounded-xl gradient-hero px-4 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition hover:scale-105 flex items-center gap-1.5"
            >
              <span>⚡</span>
              <span>{lang === "en" ? "Populate All 11 Demo Docs" : "11 மாதிரி ஆவணங்களை நிரப்பு"}</span>
            </button>
            <button
              onClick={handleOpenDummyModal}
              className="rounded-xl border border-border bg-card px-3.5 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted transition flex items-center gap-1.5 shadow-sm"
            >
              <span>📁</span>
              <span>{lang === "en" ? "View Dummy Files (11)" : "மாதிரி கோப்புகள் (11)"}</span>
            </button>
            {uploaded > 0 && (
              <button
                onClick={() => app.clearAllDocs()}
                className="rounded-xl border border-destructive/30 bg-destructive/10 px-3 py-2 text-xs font-semibold text-destructive hover:bg-destructive/20 transition"
                title="Clear all uploaded documents"
              >
                ✕ {lang === "en" ? "Clear Vault" : "அழி"}
              </button>
            )}
          </div>
        </div>
      </motion.div>

      <div className="mt-8 grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
        {DOCUMENT_KEYS.map((k, i) => (
          <DocCard key={k} keyId={k} index={i} />
        ))}
      </div>

      {/* DUMMY FILES DOWNLOAD / PREVIEW MODAL */}
      <AnimatePresence>
        {showDummyModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong border border-border shadow-2xl rounded-3xl p-6 max-w-2xl w-full max-h-[85vh] flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">
                    {lang === "en" ? "11 Generated Dummy Test Documents" : "11 மாதிரி சோதனை ஆவணங்கள்"}
                  </h3>
                  <div className="text-xs text-muted-foreground">
                    {lang === "en"
                      ? "Saved in c:\\project\\Welfare-main\\sample_documents\\ — Click to view, download, or scan with AI."
                      : "கணினியில் சேமிக்கப்பட்டுள்ளது — பார்க்க, பதிவிறக்க அல்லது ஸ்கேன் செய்ய கிளிக் செய்க."}
                  </div>
                </div>
                <button
                  onClick={() => setShowDummyModal(false)}
                  className="rounded-full bg-surface-muted p-1.5 text-xs text-muted-foreground hover:text-foreground transition"
                >
                  ✕
                </button>
              </div>

              <div className="mt-4 flex-1 overflow-y-auto space-y-2.5 pr-1">
                {dummyList.map((item, idx) => (
                  <div
                    key={idx}
                    className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-border/80 bg-surface/70 p-3 hover:border-primary/40 transition"
                  >
                    <div className="flex items-center gap-3">
                      <span className="grid h-8 w-8 place-items-center rounded-xl bg-primary/10 text-primary font-bold text-xs">
                        {idx + 1}
                      </span>
                      <div>
                        <div className="text-xs font-bold text-foreground">{item.label}</div>
                        <div className="text-[11px] text-muted-foreground">{item.fileName}</div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noreferrer"
                        className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-muted transition shadow-sm"
                      >
                        👁️ {lang === "en" ? "View" : "பார்"}
                      </a>
                      <a
                        href={item.url}
                        download={item.fileName}
                        className="rounded-xl border border-border bg-card px-3 py-1.5 text-xs font-semibold text-foreground hover:bg-surface-muted transition shadow-sm"
                      >
                        ⬇️ {lang === "en" ? "Download" : "பதிவிறக்கு"}
                      </a>
                      <Link
                        to="/document-scanner"
                        search={{ target: item.docKey, reset: true }}
                        onClick={() => setShowDummyModal(false)}
                        className="rounded-xl gradient-hero px-3 py-1.5 text-xs font-semibold text-primary-foreground shadow-glow transition"
                      >
                        📷 {lang === "en" ? "Scan with AI" : "ஸ்கேன்"}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>

              <div className="mt-4 pt-3 border-t border-border/60 flex items-center justify-between">
                <span className="text-xs text-muted-foreground">
                  Location: <code className="text-[11px] bg-surface-muted px-1.5 py-0.5 rounded">sample_documents/</code>
                </span>
                <button
                  onClick={() => setShowDummyModal(false)}
                  className="rounded-xl gradient-hero px-5 py-2 text-xs font-semibold text-primary-foreground shadow-glow"
                >
                  {lang === "en" ? "Close" : "மூடு"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </AppShell>
  );
}

function DocCard({ keyId, index }: { keyId: DocKey; index: number }) {
  const { lang, uploadedDocs, scannedDocuments } = useApp();
  const inputRef = useRef<HTMLInputElement>(null);
  const doc = uploadedDocs[keyId];
  const label = DOCUMENT_LABELS[keyId];

  // Modals state
  const [showRemoveConfirm, setShowRemoveConfirm] = useState(false);
  const [showReplaceDialog, setShowReplaceDialog] = useState(false);
  const [showReplaceOptions, setShowReplaceOptions] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ name: string; previewUrl: string } | null>(null);

  // Read file from user input
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const previewUrl = event.target?.result as string;
      const fileData = { name: file.name, previewUrl };

      // If document already exists, prompt before replacing
      if (doc) {
        setPendingFile(fileData);
        setShowReplaceDialog(true);
      } else {
        app.uploadDoc(keyId, file.name, previewUrl);
      }
    };
    reader.readAsDataURL(file);
    e.target.value = "";
  };

  const confirmReplaceWithNew = () => {
    if (pendingFile) {
      app.uploadDoc(keyId, pendingFile.name, pendingFile.previewUrl);
      setPendingFile(null);
    }
    setShowReplaceDialog(false);
  };

  const cancelReplace = () => {
    setPendingFile(null);
    setShowReplaceDialog(false);
  };

  const confirmRemove = () => {
    app.removeDoc(keyId);
    setShowRemoveConfirm(false);
  };

  // Find associated scanned document details if present
  const scannedDetails = doc?.scannedDocKey ? scannedDocuments[doc.scannedDocKey] : null;

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.03 }}
      className={`glass shadow-card rounded-3xl p-5 flex flex-col justify-between transition-all duration-200 ${
        doc ? "ring-1 ring-success/40 bg-surface/80" : "border border-border/60 hover:border-primary/30"
      }`}
    >
      <div>
        {/* Card Header */}
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <h3 className="font-display font-semibold text-base text-foreground leading-snug">{label.en}</h3>
            <div className="text-[12px] text-muted-foreground mt-0.5" lang="ta">
              {label.ta}
            </div>
          </div>
          <span
            className={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-xs font-bold transition-colors ${
              doc ? "bg-success text-success-foreground shadow-sm" : "bg-surface-muted text-muted-foreground border border-border/80"
            }`}
          >
            {doc ? "✓" : "○"}
          </span>
        </div>

        {/* Status Indicator Banner */}
        <div className="mt-4">
          {doc ? (
            doc.isNew ? (
              // STATE 4: NEW DOCUMENT ADDED
              <div className="rounded-2xl bg-emerald-500/10 border border-emerald-500/25 p-3.5 text-xs text-emerald-600 dark:text-emerald-400">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-sm font-bold">✓</span>
                  <span>{lang === "en" ? "Document uploaded" : "ஆவணம் பதிவேற்றப்பட்டது"}</span>
                </div>
                <div className="mt-1.5 truncate font-medium text-foreground opacity-90">{doc.name}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(doc.uploadedAt).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })} ·{" "}
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            ) : (
              // STATE 1: DOCUMENT ALREADY AVAILABLE
              <div className="rounded-2xl bg-success/10 border border-success/25 p-3.5 text-xs text-success">
                <div className="flex items-center gap-2 font-semibold">
                  <span className="text-sm font-bold">✓</span>
                  <span>{lang === "en" ? "Document Already Available" : "ஆவணம் ஏற்கனவே உள்ளது"}</span>
                </div>
                <div className="mt-1.5 truncate font-medium text-foreground opacity-90">{doc.name}</div>
                <div className="mt-0.5 text-[10px] text-muted-foreground">
                  {new Date(doc.uploadedAt).toLocaleDateString()}
                </div>
              </div>
            )
          ) : (
            // STATE 2 / STATE 3: NO DOCUMENT EXISTS / REMOVED
            <div className="rounded-2xl bg-surface-muted/60 border border-border/60 p-3.5 text-xs text-muted-foreground">
              <div className="flex items-center gap-2 font-medium">
                <span className="text-sm font-bold">○</span>
                <span>{lang === "en" ? "No document uploaded" : "ஆவணம் எதுவும் பதிவேற்றப்படவில்லை"}</span>
              </div>
              <div className="mt-1.5 text-[11px] text-muted-foreground/80">
                {lang === "en"
                  ? "Upload a digital copy or scan using local AI"
                  : "கோப்பை பதிவேற்றவும் அல்லது AI மூலம் ஸ்கேன் செய்யவும்"}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={inputRef}
        type="file"
        accept="image/*,application/pdf"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Action Options below card */}
      <div className="mt-5 pt-3 border-t border-border/40">
        {doc ? (
          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                app.markDocSeen(keyId);
                setShowViewModal(true);
              }}
              className="flex-1 rounded-xl border border-border/80 bg-surface hover:bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>👁️</span>
              <span>{doc.isNew ? (lang === "en" ? "View" : "பார்") : (lang === "en" ? "View Document" : "ஆவணத்தைப் பார்")}</span>
            </button>
            <button
              onClick={() => setShowReplaceOptions(true)}
              className="flex-1 rounded-xl border border-primary/30 bg-primary/10 hover:bg-primary/20 px-3 py-2 text-xs font-semibold text-primary transition flex items-center justify-center gap-1"
            >
              <span>🔄</span>
              <span>{lang === "en" ? "Replace" : "மாற்று"}</span>
            </button>
            <button
              onClick={() => setShowRemoveConfirm(true)}
              className="rounded-xl border border-border/60 bg-surface hover:bg-destructive/10 hover:border-destructive/30 hover:text-destructive px-3 py-2 text-xs font-medium text-muted-foreground transition"
              title={lang === "en" ? "Remove document" : "ஆவணத்தை நீக்கு"}
            >
              🗑️
            </button>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <button
              onClick={() => inputRef.current?.click()}
              className="flex-1 rounded-xl border border-border/80 bg-surface hover:bg-surface-muted px-3 py-2 text-xs font-semibold text-foreground transition flex items-center justify-center gap-1.5 shadow-sm"
            >
              <span>📁</span>
              <span>{lang === "en" ? "Upload from Files" : "கோப்பிலிருந்து பதிவேற்று"}</span>
            </button>
            <Link
              to="/document-scanner"
              search={{ target: keyId, reset: true }}
              className="flex-1 rounded-xl gradient-hero px-3 py-2 text-xs font-semibold text-primary-foreground shadow-glow transition flex items-center justify-center gap-1.5"
            >
              <span>📷</span>
              <span>{lang === "en" ? "Scan Document" : "ஸ்கேன் செய்"}</span>
            </Link>
          </div>
        )}
      </div>

      {/* REPLACE METHOD OPTIONS MODAL */}
      <AnimatePresence>
        {showReplaceOptions && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong border border-border shadow-2xl rounded-3xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-2.5 mb-2">
                <span className="text-xl">🔄</span>
                <h3 className="font-display font-bold text-base text-foreground">
                  {lang === "en" ? `Replace ${label.en}` : `${label.ta} ஆவணத்தை மாற்று`}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-4">
                {lang === "en"
                  ? "Choose how you would like to provide the replacement document:"
                  : "மாற்று ஆவணத்தை எவ்வாறு வழங்க விரும்புகிறீர்கள் என்பதைத் தேர்வுசெய்க:"}
              </p>

              <div className="flex flex-col gap-2.5">
                <button
                  onClick={() => {
                    setShowReplaceOptions(false);
                    inputRef.current?.click();
                  }}
                  className="rounded-2xl border border-border bg-surface hover:bg-surface-muted p-3 text-left transition flex items-center gap-3 shadow-sm"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-primary/10 text-primary text-base">📁</span>
                  <div>
                    <div className="text-xs font-semibold text-foreground">
                      {lang === "en" ? "Upload from Files" : "கோப்பிலிருந்து பதிவேற்று"}
                    </div>
                    <div className="text-[11px] text-muted-foreground">
                      {lang === "en" ? "Select a JPG, PNG, or PDF file" : "JPG, PNG அல்லது PDF கோப்பைத் தேர்வுசெய்க"}
                    </div>
                  </div>
                </button>

                <Link
                  to="/document-scanner"
                  search={{ target: keyId, reset: true }}
                  onClick={() => setShowReplaceOptions(false)}
                  className="rounded-2xl gradient-hero text-primary-foreground p-3 text-left transition flex items-center gap-3 shadow-glow"
                >
                  <span className="grid h-9 w-9 place-items-center rounded-xl bg-white/20 text-base">📷</span>
                  <div>
                    <div className="text-xs font-semibold">
                      {lang === "en" ? "Scan with Local AI" : "AI மூலம் ஸ்கேன் செய்"}
                    </div>
                    <div className="text-[11px] opacity-90">
                      {lang === "en" ? "Extract fields and auto-fill automatically" : "புலங்களை தானாகப் பிரித்தெடுத்து நிரப்புக"}
                    </div>
                  </div>
                </Link>
              </div>

              <div className="mt-4 flex justify-end">
                <button
                  onClick={() => setShowReplaceOptions(false)}
                  className="rounded-xl border border-border/80 bg-card px-3.5 py-1.5 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                >
                  {lang === "en" ? "Cancel" : "ரத்து"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* CONFIRM REMOVE MODAL (STATE 3) */}
      <AnimatePresence>
        {showRemoveConfirm && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong border border-border shadow-2xl rounded-3xl p-6 max-w-sm w-full"
            >
              <div className="flex items-center gap-3 mb-3 text-destructive">
                <span className="text-2xl">🗑️</span>
                <h3 className="font-display font-bold text-lg text-foreground">
                  {lang === "en" ? "Remove this document?" : "இந்த ஆவணத்தை நீக்கவா?"}
                </h3>
              </div>
              <p className="text-xs text-muted-foreground leading-relaxed mb-5">
                {lang === "en"
                  ? `Are you sure you want to remove ${label.en}? The document card will be reset to "No document uploaded". Any saved profile details will be safely preserved.`
                  : `${label.ta} ஆவணத்தை நீக்க விரும்புகிறீர்களா? சுயவிவரத் தகவல்கள் பாதுகாப்பாக இருக்கும்.`}
              </p>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowRemoveConfirm(false)}
                  className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                >
                  {lang === "en" ? "Cancel" : "ரத்து"}
                </button>
                <button
                  onClick={confirmRemove}
                  className="rounded-xl bg-destructive px-4 py-2 text-xs font-semibold text-destructive-foreground hover:opacity-90 transition shadow-sm"
                >
                  {lang === "en" ? "Confirm Remove" : "நீக்கு"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* REPLACE CONFLICT MODAL */}
      <AnimatePresence>
        {showReplaceDialog && (
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
                  ? `You already have "${doc?.name}" uploaded for ${label.en}. Would you like to keep the existing document or replace it with "${pendingFile?.name}"?`
                  : `${label.ta} பிரிவுக்கு "${doc?.name}" ஏற்கனவே உள்ளது. புதிய கோப்புடன் மாற்ற விரும்புகிறீர்களா?`}
              </p>
              <div className="flex gap-2.5 justify-end">
                <button
                  onClick={cancelReplace}
                  className="rounded-xl border border-border bg-card px-4 py-2.5 text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                >
                  {lang === "en" ? "Keep Existing" : "இருப்பதை வை"}
                </button>
                <button
                  onClick={confirmReplaceWithNew}
                  className="rounded-xl gradient-hero px-4 py-2.5 text-xs font-semibold text-primary-foreground shadow-glow transition"
                >
                  {lang === "en" ? "Replace with New" : "புதியதுடன் மாற்று"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* VIEW DOCUMENT MODAL */}
      <AnimatePresence>
        {showViewModal && doc && (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-md p-4">
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="glass-strong border border-border shadow-2xl rounded-3xl p-6 max-w-lg w-full max-h-[90vh] flex flex-col"
            >
              <div className="flex items-start justify-between gap-4 border-b border-border/60 pb-3">
                <div>
                  <h3 className="font-display font-bold text-lg text-foreground">{label.en}</h3>
                  <div className="text-xs text-muted-foreground" lang="ta">{label.ta}</div>
                </div>
                <button
                  onClick={() => setShowViewModal(false)}
                  className="rounded-full bg-surface-muted p-1.5 text-xs text-muted-foreground hover:text-foreground hover:bg-surface-muted/80 transition"
                >
                  ✕
                </button>
              </div>

              <div className="overflow-y-auto flex-1 my-4 space-y-4 pr-1">
                {/* Status chip */}
                <div className="flex items-center gap-2 text-xs text-success bg-success/10 border border-success/20 rounded-xl px-3 py-1.5 w-fit">
                  <span>✓</span>
                  <span className="font-semibold">{lang === "en" ? "Verified & Stored Locally" : "சரிபார்க்கப்பட்டு சேமிக்கப்பட்டது"}</span>
                </div>

                {/* Preview Image if available */}
                {doc.previewUrl ? (
                  <div className="rounded-2xl border border-border overflow-hidden bg-black/20 flex items-center justify-center max-h-72">
                    <img
                      src={doc.previewUrl}
                      alt={doc.name}
                      className="max-h-72 w-full object-contain"
                    />
                  </div>
                ) : (
                  <div className="rounded-2xl border border-dashed border-border p-6 flex flex-col items-center justify-center text-center bg-surface-muted/40">
                    <span className="text-4xl mb-2">📄</span>
                    <div className="font-semibold text-sm text-foreground">{doc.name}</div>
                    <div className="text-xs text-muted-foreground mt-1">
                      {new Date(doc.uploadedAt).toLocaleDateString()}
                    </div>
                  </div>
                )}

                {/* Extracted fields from AI scanner if available */}
                {scannedDetails && scannedDetails.fields?.length > 0 && (
                  <div className="rounded-2xl bg-surface/60 border border-border/60 p-4">
                    <div className="text-xs font-semibold text-primary uppercase tracking-wide mb-2.5">
                      {lang === "en" ? "AI Extracted Attributes" : "AI பிரித்தெடுத்த தகவல்கள்"}
                    </div>
                    <div className="grid gap-2 text-xs">
                      {scannedDetails.fields.map((f: any) => (
                        <div key={f.key} className="flex justify-between items-center py-1 border-b border-border/30 last:border-0">
                          <span className="text-muted-foreground">{f.label}:</span>
                          <span className="font-semibold text-foreground text-right">{f.value || "—"}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 border-t border-border/60 flex justify-end">
                <button
                  onClick={() => setShowViewModal(false)}
                  className="rounded-xl border border-border bg-card px-5 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted transition"
                >
                  {lang === "en" ? "Close" : "மூடு"}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </motion.div>
  );
}
