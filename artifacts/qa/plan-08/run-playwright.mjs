import { chromium } from 'playwright'

const browser = await chromium.launch({ headless: true })

const authRequired = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await authRequired.goto('http://127.0.0.1:5173/?auth_test_state=auth_required', { waitUntil: 'networkidle' })
await authRequired.getByLabel('이메일').fill('user@example.com')
await authRequired.getByRole('button', { name: '로그인 링크 받기' }).click()
await authRequired.screenshot({ path: 'artifacts/qa/plan-08/invalid-domain.png', fullPage: true })
const invalidDomainMessage = await authRequired.getByText('허용된 회사 이메일만 사용할 수 있어요.').textContent()

const authFailure = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await authFailure.goto('http://127.0.0.1:5173/?auth_test_state=auth_failure&auth_test_reason=expired', { waitUntil: 'networkidle' })
await authFailure.screenshot({ path: 'artifacts/qa/plan-08/auth-failure.png', fullPage: true })
const failureVisible = await authFailure.getByText('인증에 실패했어요').isVisible()
await authFailure.getByRole('button', { name: '이메일 다시 입력' }).click()
const returnedToLogin = await authFailure.getByRole('button', { name: '로그인 링크 받기' }).isVisible()

const nameRequired = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await nameRequired.goto('http://127.0.0.1:5173/?auth_test_state=name_required', { waitUntil: 'networkidle' })
await nameRequired.getByRole('button', { name: '이름 저장' }).click()
await nameRequired.getByLabel('이름').fill('김')
await nameRequired.getByRole('button', { name: '이름 저장' }).click()
await nameRequired.waitForTimeout(100)
await nameRequired.screenshot({ path: 'artifacts/qa/plan-08/name-capture.png', fullPage: true })
const authenticatedAfterName = await nameRequired.getByTestId('desktop-sidebar').isVisible()

const authenticated = await browser.newPage({ viewport: { width: 1440, height: 960 } })
await authenticated.goto('http://127.0.0.1:5173/?auth_test_state=authenticated', { waitUntil: 'networkidle' })
await authenticated.screenshot({ path: 'artifacts/qa/plan-08/authenticated-shell.png', fullPage: true })
await authenticated.getByRole('button', { name: '로그아웃' }).click()
await authenticated.waitForTimeout(100)
await authenticated.screenshot({ path: 'artifacts/qa/plan-08/post-logout.png', fullPage: true })
const logoutReturnedToLogin = await authenticated.getByRole('button', { name: '로그인 링크 받기' }).isVisible()

console.log(JSON.stringify({
  invalidDomainMessage,
  failureVisible,
  returnedToLogin,
  authenticatedAfterName,
  logoutReturnedToLogin,
}, null, 2))

await browser.close()
