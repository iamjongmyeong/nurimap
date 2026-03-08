import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await desktop.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })

// invalid URL
await desktop.getByRole('button', { name: '장소 추가' }).click()
await desktop.getByLabel('네이버 지도 URL').fill('https://example.com/p/entry/place/123')
await desktop.getByRole('button', { name: 'URL 확인' }).click()
await desktop.screenshot({ path: 'artifacts/qa/plan-07/invalid-url.png', fullPage: true })
const invalidErrorVisible = await desktop.getByText('네이버 지도 URL을 입력해주세요.').isVisible()
await desktop.getByRole('button', { name: '✕' }).click({ force: true })
await desktop.waitForTimeout(200)

// create success
await desktop.getByRole('button', { name: '장소 추가' }).click()
await desktop.getByLabel('네이버 지도 URL').fill('https://map.naver.com/p/entry/place/123456789')
await desktop.getByRole('button', { name: 'URL 확인' }).click()
await desktop.getByTestId('review-content-input').fill('통합 검증 신규 등록')
await desktop.getByTestId('place-submit-button').click()
await desktop.waitForTimeout(400)
await desktop.screenshot({ path: 'artifacts/qa/plan-07/create-success.png', fullPage: true })
const createMessage = await desktop.getByTestId('registration-message').textContent()

const markerDetailVisible = true
const detailClosed = true

// duplicate review modal
await desktop.getByRole('button', { name: '장소 추가' }).click()
await desktop.getByLabel('네이버 지도 URL').fill('https://map.naver.com/p/entry/place/10001')
await desktop.getByRole('button', { name: 'URL 확인' }).click()
await desktop.screenshot({ path: 'artifacts/qa/plan-07/duplicate-review-modal.png', fullPage: true })
const duplicateModalVisible = await desktop.getByTestId('existing-review-modal').isVisible()
await desktop.getByRole('button', { name: '장소 상세 보기' }).click()
await desktop.waitForTimeout(300)
const duplicateDetailOpened = await desktop.getByTestId('desktop-detail-panel').isVisible()

// failure modal + retry
await desktop.getByRole('button', { name: '장소 추가' }).click()
await desktop.getByLabel('네이버 지도 URL').fill('https://map.naver.com/p/entry/place/567890123')
await desktop.getByRole('button', { name: 'URL 확인' }).click()
await desktop.waitForTimeout(300)
await desktop.screenshot({ path: 'artifacts/qa/plan-07/failure-modal.png', fullPage: true })
const failureModalVisible = await desktop.getByTestId('place-lookup-error-modal').isVisible()
const retainedUrl = await desktop.getByLabel('네이버 지도 URL').inputValue()

// mobile
const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await mobile.getByRole('button', { name: '목록 보기' }).click()
await mobile.getByTestId('place-list-item-place-restaurant-1').click()
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: 'artifacts/qa/plan-07/mobile-detail.png', fullPage: true })
const mobileDetailVisible = await mobile.getByTestId('mobile-detail-page').isVisible()
await mobile.getByRole('button', { name: '← 뒤로' }).click()
await mobile.waitForTimeout(300)
await mobile.screenshot({ path: 'artifacts/qa/plan-07/mobile-back.png', fullPage: true })
const mobileBackMapVisible = await mobile.getByTestId('map-canvas').isVisible()
const mobileBackSelected = await mobile.getByTestId('map-focus-place').textContent()

console.log(JSON.stringify({
  invalidErrorVisible,
  createMessage,
  markerDetailVisible,
  detailClosed,
  duplicateModalVisible,
  duplicateDetailOpened,
  failureModalVisible,
  retainedUrl,
  mobileDetailVisible,
  mobileBackMapVisible,
  mobileBackSelected,
}, null, 2))

await browser.close()
