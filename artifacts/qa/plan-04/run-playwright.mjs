import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })
const page = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await page.goto('http://127.0.0.1:5173', { waitUntil: 'networkidle' })
await page.getByRole('button', { name: '장소 추가' }).click()
await page.getByLabel('네이버 지도 URL').fill('https://example.com/p/entry/place/123')
await page.getByRole('button', { name: 'URL 확인' }).click()
await page.screenshot({ path: 'artifacts/qa/plan-04/invalid-url.png', fullPage: true })
const invalidErrorVisible = await page.getByText('네이버 지도 URL을 입력해주세요.').isVisible()
const inputValueAfterError = await page.getByLabel('네이버 지도 URL').inputValue()
await page.getByLabel('네이버 지도 URL').fill('https://map.naver.com/p/search/%EC%B9%B4%ED%8E%98/place/123456789?c=15.00,0,0,0,dh')
await page.getByRole('button', { name: 'URL 확인' }).click()
await page.screenshot({ path: 'artifacts/qa/plan-04/normalized-url.png', fullPage: true })
console.log(JSON.stringify({
  invalidErrorVisible,
  inputValueAfterError,
  normalizedResultVisible: await page.getByTestId('normalized-naver-url-result').isVisible(),
  normalizedResultText: await page.getByTestId('normalized-naver-url-result').textContent(),
}, null, 2))
await browser.close()
