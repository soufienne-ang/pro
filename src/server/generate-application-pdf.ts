import { prisma } from "@/server/prisma";
import { launchBrowser } from "@/server/browser";
import path from "path";
import fs from "fs";

async function getBrowser() {
  return await launchBrowser();
}

function formatDate(d: Date): string {
  try {
    var dd = d.getDate().toString().padStart(2, "0");
    var mm = (d.getMonth() + 1).toString().padStart(2, "0");
    var yyyy = d.getFullYear();
    return dd + "/" + mm + "/" + yyyy;
  } catch {
    return "";
  }
}

function toBase64Png(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    var buf = fs.readFileSync(filePath);
    return "data:image/png;base64," + buf.toString("base64");
  } catch {
    return null;
  }
}

function buildHtml(props: {
  joumImg: string; logoImg: string; jobTitle: string; fullName: string;
  cin: string; email: string; phone: string; birthDate: string;
  address: string; studyLevel: string; diploma: string;
  institution: string; graduationYear: string; gpa: string;
}) {
  var personalRows = [
    ["الإسم واللقب", props.fullName],
    ["رقم بطاقة التعريف الوطنية", props.cin],
    ["البريد الإلكتروني", props.email],
    ["الهاتف", props.phone],
    ["تاريخ الولادة", props.birthDate],
    ["العنوان", props.address],
  ];
  var academicRows = [
    ["المستوى الدراسي", props.studyLevel],
    ["الشهادة", props.diploma],
    ["المؤسسة", props.institution],
    ["سنة التخرج", props.graduationYear],
    ["المعدل العام", props.gpa],
  ];

  var fontBase64 = fs.readFileSync(
    path.join(process.cwd(), "public", "fonts", "AeAlArabiya.ttf")
  ).toString("base64");

  var logoLeftBase64 = props.joumImg;
  var logoRightBase64 = props.logoImg;

  function rowHtml(label: string, value: string) {
    return `<tr>
      <td class="lbl">${label}</td>
      <td class="val">${value || "—"}</td>
    </tr>`;
  }

  return `<!doctype html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<style>
@font-face {
  font-family: 'AeAlArabiya';
  src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype');
}
* { margin: 0; padding: 0; box-sizing: border-box; }
body {
  font-family: 'AeAlArabiya', serif;
  padding: 40px;
  color: #1a1a1a;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 20px; }
.header img { max-height: 100px; }
.title { font-size: 16pt; color: #1a3a6e; text-align: center; font-weight: bold; }
.subtitle { font-size: 14pt; color: #cc0000; text-align: center; font-weight: bold; margin-bottom: 8px; }
.separator { border: none; border-top: 1px solid #ccc; margin: 10px 0; }
.thankyou { background: #e8f5e9; border: 1px solid #a5d6a7; border-radius: 6px; padding: 10px; text-align: center; font-size: 11pt; font-weight: bold; color: #2e7d32; margin-bottom: 16px; }
.section-title { font-size: 13pt; color: #cc0000; font-weight: bold; margin-bottom: 6px; }
table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
td { padding: 5px 8px; font-size: 10pt; border-bottom: 1px solid #ddd; }
td.lbl { width: 35%; background: #f5f5f5; font-weight: bold; color: #1a1a1a; }
td.val { width: 65%; color: #333; }
tr:nth-child(even) td.lbl { background: #fff; }
tr:nth-child(even) td.val { background: #f9f9f9; }
.signature { margin-top: 24px; text-align: left; }
.signature .label { font-size: 12pt; color: #1a3a6e; font-weight: bold; }
.signature .line { border-bottom: 1px solid #aaa; width: 200px; margin-top: 8px; margin-right: auto; }
.conditions-title { font-size: 12pt; color: #cc0000; font-weight: bold; margin-top: 20px; margin-bottom: 8px; }
.conditions { font-size: 9pt; color: #333; line-height: 1.8; padding-right: 16px; }
.conditions p { margin-bottom: 8px; }
</style>
</head>
<body>

<div class="header">
  ${logoRightBase64 ? `<img src="${logoRightBase64}" alt="Logo" />` : '<div></div>'}
  ${logoLeftBase64 ? `<img src="${logoLeftBase64}" alt="Joum" />` : '<div></div>'}
</div>

<div class="title">${props.jobTitle}</div>
<div class="subtitle">إستمارة الترشح</div>
<hr class="separator" />

<div class="thankyou">شكرا السيد/(ة): ${props.fullName} لقد تمت عملية التسجيل بنجاح</div>

<div class="section-title">المعلومات الشخصية</div>
<table>${personalRows.map(r => rowHtml(r[0], r[1])).join("")}</table>

<div class="section-title">المسار الأكاديمي</div>
<table>${academicRows.map(r => rowHtml(r[0], r[1])).join("")}</table>

<div class="signature">
  <div class="label">إمضاء المترشح(ة)</div>
  <div class="line"></div>
</div>

<div class="conditions-title">ملاحظة هامة:</div>
<div class="conditions">
<p>يتولى المترشح عند استكمال عملية التسجيل عبر الموقع الإلكتروني استخراج إستمارة الترشح وإرفاقها وجوبا بملف ترشحه الذي يجب أن يحتوي على جميع الوثائق المطلوبة، والتثبت من ذلك قبل وضعها في ظرف خارجي مغلق بإحكام يحمل بكل وضوح البيانات التالية (مع التنصيص على رمز الخطة وعلى الخطة المترشح لها) :</p>
<p dir="rtl" style="text-align: center;"><strong>لا يفتح إلا من طرف لجنة المناظرة</strong></p>
<p dir="rtl" style="text-align: center;"><strong>ملف ترشح لمناظرة إنتداب خارجي بعنوان سنة 2026</strong></p>
<p dir="rtl" style="text-align: center;"><strong>رمز الخطة : ..................</strong></p>
<p dir="rtl" style="text-align: center;"><strong>الخطة المترشح لها : ........................................</strong></p>
<p>يتولى المترشح إرسال ملف ترشحه في الآجال المحددة بهذا البلاغ عبر البريد السريع أو البريد مضمون الوصول مع الإعلام بالبلوغ أو إيداعه مباشرة لدى مكتب الضبط المركزي لشركة النهوض بالرياضة على العنوان التالي :</p>
<p dir="rtl" style="text-align: center;"><span style="font-size: 12pt; color: #ff0000;"><strong>شركة النهوض بالرياضة، المركز العمراني الشمالي، شارع محمد علي عقيد </strong></span></p>
<p dir="rtl" style="text-align: center;"><span style="font-size: 12pt; color: #ff0000;"><strong>&nbsp;- 2035 &nbsp;- الحي الأولمبي</strong></span></p>
</div>

</body>
</html>`;
}

export async function generateApplicationPdf(applicationId: string): Promise<Buffer> {
  var application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: { candidate: true, job: true },
  });

  if (!application) throw new Error("Application not found");

  var c = application.candidate;
  var job = application.job;
  var academicInfo = application.academicInfo as Record<string, unknown> | null;
  var birthDate = c.dateOfBirth ? formatDate(new Date(c.dateOfBirth)) : "";
  var addressParts = [c.address, c.delegation, c.governorate].filter(Boolean);
  if (addressParts.length === 0) addressParts = ["—"];

  var diplomas = ((academicInfo?.diplomas as Array<Record<string, unknown>>) || []).filter(Boolean);
  var topDiploma = diplomas.sort(function (a, b) {
    return ((b.graduationYear as number) || 0) - ((a.graduationYear as number) || 0);
  })[0];

  var joumImg = toBase64Png(path.join(process.cwd(), "public", "joum2.png"));
  var logoImg = toBase64Png(path.join(process.cwd(), "public", "log2.png"));

  var html = buildHtml({
    joumImg: joumImg || "",
    logoImg: logoImg || "",
    jobTitle: job.titleAr || job.titleFr || "",
    fullName: c.fullName || "",
    cin: c.cin || "",
    email: c.email || "",
    phone: c.phone || "",
    birthDate: birthDate,
    address: addressParts.join(" - "),
    studyLevel: (topDiploma?.studyLevel as string) || "",
    diploma: (topDiploma?.diploma as string) || "",
    institution: (topDiploma?.institution as string) || "",
    graduationYear: topDiploma?.graduationYear ? String(topDiploma.graduationYear) : "",
    gpa: (topDiploma?.noteGenerale as string) || "",
  });

  var browser = await getBrowser();
  try {
    var page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    var pdfBuf = await page.pdf({
      format: "A4",
      margin: { top: "0px", right: "0px", bottom: "0px", left: "0px" },
      printBackground: true,
    });
    return Buffer.from(pdfBuf);
  } finally {
    await browser.close();
  }
}
