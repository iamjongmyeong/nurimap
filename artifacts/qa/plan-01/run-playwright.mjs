import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })

const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await desktop.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await desktop.screenshot({ path: 'artifacts/qa/plan-01/desktop-shell.png', fullPage: true })

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await mobile.screenshot({ path: 'artifacts/qa/plan-01/mobile-map.png', fullPage: true })
await mobile.getByRole('button', { name: '목록 보기' }).click()
await mobile.screenshot({ path: 'artifacts/qa/plan-01/mobile-list.png', fullPage: true })

console.log(JSON.stringify({
  desktopTitle: await desktop.title(),
  desktopHasSidebar: await desktop.getByTestId('desktop-sidebar').isVisible(),
  desktopHasDetailPanel: await desktop.getByTestId('desktop-detail-panel').isVisible(),
  desktopHasMobileActions: await desktop.getByTestId('mobile-floating-actions').count(),
  mobileHasFloatingActions: await mobile.getByTestId('mobile-floating-actions').isVisible(),
  mobileListPageVisible: await mobile.getByTestId('mobile-list-page').isVisible(),
}, null, 2))

await browser.close()
