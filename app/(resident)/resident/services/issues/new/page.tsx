import { NewIssueForm } from "@/components/issues/new-issue-form";
import { PageHeader } from "@/components/ui/stat";
import { requireCommunityUser } from "@/lib/auth";

export const metadata = { title: "Report an issue" };

export default async function NewIssuePage() {
  await requireCommunityUser();
  return (
    <div className="max-w-2xl">
      <PageHeader title="Report an issue" subtitle="The committee is notified instantly. You'll see every status update here." />
      <NewIssueForm />
    </div>
  );
}
