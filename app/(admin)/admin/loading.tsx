export default function AdminLoading() {
  return (
    <div>
      <div className="skeleton h-8 w-64 rounded-lg mb-2" />
      <div className="skeleton h-4 w-80 rounded-lg mb-8" />
      <div className="grid grid-cols-2 lg:grid-cols-6 gap-3 mb-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="skeleton h-24 rounded-xl" />
        ))}
      </div>
      <div className="grid lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 space-y-5">
          <div className="skeleton h-36 rounded-xl" />
          <div className="skeleton h-72 rounded-xl" />
        </div>
        <div className="space-y-5">
          <div className="skeleton h-56 rounded-xl" />
          <div className="skeleton h-48 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
