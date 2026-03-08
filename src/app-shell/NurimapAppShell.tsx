import { useAppShellStore } from './appShellStore'
import { useViewportMode } from './useViewportMode'

const layoutInsetStyle = {
  top: '24px',
  bottom: '24px',
  width: '390px',
  height: 'calc(100vh - 48px)',
} as const

const addButtonSizeStyle = {
  width: '342px',
  height: '48px',
} as const

const EmptyState = () => (
  <div className="rounded-2xl border border-dashed border-base-300 bg-base-100 p-6 text-left shadow-sm">
    <p className="text-sm font-semibold text-base-content">아직 등록된 장소가 없어요</p>
    <p className="mt-2 text-sm text-base-content/70">
      Plan 01에서는 앱 셸과 빈 상태 구조를 먼저 검증합니다.
    </p>
  </div>
)

const MockMapCanvas = () => (
  <div
    aria-label="지도 캔버스"
    className="relative h-full min-h-screen overflow-hidden rounded-none bg-slate-900"
    data-testid="map-canvas"
  >
    <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,_rgba(34,197,94,0.25),_transparent_25%),linear-gradient(135deg,_rgba(15,23,42,1)_0%,_rgba(30,41,59,1)_45%,_rgba(59,130,246,0.35)_100%)]" />
    <div className="absolute inset-x-6 top-6 rounded-2xl bg-base-100/10 p-4 text-white backdrop-blur">
      <p className="text-xs uppercase tracking-[0.24em] text-emerald-200">Nurimap</p>
      <h1 className="mt-2 text-2xl font-semibold">내부 장소 지도를 위한 앱 셸</h1>
      <p className="mt-2 max-w-xl text-sm text-slate-200/90">
        Plan 01에서는 지도, 사이드바, 상세 패널, 모바일 floating button의 구조를 먼저 고정합니다.
      </p>
    </div>
  </div>
)

const DesktopSidebar = () => {
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)

  return (
    <aside
      className="flex h-screen w-[390px] flex-col border-r border-base-300 bg-base-200 px-6 py-6"
      data-testid="desktop-sidebar"
    >
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-semibold text-primary">Nurimap</p>
          <h2 className="mt-1 text-2xl font-bold text-base-content">장소 탐색</h2>
          <p className="mt-2 text-sm text-base-content/70">로그인 전에도 앱 구조를 검증할 수 있는 기본 셸입니다.</p>
        </div>
        <button aria-label="사이드바 접기 또는 펼치기" className="btn btn-ghost btn-square btn-sm">
          ☰
        </button>
      </div>

      <button
        className="btn btn-primary mt-6 self-center rounded-2xl text-base font-semibold"
        data-testid="desktop-add-button"
        onClick={openPlaceAdd}
        style={addButtonSizeStyle}
        type="button"
      >
        장소 추가
      </button>

      <div className="mt-6 flex-1 space-y-4 overflow-auto">
        <div className="rounded-2xl bg-base-100 p-4 shadow-sm">
          <p className="text-sm font-medium text-base-content">기본 빈 상태</p>
          <p className="mt-2 text-sm text-base-content/70">향후 Plan 02에서 목록/지도 데이터가 여기에 연결됩니다.</p>
        </div>
        <EmptyState />
      </div>
    </aside>
  )
}

const DesktopDetailPanel = () => (
  <section
    className="absolute left-6 rounded-[28px] border border-base-300 bg-base-100/95 p-6 shadow-2xl backdrop-blur"
    data-testid="desktop-detail-panel"
    style={layoutInsetStyle}
  >
    <div className="flex h-full flex-col">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-secondary">Floating Detail Panel</p>
          <h3 className="mt-2 text-xl font-bold text-base-content">선택된 장소 상세 영역</h3>
        </div>
        <button aria-label="상세 패널 닫기" className="btn btn-ghost btn-circle btn-sm" type="button">
          ✕
        </button>
      </div>

      <div className="mt-6 flex-1 rounded-2xl border border-dashed border-base-300 bg-base-200/70 p-5">
        <p className="text-sm font-medium text-base-content">Plan 01 mock detail state</p>
        <p className="mt-2 text-sm leading-6 text-base-content/70">
          실제 상세 데이터 연동은 Plan 03에서 연결됩니다. 지금은 데스크톱 floating panel의 위치, 크기, 지도 뒤 노출 구조를 검증합니다.
        </p>
      </div>
    </div>
  </section>
)

const MobileFloatingActions = () => {
  const openMobilePlaceList = useAppShellStore((state) => state.openMobilePlaceList)
  const openPlaceAdd = useAppShellStore((state) => state.openPlaceAdd)

  return (
    <div className="absolute inset-x-4 bottom-6 z-10 flex gap-3" data-testid="mobile-floating-actions">
      <button className="btn btn-neutral flex-1 rounded-2xl" onClick={openMobilePlaceList} type="button">
        목록 보기
      </button>
      <button className="btn btn-primary flex-1 rounded-2xl" onClick={openPlaceAdd} type="button">
        장소 추가
      </button>
    </div>
  )
}

const MobileListPage = () => {
  const returnToMapBrowse = useAppShellStore((state) => state.returnToMapBrowse)

  return (
    <section className="absolute inset-0 z-20 flex min-h-screen flex-col bg-base-100" data-testid="mobile-list-page">
      <div className="flex items-center justify-between border-b border-base-300 px-4 py-4">
        <div>
          <p className="text-xs font-semibold uppercase tracking-[0.2em] text-primary">Mobile List</p>
          <h2 className="text-lg font-bold text-base-content">장소 목록 페이지</h2>
        </div>
        <button className="btn btn-ghost btn-sm" onClick={returnToMapBrowse} type="button">
          지도 보기
        </button>
      </div>

      <div className="flex-1 px-4 py-6">
        <EmptyState />
      </div>
    </section>
  )
}

const MobileAppShell = () => {
  const navigationState = useAppShellStore((state) => state.navigationState)

  return (
    <main className="relative min-h-screen overflow-hidden bg-base-100 md:hidden" data-testid="mobile-shell">
      <MockMapCanvas />
      <MobileFloatingActions />
      {navigationState === 'mobile_place_list_open' ? <MobileListPage /> : null}
    </main>
  )
}

const DesktopAppShell = () => (
  <main className="hidden md:flex" data-testid="desktop-shell">
    <DesktopSidebar />
    <section className="relative flex-1 min-h-screen">
      <MockMapCanvas />
      <DesktopDetailPanel />
    </section>
  </main>
)

export const NurimapAppShell = () => {
  const { isDesktop } = useViewportMode()

  return isDesktop ? <DesktopAppShell /> : <MobileAppShell />
}
