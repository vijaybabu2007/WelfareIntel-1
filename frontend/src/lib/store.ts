import { useEffect, useSyncExternalStore } from "react";
import { type DocKey, mapDocTypeToDocKey } from "./data";

type Lang = "en" | "ta";

type ScannedField = {
  key: string;
  label: string;
  value: string;
  confidence?: "high" | "medium" | "low";
};

export type ScannedDocument = {
  owner?: string;
  documentType: string;
  documentTypeLabel: string;
  fields: ScannedField[];
  photo?: string; // base64 data URL of extracted face
  preview?: string; // base64 data URL of full document preview
  scannedAt: number;
};

export type UploadedDoc = {
  name: string;
  uploadedAt: number;
  previewUrl?: string;
  scannedDocKey?: string;
  isNew?: boolean;
};

type AppState = {
  user: { name: string; email: string; photo?: string } | null;
  lang: Lang;
  uploadedDocs: Partial<Record<DocKey, UploadedDoc>>;
  scannedDocuments: Record<string, ScannedDocument>;
  documentPhoto: string | null; // accepted photo for use across forms
  savedSchemes: string[];
  appliedSchemes: string[];
};

const DEFAULT_STATE: AppState = {
  user: null,
  lang: "en",
  uploadedDocs: {},
  scannedDocuments: {},
  documentPhoto: null,
  savedSchemes: [],
  appliedSchemes: [],
};

const STORAGE_KEY = "welfareintel-state-v1";
const listeners = new Set<() => void>();
let state: AppState = DEFAULT_STATE;
let hydrated = false;

function hydrate() {
  if (hydrated || typeof window === "undefined") return;
  hydrated = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) state = { ...DEFAULT_STATE, ...JSON.parse(raw) };
  } catch (e) {
    console.warn("Failed to hydrate application state:", e);
  }
}

function persist() {
  if (typeof window === "undefined") return;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch (e) {
    console.warn("Failed to persist application state:", e);
  }
}

function setState(updater: (prev: AppState) => AppState) {
  state = updater(state);
  persist();
  listeners.forEach((l) => l());
}

function subscribe(l: () => void) {
  listeners.add(l);
  return () => listeners.delete(l);
}

function getSnapshot() {
  return state;
}
function getServerSnapshot() {
  return DEFAULT_STATE;
}

export function useApp() {
  // Hydrate on first client render
  useEffect(() => {
    if (!hydrated) {
      hydrate();
      listeners.forEach((l) => l());
    }
  }, []);
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}

export const app = {
  login(email: string, name?: string, photo?: string) {
    setState((s) => ({
      ...s,
      user: {
        email,
        name:
          name ||
          email
            .split("@")[0]
            .replace(/[._]/g, " ")
            .replace(/\b\w/g, (c) => c.toUpperCase()),
        photo,
      },
    }));
  },
  logout() {
    setState((s) => ({ ...s, user: null }));
  },
  setLang(lang: Lang) {
    setState((s) => ({ ...s, lang }));
  },
  uploadDoc(key: DocKey, name: string, previewUrl?: string) {
    setState((s) => ({
      ...s,
      uploadedDocs: {
        ...s.uploadedDocs,
        [key]: { name, uploadedAt: Date.now(), previewUrl, isNew: true },
      },
    }));
  },
  removeDoc(key: DocKey) {
    setState((s) => {
      const nextUploaded = { ...s.uploadedDocs };
      const doc = nextUploaded[key];
      delete nextUploaded[key];

      const nextScanned = { ...s.scannedDocuments };
      if (doc?.scannedDocKey && nextScanned[doc.scannedDocKey]) {
        delete nextScanned[doc.scannedDocKey];
      }
      Object.entries(nextScanned).forEach(([k, d]) => {
        if (mapDocTypeToDocKey(d.documentType) === key) {
          delete nextScanned[k];
        }
      });

      return { ...s, uploadedDocs: nextUploaded, scannedDocuments: nextScanned };
    });
  },
  markDocSeen(key: DocKey) {
    setState((s) => {
      const doc = s.uploadedDocs[key];
      if (!doc || !doc.isNew) return s;
      return {
        ...s,
        uploadedDocs: {
          ...s.uploadedDocs,
          [key]: { ...doc, isNew: false },
        },
      };
    });
  },
  toggleSaved(id: string) {
    setState((s) => ({
      ...s,
      savedSchemes: s.savedSchemes.includes(id)
        ? s.savedSchemes.filter((x) => x !== id)
        : [...s.savedSchemes, id],
    }));
  },
  apply(id: string) {
    setState((s) =>
      s.appliedSchemes.includes(id) ? s : { ...s, appliedSchemes: [...s.appliedSchemes, id] },
    );
  },
  populateDemoVault() {
    const demoDocs: Record<DocKey, UploadedDoc> = {
      aadhaar: {
        name: "01_aadhaar_card.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/01_aadhaar_card.jpg",
        isNew: true,
      },
      community: {
        name: "02_community_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/02_community_certificate.jpg",
        isNew: true,
      },
      income: {
        name: "03_income_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/03_income_certificate.jpg",
        isNew: true,
      },
      nativity: {
        name: "04_nativity_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/04_nativity_certificate.jpg",
        isNew: true,
      },
      marksheet10: {
        name: "05_class_10_marksheet.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/05_class_10_marksheet.jpg",
        isNew: true,
      },
      marksheet12: {
        name: "06_class_12_marksheet.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/06_class_12_marksheet.jpg",
        isNew: true,
      },
      tc: {
        name: "07_transfer_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/07_transfer_certificate.jpg",
        isNew: true,
      },
      bonafide: {
        name: "08_bonafide_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/08_bonafide_certificate.jpg",
        isNew: true,
      },
      emis: {
        name: "09_school_emis_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/09_school_emis_certificate.jpg",
        isNew: true,
      },
      firstGraduate: {
        name: "10_first_graduate_certificate.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/10_first_graduate_certificate.jpg",
        isNew: true,
      },
      bankPassbook: {
        name: "11_bank_passbook.jpg (Verified Demo)",
        uploadedAt: Date.now(),
        previewUrl: "http://127.0.0.1:8000/sample-documents/11_bank_passbook.jpg",
        isNew: true,
      },
    };
    setState((s) => ({ ...s, uploadedDocs: demoDocs }));
  },
  clearAllDocs() {
    setState((s) => ({ ...s, uploadedDocs: {} as any, scannedDocuments: {} }));
  },
  saveScannedDocument(docKey: string, data: ScannedDocument) {
    const targetDocKey =
      mapDocTypeToDocKey(data.documentType) ||
      (isKnownDocKey(docKey) ? (docKey as DocKey) : null);
    setState((s) => ({
      ...s,
      scannedDocuments: { ...s.scannedDocuments, [docKey]: data },
      uploadedDocs: {
        ...s.uploadedDocs,
        ...(targetDocKey
          ? {
              [targetDocKey]: {
                name: `${data.documentTypeLabel || "Scanned Document"} (AI Scanned)`,
                uploadedAt: Date.now(),
                previewUrl: data.preview,
                scannedDocKey: docKey,
                isNew: true,
              },
            }
          : {}),
      },
    }));
  },
  updateScannedField(docKey: string, fieldKey: string, value: string) {
    setState((s) => {
      const doc = s.scannedDocuments[docKey];
      if (!doc) return s;
      return {
        ...s,
        scannedDocuments: {
          ...s.scannedDocuments,
          [docKey]: {
            ...doc,
            fields: doc.fields.map((f) =>
              f.key === fieldKey ? { ...f, value } : f,
            ),
          },
        },
      };
    });
  },
  acceptDocumentPhoto(photo: string) {
    setState((s) => ({ ...s, documentPhoto: photo }));
  },
  rejectDocumentPhoto() {
    setState((s) => ({ ...s, documentPhoto: null }));
  },
  clearScannedDocument(docKey: string) {
    setState((s) => {
      const next = { ...s.scannedDocuments };
      delete next[docKey];
      return { ...s, scannedDocuments: next };
    });
  },
};

function isKnownDocKey(key: string): key is DocKey {
  return [
    "aadhaar", "nativity", "community", "income", "marksheet10",
    "marksheet12", "tc", "bonafide", "emis", "firstGraduate", "bankPassbook",
  ].includes(key);
}

export function t<T extends { en: string; ta: string }>(obj: T, lang: Lang): string {
  return obj[lang];
}
