import { UserLicensesCard } from "./UserLicensesCard";
import { ExecutionRequestCard } from "./ExecutionRequestCard";

export function UserDashboard() {
  return (
    <section className="space-y-6">
      <UserLicensesCard />
      <ExecutionRequestCard />
    </section>
  );
}
