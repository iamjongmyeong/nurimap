import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })

const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await desktop.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await desktop.getByTestId('place-list-item-place-restaurant-1').click()
await desktop.waitForTimeout(300)
await desktop.screenshot({ path: 'artifacts/qa/plan-03/desktop-detail-with-my-review.png', fullPage: true })
await desktop.getByRole('button', { name: '상세 패널 닫기' }).click({ force: true })
await desktop.waitForTimeout(300)
await desktop.screenshot({ path: 'artifacts/qa/plan-03/desktop-map-after-close.png', fullPage: true })
await desktop.getByTestId('place-list-item-place-cafe-1').click()
await desktop.waitForTimeout(300)
await desktop.screenshot({ path: 'artifacts/qa/plan-03/desktop-detail-with-compose.png', fullPage: true })

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await mobile.getByRole('button', { name: '목록 보기' }).click()
await mobile.getByTestId('place-list-item-place-restaurant-1').click()
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: 'artifacts/qa/plan-03/mobile-detail.png', fullPage: true })
await mobile.getByRole('button', { name: '← 뒤로' }).click()
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: 'artifacts/qa/plan-03/mobile-map-after-back.png', fullPage: true })

console.log(JSON.stringify({
  desktopNaverHref: await desktop.getByTestId('detail-naver-link').getAttribute('href'),
  desktopComposeVisible: await desktop.getByTestId('detail-review-compose').isVisible(),
  desktopMyReviewVisible: await desktop.getByTestId('detail-my-review').count(),
  mobileMapVisibleAfterBack: await mobile.getByTestId('map-canvas').isVisible(),
  mobileFloatingActionsVisibleAfterBack: await mobile.getByTestId('mobile-floating-actions').isVisible(),
  mobileMapCenterAfterBack: await mobile.getByTestId('map-center').textContent(),
}, null, 2))

await browser.close()
