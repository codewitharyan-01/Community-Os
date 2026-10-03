import { Briefcase, FileWarning } from "lucide-react";
import { requireCommunityUser } from "@/lib/auth";
import { db } from "@/lib/db";
import { PageHeader, StatCard } from "@/components/ui/stat";
import { Card } from "@/components/ui/card";
import { StatusBadge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { DataTable, type Column } from "@/components/ui/data-table";
import { formatINR, formatDate, daysBetween } from "@/lib/utils";
import { VendorModal } from "@/components/admin/crud";
import { can } from "@/lib/permissions";

export const metadata = { title: "Vendors" };

export default async function AdminVendors() {
  const user = await requireCommunityUser();
  const communityId = user.communityId!;
  const now = new Date();

  const [vendors, expenses] = await Promise.all([
    db.vendor.findMany({ where: { communityId }, orderBy: { company: "asc" } }),
    db.expense.findMany({ where: { communityId, vendorId: { not: null }, status: { in: ["APPROVED", "PAID"] } } }),
  ]);

  const expiringSoon = vendors.filter((v) => v.contractEnd && daysBetween(now, v.contractEnd) <= 30 && v.contractEnd >= now);

  type Row = (typeof vendors)[number] & { id: string };
  const columns: Column<Row>[] = [
    {
      key: "company", header: "Vendor",
      render: (r) => (
        <div>
          <p className="font-medium">{r.company}</p>
          <p className="text-xs text-muted-foreground">{r.contactName}{r.phone ? ` · ${r.phone}` : ""}</p>
        </div>
      ),
      mobilePrimary: (r) => <span className="font-medium">{r.company}</span>,
      mobileSecondary: (r) => r.contactName || r.category.toLowerCase(),
    },
    { key: "category", header: "Category", render: (r) => <span className="text-xs capitalize">{r.category.toLowerCase().replace(/_/g, " ")}</span> },
    { key: "contract", header: "Contract", render: (r) => <span className="text-xs">{r.contractStart ? formatDate(r.contractStart) : "—"} → {r.contractEnd ? formatDate(r.contractEnd) : "—"}</span>, mobilePrimary: (r) => (r.contractEnd ? formatDate(r.contractEnd) : "—") },
    { key: "fee", header: "Monthly", render: (r) => <span className="num text-xs">{formatINR(r.monthlyAmount)}</span> },
    { key: "rating", header: "Rating", render: (r) => <span className="text-xs">{"★".repeat(r.rating)}{"☆".repeat(5 - r.rating)}</span> },
    { key: "status", header: "Status", render: (r) => <StatusBadge status={r.status === "EXPIRING" ? "PENDING" : r.status === "EXPIRED" ? "VOIDED" : "ACTIVE"} label={r.status.charAt(0) + r.status.slice(1).toLowerCase()} />, mobileRight: (r) => <StatusBadge status={r.status} label={r.status.toLowerCase()} /> },
    ...(can(user.role, "vendors.manage")
      ? [{
          key: "vendorEdit",
          header: "",
          render: (r: Row) => (
            <VendorModal vendor={{ id: r.id, company: r.company, category: r.category, contactName: r.contactName, phone: r.phone, email: r.email, monthlyAmount: r.monthlyAmount, contractEnd: r.contractEnd ? r.contractEnd.toISOString().slice(0, 10) : null }} />
          ),
        }]
      : []),
  ];

  const paidByVendor = new Map<string, number>();
  expenses.forEach((e) => e.vendorId && paidByVendor.set(e.vendorId, (paidByVendor.get(e.vendorId) ?? 0) + e.amount));

  return (
    <div>
      <PageHeader
        title="Vendors"
        subtitle="Service contracts, payments and renewals."
        action={can(user.role, "vendors.manage") ? <VendorModal /> : undefined}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 mb-6">
        <StatCard label="Active vendors" value={vendors.filter((v) => v.status === "ACTIVE").length} />
        <StatCard label="Expiring ≤30 days" value={expiringSoon.length} tone={expiringSoon.length > 0 ? "orange" : "green"} />
        <StatCard label="Monthly commitments" value={formatINR(vendors.reduce((s, v) => s + v.monthlyAmount, 0))} />
        <StatCard label="Paid (YTD)" value={formatINR(expenses.filter((e) => e.date >= new Date(now.getFullYear(), 0, 1)).reduce((s, e) => s + e.amount, 0))} />
      </div>

      {expiringSoon.length > 0 && (
        <Card className="p-4 mb-6 border-[var(--status-orange)] bg-[var(--status-orange-bg)]">
          <p className="text-sm font-medium text-[var(--status-orange)] flex items-center gap-2">
            <FileWarning className="w-4 h-4" /> Contract renewals due
          </p>
          <p className="text-xs mt-1.5 text-foreground/80">
            {expiringSoon.map((v) => `${v.company} (ends ${formatDate(v.contractEnd)})`).join(" · ")}
          </p>
        </Card>
      )}

      <DataTable
        columns={columns}
        rows={vendors}
        mobileTitle={(r) => (
          <div>
            <p className="text-sm font-medium">{r.company}</p>
            <p className="text-2xs text-muted-foreground">{r.category.toLowerCase().replace(/_/g, " ")}</p>
          </div>
        )}
        empty={<EmptyState icon={<Briefcase className="w-5 h-5" />} title="No vendors" body="Security, cleaning, lift maintenance contracts live here." />}
      />
    </div>
  );
}
