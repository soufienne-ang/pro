"use client";

import { createContext, useContext, useState, useCallback, ReactNode } from "react";

interface ApplicationData {
  accountInfo?: {
    email: string;
    password: string;
    confirmPassword: string;
    termsAccepted: boolean;
  };
  personalInfo?: {
    firstName: string;
    lastName: string;
    fullName?: string;
    cin: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE";
    familyStatus?: string;
    numberOfChildren?: number;
    nationality?: string;
    phone: string;
    governorate: string;
    delegation: string;
    address: string;
    postalCode?: string;
    smsOptIn: boolean;
    birthPlace?: string;
  };
  academicInfo?: {
    diplomas: Array<{
      studyLevel: string;
      diploma: string;
      institution: string;
      grade: string;

      graduationYear: number;
    }>;
    moyenneBac?: string;
    moyenne1ere?: string;
    moyenne2eme?: string;
    moyenne3eme?: string;
    eduLevel?: string;
    hasCertification?: boolean;
  };
  experienceInfo?: {
    hasExperience: boolean;
    experiences: Array<{
      company: string;
      position: string;
      startDate: string;
      endDate: string | null;
      isCurrent: boolean;
      description: string;
    }>;
  };
  jobSelection?: {
    jobId: string;
  };
  documents?: {
    files: Array<{
      type: string;
      fileName: string;
      fileUrl: string;
      fileSize: number;
      mimeType: string;
    }>;
    confirmedDocs?: string[];
    docsAcknowledged?: boolean;
  };
  termsAccepted?: boolean;
  certificationSigned?: boolean;
}

type StepKey = keyof ApplicationData;

interface ApplicationContextType {
  currentStep: number;
  setCurrentStep: (step: number) => void;
  formData: ApplicationData;
  updateFormData: (step: StepKey | "termsAccepted" | "certificationSigned", data: ApplicationData[StepKey] | boolean) => void;
  isDraft: boolean;
  setIsDraft: (draft: boolean) => void;
  lastSaved: Date | null;
  setLastSaved: (date: Date | null) => void;
  resetApplication: () => void;
}

const initialFormData: ApplicationData = {};

const STORAGE_KEYS = ["accountInfo", "personalInfo", "academicInfo", "experienceInfo", "jobSelection", "documents", "termsAccepted", "certificationSigned"];

const ApplicationContext = createContext<ApplicationContextType | null>(null);

export function ApplicationProvider({ children }: { children: ReactNode }) {
  const [currentStep, setCurrentStep] = useState(1);
  const [formData, setFormData] = useState<ApplicationData>(initialFormData);
  const [isDraft, setIsDraft] = useState(true);
  const [lastSaved, setLastSaved] = useState<Date | null>(null);

  const updateFormData = useCallback((step: StepKey | "termsAccepted" | "certificationSigned", data: ApplicationData[StepKey] | boolean) => {
    setFormData(prev => ({ ...prev, [step]: data }));
    
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem(`application_draft_${step}`, JSON.stringify(data));
      } catch {
        // Ignore localStorage errors
      }
    }
  }, []);

  const resetApplication = useCallback(() => {
    setCurrentStep(1);
    setFormData(initialFormData);
    setIsDraft(true);
    setLastSaved(null);
    
    if (typeof window !== "undefined") {
      STORAGE_KEYS.forEach(key => {
        localStorage.removeItem(`application_draft_${key}`);
      });
      localStorage.removeItem("application_current_step");
      localStorage.removeItem("application_current_step_v2");
    }
  }, []);

  return (
    <ApplicationContext.Provider value={{
      currentStep,
      setCurrentStep,
      formData,
      updateFormData,
      isDraft,
      setIsDraft,
      lastSaved,
      setLastSaved,
      resetApplication,
    }}>
      {children}
    </ApplicationContext.Provider>
  );
}

export function useApplication() {
  const context = useContext(ApplicationContext);
  if (!context) {
    return {
      currentStep: 1,
      setCurrentStep: () => {},
      formData: {},
      updateFormData: () => {},
      isDraft: true,
      setIsDraft: () => {},
      lastSaved: null,
      setLastSaved: () => {},
      resetApplication: () => {},
    };
  }
  return context;
}