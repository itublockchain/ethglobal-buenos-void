import { motion } from "framer-motion";
import { Check } from "lucide-react";
import React from "react";

interface ProgressStepperProps {
    currentStep: number;
    steps: string[]; // labels for each step, e.g. ["Select", "Approve", "Deposit"]
}

export const ProgressStepper: React.FC<ProgressStepperProps> = ({
    currentStep,
    steps,
}) => {
    return (
        <div className="px-10 py-4 border-b border-white/5 bg-white/[0.01]">
            <div className="relative flex items-center justify-between">
                {/* Background line */}
                <div className="absolute left-0 top-[15px] w-full h-[2px] bg-white/5 z-0 rounded-full" />
                {/* Active progress line */}
                <motion.div
                    className="absolute left-0 top-[15px] h-[2px] bg-gradient-to-r from-white/40 to-white z-0 rounded-full"
                    initial={{ width: "0%" }}
                    animate={{
                        width:
                            currentStep === 1
                                ? "0%"
                                : currentStep === 2
                                    ? "50%"
                                    : "100%",
                    }}
                    transition={{ duration: 0.5, ease: "circOut" }}
                />
                {steps.map((label, index) => {
                    const step = index + 1;
                    const isActive = currentStep >= step;
                    const isCompleted = currentStep > step;
                    const isCurrent = currentStep === step;
                    return (
                        <div
                            key={step}
                            className="relative z-10 flex flex-col items-center gap-2"
                        >
                            <motion.div
                                className={`w-7 h-7 rounded-full flex items-center justify-center text-xs font-bold transition-all duration-500 border backdrop-blur-md ${isActive
                                    ? "bg-white text-black border-white shadow-[0_0_20px_rgba(255,255,255,0.4)]"
                                    : "bg-black/40 text-white/20 border-white/10"
                                    }`}
                                animate={{
                                    scale: isCurrent ? 1.08 : 1,
                                    y: isCurrent ? -1 : 0,
                                }}
                            >
                                {isCompleted ? <Check className="w-3.5 h-3.5" /> : step}
                            </motion.div>
                            <span
                                className={`text-[9px] uppercase tracking-[0.2em] font-medium transition-colors duration-300 ${isCurrent ? "text-white" : "text-white/20"}`}
                            >
                                {label}
                            </span>
                        </div>
                    );
                })}
            </div>
        </div>
    );
};
