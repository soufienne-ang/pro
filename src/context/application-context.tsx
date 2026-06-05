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
    cin: string;
    dateOfBirth: string;
    gender: "MALE" | "FEMALE";
    phone: string;
    governorate: string;
    delegation: string;
    smsOptIn: boolean;
    birthPlace?: string;
    familyStatus?: string;
    numberOfChildren?: number;
  };
  academicInfo?: {
    diplomas: Array<{
      studyLevel: string;
      diploma: string;
      institution: string;
      grade: string;
      graduationYear: number;
    }>;
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
  validateStep: (step: number) => boolean;
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

  const validateStep = useCallback((step: number): boolean => {
    switch (step) {
      case 1:
        return !!formData.accountInfo?.email
          && !!formData.accountInfo?.password
          && formData.accountInfo.password === formData.accountInfo?.confirmPassword
          && !!formData.accountInfo?.termsAccepted;
      case 2:
        return !!formData.personalInfo?.firstName
          && !!formData.personalInfo?.lastName
          && !!formData.personalInfo?.cin
          && !!formData.personalInfo?.phone
          && !!formData.personalInfo?.governorate
          && !!formData.personalInfo?.dateOfBirth;
      case 3:
        return !!formData.academicInfo?.diplomas?.length;
      case 4:
        if (!formData.experienceInfo?.hasExperience) return true;
        return !!formData.experienceInfo?.experiences?.length;
      case 5:
        return !!formData.jobSelection?.jobId;
      case 6:
        return true;
      case 7:
        return !!(formData.termsAccepted && formData.certificationSigned);
      default:
        return true;
    }
  }, [formData]);

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
      validateStep,
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
      validateStep: () => true,
      resetApplication: () => {},
    };
  }
  return context;
}