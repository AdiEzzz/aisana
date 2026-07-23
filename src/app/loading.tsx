export default function HomeLoading() {
  return (
    <div className="flex flex-col h-screen bg-[#0d1b3e]">
      <div className="h-14 gov-header border-b border-white/10" />
      <div className="flex-1 flex items-center justify-center">
        <div
          role="status"
          aria-label="Загрузка"
          className="w-7 h-7 border-[2.5px] border-white/15 border-t-white/70 rounded-full animate-spin"
        />
      </div>
    </div>
  )
}
