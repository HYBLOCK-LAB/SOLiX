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
      <nav className="flex items-center gap-2 rounded-full border border-primary-25 bg-background-light-50 p-2 shadow-sm dark:border-surface-dark-75 dark:bg-surface-dark-75">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`flex-1 rounded-full px-4 py-2 text-sm font-semibold transition-colors ${
              activeTab === tab.id
                ? "bg-primary-100 text-text-dark-100 dark:bg-primary-75"
                : "text-text-light-50 hover:bg-secondary-25 dark:text-text-dark-50 dark:hover:bg-primary-50"
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
