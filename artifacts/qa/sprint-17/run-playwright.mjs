import { chromium } from 'playwright'

const baseUrl = 'http://127.0.0.1:4174'
const browser = await chromium.launch({ headless: true })
const results = {}

const desktop = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await desktop.goto(`${baseUrl}/places/place-restaurant-1?auth_test_state=authenticated`, { waitUntil: 'networkidle' })
await desktop.screenshot({ path: 'artifacts/qa/sprint-17/desktop-detail-direct.png', fullPage: true })
results.desktopDirectDetail = await desktop.getByTestId('desktop-detail-panel').isVisible()
await desktop.getByRole('button', { name: '목록으로 돌아가기' }).click()
await desktop.waitForURL(`${baseUrl}/`)
await desktop.screenshot({ path: 'artifacts/qa/sprint-17/desktop-browse-after-back.png', fullPage: true })
results.desktopBackToBrowse = await desktop.getByTestId('desktop-browse-topbar').isVisible()

const mobile = await browser.newPage({ viewport: { width: 390, height: 844 } })
await mobile.goto(`${baseUrl}/places/place-restaurant-1?auth_test_state=authenticated`, { waitUntil: 'networkidle' })
await mobile.screenshot({ path: 'artifacts/qa/sprint-17/mobile-detail-direct.png', fullPage: true })
results.mobileDirectDetail = await mobile.getByTestId('mobile-detail-page').isVisible()
await mobile.getByRole('button', { name: '뒤로 가기' }).click()
await mobile.waitForURL(`${baseUrl}/`)
await mobile.screenshot({ path: 'artifacts/qa/sprint-17/mobile-map-after-back.png', fullPage: true })
results.mobileBackToMap = await mobile.getByTestId('mobile-shell').isVisible()

const canonicalVerify = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await canonicalVerify.route('**/api/auth/verify-link', async (route) => {
  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'error', reason: 'invalidated' }),
  })
})
await canonicalVerify.goto(`${baseUrl}/auth/verify?email=tester%40nurimedia.co.kr&nonce=nonce-s17`, { waitUntil: 'networkidle' })
await canonicalVerify.screenshot({ path: 'artifacts/qa/sprint-17/auth-verify-invalidated.png', fullPage: true })
results.canonicalVerifyFailure = await canonicalVerify.getByText('최근에 보낸 로그인 링크만 사용할 수 있어요. 최신 이메일의 링크를 열어주세요.').isVisible()
results.canonicalVerifyCleared = canonicalVerify.url() === `${baseUrl}/`

const legacyVerify = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await legacyVerify.route('**/api/auth/verify-link', async (route) => {
  await route.fulfill({
    status: 400,
    contentType: 'application/json',
    body: JSON.stringify({ status: 'error', reason: 'used' }),
  })
})
await legacyVerify.goto(`${baseUrl}/?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=legacy-s17`, { waitUntil: 'networkidle' })
await legacyVerify.screenshot({ path: 'artifacts/qa/sprint-17/auth-legacy-verify-used.png', fullPage: true })
results.legacyVerifyFailure = await legacyVerify.getByText('이미 사용한 로그인 링크예요. 새 로그인 링크를 받아주세요.').isVisible()
results.legacyVerifyCleared = legacyVerify.url() === `${baseUrl}/`

const mapFailure = await browser.newPage({ viewport: { width: 1440, height: 960 } })
let kakaoRequestCount = 0
await mapFailure.route('**://dapi.kakao.com/v2/maps/sdk.js**', async (route) => {
  kakaoRequestCount += 1
  if (kakaoRequestCount === 1) {
    await new Promise((resolve) => setTimeout(resolve, 1200))
    await route.abort('failed')
    return
  }
  await route.abort('failed')
})
await mapFailure.goto(`${baseUrl}/?auth_test_state=authenticated`, { waitUntil: 'domcontentloaded' })
await mapFailure.getByText('지도를 불러오는 중이에요.').waitFor()
await mapFailure.screenshot({ path: 'artifacts/qa/sprint-17/map-loading-runtime.png', fullPage: true })
await mapFailure.getByText('지도를 불러오지 못했어요.').waitFor()
await mapFailure.screenshot({ path: 'artifacts/qa/sprint-17/map-error-runtime.png', fullPage: true })
results.mapLoadingVisible = true
results.mapErrorVisible = await mapFailure.getByText('지도를 불러오지 못했어요.').isVisible()
results.mapRetryVisible = await mapFailure.getByRole('button', { name: '다시 시도' }).isVisible()
await mapFailure.getByRole('button', { name: '다시 시도' }).click()
await mapFailure.getByText('지도를 불러오는 중이에요.').waitFor()
results.mapRetryReturnsLoading = true

console.log(JSON.stringify(results, null, 2))
await browser.close()
