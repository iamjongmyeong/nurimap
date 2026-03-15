import { chromium } from 'playwright'
const baseUrl = 'http://127.0.0.1:4175'
const browser = await chromium.launch({ headless: true })

const canonical = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await canonical.route('**/api/auth/verify-link', async (route) => {
  await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 'error', reason: 'invalidated' }) })
})
await canonical.goto(`${baseUrl}/auth/verify?email=tester%40nurimedia.co.kr&nonce=preview-canonical`, { waitUntil: 'networkidle' })
await canonical.screenshot({ path: 'artifacts/qa/sprint-17/auth-verify-invalidated-preview.png', fullPage: true })

const legacy = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await legacy.route('**/api/auth/verify-link', async (route) => {
  await route.fulfill({ status: 400, contentType: 'application/json', body: JSON.stringify({ status: 'error', reason: 'used' }) })
})
await legacy.goto(`${baseUrl}/?auth_mode=verify&email=tester%40nurimedia.co.kr&nonce=preview-legacy`, { waitUntil: 'networkidle' })
await legacy.screenshot({ path: 'artifacts/qa/sprint-17/auth-legacy-verify-used-preview.png', fullPage: true })

console.log(JSON.stringify({
  canonicalUrlCleared: canonical.url() === `${baseUrl}/`,
  canonicalMessageVisible: await canonical.getByText('최근에 보낸 로그인 링크만 사용할 수 있어요. 최신 이메일의 링크를 열어주세요.').isVisible(),
  legacyUrlCleared: legacy.url() === `${baseUrl}/`,
  legacyMessageVisible: await legacy.getByText('이미 사용한 로그인 링크예요. 새 로그인 링크를 받아주세요.').isVisible(),
}, null, 2))

await browser.close()
