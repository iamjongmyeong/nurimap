import { chromium } from 'playwright';
import { mkdir, writeFile } from 'node:fs/promises';

const baseUrl = 'http://localhost:5175';
const mailpitUrl = 'http://127.0.0.1:54324/api/v1/messages';
const artifactDir = 'artifacts/qa/deploy-guard';
const resultPath = `${artifactDir}/playwright-edge-user-actions-result.json`;

await mkdir(artifactDir, { recursive: true });

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

async function fetchOtpCode(email) {
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
  throw new Error(`OTP email not observed for ${email}`);
}

async function createContext(browser, viewport = { width: 390, height: 844 }) {
  const context = await browser.newContext({ viewport });
  await context.addInitScript(() => {
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
  return context;
}

async function attachCollectors(page, email, dialogs, apiResponses) {
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
        entry.body = JSON.stringify(json).replaceAll(email, '[REDACTED_EMAIL]');
      }
    } catch {}
    apiResponses.push(entry);
  });
}

async function ensureAuthRequestScreen(page, dialogs, { mobile = false } = {}) {
  await page.goto(baseUrl, { waitUntil: 'networkidle' });
  const requestButton = page.getByRole('button', { name: '인증 코드 전송' });
  const resetEmailButton = page.getByRole('button', { name: '이메일 다시 입력' });
  const mobileListLogoutButton = page.getByTestId('mobile-list-logout-button');
  const logoutButton = mobile ? mobileListLogoutButton : page.getByRole('button', { name: '로그아웃' });

  for (let attempt = 0; attempt < 30; attempt += 1) {
    if (await requestButton.isVisible().catch(() => false)) {
      return;
    }

    if (await resetEmailButton.isVisible().catch(() => false)) {
      await resetEmailButton.click();
      await requestButton.waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    if (mobile && !(await mobileListLogoutButton.isVisible().catch(() => false))) {
      const mobileTabList = page.getByTestId('mobile-tab-list');
      if (await mobileTabList.isVisible().catch(() => false)) {
        await mobileTabList.click();
      }
    }

    if (await logoutButton.isVisible().catch(() => false)) {
      page.once('dialog', async (dialog) => {
        dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'accept' });
        await dialog.accept();
      });
      await logoutButton.click();
      await requestButton.waitFor({ state: 'visible', timeout: 15000 });
      return;
    }

    await page.waitForTimeout(500);
  }

  throw new Error('Could not reach the auth request screen from the local runtime');
}

async function loginAndSaveName(page, email, profileName) {
  await ensureAuthRequestScreen(page, [], { mobile: page.viewportSize()?.width ? page.viewportSize().width < 768 : false });
  await page.getByLabel('이메일').fill(email);
  await page.getByRole('button', { name: '인증 코드 전송' }).click();
  await page.getByText('로그인 코드를 보냈어요.').waitFor({ state: 'visible', timeout: 15000 });
  const otpCode = await fetchOtpCode(email);
  await page.getByLabel('인증 코드').fill(otpCode);
  await page.getByRole('button', { name: '인증' }).click();
  await page.getByRole('button', { name: '저장' }).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByLabel('이름').fill(profileName);
  await page.getByRole('button', { name: '저장' }).click();
}

async function openDesktopUrlEntryForm(page) {
  await page.locator('[data-testid="desktop-add-button"]').click();
  await page.getByTestId('place-add-url-entry-screen').waitFor({ state: 'visible', timeout: 15000 });
}

async function openDesktopDirectEntryForm(page) {
  await openDesktopUrlEntryForm(page);
  await page.getByTestId('place-add-direct-entry-button').click();
  await page.getByLabel('이름').waitFor({ state: 'visible', timeout: 15000 });
}

const browser = await chromium.launch({ headless: true });
const result = {
  checkedAt: new Date().toISOString(),
  baseUrl,
  scenarios: [],
};

async function runScenario(name, fn) {
  try {
    const scenario = await fn();
    result.scenarios.push({ name, ...scenario, passed: true });
  } catch (error) {
    result.scenarios.push({ name, passed: false, error: error instanceof Error ? error.message : String(error) });
  }
}

await runScenario('invalid_domain_error', async () => {
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 1280, height: 900 });
  const page = await context.newPage();
  await attachCollectors(page, 'invalid@example.com', dialogs, apiResponses);
  await ensureAuthRequestScreen(page, dialogs);
  await page.getByLabel('이메일').fill('invalid@example.com');
  await page.getByRole('button', { name: '인증 코드 전송' }).click();
  await page.getByText('누리미디어 구성원만 사용할 수 있어요.').waitFor({ state: 'visible', timeout: 15000 });
  const retained = await page.getByLabel('이메일').inputValue();
  await context.close();
  return { dialogs, apiResponses, retainedEmail: retained };
});

await runScenario('session_restore_direct_detail_and_review_cta_hide', async () => {
  const unique = Date.now().toString().slice(-6);
  const email = `playwright-session-${unique}@nurimedia.co.kr`;
  const profileName = '세션리뷰';
  const reviewContent = `CTA 숨김 검증 ${unique}`;
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 390, height: 844 });
  const page = await context.newPage();
  await attachCollectors(page, email, dialogs, apiResponses);

  await loginAndSaveName(page, email, profileName);
  await page.getByRole('button', { name: '목록 보기' }).waitFor({ state: 'visible', timeout: 15000 });

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByRole('button', { name: '목록 보기' }).waitFor({ state: 'visible', timeout: 15000 });

  const places = await page.evaluate(async () => {
    const response = await fetch('/api/places');
    return await response.json();
  });
  const targetPlace = (places?.places ?? []).find((place) => !['세션리뷰', '리뷰플레이', '플레이라이트'].includes(place.added_by_name));
  if (!targetPlace) throw new Error('No suitable target place found');

  await page.goto(`${baseUrl}/places/${targetPlace.id}`, { waitUntil: 'networkidle' });
  await page.getByTestId('mobile-detail-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: '평가 남기기' }).waitFor({ state: 'visible', timeout: 15000 });

  await page.getByRole('button', { name: '평가 남기기' }).click();
  await page.getByTestId('mobile-review-add-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('review-add-rating-star-5').click();
  await page.getByTestId('review-add-content-input').fill(reviewContent);
  await page.getByTestId('review-add-submit-button').click();

  await page.getByTestId('mobile-detail-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(reviewContent).waitFor({ state: 'visible', timeout: 15000 });
  const ctaCount = await page.getByRole('button', { name: '평가 남기기' }).count();

  await page.reload({ waitUntil: 'networkidle' });
  await page.getByText(reviewContent).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: '뒤로 가기' }).click();
  await page.getByRole('button', { name: '목록 보기' }).waitFor({ state: 'visible', timeout: 15000 });

  await context.close();
  return {
    dialogs,
    apiResponses,
    targetPlace: { id: targetPlace.id, name: targetPlace.name, addedBy: targetPlace.added_by_name },
    ctaCountAfterReview: ctaCount,
    reviewContent,
  };
});

await runScenario('mobile_list_first_root_and_map_origin_add_back', async () => {
  const unique = Date.now().toString().slice(-6);
  const email = `playwright-mobile-root-${unique}@nurimedia.co.kr`;
  const profileName = '모바일루트';
  const placeName = `모바일 지도 시작 등록 ${unique}`;
  const placeAddress = '서울 마포구 등록로 1';
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 390, height: 844 });
  const page = await context.newPage();
  await attachCollectors(page, email, dialogs, apiResponses);

  await loginAndSaveName(page, email, profileName);
  await page.getByTestId('mobile-list-page').waitFor({ state: 'visible', timeout: 15000 });

  const listTabActiveAtRoot = await page.getByTestId('mobile-tab-list').getAttribute('data-active');
  const mapTabActiveAtRoot = await page.getByTestId('mobile-tab-map').getAttribute('data-active');

  await page.getByTestId('mobile-tab-map').click();
  await page.getByTestId('map-canvas').waitFor({ state: 'visible', timeout: 15000 });
  const listTabActiveOnMap = await page.getByTestId('mobile-tab-list').getAttribute('data-active');
  const mapTabActiveOnMap = await page.getByTestId('mobile-tab-map').getAttribute('data-active');

  await page.getByTestId('mobile-tab-add').click();
  await page.getByTestId('place-add-url-entry-screen').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByTestId('place-add-direct-entry-button').click();
  await page.getByLabel('이름').fill(placeName);
  await page.getByLabel('주소').fill(placeAddress);
  await page.locator('[data-testid="place-submit-button"]').click();

  await page.waitForURL(/\/places\//, { timeout: 15000 });
  await page.getByTestId('mobile-detail-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(placeName).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: '뒤로 가기' }).click();

  await page.getByTestId('map-canvas').waitFor({ state: 'visible', timeout: 15000 });
  const mapTabActiveAfterBack = await page.getByTestId('mobile-tab-map').getAttribute('data-active');
  const listPageVisibleAfterBack = await page.getByTestId('mobile-list-page').isVisible().catch(() => false);

  await context.close();
  return {
    dialogs,
    apiResponses,
    listTabActiveAtRoot,
    mapTabActiveAtRoot,
    listTabActiveOnMap,
    mapTabActiveOnMap,
    mapTabActiveAfterBack,
    listPageVisibleAfterBack,
    createdPlace: {
      name: placeName,
      address: placeAddress,
    },
  };
});

await runScenario('url_entry_invalid_url_inline_error', async () => {
  const unique = Date.now().toString().slice(-6);
  const email = `playwright-url-invalid-${unique}@nurimedia.co.kr`;
  const profileName = 'URL에러';
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 1280, height: 900 });
  const page = await context.newPage();
  await attachCollectors(page, email, dialogs, apiResponses);

  await loginAndSaveName(page, email, profileName);
  await page.locator('[data-testid="desktop-add-button"]').waitFor({ state: 'visible', timeout: 15000 });
  await openDesktopUrlEntryForm(page);

  const urlInput = page.getByTestId('place-add-url-entry-input');
  await urlInput.fill('https://example.com/nope');
  await page.getByTestId('place-add-url-entry-submit-button').click();
  await page.getByTestId('place-add-url-entry-error').waitFor({ state: 'visible', timeout: 15000 });

  const errorText = await page.getByTestId('place-add-url-entry-error').textContent();
  const ariaInvalid = await urlInput.getAttribute('aria-invalid');
  const stayedOnUrlEntry = await page.getByTestId('place-add-url-entry-screen').isVisible();
  const manualHeadingVisible = await page.getByRole('heading', { name: '직접 장소 등록' }).isVisible().catch(() => false);

  await urlInput.fill('https://example.com/nope?retry=1');
  const errorClearedAfterEdit = !(await page.getByTestId('place-add-url-entry-error').isVisible().catch(() => false));

  await context.close();
  return {
    dialogs,
    apiResponses,
    errorText,
    ariaInvalid,
    stayedOnUrlEntry,
    manualHeadingVisible,
    errorClearedAfterEdit,
  };
});

await runScenario('url_entry_lookup_failed_manual_fallback', async () => {
  const unique = Date.now().toString().slice(-6);
  const email = `playwright-url-fallback-${unique}@nurimedia.co.kr`;
  const profileName = 'URL폴백';
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 390, height: 844 });
  const page = await context.newPage();
  await attachCollectors(page, email, dialogs, apiResponses);

  await page.route(`${baseUrl}/api/place-lookups`, async (route) => {
    await route.fulfill({
      status: 502,
      contentType: 'application/json',
      body: JSON.stringify({
        status: 'error',
        error: {
          code: 'lookup_failed',
          message: '장소 정보를 가져오지 못했어요. 다시 시도해 주세요.',
        },
      }),
    });
  });

  await loginAndSaveName(page, email, profileName);
  await page.getByTestId('mobile-list-page').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByRole('button', { name: '장소 추가' }).click();
  await page.getByTestId('place-add-url-entry-screen').waitFor({ state: 'visible', timeout: 15000 });

  await page.getByTestId('place-add-url-entry-input').fill('https://map.naver.com/p/entry/place/123456789');
  await page.getByTestId('place-add-url-entry-submit-button').click();

  await page.getByRole('heading', { name: '직접 장소 등록' }).waitFor({ state: 'visible', timeout: 15000 });
  const nameValue = await page.getByLabel('이름').inputValue();
  const addressValue = await page.getByLabel('주소').inputValue();

  await context.close();
  return {
    dialogs,
    apiResponses,
    nameValue,
    addressValue,
  };
});

await runScenario('duplicate_registration_cancel', async () => {
  const unique = Date.now().toString().slice(-6);
  const email = `playwright-dup-cancel-${unique}@nurimedia.co.kr`;
  const profileName = '중복취소';
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 1280, height: 900 });
  const page = await context.newPage();
  await attachCollectors(page, email, dialogs, apiResponses);
  await loginAndSaveName(page, email, profileName);
  await page.locator('[data-testid="desktop-add-button"]').waitFor({ state: 'visible', timeout: 15000 });

  const places = await page.evaluate(async () => {
    const response = await fetch('/api/places');
    return await response.json();
  });
  const targetPlace = (places?.places ?? []).find((place) => place.added_by_name === '테스트');
  if (!targetPlace) throw new Error('No duplicate target place found');

  page.once('dialog', async (dialog) => {
    dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'dismiss' });
    await dialog.dismiss();
  });

  await openDesktopDirectEntryForm(page);
  await page.getByLabel('이름').fill(targetPlace.name);
  await page.getByLabel('주소').fill(targetPlace.road_address);
  await page.locator('[data-testid="review-content-input"]').fill(`중복 취소 검증 ${unique}`);
  await page.locator('[data-testid="place-submit-button"]').click();
  await page.getByLabel('이름').waitFor({ state: 'visible', timeout: 15000 });
  const retainedName = await page.getByLabel('이름').inputValue();
  const retainedAddress = await page.getByLabel('주소').inputValue();
  await context.close();
  return {
    dialogs,
    apiResponses,
    targetPlace: { id: targetPlace.id, name: targetPlace.name },
    retainedName,
    retainedAddress,
  };
});

await runScenario('duplicate_registration_confirm_merge', async () => {
  const unique = Date.now().toString().slice(-6);
  const email = `playwright-dup-confirm-${unique}@nurimedia.co.kr`;
  const profileName = '중복확인';
  const reviewContent = `중복 확인 병합 ${unique}`;
  const dialogs = [];
  const apiResponses = [];
  const context = await createContext(browser, { width: 1280, height: 900 });
  const page = await context.newPage();
  await attachCollectors(page, email, dialogs, apiResponses);
  await loginAndSaveName(page, email, profileName);
  await page.locator('[data-testid="desktop-add-button"]').waitFor({ state: 'visible', timeout: 15000 });

  const places = await page.evaluate(async () => {
    const response = await fetch('/api/places');
    return await response.json();
  });
  const targetPlace = (places?.places ?? []).find((place) => place.added_by_name === '테스트');
  if (!targetPlace) throw new Error('No duplicate target place found');

  let firstConfirmHandled = false;
  page.on('dialog', async (dialog) => {
    if (dialog.type() !== 'confirm') {
      return;
    }
    if (!firstConfirmHandled) {
      firstConfirmHandled = true;
      dialogs.push({ type: dialog.type(), message: dialog.message(), action: 'accept' });
      await dialog.accept();
    }
  });

  await openDesktopDirectEntryForm(page);
  await page.getByLabel('이름').fill(targetPlace.name);
  await page.getByLabel('주소').fill(targetPlace.road_address);
  await page.locator('[data-testid="review-content-input"]').fill(reviewContent);
  await page.locator('[data-testid="place-submit-button"]').click();

  await page.getByTestId('desktop-detail-panel').waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(targetPlace.name).waitFor({ state: 'visible', timeout: 15000 });
  await page.getByText(reviewContent).waitFor({ state: 'visible', timeout: 15000 });
  await context.close();
  return {
    dialogs,
    apiResponses,
    targetPlace: { id: targetPlace.id, name: targetPlace.name },
    reviewContent,
  };
});

await browser.close();
await writeFile(resultPath, JSON.stringify(result, null, 2));
console.log(resultPath);
if (result.scenarios.some((scenario) => !scenario.passed)) process.exit(1);
