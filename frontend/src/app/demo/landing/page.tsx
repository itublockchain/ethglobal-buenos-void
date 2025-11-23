"use client";

export default function DemoLandingPage() {
  return (
    <main className="min-h-screen w-full bg-black text-white overflow-hidden font-sans">
      {/* Demo Mode Banner */}
      <div className="fixed top-4 left-1/2 -translate-x-1/2 z-[9999] px-4 py-2 bg-yellow-500/20 border border-yellow-500/40 rounded-full text-yellow-200 text-xs font-medium pointer-events-none">
        🎨 DEMO MODE - No wallet connection required
      </div>

      {/* Video Container */}
      <div className="fixed inset-0 w-full h-full flex items-end justify-center">
        <div className="w-[min(120vw,120vh)] h-[min(120vw,120vh)] overflow-hidden">
          <video
            autoPlay
            loop
            muted
            playsInline
            className="w-full h-[120%] object-cover object-top"
          >
            <source src="/landing.mp4" type="video/mp4" />
          </video>
        </div>
      </div>
    </main>
  );
}

