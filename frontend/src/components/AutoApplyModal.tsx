import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useUserProfile } from "@/lib/userProfileStore";
import { app, useApp } from "@/lib/store";
import { API_BASE_URL } from "@/lib/api";

interface AutoApplyModalProps {
  isOpen: boolean;
  onClose: () => void;
  formUrl: string;
  schemeName?: string;
  schemeId?: string;
  onApplied?: () => void;
}

export function AutoApplyModal({
  isOpen,
  onClose,
  formUrl,
  schemeName = "Official Welfare Scheme",
  schemeId,
  onApplied,
}: AutoApplyModalProps) {
  const { lang, user, scannedDocuments } = useApp();
  const { profile, updateProfile } = useUserProfile();

  const getCombinedProfile = () => {
    const combined: Record<string, any> = { ...profile };

    // 1. App user
    if (user?.name && !combined["fullName"]) combined["fullName"] = user.name;
    if (user?.email && !combined["emailAddress"]) combined["emailAddress"] = user.email;

    // 2. Scanned Documents
    if (scannedDocuments) {
      Object.values(scannedDocuments).forEach((doc: any) => {
        if (doc.owner && user?.email && doc.owner !== user.email) return;

        doc.fields?.forEach((f: any) => {
          if (f.key === "name" && !combined["fullName"]) combined["fullName"] = f.value;
          if (f.key === "dob" && !combined["dateOfBirth"]) combined["dateOfBirth"] = f.value;
          if (f.key === "gender" && !combined["gender"]) combined["gender"] = f.value;
          if (f.key === "aadhaar_number" && !combined["aadhaarNumber"]) combined["aadhaarNumber"] = f.value;
          if (f.key === "mobile_number" && !combined["mobileNumber"]) combined["mobileNumber"] = f.value;
          if (f.key === "annual_income" && !combined["annualIncome"]) combined["annualIncome"] = f.value;
          if (f.key === "community" && !combined["community"]) combined["community"] = f.value;
          if (f.key === "caste" && !combined["caste"]) combined["caste"] = f.value;
          if (f.key === "institution" && !combined["institution"]) combined["institution"] = f.value;
          if (f.key === "account_number" && !combined["accountNumber"]) combined["accountNumber"] = f.value;
          if (f.key === "ifsc" && !combined["ifsc"]) combined["ifsc"] = f.value;
          if (f.key === "bank_name" && !combined["bankName"]) combined["bankName"] = f.value;
          if (f.key === "district" && !combined["district"]) combined["district"] = f.value;
          combined[f.key] = f.value;
        });
      });
    }
    return combined;
  };

  const [step, setStep] = useState<"overview" | "launching" | "launched" | "submitting" | "success" | "error">("overview");
  const [errorMsg, setErrorMsg] = useState("");
  const [copied, setCopied] = useState(false);
  const [portalResult, setPortalResult] = useState<any>(null);

  const completeProfile = getCombinedProfile();

  useEffect(() => {
    if (isOpen) {
      setStep("overview");
      setErrorMsg("");
      setCopied(false);
      setPortalResult(null);
    }
  }, [isOpen]);

  const handleLaunchBrowserPortal = async () => {
    setStep("launching");
    try {
      const res = await fetch(`${API_BASE_URL}/api/auto-apply/launch-portal`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          scheme_name: schemeName,
          user_details: completeProfile,
        }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.detail || "Failed to launch browser portal");
      }

      const data = await res.json();
      setPortalResult(data);
      setStep("launched");

      if (schemeId) {
        app.apply(schemeId);
      }
      if (onApplied) {
        onApplied();
      }
    } catch (e: any) {
      console.error(e);
      setErrorMsg(e.message || "Failed to launch browser automation");
      setStep("error");
    }
  };

  const handleCopyAndOpenTab = () => {
    const formatted = Object.entries(completeProfile)
      .filter(([k, v]) => v && typeof v === "string")
      .map(([k, v]) => `${k.replace(/([A-Z])/g, " $1").toUpperCase()}: ${v}`)
      .join("\n");

    navigator.clipboard.writeText(formatted);
    setCopied(true);
    setTimeout(() => setCopied(false), 3000);
    window.open(formUrl, "_blank");

    if (schemeId) {
      app.apply(schemeId);
    }
    if (onApplied) {
      onApplied();
    }
  };

  const handleHeadlessSubmit = async () => {
    setStep("submitting");
    try {
      const analyzeRes = await fetch(`${API_BASE_URL}/api/auto-apply/analyze`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: formUrl, user_details: completeProfile }),
      });
      if (!analyzeRes.ok) throw new Error("Could not analyze target form schema");
      const analysis = await analyzeRes.json();

      const subRes = await fetch(`${API_BASE_URL}/api/auto-apply/submit`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          url: formUrl,
          mapping: analysis.mapping,
          user_details: completeProfile,
          form_fields: analysis.form_fields,
        }),
      });
      if (!subRes.ok) throw new Error("Submission failed or requires manual browser interaction");
      setStep("success");
      if (schemeId) app.apply(schemeId);
      if (onApplied) onApplied();
    } catch (e: any) {
      setErrorMsg(e.message || "Headless submission failed. Please use visible browser auto-fill.");
      setStep("error");
    }
  };

  if (!isOpen) return null;

  const displayFields = [
    { label: "Applicant Name", val: completeProfile.fullName },
    { label: "Date of Birth", val: completeProfile.dateOfBirth },
    { label: "Gender", val: completeProfile.gender },
    { label: "Aadhaar Number", val: completeProfile.aadhaarNumber },
    { label: "Community / Caste", val: completeProfile.community || completeProfile.caste },
    { label: "Annual Income", val: completeProfile.annualIncome ? `₹ ${completeProfile.annualIncome}` : null },
    { label: "Mobile Number", val: completeProfile.mobileNumber },
    { label: "Bank Account", val: completeProfile.accountNumber ? `${completeProfile.accountNumber} (${completeProfile.bankName || "Bank"})` : null },
    { label: "Institution / School", val: completeProfile.institution || completeProfile.schoolName },
  ].filter((f) => f.val);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-md">
      <motion.div
        initial={{ opacity: 0, scale: 0.95, y: 10 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 10 }}
        className="glass-strong border border-border shadow-2xl relative w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-3xl p-6 md:p-8"
      >
        <button
          onClick={onClose}
          className="absolute right-4 top-4 grid h-8 w-8 place-items-center rounded-full bg-surface-muted text-muted-foreground hover:text-foreground hover:bg-surface-hover transition"
        >
          ✕
        </button>

        {/* Header */}
        <div className="mb-5">
          <div className="inline-flex items-center gap-2 rounded-full bg-primary/10 border border-primary/20 px-3 py-1 text-xs font-semibold text-primary mb-2">
            <span>⚡</span>
            <span>{lang === "en" ? "Live Portal Auto-Filler" : "நேரடி போர்டல் தானியங்கி நிரப்பு"}</span>
          </div>
          <h2 className="font-display text-xl font-bold text-foreground">
            {lang === "en" ? "Apply to Official Portal" : "அதிகாரப்பூர்வ தளத்தில் விண்ணப்பிக்கவும்"}
          </h2>
          <div className="mt-1 text-sm font-medium text-foreground/90">
            {schemeName}
          </div>
          <div className="mt-1 text-xs text-muted-foreground flex items-center gap-1.5 truncate">
            <span>🔗</span>
            <a
              href={formUrl}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline truncate"
            >
              {formUrl}
            </a>
          </div>
        </div>

        {/* Step: Overview */}
        {step === "overview" && (
          <div className="space-y-5">
            {/* Extracted Profile Info */}
            <div className="rounded-2xl border border-border bg-surface-muted/50 p-4">
              <div className="flex items-center justify-between mb-3">
                <span className="text-xs font-bold uppercase tracking-wider text-muted-foreground">
                  {lang === "en" ? "Verified Citizen Data (From Vault)" : "சரிபார்க்கப்பட்ட குடிமக்கள் தரவு"}
                </span>
                <span className="text-[11px] font-semibold text-success bg-success/10 px-2 py-0.5 rounded-full">
                  ✓ {displayFields.length} {lang === "en" ? "Fields Ready" : "புலங்கள் தயார்"}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2 text-xs">
                {displayFields.map((f, i) => (
                  <div key={i} className="rounded-xl bg-card/60 p-2 border border-border/50">
                    <div className="text-[10px] text-muted-foreground">{f.label}</div>
                    <div className="font-medium text-foreground truncate">{f.val}</div>
                  </div>
                ))}
              </div>
            </div>

            {/* Action buttons */}
            <div className="space-y-3">
              <button
                onClick={handleLaunchBrowserPortal}
                className="w-full group relative overflow-hidden rounded-2xl gradient-hero p-4 font-bold text-primary-foreground shadow-glow hover:scale-[1.01] transition-all flex items-center justify-center gap-3 text-sm md:text-base"
              >
                <span className="text-xl">🚀</span>
                <div className="text-left">
                  <div>{lang === "en" ? "Launch Website & Auto-Fill in Chrome" : "Chrome தளத்தை திறந்து தானாக நிரப்பு"}</div>
                  <div className="text-[11px] font-normal opacity-90">
                    {lang === "en"
                      ? "Opens visible Google Chrome and injects WelfareIntel Assistant"
                      : "நேரடி Chrome திறக்கப்பட்டு தானாக விவரங்கள் உள்ளிடப்படும்"}
                  </div>
                </div>
              </button>

              <div className="flex gap-2">
                <button
                  onClick={handleCopyAndOpenTab}
                  className="flex-1 rounded-xl border border-border bg-card hover:bg-surface-muted p-3 text-xs font-semibold text-foreground transition flex items-center justify-center gap-2"
                >
                  <span>📋</span>
                  <span>{copied ? (lang === "en" ? "Copied!" : "நகலெடுக்கப்பட்டது!") : (lang === "en" ? "Copy Data & Open Tab" : "தரவை நகலெடுத்து திற")}</span>
                </button>

                <button
                  onClick={handleHeadlessSubmit}
                  className="rounded-xl border border-border bg-card/70 hover:bg-surface-muted px-4 py-3 text-xs font-semibold text-muted-foreground hover:text-foreground transition"
                  title="Submit automatically via background headless runner"
                >
                  ⚡ {lang === "en" ? "Auto-Submit" : "தானாக சமர்ப்பி"}
                </button>
              </div>
            </div>

            <div className="rounded-xl bg-primary/5 border border-primary/15 p-3 text-xs text-muted-foreground leading-relaxed flex items-start gap-2.5">
              <span className="text-base">💡</span>
              <div>
                <strong className="text-foreground">
                  {lang === "en" ? "How live auto-fill works:" : "நேரடி தானியங்கி எவ்வாறு செயல்படுகிறது:"}
                </strong>{" "}
                {lang === "en"
                  ? "A visible Google Chrome window will launch on this computer directly to the government portal. The WelfareIntel floating bar on the page matches your scanned documents and auto-populates all inputs."
                  : "உங்கள் கணினியில் Google Chrome திறக்கப்பட்டு அரசின் இணையதளத்திற்கு செல்லும். WelfareIntel உதவியாளர் உங்கள் ஆவண விவரங்களை தானாக படிவத்தில் நிரப்பும்."}
              </div>
            </div>
          </div>
        )}

        {/* Step: Launching */}
        {step === "launching" && (
          <div className="py-10 text-center space-y-4">
            <div className="relative inline-block">
              <div className="h-16 w-16 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
              <span className="absolute inset-0 grid place-items-center text-xl">🌐</span>
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {lang === "en" ? "Launching Google Chrome..." : "Google Chrome திறக்கப்படுகிறது..."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {lang === "en"
                ? "Starting live browser automation, navigating to the official portal, and preparing the WelfareIntel Auto-Filler Assistant..."
                : "உலாவியைத் துவக்கி, அதிகாரப்பூர்வ போர்ட்டலுக்கு சென்று, WelfareIntel உதவியாளரைத் தயார் செய்கிறது..."}
            </p>
          </div>
        )}

        {/* Step: Launched */}
        {step === "launched" && (
          <div className="py-6 text-center space-y-5">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-success/20 text-success text-3xl mx-auto shadow-glow">
              🚀
            </div>
            <div>
              <h3 className="text-lg font-bold text-foreground">
                {lang === "en" ? "Live Portal Launched in Chrome!" : "Chrome இல் போர்டல் திறக்கப்பட்டது!"}
              </h3>
              <p className="text-xs text-muted-foreground mt-1 max-w-md mx-auto">
                {lang === "en"
                  ? "Look at your desktop taskbar: Google Chrome is open with the portal, and the WelfareIntel Auto-Fill Assistant is active at the bottom right."
                  : "உங்கள் டெஸ்க்டாப்பில் Google Chrome திறக்கப்பட்டுள்ளது. WelfareIntel உதவியாளர் திரையின் கீழ் வலதுபுறத்தில் தயாராக உள்ளது."}
              </p>
            </div>

            <div className="rounded-2xl border border-success/30 bg-success/5 p-4 text-left space-y-2">
              <div className="text-xs font-bold text-success flex items-center gap-1.5">
                <span>✓</span>
                <span>{lang === "en" ? "WelfareIntel Assistant Active in Browser:" : "உலாவியில் உதவியாளர் தயார்:"}</span>
              </div>
              <ul className="text-xs text-muted-foreground space-y-1.5 pl-4 list-disc">
                <li>{lang === "en" ? "Automatically enters Name, Aadhaar, Income, Community & School into matching fields." : "பெயர், ஆதார், வருமானம், சாதி மற்றும் பள்ளி விவரங்களை உள்ளிடுகிறது."}</li>
                <li>{lang === "en" ? "Filled fields are highlighted in emerald green." : "நிரப்பப்பட்ட புலங்கள் பச்சை நிறத்தில் குறிக்கப்படும்."}</li>
                <li>{lang === "en" ? "Use the floating bar's '⚡ Auto-Fill All Form Fields' or '📋 View Data' buttons anytime." : "மிதக்கும் பட்டியில் உள்ள 'Auto-Fill' அல்லது 'View Data' பொத்தான்களைப் பயன்படுத்தலாம்."}</li>
              </ul>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleLaunchBrowserPortal}
                className="flex-1 rounded-xl border border-border bg-card p-3 text-xs font-semibold text-foreground hover:bg-surface-muted transition"
              >
                🔄 {lang === "en" ? "Relaunch Browser" : "மீண்டும் திற"}
              </button>
              <button
                onClick={onClose}
                className="flex-1 rounded-xl gradient-hero p-3 text-xs font-bold text-primary-foreground shadow-glow hover:scale-[1.02] transition"
              >
                ✓ {lang === "en" ? "Done / Track Application" : "முடிந்தது / கண்காணிக்கவும்"}
              </button>
            </div>
          </div>
        )}

        {/* Step: Submitting */}
        {step === "submitting" && (
          <div className="py-10 text-center space-y-4">
            <div className="text-4xl animate-pulse">⚡</div>
            <h3 className="text-lg font-bold">
              {lang === "en" ? "Auto-Submitting via Playwright..." : "தானாக சமர்ப்பிக்கிறது..."}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {lang === "en"
                ? "Automation runner is passing citizen data directly to the form fields."
                : "தானியங்கி படிவப் புலங்களுக்கு நேரடியாக குடிமக்கள் தரவை அனுப்புகிறது."}
            </p>
          </div>
        )}

        {/* Step: Success */}
        {step === "success" && (
          <div className="py-6 text-center space-y-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-success/20 text-success text-3xl mx-auto shadow-glow">
              ✅
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {lang === "en" ? "Application Submitted Successfully!" : "விண்ணப்பம் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டது!"}
            </h3>
            <p className="text-xs text-muted-foreground max-w-sm mx-auto">
              {lang === "en"
                ? "Your details have been securely recorded. The scheme status has been updated to Applied."
                : "உங்கள் விவரங்கள் வெற்றிகரமாக சமர்ப்பிக்கப்பட்டன."}
            </p>
            <button
              onClick={onClose}
              className="w-full rounded-xl gradient-hero py-3 text-sm font-bold text-primary-foreground shadow-glow"
            >
              {lang === "en" ? "Continue" : "தொடரவும்"}
            </button>
          </div>
        )}

        {/* Step: Error */}
        {step === "error" && (
          <div className="py-6 text-center space-y-4">
            <div className="grid h-16 w-16 place-items-center rounded-full bg-destructive/20 text-destructive text-3xl mx-auto">
              ❌
            </div>
            <h3 className="text-lg font-bold text-foreground">
              {lang === "en" ? "Action Could Not Complete" : "செயல்பாட்டை முடிக்க முடியவில்லை"}
            </h3>
            <p className="text-xs text-destructive max-w-md mx-auto">
              {errorMsg}
            </p>
            <div className="flex gap-2 justify-center pt-2">
              <button
                onClick={() => setStep("overview")}
                className="rounded-xl border border-border bg-card px-4 py-2 text-xs font-semibold text-foreground hover:bg-surface-muted transition"
              >
                {lang === "en" ? "Back to Options" : "பின்செல்க"}
              </button>
              <button
                onClick={handleCopyAndOpenTab}
                className="rounded-xl gradient-hero px-4 py-2 text-xs font-bold text-primary-foreground shadow-glow transition"
              >
                📋 {lang === "en" ? "Copy Data & Open Website Manually" : "தரவை நகலெடுத்து இணையதளத்தை திற"}
              </button>
            </div>
          </div>
        )}
      </motion.div>
    </div>
  );
}
