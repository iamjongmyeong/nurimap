import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const baseUrl = 'http://localhost:5175';
const mailpitUrl = 'http://127.0.0.1:54324/api/v1/messages';
const runStartedAt = new Date().toISOString();
const uniqueSuffix = Date.now().toString().slice(-6);
const email = `playwright-e2e-${uniqueSuffix}@nurimedia.co.kr`;
const profileName = '플레이라이트';
const placeName = `플레이라이트 테스트 ${uniqueSuffix}`;
const placeAddress = '서울 마포구 등록로 1';
const reviewContent = `Playwright 등록 확인 ${uniqueSuffix}`;
const artifactDir = 'artifacts/qa/deploy-guard';
const screenshotPath = `${artifactDir}/playwright-real-user-flow-success.png`;
const failScreenshotPath = `${artifactDir}/playwright-real-user-flow-failure.png`;
const resultPath = `${artifactDir}/playwright-real-user-flow-result.json`;

await mkdir(artifactDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

function sanitizeApiResponseBody(json, email) {
  return JSON.stringify(json)
    .replaceAll(email, '[REDACTED_EMAIL]')
    .replace(/"tokenHash":"[^"]+"/g, '"tokenHash":"[REDACTED_TOKEN_HASH]"')
    .replace(/"sessionId":"[^"]+"/g, '"sessionId":"[REDACTED_SESSION_ID]"')
    .replace(/"csrfToken":"[^"]+"/g, '"csrfToken":"[REDACTED_CSRF_TOKEN]"')
    .replace(/"access_token":"[^"]+"/g, '"access_token":"[REDACTED_ACCESS_TOKEN]"')
    .replace(/"refresh_token":"[^"]+"/g, '"refresh_token":"[REDACTED_REFRESH_TOKEN]"');
}

async function openDesktopDirectEntryForm(page) {
  await page.locator('[data-testid="desktop-add-button"]').click();
  await page.getByTestId('place-add-url-entry-screen').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('place-add-direct-entry-button').click();
  await page.getByLabel('이름').waitFor({ state: 'visible', timeout: 15000 });
}

async function readVisiblePlaceList(page) {
  return await page.evaluate(async () => {
    const response = await fetch('/api/places');
    const payload = await response.json();
    return Array.isArray(payload?.places) ? payload.places : [];
  });
}

async function ensureAuthRequestScreen(page, { navigate = false } = {}) {
  if (navigate) {
    await page.goto(baseUrl, { waitUntil: 'networkidle' });
  }

  const requestButton = page.getByRole('button', { name: '인증 코드 전송' });
  const resetEmailButton = page.getByRole('button', { name: '이메일 다시 입력' });
  const loginButton = page.getByRole('button', { name: '로그인' });
  const logoutButton = page.getByRole('button', { name: '로그아웃' });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await requestButton.isVisible().catch(() => false)) {
      return;
    }

    if (await resetEmailButton.isVisible().catch(() => false)) {
      await resetEmailButton.click();
      await requestButton.waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    if (await loginButton.isVisible().catch(() => false)) {
      await loginButton.click();
      await requestButton.waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    if (await logoutButton.isVisible().catch(() => false)) {
      await logoutButton.click();
      await requestButton.waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error('Could not reach the auth request screen from the local runtime');
}

async function signInAndSaveName(page) {
  await ensureAuthRequestScreen(page);
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '인증 코드 전송' }).click();
  await page.getByText('로그인 코드를 보냈어요.').waitFor({ state: 'visible', timeout: 15000 });

  const otpCode = await fetchOtpCode();
  result.notes.push('OTP email observed in local Mailpit API');

  await page.getByLabel('인증 코드').fill(otpCode);
  await page.getByRole('button', { name: '인증' }).click();

  const nameInput = page.getByLabel('이름');
  const saveButton = page.getByRole('button', { name: '저장' });
  if (await saveButton.isVisible().catch(() => false)) {
    await nameInput.fill(profileName);
    await saveButton.click();
  } else {
    await saveButton.waitFor({ state: 'visible', timeout: 15000 });
    await nameInput.fill(profileName);
    await saveButton.click();
  }
}

async function fetchOtpCode() {
  const deadline = Date.now() + 30000;
  while (Date.now() < deadline) {
    const response = await fetch(mailpitUrl);
    const data = await response.json();
    const messages = Array.isArray(data?.messages) ? data.messages : [];
    const match = messages.find((message) =>
      Array.isArray(message?.To) && message.To.some((recipient) => recipient?.Address === email),
    );
    if (match?.Snippet) {
      const otpMatch = String(match.Snippet).match(/(?:code|코드)[:\s]+(\d{6})|\b(\d{6})\b/iu);
      const otpCode = otpMatch?.[1] ?? otpMatch?.[2];
      if (otpCode) return otpCode;
    }
    await sleep(1000);
  }
  throw new Error('OTP email was not observed in Mailpit within 30s');
}

const browser = await chromium.launch({ headless: true });
const context = await browser.newContext({ viewport: { width: 1280, height: 900 } });
const page = await context.newPage();
await page.addInitScript(() => {
  let currentLevel = 3;
  const mapInstance = {
    getLevel: () => currentLevel,
    panTo: () => {},
    setLevel: (level) => {
      currentLevel = level;
    },
  };
  class MockLatLng {
    constructor(latitude, longitude) {
      this.latitude = latitude;
      this.longitude = longitude;
    }
  }
  class MockMarker {
    constructor(options) {
      this.options = options;
    }
    setMap() {}
  }
  class MockMarkerImage {
    constructor(source, size) {
      this.source = source;
      this.size = size;
    }
  }
  class MockSize {
    constructor(width, height) {
      this.width = width;
      this.height = height;
    }
  }
  class MockOverlay {
    constructor(options) {
      this.options = options;
    }
    setMap() {}
  }
  window.kakao = {
    maps: {
      load: (callback) => callback(),
      Map: function MockMap() {
        return mapInstance;
      },
      LatLng: MockLatLng,
      Marker: MockMarker,
      MarkerImage: MockMarkerImage,
      Size: MockSize,
      CustomOverlay: MockOverlay,
      event: { addListener: () => {} },
    },
  };
});
const dialogs = [];
const apiResponses = [];

page.on('dialog', async (dialog) => {
  if (dialog.type() === 'alert') {
    dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'accept' });
    await dialog.accept();
  }
});

page.on('response', async (response) => {
  const url = response.url();
  if (!url.startsWith(baseUrl) || !url.includes('/api/')) return;
  const entry = { url, status: response.status() };
  try {
    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      entry.body = sanitizeApiResponseBody(json, email);
    }
  } catch {}
  apiResponses.push(entry);
});

const result = {
  checkedAt: new Date().toISOString(),
  runStartedAt,
  baseUrl,
  email: '[REDACTED_EMAIL]',
  profileName,
  placeName,
  placeAddress,
  passed: false,
  finalState: null,
  dialogs,
  apiResponses,
  notes: [],
};

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.locator('[data-testid="desktop-browse-topbar"]').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('map-canvas').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: '로그인' }).waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Anonymous desktop browse surface reached');

  const visiblePlaces = await readVisiblePlaceList(page);
  const readablePlace = visiblePlaces[0];
  if (!readablePlace?.id) {
    throw new Error('No readable place was returned from /api/places');
  }

  await page.getByTestId(`place-list-item-${readablePlace.id}`).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId(`place-list-item-${readablePlace.id}`).click();
  await page.getByTestId('desktop-detail-panel').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(readablePlace.name).waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Anonymous desktop detail read confirmed');

  await page.getByRole('button', { name: '목록으로 돌아가기' }).click();
  await page.locator('[data-testid="desktop-browse-topbar"]').waitFor({ state: 'visible', timeout: 15000 });

  page.once('dialog', async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'dismiss' });
    await dialog.dismiss();
  });
  await page.locator('[data-testid="desktop-add-button"]').click();
  await page.locator('[data-testid="desktop-browse-topbar"]').waitFor({ state: 'visible', timeout: 15000 });
  if (await page.getByTestId('place-add-url-entry-screen').isVisible().catch(() => false)) {
    throw new Error('Anonymous add-place cancel unexpectedly opened the place-add surface');
  }
  result.notes.push('Anonymous add-place confirm cancel preserved desktop browse context');

  page.once('dialog', async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'accept' });
    await dialog.accept();
  });
  await page.locator('[data-testid="desktop-add-button"]').click();
  await signInAndSaveName(page);
  await page.getByTestId('place-add-url-entry-screen').waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Anonymous add-place intent resumed after auth');

  await page.getByTestId('place-add-direct-entry-button').click();
  await page.getByLabel('이름').waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Place add URL-entry screen observed before direct entry');
  await page.getByLabel('이름').fill(placeName);
  await page.getByLabel('주소').fill(placeAddress);
  await page.locator('[data-testid="review-content-input"]').fill(reviewContent);
  await page.locator('[data-testid="place-submit-button"]').click();

  await page.waitForURL(/\/places\//, { timeout: 15000 });
  await page.getByTestId('desktop-detail-panel').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(placeName).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(placeAddress).waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Place registration and detail view confirmed');

  await page.screenshot({ path: screenshotPath, fullPage: true });

  await page.getByRole('button', { name: '목록으로 돌아가기' }).click();
  await page.getByRole('button', { name: '로그아웃' }).waitFor({ state: 'visible', timeout: 15000 });
  page.once('dialog', async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'accept' });
    await dialog.accept();
  });
  await page.getByRole('button', { name: '로그아웃' }).click();
  await page.getByRole('button', { name: '로그인' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.locator('[data-testid="desktop-browse-topbar"]').waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Logout returned to anonymous browse surface');

  result.passed = true;
  result.finalState = 'anonymous_browse_after_logout';
} catch (error) {
  result.error = error instanceof Error ? error.message : String(error);
  try {
    await page.screenshot({ path: failScreenshotPath, fullPage: true });
    result.failureScreenshot = failScreenshotPath;
  } catch {}
} finally {
  await writeFile(resultPath, JSON.stringify(result, null, 2));
  await browser.close();
}

if (!result.passed) process.exit(1);
