const puppeteer = require('puppeteer');
const fs = require('fs');
const path = require('path');
const { execSync } = require('child_process');

const ffmpegPath = require('@ffmpeg-installer/ffmpeg').path;

const NARRATION_DIR = path.join(__dirname, 'narration');
const SCENES_DIR = path.join(__dirname, 'scenes');
const FRAMES_DIR = path.join(__dirname, 'frames');
const OUTPUT_DIR = path.join(__dirname, '..', '..', 'public', 'videos');
const TEMPLATE_PATH = path.join(__dirname, 'scene-template.html');

const FPS = 10;
const FRAME_INTERVAL = 1000 / FPS;

function ensureDir(dir) {
  if (!fs.existsSync(dir)) fs.mkdirSync(dir, { recursive: true });
}

function loadNarration(id) {
  const fp = path.join(NARRATION_DIR, `${id}.json`);
  return JSON.parse(fs.readFileSync(fp, 'utf-8'));
}

function buildSceneConfig(narration) {
  const configs = {
    'register-step1': {
      formTitle: 'معلومات شخصية',
      subtitle: 'أنشئ حسابك كمرشح',
      fields: [
        { label: 'الاسم الكامل', placeholder: 'أحمد بن سالم', fullWidth: true },
        { label: 'تاريخ الميلاد', placeholder: '01/01/1990' },
        { label: 'مكان الولادة', placeholder: 'تونس' },
        { label: 'رقم بطاقة التعريف', placeholder: '12345678', ltr: true },
        { label: 'رقم الهاتف', placeholder: '50123456', ltr: true },
        { label: 'البريد الإلكتروني', placeholder: 'ahmed@example.com', ltr: true },
        { label: 'كلمة المرور', placeholder: '********' },
        { label: 'العنوان الكامل', placeholder: 'شارع الحبيب بورقيبة', fullWidth: true },
        { label: 'الولاية', type: 'select' },
        { label: 'المعتمدية', type: 'select' },
      ],
      showSubmit: true,
      submitText: 'التالي →',
      timeline: [
        { time: 1, type: 'fill', selector: '#inp-0', value: 'أحمد بن سالم' },
        { time: 4, type: 'highlight', selector: '#inp-2' },
        { time: 5, type: 'fill', selector: '#inp-2', value: 'تونس' },
        { time: 7, type: 'highlight', selector: '#inp-3' },
        { time: 8, type: 'fill', selector: '#inp-3', value: '12345678' },
        { time: 11, type: 'unhighlight' },
        { time: 14, type: 'highlight', selector: '#inp-5' },
        { time: 14.5, type: 'fill', selector: '#inp-5', value: 'ahmed@example.com' },
        { time: 17, type: 'unhighlight' },
        { time: 21, type: 'highlight', selector: '#inp-7' },
        { time: 21.5, type: 'fill', selector: '#inp-7', value: 'شارع الحبيب بورقيبة، تونس' },
        { time: 26, type: 'unhighlight' },
        { time: 29, type: 'show-submit' },
        { time: 31, type: 'highlight', selector: '#submitBtn' },
      ]
    },
    'register-step2': {
      formTitle: 'المسار الأكاديمي',
      subtitle: 'أضف شهاداتك ومؤهلاتك الدراسية',
      fields: [
        { label: 'مستوى الدراسة', type: 'select' },
        { label: 'اسم الشهادة', placeholder: 'بكالوريا علوم تجريبية' },
        { label: 'المؤسسة التعليمية', placeholder: 'المعهد النموذجي بتونس' },
        { label: 'التقدير', type: 'select' },
        { label: 'سنة التخرج', placeholder: '2020', ltr: true },
      ],
      showSubmit: true,
      submitText: 'التالي →',
      timeline: [
        { time: 3, type: 'highlight', selector: '#inp-0' },
        { time: 5, type: 'fill', selector: '#inp-0', value: 'بكالوريا' },
        { time: 7, type: 'unhighlight' },
        { time: 9, type: 'highlight', selector: '#inp-1' },
        { time: 10, type: 'fill', selector: '#inp-1', value: 'بكالوريا علوم تجريبية' },
        { time: 13, type: 'unhighlight' },
        { time: 16, type: 'highlight', selector: '#inp-2' },
        { time: 16.5, type: 'fill', selector: '#inp-2', value: 'المعهد النموذجي بتونس' },
        { time: 21, type: 'unhighlight' },
        { time: 24, type: 'highlight', selector: '#inp-4' },
        { time: 24.5, type: 'fill', selector: '#inp-4', value: '2020' },
        { time: 28, type: 'unhighlight' },
        { time: 31, type: 'show-submit' },
      ]
    },
    'register-step3': {
      formTitle: 'الخبرة المهنية',
      subtitle: 'أضف خبراتك المهنية السابقة',
      fields: [
        { type: 'checkbox', label: 'لدي خبرة مهنية' },
        { label: 'اسم الشركة', placeholder: 'شركة تقنية' },
        { label: 'المنصب', placeholder: 'مهندس معلوماتية' },
        { label: 'تاريخ البداية', placeholder: '01/2020', ltr: true },
        { label: 'تاريخ النهاية', placeholder: '12/2023', ltr: true },
        { type: 'checkbox', label: 'أعمل حالياً في هذا المنصب' },
        { label: 'الوصف', placeholder: 'وصف المهام والمسؤوليات...', fullWidth: true },
      ],
      showSubmit: true,
      submitText: 'التالي →',
      timeline: [
        { time: 3, type: 'check', selector: '#cb-0' },
        { time: 6, type: 'highlight', selector: '#inp-1' },
        { time: 6.5, type: 'fill', selector: '#inp-1', value: 'شركة تقنية' },
        { time: 10, type: 'unhighlight' },
        { time: 12, type: 'highlight', selector: '#inp-2' },
        { time: 12.5, type: 'fill', selector: '#inp-2', value: 'مهندس معلوماتية' },
        { time: 16, type: 'unhighlight' },
        { time: 19, type: 'highlight', selector: '#inp-3' },
        { time: 19.5, type: 'fill', selector: '#inp-3', value: '01/2020' },
        { time: 22, type: 'unhighlight' },
        { time: 24, type: 'highlight', selector: '#inp-4' },
        { time: 24.5, type: 'fill', selector: '#inp-4', value: '12/2023' },
        { time: 27, type: 'unhighlight' },
        { time: 29, type: 'show-submit' },
      ]
    },
    'register-step4': {
      formTitle: 'الوثائق المطلوبة',
      subtitle: 'ارفع المستندات الداعمة لطلبك',
      fields: [
        { type: 'doc', label: 'بطاقة التعريف الوطنية' },
        { type: 'doc', label: 'نسخة من الشهادة' },
        { type: 'doc', label: 'صورة شخصية حديثة' },
        { type: 'doc', label: 'السيرة الذاتية (CV)' },
        { type: 'doc', label: 'رسالة تحفيزية' },
        { type: 'doc', label: 'شهادة الميلاد رقم 3' },
        { type: 'doc', label: 'بطاقة السوابق العدلية' },
        { type: 'doc', label: 'شهادة العمل' },
      ],
      showSubmit: true,
      submitText: 'التالي →',
      timeline: [
        { time: 4, type: 'check', selector: '[data-doc="0"]' },
        { time: 6, type: 'check', selector: '[data-doc="1"]' },
        { time: 8, type: 'check', selector: '[data-doc="3"]' },
        { time: 10, type: 'check', selector: '[data-doc="4"]' },
        { time: 12, type: 'check', selector: '[data-doc="2"]' },
        { time: 16, type: 'check', selector: '[data-doc="5"]' },
        { time: 20, type: 'check', selector: '[data-doc="6"]' },
        { time: 24, type: 'check', selector: '[data-doc="7"]' },
        { time: 28, type: 'show-submit' },
      ]
    },
    'register-step5': {
      formTitle: 'اختيار المناظرة',
      subtitle: 'اختر المناظرة التي تريد التقدم إليها',
      fields: [
        { type: 'job', label: 'مناظرة مهندس معلوماتية', code: 'INF-2024', date: 'آخر أجل: 30/06/2024' },
        { type: 'job', label: 'مناظرة تقني سامي', code: 'TECH-2024', date: 'آخر أجل: 15/07/2024' },
        { type: 'job', label: 'مناظرة مساعد إداري', code: 'ADM-2024', date: 'آخر أجل: 20/07/2024' },
      ],
      showSubmit: true,
      submitText: 'التالي →',
      timeline: [
        { time: 6, type: 'select-job', selector: '0' },
        { time: 18, type: 'show-submit' },
        { time: 25, type: 'highlight', selector: '#submitBtn' },
      ]
    },
    'register-step6': {
      formTitle: 'التأكيد والإرسال',
      subtitle: 'راجع معلوماتك وأرسل طلب ترشحك',
      fields: [
        { type: 'summary', label: 'أحمد بن سالم - مناظرة مهندس معلوماتية' },
        { type: 'checkbox', label: 'أقر بأن جميع المعلومات المذكورة صحيحة' },
        { type: 'checkbox', label: 'أوافق على شروط الاستخدام' },
        { type: 'checkbox', label: 'أوافق على سياسة الخصوصية' },
        { type: 'checkbox', label: 'أقر بصحة التصريح الشرفي' },
      ],
      showSubmit: true,
      submitText: 'تأكيد التسجيل ✓',
      timeline: [
        { time: 3, type: 'show-summary' },
        { time: 10, type: 'check', selector: '#cb-0' },
        { time: 13, type: 'check', selector: '#cb-1' },
        { time: 16, type: 'check', selector: '#cb-2' },
        { time: 19, type: 'check', selector: '#cb-3' },
        { time: 25, type: 'show-submit' },
        { time: 31, type: 'highlight', selector: '#submitBtn' },
        { time: 33, type: 'confetti' },
      ]
    },
    'apply-direct': {
      stepNumber: '▶',
      formTitle: 'التقديم المباشر',
      subtitle: 'قدم مباشرة من صفحة تفاصيل المناظرة',
      fields: [
        { label: 'تصفح المناظرات المتاحة', placeholder: 'قائمة المناظرات', fullWidth: true },
        { type: 'job', label: 'مناظرة مهندس معلوماتية', code: 'INF-2024', date: 'آخر أجل: 30/06/2024' },
        { type: 'job', label: 'مناظرة تقني سامي', code: 'TECH-2024', date: 'آخر أجل: 15/07/2024' },
      ],
      showSubmit: true,
      submitText: 'بدء التقديم',
      timeline: [
        { time: 5, type: 'fill', selector: '#inp-0', value: 'قائمة المناظرات المتاحة' },
        { time: 12, type: 'select-job', selector: '0' },
        { time: 24, type: 'show-submit' },
        { time: 35, type: 'highlight', selector: '#submitBtn' },
      ]
    },
    'verify-email': {
      stepNumber: '✉',
      formTitle: 'التحقق من البريد الإلكتروني',
      subtitle: 'فعّل حسابك لإكمال التسجيل',
      fields: [
        { label: 'رمز التحقق', placeholder: 'أدخل رمز التحقق (6 أرقام)', ltr: true },
        { type: 'checkbox', label: 'لم تستلم الرمز؟ إعادة إرسال' },
        { type: 'checkbox', label: 'تحقق من البريد غير المرغوب فيه (Spam)' },
      ],
      showSubmit: true,
      submitText: 'تأكيد',
      timeline: [
        { time: 5, type: 'highlight', selector: '#inp-0' },
        { time: 7, type: 'fill', selector: '#inp-0', value: '482931' },
        { time: 12, type: 'unhighlight' },
        { time: 16, type: 'check', selector: '#cb-1' },
        { time: 20, type: 'check', selector: '#cb-0' },
        { time: 24, type: 'show-submit' },
        { time: 27, type: 'highlight', selector: '#submitBtn' },
      ]
    },
    'dashboard': {
      stepNumber: '◉',
      formTitle: 'مساحتي الشخصية',
      subtitle: 'أدر طلبات ترشحك وتابع إشعاراتك',
      fields: [
        { type: 'summary', label: 'مرحباً بك في مساحتك الشخصية' },
        { type: 'checkbox', label: 'عرض ملخص طلبات الترشح' },
        { type: 'checkbox', label: 'تفقد الإشعارات والتحديثات' },
        { type: 'checkbox', label: 'تعديل المعلومات الشخصية' },
        { type: 'checkbox', label: 'تحميل الاستدعاءات والوثائق' },
      ],
      showSubmit: false,
      timeline: [
        { time: 3, type: 'show-summary' },
        { time: 10, type: 'check', selector: '#cb-0' },
        { time: 14, type: 'check', selector: '#cb-1' },
        { time: 19, type: 'check', selector: '#cb-2' },
        { time: 24, type: 'check', selector: '#cb-3' },
      ]
    },
    'results': {
      stepNumber: '◉',
      formTitle: 'متابعة النتائج',
      subtitle: 'ابحث عن درجاتك وترتيبك',
      fields: [
        { label: 'رقم بطاقة التعريف الوطنية', placeholder: 'أدخل رقم البطاقة', ltr: true, fullWidth: true },
        { type: 'checkbox', label: 'البحث في نتائج المناظرات' },
        { type: 'summary', label: 'النتيجة: 85.50 - الترتيب: 12' },
      ],
      showSubmit: true,
      submitText: 'بحث',
      timeline: [
        { time: 4, type: 'highlight', selector: '#inp-0' },
        { time: 7, type: 'fill', selector: '#inp-0', value: '12345678' },
        { time: 13, type: 'unhighlight' },
        { time: 16, type: 'show-submit' },
        { time: 20, type: 'check', selector: '#cb-0' },
        { time: 25, type: 'show-summary' },
      ]
    }
  };

  const cfg = configs[narration.id] || {};
  return {
    ...narration,
    ...cfg,
    stepNumber: cfg.stepNumber || (narration.id.includes('step') ? parseInt(narration.id.replace('register-step', '')) : 1),
  };
}

function generateHtml(config) {
  let template = fs.readFileSync(TEMPLATE_PATH, 'utf-8');
  const configStr = JSON.stringify(config).replace(/<\/script>/g, '<\\/script>');
  template = template.replace('__CONFIG__', configStr);
  return template;
}

async function renderVideo(id) {
  console.log(`\n=== Rendering: ${id} ===`);

  const narration = loadNarration(id);
  const config = buildSceneConfig(narration);

  const html = generateHtml(config);
  const scenePath = path.join(SCENES_DIR, `${id}.html`);
  fs.writeFileSync(scenePath, html);

  const framesDir = path.join(FRAMES_DIR, id);
  ensureDir(framesDir);
  for (const f of fs.readdirSync(framesDir)) {
    fs.unlinkSync(path.join(framesDir, f));
  }

  const browser = await puppeteer.launch({
    headless: true,
    args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-gpu'],
    defaultViewport: { width: 1280, height: 720 },
  });

  try {
    const page = await browser.newPage();
    await page.goto('file://' + scenePath, { waitUntil: 'networkidle0' });
    await page.waitForFunction(() => typeof window.setTime === 'function');

    const totalFrames = Math.ceil(config.duration * FPS);
    const progressInterval = Math.max(1, Math.floor(totalFrames / 20));

    for (let frame = 0; frame < totalFrames; frame++) {
      const time = frame / FPS;
      await page.evaluate((t) => window.setTime(t), time);

      const screenshot = await page.screenshot({
        type: 'jpeg',
        quality: 80,
        fullPage: false,
      });

      const fp = path.join(framesDir, `frame-${String(frame).padStart(5, '0')}.jpg`);
      fs.writeFileSync(fp, screenshot);

      if (frame % progressInterval === 0) {
        const pct = Math.round((frame / totalFrames) * 100);
        process.stdout.write(`\r  [${id}] ${pct}% (${frame}/${totalFrames} فریم)`);
      }
    }

    const outputPath = path.join(OUTPUT_DIR, `${id}.mp4`);
    console.log(`\n  Assembling video with ffmpeg...`);

    const framePattern = path.join(framesDir, 'frame-%05d.jpg').replace(/\\/g, '/');
    const out = outputPath.replace(/\\/g, '/');
    const ffmpegCmd = `"${ffmpegPath}" -y -framerate ${FPS} -i "${framePattern}" -c:v libx264 -preset medium -pix_fmt yuv420p -crf 23 "${out}"`;
    execSync(ffmpegCmd, { stdio: 'pipe' });

    const stats = fs.statSync(outputPath);
    console.log(`  ✅ ${id}.mp4 (${(stats.size / 1024 / 1024).toFixed(1)} MB)`);

    for (const f of fs.readdirSync(framesDir)) {
      fs.unlinkSync(path.join(framesDir, f));
    }

    return outputPath;
  } finally {
    await browser.close();
  }
}

async function main() {
  ensureDir(OUTPUT_DIR);
  ensureDir(SCENES_DIR);
  ensureDir(FRAMES_DIR);

  const videoIds = [
    'register-step1', 'register-step2', 'register-step3',
    'register-step4', 'register-step5', 'register-step6',
    'apply-direct', 'verify-email', 'dashboard', 'results',
  ];

  console.log('Generating ' + videoIds.length + ' videos...\n');

  for (const id of videoIds) {
    try {
      await renderVideo(id);
    } catch (err) {
      console.error(`\n❌ ${id}: ${err.message}`);
    }
  }

  console.log('\n=== Done ===');
  const totalSize = fs.readdirSync(OUTPUT_DIR)
    .filter(f => f.endsWith('.mp4'))
    .reduce((sum, f) => sum + fs.statSync(path.join(OUTPUT_DIR, f)).size, 0);
  console.log('Total: ' + (totalSize / 1024 / 1024).toFixed(1) + ' MB');
}

main().catch(console.error);
