import { RegisterCodeCard } from "./RegisterCodeCard";
import { IssueLicenseCard } from "./IssueLicenseCard";
import { ManageCodeStateCard } from "./ManageCodeStateCard";

export function PublisherDashboard() {
  return (
    <section className="space-y-6">
      <RegisterCodeCard />
      <IssueLicenseCard />
      <ManageCodeStateCard />
    </section>
  );
}
