import React from "react";

export default function Loading() {
  return (
    <div className="max-w-7xl mx-auto py-12 px-4 space-y-6 animate-pulse">
      <div className="h-8 bg-slate-200 rounded-md w-1/4"></div>
      <div className="h-4 bg-slate-200 rounded-md w-2/4"></div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-8">
        {[1, 2, 3].map((i) => (
          <div key={i} className="h-40 bg-slate-200 rounded-xl border border-slate-100"></div>
        ))}
      </div>

      <div className="h-64 bg-slate-200 rounded-xl mt-8"></div>
    </div>
  );
}