import { CardSkeleton, RowsSkeleton } from "@/components/ui/empty-state";

export default function ResidentLoading() {
  return (
    <div>
      <div className="skeleton h-8 w-56 rounded-lg mb-2" />
      <div className="skeleton h-4 w-72 rounded-lg mb-8" />
      <div className="skeleton h-40 rounded-2xl mb-5" />
      <div className="grid grid-cols-3 sm:grid-cols-6 gap-2 mb-7">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-[86px] rounded-xl" />
        ))}
      </div>
      <RowsSkeleton rows={3} />
      <CardSkeleton className="mt-4" />
    </div>
  );
}
