"use client";

import FuzzyText from "./test";

export default function EmergencyWithdrawPage() {
  return (
    <div className="min-h-screen w-full bg-black flex flex-col items-center justify-start">
      <div className="w-full flex flex-col items-center mt-12 px-6">
        <h1 className="flex flex-col gap-2 text-white text-5xl font-bold italic text-left">
          Emergency
          <FuzzyText
            fontSize="clamp(2rem, 5vw, 5rem)"
            fontWeight={900}
            fontFamily="inherit"
            color="yellow"
            baseIntensity={0.3}
            hoverIntensity={0.4}
          >
            Withdraw
          </FuzzyText>
        </h1>
      </div>
    </div>
  );
}
