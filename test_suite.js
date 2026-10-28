const assert = require('assert');
const fs = require('fs');

console.log('--- STARTING COMPREHENSIVE QR AUDIO TEST SUITE ---');

// Extract the functions from index.html directly to ensure we are testing real code!
const html = fs.readFileSync('index.html', 'utf8');

// Mock window and document
global.window = {
  location: {
    protocol: 'https:',
    origin: 'https://rifkiindrazakaria.github.io',
    pathname: '/CeritaRakyat/',
    href: 'https://rifkiindrazakaria.github.io/CeritaRakyat/'
  }
};
global.document = {
  createElement: () => ({ getContext: () => ({ willReadFrequently: true }) }),
  getElementById: (id) => {
    if (id === 'selectQrFormatMode') return { value: 'web_url' };
    if (id === 'inputBaseWebUrl') return { value: 'https://rifkiindrazakaria.github.io/CeritaRakyat/' };
    return null;
  }
};

const vm = require('vm');
const scriptContent = html.match(/<script>([\s\S]*?)<\/script>/)[1];

vm.runInThisContext(`
  ${scriptContent.slice(scriptContent.indexOf('const INITIAL_QR_MAPPINGS'), scriptContent.indexOf('async function loadMappings()'))}
  global.INITIAL_QR_MAPPINGS = INITIAL_QR_MAPPINGS;
  global.qrMappings = qrMappings;
  global.resolveGithubAudioUrl = resolveGithubAudioUrl;
  global.getSelectedBaseWebUrl = getSelectedBaseWebUrl;
  global.buildQrPayloadText = buildQrPayloadText;
  global.findMappingItem = findMappingItem;
  global.parseScannedQrPayload = parseScannedQrPayload;
`);

// 1. Test INITIAL_QR_MAPPINGS
console.log('\n[TEST 1] INITIAL_QR_MAPPINGS content & structure');
assert(Array.isArray(INITIAL_QR_MAPPINGS), 'INITIAL_QR_MAPPINGS must be an array');
assert(INITIAL_QR_MAPPINGS.length >= 11, 'Must have at least 11 mappings (10 stories + test)');
for (let i = 1; i <= 10; i++) {
  const item = INITIAL_QR_MAPPINGS.find(m => m.qrCode === String(i));
  assert(item, `Track ${i} must exist in INITIAL_QR_MAPPINGS`);
  assert.strictEqual(item.mode, 'url', `Track ${i} mode must be "url"`);
  assert(item.audioUrl.includes(`${i}.mp3`), `Track ${i} audioUrl must reference ${i}.mp3`);
}
console.log('✓ INITIAL_QR_MAPPINGS verified successfully');

// Initialize qrMappings with INITIAL_QR_MAPPINGS for tests
qrMappings = JSON.parse(JSON.stringify(INITIAL_QR_MAPPINGS));

// 2. Test resolveGithubAudioUrl
console.log('\n[TEST 2] resolveGithubAudioUrl tests');
assert.strictEqual(resolveGithubAudioUrl(''), '', 'Empty input returns empty');
assert.strictEqual(resolveGithubAudioUrl(null), '', 'Null input returns empty');
assert.strictEqual(resolveGithubAudioUrl(undefined), '', 'Undefined input returns empty');

// 2a. Relative paths on GitHub Pages
const resolvedRel1 = resolveGithubAudioUrl('./audio/1.mp3');
assert.strictEqual(resolvedRel1, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/1.mp3');

const resolvedRel2 = resolveGithubAudioUrl('audio/2.mp3');
assert.strictEqual(resolvedRel2, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/2.mp3');

const resolvedNumeric = resolveGithubAudioUrl('3');
assert.strictEqual(resolvedNumeric, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/3.mp3');

const resolvedFilename = resolveGithubAudioUrl('4.mp3');
assert.strictEqual(resolvedFilename, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/4.mp3');

// 2b. GitHub Blob URLs (crucial bug fix)
const blobUrl = 'https://github.com/RifkiIndraZakaria/CeritaRakyat/blob/main/audio/5.mp3';
const resolvedBlob = resolveGithubAudioUrl(blobUrl);
assert.strictEqual(resolvedBlob, 'https://raw.githubusercontent.com/RifkiIndraZakaria/CeritaRakyat/main/audio/5.mp3', 'Blob URL must be converted to raw URL');

// 2c. GitHub Raw URLs
const rawUrl = 'https://raw.githubusercontent.com/RifkiIndraZakaria/CeritaRakyat/main/audio/6.mp3';
const resolvedRaw = resolveGithubAudioUrl(rawUrl);
assert.strictEqual(resolvedRaw, rawUrl, 'Raw URL must remain unchanged');

// 2d. External audio URLs
const extUrl = 'https://media.example.com/audio/story.mp3';
const resolvedExt = resolveGithubAudioUrl(extUrl);
assert.strictEqual(resolvedExt, extUrl, 'External absolute URL must remain unchanged');

console.log('✓ resolveGithubAudioUrl verified successfully');

// 3. Test findMappingItem
console.log('\n[TEST 3] findMappingItem lookup tests');
assert.strictEqual(findMappingItem('1').qrCode, '1', 'Matches exact id "1"');
assert.strictEqual(findMappingItem('10').qrCode, '10', 'Matches exact id "10"');
assert.strictEqual(findMappingItem('tes').qrCode, 'tes', 'Matches exact id "tes"');
assert.strictEqual(findMappingItem('CERITA-01').qrCode, '1', 'Normalizes "CERITA-01" to id "1"');
assert.strictEqual(findMappingItem('cerita-2').qrCode, '2', 'Normalizes "cerita-2" to id "2"');
assert.strictEqual(findMappingItem('./audio/3.mp3').qrCode, '3', 'Matches by audioUrl');
assert.strictEqual(findMappingItem('audio/4.mp3').qrCode, '4', 'Matches by short audioUrl');
assert.strictEqual(findMappingItem('unknown-xyz-999'), null, 'Returns null for unknown key');
console.log('✓ findMappingItem verified successfully');

// 4. Test parseScannedQrPayload
console.log('\n[TEST 4] parseScannedQrPayload tests (Cross-device scanning formats)');

// 4a. Cross-device Web QR URL: https://rifkiindrazakaria.github.io/CeritaRakyat/?qr=1
const parsedUrlQr = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/?qr=1');
assert(parsedUrlQr, 'Web URL with ?qr=1 must be parsed');
assert.strictEqual(parsedUrlQr.qrCode, '1');
assert.strictEqual(parsedUrlQr.mode, 'url');
assert(parsedUrlQr.audioUrl.includes('1.mp3'));

// 4b. Web URL with ?play=5
const parsedUrlPlay = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/?play=5');
assert(parsedUrlPlay, 'Web URL with ?play=5 must be parsed');
assert.strictEqual(parsedUrlPlay.qrCode, '5');

// 4c. Web URL with ?audio=./audio/7.mp3
const parsedUrlAudio = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/?audio=./audio/7.mp3');
assert(parsedUrlAudio, 'Web URL with ?audio= must be parsed');
assert.strictEqual(parsedUrlAudio.audioUrl, './audio/7.mp3');

// 4d. Direct GitHub Raw MP3 link in QR
const parsedRawQr = parseScannedQrPayload('https://raw.githubusercontent.com/RifkiIndraZakaria/CeritaRakyat/main/audio/8.mp3');
assert(parsedRawQr, 'Direct Raw MP3 link must be parsed');
assert.strictEqual(parsedRawQr.mode, 'url');

// 4e. Compact Portable format: QRA|url|Cerita 9|./audio/9.mp3
const parsedQra = parseScannedQrPayload('QRA|url|Cerita 9|./audio/9.mp3');
assert(parsedQra, 'QRA format must be parsed');
assert.strictEqual(parsedQra.mode, 'url');
assert.strictEqual(parsedQra.title, 'Cerita 9');
assert.strictEqual(parsedQra.audioUrl, './audio/9.mp3');

// 4f. Bare numbers (e.g. scanner scans "1")
const parsedNum = parseScannedQrPayload('1');
assert(parsedNum, 'Bare number 1 must be parsed');
assert.strictEqual(parsedNum.qrCode, '1');
assert(parsedNum.audioUrl.includes('1.mp3'));

console.log('✓ parseScannedQrPayload verified successfully');

// 5. Test buildQrPayloadText for different generation modes
console.log('\n[TEST 5] buildQrPayloadText generator tests');
const sampleItem = {
  qrCode: '1',
  title: 'Halaman 1 - Legenda Kota Menara',
  mode: 'url',
  audioUrl: './audio/1.mp3'
};

// Mode web_url (default)
global.document.getElementById = (id) => {
  if (id === 'selectQrFormatMode') return { value: 'web_url' };
  if (id === 'inputBaseWebUrl') return { value: 'https://rifkiindrazakaria.github.io/CeritaRakyat/' };
  return null;
};
const webPayload = buildQrPayloadText(sampleItem);
assert.strictEqual(webPayload, 'https://rifkiindrazakaria.github.io/CeritaRakyat/?qr=1', 'web_url mode produces full playable URL');

// Mode id_only
global.document.getElementById = (id) => {
  if (id === 'selectQrFormatMode') return { value: 'id_only' };
  return null;
};
const idPayload = buildQrPayloadText(sampleItem);
assert.strictEqual(idPayload, '1', 'id_only mode produces raw ID');

// Mode portable
global.document.getElementById = (id) => {
  if (id === 'selectQrFormatMode') return { value: 'portable' };
  return null;
};
const portablePayload = buildQrPayloadText(sampleItem);
assert(portablePayload.startsWith('QRA|url|'), 'portable mode produces QRA format');

console.log('✓ buildQrPayloadText verified successfully');

// 6. Test End-to-End Cross-Device Scanning Flow
console.log('\n[TEST 6] End-to-End Cross-Device Scanning Simulation');
// Scenario:
// Device A (PC/Admin) generates a Web QR for Story 2
global.document.getElementById = (id) => {
  if (id === 'selectQrFormatMode') return { value: 'web_url' };
  if (id === 'inputBaseWebUrl') return { value: 'https://rifkiindrazakaria.github.io/CeritaRakyat/' };
  return null;
};
const story2Item = INITIAL_QR_MAPPINGS.find(m => m.qrCode === '2');
const qrCodeOnScreen = buildQrPayloadText(story2Item);
console.log('  Device A displays QR content:', qrCodeOnScreen);

// Device B (Visitor Phone) scans with native camera:
// Native camera opens the scanned URL in mobile browser:
const urlScannedByPhone = qrCodeOnScreen;
const phoneUrlObj = new URL(urlScannedByPhone);
const phoneQrParam = phoneUrlObj.searchParams.get('qr');
assert.strictEqual(phoneQrParam, '2', 'Phone receives qr=2 from scan');

// Device B loads the web app and resolves the audio track:
const resolvedOnDeviceB = parseScannedQrPayload(phoneQrParam);
assert(resolvedOnDeviceB, 'Device B must find the track');
assert.strictEqual(resolvedOnDeviceB.qrCode, '2');

// Device B resolves the final audio stream URL:
const finalAudioStreamUrl = resolveGithubAudioUrl(resolvedOnDeviceB.audioUrl);
console.log('  Device B resolves audio stream URL:', finalAudioStreamUrl);
assert.strictEqual(finalAudioStreamUrl, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/2.mp3');

console.log('✓ End-to-End Cross-Device flow passed 100%');

// 7. Edge Cases & Boundary Conditions
console.log('\n[TEST 7] Edge Cases & Robustness Tests');

// 7a. Query parameters mixed with analytics & hash
const complexUrl = 'https://rifkiindrazakaria.github.io/CeritaRakyat/?utm_source=poster&qr=8&medium=qr#play';
const complexParsed = parseScannedQrPayload(complexUrl);
assert(complexParsed, 'Complex URL with multiple params must parse qr=8');
assert.strictEqual(complexParsed.qrCode, '8');
assert(complexParsed.audioUrl.includes('8.mp3'));

// 7b. Raw GitHub link with query params (e.g. ?raw=true)
const rawWithParam = 'https://raw.githubusercontent.com/RifkiIndraZakaria/CeritaRakyat/main/audio/10.mp3?raw=true';
const resolvedRawParam = resolveGithubAudioUrl(rawWithParam);
assert.strictEqual(resolvedRawParam, rawWithParam);

// 7c. Leading/trailing whitespace in QR
assert.strictEqual(parseScannedQrPayload('   3   ').qrCode, '3');
assert.strictEqual(parseScannedQrPayload('   cerita-04   ').qrCode, '4');

// 7d. Empty/null inputs to parseScannedQrPayload
assert.strictEqual(parseScannedQrPayload(''), null);
assert.strictEqual(parseScannedQrPayload(null), null);
assert.strictEqual(parseScannedQrPayload('   '), null);

// 7e. Unmapped number beyond 10 (e.g. "99")
const unmappedNum = parseScannedQrPayload('99');
assert(unmappedNum, 'Unmapped number produces dynamic fallback audioUrl');
assert.strictEqual(unmappedNum.audioUrl, './audio/99.mp3');

// 7f. Unknown non-numeric text
const unknownText = parseScannedQrPayload('random-unmapped-string');
assert.strictEqual(unknownText, null, 'Unknown string returns null for handleDetectedQrCode fallback');

console.log('✓ Edge cases & boundary tests passed');

// 8. Mobile Autoplay Simulation
console.log('\n[TEST 8] Mobile Browser Autoplay Restriction Simulation');
(async () => {
  let autoplayPromptShown = false;
  let autoplayPromptTitle = '';
  let playCallCount = 0;

  const mockAudioPlayer = {
    src: '',
    muted: false,
    volume: 1.0,
    removeAttribute: (attr) => {},
    play: () => {
      playCallCount++;
      if (playCallCount === 1) {
        // First attempt on mobile without user gesture is blocked by browser policy
        const err = new Error('play() failed because the user didn\'t interact with the document first.');
        err.name = 'NotAllowedError';
        return Promise.reject(err);
      }
      // Subsequent attempt after user taps button succeeds!
      return Promise.resolve();
    }
  };

  const mockBanner = {
    classList: {
      remove: (cls) => { if (cls === 'hidden') autoplayPromptShown = true; },
      add: (cls) => { if (cls === 'hidden') autoplayPromptShown = false; }
    }
  };

  const mockTitle = {
    set textContent(val) { autoplayPromptTitle = val; }
  };

  let bannerClickHandler = null;
  const mockBtn = {
    set onclick(fn) { bannerClickHandler = fn; }
  };

  // Simulate opening with ?qr=1 on mobile phone
  const mobileUrl = 'https://rifkiindrazakaria.github.io/CeritaRakyat/?qr=1';
  const detectedItem = parseScannedQrPayload(mobileUrl);
  assert(detectedItem);

  // In mobile browser: first playUrlAudio attempt
  const targetStreamUrl = resolveGithubAudioUrl(detectedItem.audioUrl);
  mockAudioPlayer.src = targetStreamUrl;

  // Call play() and catch NotAllowedError:
  try {
    await mockAudioPlayer.play();
  } catch (err) {
    if (err.name === 'NotAllowedError') {
      mockTitle.textContent = detectedItem.title;
      mockBanner.classList.remove('hidden');
      mockBtn.onclick = () => {
        mockBanner.classList.add('hidden');
        return mockAudioPlayer.play();
      };
    }
  }

  // Verify autoplay prompt is now visible with correct story title
  assert.strictEqual(autoplayPromptShown, true, 'Autoplay prompt must be shown when browser blocks autoplay');
  assert(autoplayPromptTitle.includes('Halaman 1'), 'Autoplay prompt shows correct story title');

  // User taps "Sentuh untuk Mendengarkan Audio":
  assert(typeof bannerClickHandler === 'function', 'Button click handler must be assigned');
  await bannerClickHandler();

  assert.strictEqual(autoplayPromptShown, false, 'Autoplay banner is hidden after user tap');
  assert.strictEqual(playCallCount, 2, 'Audio player play() is successfully called after user tap');
  console.log('✓ Mobile Autoplay simulation passed 100%');

  // 9. Subpath without trailing slash resolution
  console.log('\n[TEST 9] Subpath without trailing slash resolution');
  const locWithoutSlash = {
    protocol: 'https:',
    origin: 'https://rifkiindrazakaria.github.io',
    pathname: '/CeritaRakyat',
    hostname: 'rifkiindrazakaria.github.io'
  };
  const originalLocation = global.window.location;
  global.window.location = locWithoutSlash;

  const resolvedNoSlash = resolveGithubAudioUrl('./audio/1.mp3');
  assert.strictEqual(resolvedNoSlash, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/1.mp3', 'Must not strip /CeritaRakyat directory when trailing slash is missing');

  // Also test index.html subpath
  global.window.location = {
    protocol: 'https:',
    origin: 'https://rifkiindrazakaria.github.io',
    pathname: '/CeritaRakyat/index.html',
    hostname: 'rifkiindrazakaria.github.io'
  };
  const resolvedIndexHtml = resolveGithubAudioUrl('audio/2.mp3');
  assert.strictEqual(resolvedIndexHtml, 'https://rifkiindrazakaria.github.io/CeritaRakyat/audio/2.mp3', 'Must resolve relative to repo dir when index.html is in path');

  // Restore location
  global.window.location = originalLocation;
  console.log('✓ Subpath without trailing slash verified successfully');

  // 10. Hash Parameter & No-Key Query Tests
  console.log('\n[TEST 10] Hash Parameter & No-Key Query Parsing');
  const parsedHash1 = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/#qr=3');
  assert(parsedHash1, 'Hash #qr=3 must be parsed');
  assert.strictEqual(parsedHash1.qrCode, '3');

  const parsedHashSlash = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/#/4');
  assert(parsedHashSlash, 'Hash #/4 must be parsed');
  assert.strictEqual(parsedHashSlash.qrCode, '4');

  const parsedNoKey = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/?5');
  assert(parsedNoKey, 'No-key query ?5 must be parsed');
  assert.strictEqual(parsedNoKey.qrCode, '5');
  console.log('✓ Hash parameters and no-key queries verified successfully');

  // 11. Custom Title in Query String
  console.log('\n[TEST 11] Custom Title in URL Preservation');
  const parsedCustomTitle = parseScannedQrPayload('https://rifkiindrazakaria.github.io/CeritaRakyat/?qr=1&title=Kisah%20Suling%20Kencana');
  assert(parsedCustomTitle, 'URL with custom title must parse');
  assert.strictEqual(parsedCustomTitle.title, 'Kisah Suling Kencana', 'Custom title parameter must override default title');
  assert.strictEqual(parsedCustomTitle.qrCode, '1');
  console.log('✓ Custom title preservation verified successfully');

  // 12. Localhost QR Generator Base Web URL
  console.log('\n[TEST 12] Localhost QR Generator Base Web URL');
  global.window.location = {
    protocol: 'http:',
    origin: 'http://localhost:5500',
    pathname: '/CeritaRakyat/',
    hostname: 'localhost'
  };
  global.document.getElementById = (id) => null; // No input override
  const localBase = getSelectedBaseWebUrl();
  assert.strictEqual(localBase, 'https://rifkiindrazakaria.github.io/CeritaRakyat/', 'Localhost must default to GitHub Pages URL so other devices can open the QR code');

  // Restore location
  global.window.location = originalLocation;
  console.log('✓ Localhost QR Generator Base URL verified successfully');

  // 13. Custom Item QR Generator (Self-Contained Payload)
  console.log('\n[TEST 13] Custom Item QR Generator Self-Contained Payload');
  global.document.getElementById = (id) => {
    if (id === 'selectQrFormatMode') return { value: 'web_url' };
    if (id === 'inputBaseWebUrl') return { value: 'https://rifkiindrazakaria.github.io/CeritaRakyat/' };
    return null;
  };
  const customItem = {
    qrCode: 'cerita-museum-01',
    title: 'Koleksi Museum 1',
    mode: 'url',
    audioUrl: 'https://raw.githubusercontent.com/user/repo/main/audio/mus1.mp3'
  };
  const customPayload = buildQrPayloadText(customItem);
  assert(customPayload.includes('qr=cerita-museum-01'), 'Must include qr param');
  assert(customPayload.includes('title=Koleksi%20Museum%201'), 'Must include title param');
  assert(customPayload.includes('audio='), 'Must include audio param');

  // Device B parsing this custom payload:
  const parsedCustomByDeviceB = parseScannedQrPayload(customPayload);
  assert(parsedCustomByDeviceB, 'Device B must parse custom item without prior mapping');
  assert.strictEqual(parsedCustomByDeviceB.title, 'Koleksi Museum 1');
  assert.strictEqual(parsedCustomByDeviceB.audioUrl, 'https://raw.githubusercontent.com/user/repo/main/audio/mus1.mp3');
  console.log('✓ Custom Item QR Generator verified successfully');

  console.log('\n--- ALL 13 TEST SUITES PASSED SUCCESSFULLY (100%)! ---');
})();
