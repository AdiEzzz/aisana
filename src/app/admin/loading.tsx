export default function AdminLoading() {
  return (
    <div className="flex items-center justify-center py-32">
      <div
        role="status"
        aria-label="Загрузка"
        className="w-7 h-7 border-[2.5px] border-slate-200 border-t-blue-600 rounded-full animate-spin"
      />
    </div>
  )
}
