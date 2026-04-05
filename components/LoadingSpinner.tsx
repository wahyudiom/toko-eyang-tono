export default function LoadingSpinner({ fullPage = false }: { fullPage?: boolean }) {
  if (fullPage) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-white/70">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
          <span className="text-sm text-gray-500">Memuat data...</span>
        </div>
      </div>
    );
  }
  return (
    <div className="flex items-center justify-center py-12">
      <div className="h-8 w-8 animate-spin rounded-full border-4 border-gray-200 border-t-blue-600" />
    </div>
  );
}
