import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })

const openPlaceAdd = async () => {
  await page.getByRole('button', { name: '장소 추가' }).click()
  await page.waitForTimeout(200)
}

const submitUrl = async (url) => {
  const input = page.getByLabel('네이버 지도 URL')
  await input.fill(url)
  await page.getByRole('button', { name: /URL 확인|조회 중/ }).click()
  await page.waitForTimeout(500)
}

await openPlaceAdd()
await submitUrl('https://map.naver.com/p/entry/place/123456789')
await page.screenshot({ path: 'artifacts/qa/plan-05/success-naver-coords.png', fullPage: true })
const successNaver = await page.getByTestId('place-lookup-summary').textContent()
await page.getByRole('button', { name: '✕' }).click({ force: true })
await page.waitForTimeout(200)

await openPlaceAdd()
await submitUrl('https://map.naver.com/p/entry/place/234567890')
await page.screenshot({ path: 'artifacts/qa/plan-05/success-road-fallback.png', fullPage: true })
const successRoad = await page.getByTestId('place-lookup-summary').textContent()
await page.getByRole('button', { name: '✕' }).click({ force: true })
await page.waitForTimeout(200)

await openPlaceAdd()
await submitUrl('https://map.naver.com/p/entry/place/345678901')
await page.screenshot({ path: 'artifacts/qa/plan-05/success-land-fallback.png', fullPage: true })
const successLand = await page.getByTestId('place-lookup-summary').textContent()
await page.getByRole('button', { name: '✕' }).click({ force: true })
await page.waitForTimeout(200)

await openPlaceAdd()
await submitUrl('https://map.naver.com/p/entry/place/567890123')
await page.screenshot({ path: 'artifacts/qa/plan-05/failure-modal.png', fullPage: true })
const failureVisible = await page.getByTestId('place-lookup-error-modal').isVisible()
const inputAfterFailure = await page.getByLabel('네이버 지도 URL').inputValue()
await page.getByRole('button', { name: '다시 시도' }).click()
await page.waitForTimeout(500)
const retryStillVisible = await page.getByTestId('place-lookup-error-modal').isVisible()

console.log(JSON.stringify({
  successNaver,
  successRoad,
  successLand,
  failureVisible,
  inputAfterFailure,
  retryStillVisible,
}, null, 2))

await browser.close()
