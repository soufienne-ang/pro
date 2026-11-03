export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requireRole, isErrorResponse } from "@/lib/roles";
import { launchBrowser } from "@/server/browser";
import path from "path";
import fs from "fs";

async function getBrowser() {
  return await launchBrowser();
}

function formatDate(d: Date): string {
  try {
    return d.getDate().toString().padStart(2, "0") + "/" + (d.getMonth() + 1).toString().padStart(2, "0") + "/" + d.getFullYear();
  } catch { return ""; }
}

function getAeAlArabiyaBase64(): string {
  var fontPath = path.join(process.cwd(), "public", "fonts", "AeAlArabiya.ttf");
  if (fs.existsSync(fontPath)) return fs.readFileSync(fontPath, "base64");
  var amiriPath = path.join(process.cwd(), "public", "fonts", "Amiri-Regular.ttf");
  if (fs.existsSync(amiriPath)) return fs.readFileSync(amiriPath, "base64");
  return "";
}

function getImageBase64(relativePath: string): string {
  var fullPath = path.join(process.cwd(), "public", relativePath);
  if (!fs.existsSync(fullPath)) return "";
  var ext = path.extname(relativePath).toLowerCase();
  var mime = ext === ".png" ? "image/png" : ext === ".jpg" || ext === ".jpeg" ? "image/jpeg" : ext === ".svg" ? "image/svg+xml" : "image/png";
  var data = fs.readFileSync(fullPath);
  return "data:" + mime + ";base64," + data.toString("base64");
}

function buildHtml(props: {
  logoImg: string; candidateName: string; cin: string; examTitle: string;
  examType: string; sessionDate: string; startTime: string; endTime: string;
  roomName: string | null; roomLocation: string | null; duration: number | null;
}) {
  var fontBase64 = getAeAlArabiyaBase64();
  var fontFace = fontBase64
    ? "@font-face { font-family: 'AeAlArabiya'; src: url(data:font/truetype;charset=utf-8;base64," + fontBase64 + "); }"
    : "";

  return `<!DOCTYPE html>
<html dir="rtl">
<head>
<meta charset="utf-8"/>
<style>
  ${fontFace}
  * { margin: 0; padding: 0; box-sizing: border-box; font-family: ${fontBase64 ? "'AeAlArabiya', " : ""} 'Traditional Arabic', Arial, sans-serif; }
  body { background: #fff; padding: 20px; }
  .header { text-align: center; margin-bottom: 20px; }
  .header img { max-height: 100px; }
  .header h1 { font-size: 20px; font-weight: bold; margin-top: 10px; }
  .header h2 { font-size: 14px; color: #555; margin-top: 4px; }
  .title { text-align: center; font-size: 18px; font-weight: bold; margin: 20px 0; padding: 10px; border: 2px solid #000; }
  table { width: 100%; border-collapse: collapse; margin: 15px 0; }
  td, th { border: 1px solid #333; padding: 8px; text-align: right; font-size: 13px; }
  th { background: #e5e7eb; font-weight: bold; text-align: center; }
  td:first-child { font-weight: bold; width: 35%; background: #f9fafb; }
  .footer { margin-top: 40px; text-align: center; font-size: 12px; color: #777; border-top: 1px solid #ddd; padding-top: 15px; }
  .note { margin-top: 20px; padding: 10px; border: 1px solid #fbbf24; background: #fffbeb; border-radius: 4px; font-size: 12px; }
  .note strong { color: #d97706; }
</style>
</head>
<body>
  <div class="header">
    ${props.logoImg ? '<img src="' + props.logoImg + '"/>' : ""}
    </div>

  <div class="title">استدعاء لاجتياز اختبار ${props.examType === "ORAL" ? "شفوي" : props.examType === "PRACTICAL" ? "تطبيقي" : "رياضي"}</div>

  <table>
    <tr><td>الاسم واللقب</td><td>${props.candidateName}</td></tr>
    <tr><td>رقم بطاقة التعريف الوطنية</td><td>${props.cin}</td></tr>
    <tr><td>الاختبار</td><td>${props.examTitle}</td></tr>
    <tr><td>تاريخ الجلسة</td><td>${props.sessionDate}</td></tr>
    <tr><td>التوقيت</td><td>${props.startTime} - ${props.endTime}</td></tr>
    ${props.roomName ? '<tr><td>القاعة</td><td>' + props.roomName + (props.roomLocation ? " - " + props.roomLocation : "") + '</td></tr>' : ""}
    ${props.duration ? '<tr><td>المدة (دقائق)</td><td>' + props.duration + '</td></tr>' : ""}
  </table>

  <div style="text-align:center; font-size:14px; font-weight:bold; margin:18px 0 10px; padding:10px; border:1.5px solid #000; background:#f9fafb;">
    أنت مدعو لإجتياز الإختبار ${props.examType === "ORAL" ? "الشفاهي" : props.examType === "PRACTICAL" ? "التطبيقي" : props.examType === "SPORTS" ? "الرياضي" : props.examType === "WRITTEN" ? "الكتــــابي" : props.examType} يوم : ${props.sessionDate} على الساعة ${props.startTime} مصحوبا بهذا الإستدعاء
  </div>

  <div class="note">
    <strong>ملاحظة هامة:</strong><br/>
    يجب على المترشح الحضور قبل الموعد المحدد بـ 30 دقيقة على الأقل مع بطاقة التعريف الوطنية.<br/>
    في حالة الغياب أو التأخر يعتبر المترشح راسباً في هذا الاختبار.
  </div>

  <div class="footer">
  هذا الاستدعاء صادر عن موقع المناظرات الخاص بشركة النهوض بالرياضة - PROMOSPORT<br/>
    تاريخ الطباعة: ${formatDate(new Date())}
  </div>
</body>
</html>`;
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ resultId: string }> }
) {
  try {
    const user = await requireRole("CANDIDATE");
    if (isErrorResponse(user)) return user;

    const p = await params;

    const result = await prisma.examResult.findUnique({
      where: { id: p.resultId },
      include: {
        candidate: { select: { id: true, fullName: true, cin: true } },
        session: {
          include: {
            exam: { select: { id: true, titleAr: true, titleFr: true, type: true, duration: true } },
            room: { select: { name: true, location: true } },
          },
        },
      },
    });

    if (!result || result.candidateId !== user.id) {
      return NextResponse.json({ error: "Invitation introuvable" }, { status: 404 });
    }

    var logoImg = getImageBase64("log3.png");

    var html = buildHtml({
      logoImg,
      candidateName: result.candidate.fullName,
      cin: result.candidate.cin,
      examTitle: result.session.exam.titleAr,
      examType: result.session.exam.type,
      sessionDate: formatDate(result.session.date),
      startTime: result.session.startTime,
      endTime: result.session.endTime,
      roomName: result.session.room?.name || null,
      roomLocation: result.session.room?.location || null,
      duration: result.session.exam.duration,
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
      return new NextResponse(pdfBuf, {
        headers: {
          "Content-Type": "application/pdf",
          "Content-Disposition": 'attachment; filename="convocation-exam.pdf"',
          "Content-Length": pdfBuf.length.toString(),
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("Candidate exam convocation PDF error:", err);
    return NextResponse.json({
      error: "Failed: " + ((err instanceof Error) ? err.message : "Unknown")
    }, { status: 500 });
  }
}
