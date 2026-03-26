import { chromium } from 'playwright';
import { writeFile, mkdir } from 'node:fs/promises';

const baseUrl = 'http://localhost:5175';
const mailpitUrl = 'http://127.0.0.1:54324/api/v1/messages';
const uniqueSuffix = Date.now().toString().slice(-6);
const email = `playwright-review-${uniqueSuffix}@nurimedia.co.kr`;
const profileName = '리뷰플레이';
const reviewContent = `다른 사람이 만든 장소 리뷰 검증 ${uniqueSuffix}`;
const artifactDir = 'artifacts/qa/sprint-20';
const resultPath = `${artifactDir}/playwright-review-other-user-place-result.json`;
const screenshotPath = `${artifactDir}/playwright-review-other-user-place-success.png`;
const failScreenshotPath = `${artifactDir}/playwright-review-other-user-place-failure.png`;

await mkdir(artifactDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

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
const context = await browser.newContext({ viewport: { width: 390, height: 844 } });
const page = await context.newPage();
await page.addInitScript(() => {
  let currentLevel = 3;
  const mapInstance = {
    getLevel: () => currentLevel,
    panTo: () => {},
    setLevel: (level) => { currentLevel = level; },
  };
  class MockLatLng { constructor(latitude, longitude) { this.latitude = latitude; this.longitude = longitude; } }
  class MockMarker { constructor(options) { this.options = options; } setMap() {} }
  class MockMarkerImage { constructor(source, size) { this.source = source; this.size = size; } }
  class MockSize { constructor(width, height) { this.width = width; this.height = height; } }
  class MockOverlay { constructor(options) { this.options = options; } setMap() {} }
  window.kakao = {
    maps: {
      load: (callback) => callback(),
      Map: function MockMap() { return mapInstance; },
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
const result = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  email: '[REDACTED_EMAIL]',
  profileName,
  reviewContent,
  passed: false,
  targetPlace: null,
  dialogs,
  apiResponses,
  notes: [],
};

page.on('dialog', async (dialog) => {
  dialogs.push({ type: dialog.type(), message: dialog.message() });
  await dialog.accept();
});
page.on('response', async (response) => {
  const url = response.url();
  if (!url.startsWith(baseUrl) || !url.includes('/api/')) return;
  const entry = { url, status: response.status() };
  try {
    const contentType = response.headers()['content-type'] ?? '';
    if (contentType.includes('application/json')) {
      const json = await response.json();
      entry.body = JSON.stringify(json).replaceAll(email, '[REDACTED_EMAIL]');
    }
  } catch {}
  apiResponses.push(entry);
});

try {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '인증 코드 전송' }).click();
  await page.getByText('로그인 코드를 보냈어요.').waitFor({ state: 'visible', timeout: 15000 });

  const otpCode = await fetchOtpCode();
  result.notes.push('OTP email observed in local Mailpit API');

  await page.getByLabel('인증 코드').fill(otpCode);
  await page.getByRole('button', { name: '인증' }).click();

  await page.getByRole('button', { name: '저장' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByLabel('이름').fill(profileName);
  await page.getByRole('button', { name: '저장' }).click();

  await page.getByRole('button', { name: '목록 보기' }).waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Authenticated mobile shell reached');

  const places = await page.evaluate(async () => {
    const response = await fetch('/api/place-list');
    return await response.json();
  });
  const targetPlace = (places?.places ?? []).find((place) => !['리뷰플레이', '플레이라이트'].includes(place.added_by_name));
  if (!targetPlace) throw new Error('Could not find a place created by another user');
  result.targetPlace = {
    id: targetPlace.id,
    name: targetPlace.name,
    addedBy: targetPlace.added_by_name,
  };

  await page.goto(`${baseUrl}/places/${targetPlace.id}`, { waitUntil: 'networkidle' });
  await page.getByTestId('mobile-detail-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: '평가 남기기' }).waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Opened another user place detail');

  await page.getByRole('button', { name: '평가 남기기' }).click();
  await page.getByTestId('mobile-review-add-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('review-add-rating-star-5').click();
  await page.getByTestId('review-add-content-input').fill(reviewContent);
  await page.getByTestId('review-add-submit-button').click();

  await page.getByTestId('mobile-detail-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('detail-review-list').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(reviewContent).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(profileName).waitFor({ state: 'visible', timeout: 15000 });
  result.notes.push('Review submitted on another user place and reflected in detail UI');

  await page.screenshot({ path: screenshotPath, fullPage: true });
  result.passed = true;
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

console.log(resultPath);
if (!result.passed) process.exit(1);
