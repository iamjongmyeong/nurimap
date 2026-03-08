import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })

const openPlaceAdd = async () => {
  await page.getByRole('button', { name: '장소 추가' }).click()
  await page.waitForTimeout(200)
}

const lookup = async (url) => {
  await page.getByLabel('네이버 지도 URL').fill(url)
  await page.getByRole('button', { name: 'URL 확인' }).click()
  await page.waitForTimeout(300)
}

// step 2 transition + default star
await openPlaceAdd()
await lookup('https://map.naver.com/p/entry/place/123456789')
await page.screenshot({ path: 'artifacts/qa/plan-06/step-two-registration.png', fullPage: true })
const defaultStarClass = await page.getByTestId('rating-star-5').getAttribute('class')
await page.getByRole('button', { name: '✕' }).click({ force: true })
await page.waitForTimeout(200)

// duplicate review modal
await openPlaceAdd()
await lookup('https://map.naver.com/p/entry/place/10001')
await page.screenshot({ path: 'artifacts/qa/plan-06/duplicate-review-modal.png', fullPage: true })
const duplicateModalVisible = await page.getByTestId('existing-review-modal').isVisible()
await page.getByRole('button', { name: '닫기' }).click()
await page.waitForTimeout(200)

// save failure retain input
await openPlaceAdd()
await lookup('https://map.naver.com/p/entry/place/678901234')
await page.getByTestId('review-content-input').fill('저장 실패 테스트 입력')
await page.getByTestId('place-type-select').selectOption('cafe')
await page.getByTestId('zeropay-status-select').selectOption('available')
await page.getByTestId('place-submit-button').click()
await page.waitForTimeout(200)
await page.screenshot({ path: 'artifacts/qa/plan-06/save-failure-retain.png', fullPage: true })
const retainedReviewValue = await page.getByTestId('review-content-input').inputValue()
await page.getByRole('button', { name: '✕' }).click({ force: true })
await page.waitForTimeout(200)

// success create
await openPlaceAdd()
await lookup('https://map.naver.com/p/entry/place/123456789')
await page.getByTestId('review-content-input').waitFor()
await page.getByTestId('review-content-input').fill('새 장소 리뷰')
await page.getByTestId('place-submit-button').click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'artifacts/qa/plan-06/create-success.png', fullPage: true })
const createMessage = await page.getByTestId('registration-message').textContent()
const createdListVisible = await page.getByTestId('place-list-item-place-123456789').isVisible()

// merge success
await openPlaceAdd()
await lookup('https://map.naver.com/p/entry/place/10002')
await page.getByTestId('review-content-input').waitFor()
await page.getByTestId('review-content-input').fill('병합 리뷰')
await page.getByTestId('place-submit-button').click()
await page.waitForTimeout(400)
await page.screenshot({ path: 'artifacts/qa/plan-06/merge-success.png', fullPage: true })
const mergeMessage = await page.getByTestId('registration-message').textContent()
const mergeDetailHasName = await page.getByTestId('desktop-detail-panel').textContent()

console.log(JSON.stringify({
  defaultStarClass,
  duplicateModalVisible,
  retainedReviewValue,
  createMessage,
  createdListVisible,
  mergeMessage,
  mergeDetailHasName,
}, null, 2))

await browser.close()
