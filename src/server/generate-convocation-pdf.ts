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
  } catch { return ""; }
}

function toBase64Png(filePath: string): string | null {
  try {
    if (!fs.existsSync(filePath)) return null;
    var buf = fs.readFileSync(filePath);
    return "data:image/png;base64," + buf.toString("base64");
  } catch { return null; }
}

function extractConcoursName(title: string): string {
  try {
    const parts = title.split(/[-–—]/);
    if (parts.length > 1) {
      const last = parts[parts.length - 1].trim();
      if (last) return last;
    }
    return title || "";
  } catch { return title || ""; }
}

function extractYear(title: string, fallback?: string): string {
  try {
    const m = (title || "").match(/سنة\s*(\d{4})/);
    if (m) return m[1];
    if (fallback) {
      const m2 = fallback.match(/(\d{4})/);
      if (m2) return m2[1];
    }
    return String(new Date().getFullYear());
  } catch { return String(new Date().getFullYear()); }
}

export async function generateConvocationPdf(
  applicationId: string,
  templateId?: string | null
): Promise<Buffer> {
  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: true,
      job: true,
      documents: true,
    },
  });

  if (!application) throw new Error("Application not found");

  let template = null;
  if (templateId) {
    template = await prisma.convocationTemplate.findUnique({
      where: { id: templateId },
    });
  }

  const candidate = application.candidate;
  const job = application.job;

  // Resolve exam date/time/type directly from Épreuves (Exam) — as requested
  let examDateStr = "";
  let examTimeStr = "";
  let examTypeStr = "";
  try {
    const exam = await prisma.exam.findFirst({
      where: { jobId: job.id },
      include: { sessions: { orderBy: { date: "asc" }, take: 1 } },
    });
    if (exam) {
      if (exam.type === "ORAL") examTypeStr = "الشفاهي";
      else if (exam.type === "PRACTICAL") examTypeStr = "التطبيقي";
      else if (exam.type === "SPORTS") examTypeStr = "الرياضي";
      else if (exam.type === "WRITTEN") examTypeStr = "الكتــــابي";
      else examTypeStr = exam.type || "";
      if (exam.sessions[0]) {
        const _ed = new Date(exam.sessions[0].date);
        examDateStr = String(_ed.getFullYear()) + "/" + String(_ed.getMonth() + 1).padStart(2, "0") + "/" + String(_ed.getDate()).padStart(2, "0");
        examTimeStr = exam.sessions[0].startTime || "";
        if (exam.sessions[0].endTime) examTimeStr += " - " + exam.sessions[0].endTime;
      }
    }
    // Fallback to ExamResult if no session on epreuve
    if (!examDateStr || !examTimeStr) {
      const examResult = await prisma.examResult.findFirst({
        where: { candidateId: candidate.id, session: { exam: { jobId: job.id } } },
        include: { session: true },
        orderBy: { session: { date: "asc" } },
      });
      if (examResult?.session) {
        if (!examDateStr) { const _ed2 = new Date(examResult.session.date); examDateStr = String(_ed2.getFullYear()) + "/" + String(_ed2.getMonth() + 1).padStart(2, "0") + "/" + String(_ed2.getDate()).padStart(2, "0"); }
        if (!examTimeStr) {
          examTimeStr = examResult.session.startTime || "";
          if (examResult.session.endTime) examTimeStr += " - " + examResult.session.endTime;
        }
      }
    }
  } catch { /* ignore */ }

  const candidateName = candidate.fullName || "";
  const candidateAddress = [candidate.address, candidate.delegation, candidate.governorate]
    .filter(Boolean)
    .join("، ");
  const concoursName = extractConcoursName(job.titleAr || job.titleFr || "");
  const year = extractYear(job.titleAr || job.titleFr || "", examDateStr);

  var logoUrl = null;
  if (template?.logoUrl) {
    const logoPath = path.join(process.cwd(), "public", template.logoUrl.replace(/^\//, ""));
    logoUrl = toBase64Png(logoPath);
  }
  if (!logoUrl) {
    logoUrl = toBase64Png(path.join(process.cwd(), "public", "model-logo.png"));
  }

  var fontBase64 = "";
  try {
    fontBase64 = fs.readFileSync(
      path.join(process.cwd(), "public", "fonts", "Cairo-Variable.ttf")
    ).toString("base64");
  } catch { /* ignore */ }

  const _d = new Date();
  const dateStr = String(_d.getFullYear()) + "/" + String(_d.getMonth() + 1).padStart(2, "0") + "/" + String(_d.getDate()).padStart(2, "0");
  const p0 = "    الجمهورية التونسية                                                                                                                   تونس في : " + dateStr + "                                                ";
  const p5 = "<h2>إستدعاء</h2> ";
  const p6 = "                                                             إلى السيد(ة): " + candidateName;
  const p7 = "                                        العنوان:" + candidateAddress + "  ";
  const p9 = "<u>الموضوع</u>: بخصوص دعوتكم لإجتياز الإمتحان الشفاهي للمناظرة الخارجية لإنتداب " + concoursName + " بعنوان سنة " + year + " ،";
  const p12 = "       تبعا للتصريح عن قبول ترشحكم لإجتياز الإمتحان الشفاهي للمناظرة الخارجية لإنتدات " + concoursName + " بعنوان سنة " + year + " ،<br> أتشرف بإعلامكم أنه يتعين عليكم الحضور بـ:";
  const p13 = "مقر شركة النهوض بالرياضة، المركز العمراني الشمالي، شارع محمد علي عقيد – 2035- الحي الوطني الرياضي";
  const p14 = "يوم " + (examDateStr || "") + " على الساعة " + (examTimeStr || "") + "، مصحوبا(ة) وجوبا ببطاقة التعريف الوطنية وبهذا الإستدعاء.";
  const p16 = "                                                                                                                                           والسلام";

  const html = `<!doctype html>
<html dir="rtl">
<head>
<meta charset="utf-8">
<style>
${fontBase64 ? `@font-face { font-family: 'Cairo'; src: url(data:font/truetype;charset=utf-8;base64,${fontBase64}) format('truetype'); }` : ""}
* { margin: 0; padding: 0; box-sizing: border-box; }
body { font-family: 'Cairo', sans-serif; padding: 40px; padding-bottom: 80px; color: #1a1a1a; font-size: 11pt; line-height: 1.5; text-align: justify; }
p { white-space: pre-wrap; margin: 0; text-align: justify; }
.logo { text-align: center; margin-bottom: 8px; }
.logo img { width: 70px; height: 70px; object-fit: contain; }
.company { margin-bottom: 4px; }
.title { text-align: center; font-size: 22pt; font-weight: bold; margin: 16px 0; }
h2 { text-align: center; font-size: 22pt; font-weight: bold; margin: 16px 0; }
.subject { margin: 8px 0; }
.body { margin: 8px 0; text-align: justify; }
.closing { text-align: right; margin-top: 24px; }
.footer { position: fixed; bottom: 20px; left: 40px; right: 40px; text-align: center; font-size: 9pt; color: #555; border-top: 1px solid #ccc; padding-top: 6px; }
</style>
</head>
<body>
<p>${p0}</p>
<p>شركة النهوض بالرياضة   </p>
${logoUrl ? `<div class="logo" style="text-align:center; margin:12px 0;"><img src="${logoUrl}" alt="Logo" /></div>` : ""}
<p></p>
<p></p>
<p></p>
${p5}
<br>
<p>${p6}</p>
<br>
<p>${p7}</p>
<br>
<br>
<p></p>
<p>${p9}</p>
<p></p>
<p>وبعد،</p>
<br>
<p>${p12}</p>
<br>
<p>${p13}</p>
<br>
<p>${p14}</p>
<p></p>
<br>
<br>
<br>

<div style="text-align:left; margin-top:30px;">           والسلام</div>
<div class="footer">شركة النهوض بالرياضة، المركز العمراني الشمالي، شارع محمد علي عقيد – 2035- الحي الوطني الرياضي</div>
</body>
</html>`;

  const browser = await getBrowser();
  try {
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "load" });
    const pdfBuf = await page.pdf({
      format: "A4",
      margin: { top: "20px", right: "20px", bottom: "20px", left: "20px" },
      printBackground: true,
    });
    return Buffer.from(pdfBuf);
  } finally {
    await browser.close();
  }
}
