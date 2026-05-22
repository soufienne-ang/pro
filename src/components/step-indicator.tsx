"use client";

import { useTranslations } from "next-intl";

interface Step {
  number: number;
  labelKey: string;
}

interface StepIndicatorProps {
  currentStep: number;
  totalSteps?: number;
  steps?: Step[];
  onStepClick?: (step: number) => void;
}

export function StepIndicator({ 
  currentStep, 
  totalSteps = 8,
  steps,
  onStepClick 
}: StepIndicatorProps) {
  const t = useTranslations("candidate");
  
  const defaultSteps: Step[] = [
    { number: 1, labelKey: "account" },
    { number: 2, labelKey: "personalInfo" },
    { number: 3, labelKey: "academicInfo" },
    { number: 4, labelKey: "experience" },
    { number: 5, labelKey: "jobSelection" },
    { number: 6, labelKey: "documents" },
    { number: 7, labelKey: "review" },
    { number: 8, labelKey: "confirmation" },
  ];

  const displaySteps = (steps || defaultSteps).slice(0, totalSteps);

  return (
    <nav aria-label="Progress" className="w-full">
      <ol className="flex items-center justify-between">
        {displaySteps.map((step, index) => {
          const isCompleted = step.number < currentStep;
          const isCurrent = step.number === currentStep;
          const isClickable = step.number <= currentStep || isCompleted;

          return (
            <li key={step.number} className="flex-1 relative">
              <div className="flex flex-col items-center">
                <button
                  type="button"
                  onClick={() => isClickable && onStepClick?.(step.number)}
                  disabled={!isClickable}
                  className={`
                    flex items-center justify-center w-10 h-10 rounded-full border-2 
                    transition-all duration-200 font-semibold text-sm
                    ${isCompleted 
                      ? "bg-primary text-primary-foreground border-primary cursor-pointer" 
                      : isCurrent 
                        ? "bg-primary text-primary-foreground border-primary ring-4 ring-primary/20" 
                        : "bg-background text-muted-foreground border-muted-foreground/30"
                    }
                    ${isClickable && !isCurrent ? "hover:bg-primary/90 cursor-pointer" : ""}
                    ${!isClickable ? "cursor-not-allowed" : ""}
                  `}
                  aria-current={isCurrent ? "step" : undefined}
                >
                  {isCompleted ? (
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                  ) : (
                    step.number
                  )}
                </button>
                <span className={`
                  mt-2 text-xs text-center max-w-[80px]
                  ${isCurrent ? "text-primary font-semibold" : "text-muted-foreground"}
                `}>
                  {t(step.labelKey)}
                </span>
              </div>
              
              {index < displaySteps.length - 1 && (
                <div 
                  className={`
                    hidden sm:block absolute top-5 left-1/2 w-full h-0.5 -translate-y-1/2
                    ${step.number < currentStep ? "bg-primary" : "bg-muted-foreground/30"}
                  `}
                  style={{ width: "calc(100% - 2.5rem)" }}
                />
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}

interface StepLayoutProps {
  children: React.ReactNode;
  currentStep: number;
  titleKey: string;
  description?: string;
  onNext?: () => void;
  onBack?: () => void;
  isRTL?: boolean;
}

export function StepLayout({ 
  children, 
  currentStep, 
  titleKey,
  description,
  onNext, 
  onBack,
  isRTL = false 
}: StepLayoutProps) {
  const t = useTranslations("candidate");

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-blue-50 py-8 px-4" dir={isRTL ? "rtl" : "ltr"}>
      <div className="max-w-3xl mx-auto">
        <div className="mb-8">
          <h1 className="text-2xl font-bold text-center mb-2">
            {t(titleKey)}
          </h1>
          {description && (
            <p className="text-muted-foreground text-center">{description}</p>
          )}
        </div>

        <div className="mb-8">
          <StepIndicator currentStep={currentStep} />
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6">
          {children}
        </div>

        {(onNext || onBack) && (
          <div className="flex justify-between mt-6">
            {onBack && (
              <button
                type="button"
                onClick={onBack}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg border border-input bg-background hover:bg-accent transition-colors"
              >
                <svg className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
                </svg>
                {isRTL ? "التالي" : "Previous"}
              </button>
            )}
            {onNext && (
              <button
                type="button"
                onClick={onNext}
                className="flex items-center gap-2 px-6 py-2.5 text-sm font-medium rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 transition-colors ml-auto"
              >
                {isRTL ? "السابق" : "Next"}
                <svg className={`w-4 h-4 ${isRTL ? "rotate-180" : ""}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                </svg>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}