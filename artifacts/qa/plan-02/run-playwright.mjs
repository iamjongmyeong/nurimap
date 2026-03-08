import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })

const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await desktop.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await desktop.waitForTimeout(1500)
await desktop.screenshot({ path: 'artifacts/qa/plan-02/desktop-browse.png', fullPage: true })
await desktop.getByTestId('place-list-item-place-cafe-1').click()
await desktop.waitForTimeout(500)
await desktop.screenshot({ path: 'artifacts/qa/plan-02/desktop-detail-selected.png', fullPage: true })

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await mobile.waitForTimeout(1500)
await mobile.screenshot({ path: 'artifacts/qa/plan-02/mobile-map.png', fullPage: true })
await mobile.getByRole('button', { name: '목록 보기' }).click()
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: 'artifacts/qa/plan-02/mobile-list.png', fullPage: true })
await mobile.getByTestId('place-list-item-place-restaurant-1').click()
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: 'artifacts/qa/plan-02/mobile-detail.png', fullPage: true })

console.log(JSON.stringify({
  desktopTitle: await desktop.title(),
  desktopDetailSelected: await desktop.getByTestId('desktop-detail-panel').textContent(),
  desktopListCount: await desktop.locator('[data-testid^="place-list-item-"]').count(),
  mobileMapButtonsVisible: await mobile.getByText('전체 화면 상세').isVisible(),
  mobileListPageVisible: await mobile.locator('[data-testid="mobile-list-page"]').count(),
  mobileDetailVisible: await mobile.getByTestId('mobile-detail-page').isVisible(),
}, null, 2))

await browser.close()
