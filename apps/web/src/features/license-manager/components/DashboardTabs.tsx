"use client";

import { useState } from "react";
import { PublisherDashboard } from "./publisher/PublisherDashboard";
import { UserDashboard } from "./user/UserDashboard";

const tabs = [
  { id: "publisher", label: "배포자 도구" },
  { id: "user", label: "사용자 도구" },
] as const;

type TabId = (typeof tabs)[number]["id"];

export function DashboardTabs() {
  const [activeTab, setActiveTab] = useState<TabId>("publisher");

  return (
    <section className="space-y-6">
      <nav className="flex items-center gap-2 rounded-full bg-slate-900/70 p-2">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition ${
              activeTab === tab.id
                ? "bg-slate-100 text-slate-900"
                : "text-slate-400 hover:bg-slate-800"
            }`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </nav>

      <div>{activeTab === "publisher" ? <PublisherDashboard /> : <UserDashboard />}</div>
    </section>
  );
}
