export const dynamic = "force-dynamic";
export const runtime = "nodejs";

import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/server/prisma";
import { requirePermission, isErrorResponse } from "@/lib/roles";
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

function formatTime(t: string): string {
  if (!t) return "";
  var parts = t.split(":");
  if (parts.length < 2) return t;
  return parts[0] + ":" + parts[1];
}

function buildHtml(props: {
  joumImg: string; logoImg: string;
  examTitle: string; examType: string;
  sessionInfo: { date: string; startTime: string; endTime: string; roomName: string; sessionType: string } | null;
  candidates: Array<{ fullName: string; cin: string }>;
}) {
  var fontBase64 = fs.readFileSync(
    path.join(process.cwd(), "public", "fonts", "AeAlArabiya.ttf")
  ).toString("base64");

  var candidateRows = props.candidates.map(function (c, i) {
    var idx = (i + 1).toString().padStart(2, "0");
    return `<tr>
      <td class="idx">${idx}</td>
      <td class="name">${c.fullName || "—"}</td>
      <td class="cin">${c.cin || "—"}</td>
      <td class="sig"></td>
    </tr>`;
  }).join("");

  var sessionHtml = "";
  if (props.sessionInfo) {
    var si = props.sessionInfo;
    var typeLabel = si.sessionType === "RESIT" ? "استدراكية" : "رئيسية";
    sessionHtml = `<div class="session-box">
      <table class="session-table">
        <tr><td class="slbl">تاريخ الاختبار</td><td class="sval">${si.date}</td></tr>
        <tr><td class="slbl">وقت البدء</td><td class="sval">${si.startTime}</td></tr>
        <tr><td class="slbl">وقت الانتهاء</td><td class="sval">${si.endTime}</td></tr>
        <tr><td class="slbl">القاعة</td><td class="sval">${si.roomName || "—"}</td></tr>
        <tr><td class="slbl">نوع الحصة</td><td class="sval">${typeLabel}</td></tr>
      </table>
    </div>`;
  }

  var typeLabelAr = "";
  switch (props.examType) {
    case "WRITTEN": typeLabelAr = "اختبار كتابي"; break;
    case "ORAL": typeLabelAr = "اختبار شفاهي"; break;
    case "PRACTICAL": typeLabelAr = "اختبار تطبيقي"; break;
    case "SPORTS": typeLabelAr = "اختبار رياضي"; break;
    default: typeLabelAr = props.examType;
  }

  var candidateCount = props.candidates.length;

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
  padding: 30px 40px;
  color: #1a1a1a;
  font-size: 10pt;
}
.header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 14px; }
.header img { max-height: 80px; }
.title { font-size: 15pt; color: #1a3a6e; text-align: center; font-weight: bold; margin-bottom: 4px; }
.subtitle { font-size: 13pt; color: #cc0000; text-align: center; font-weight: bold; margin-bottom: 10px; }
.type-label { font-size: 11pt; color: #1a3a6e; text-align: center; font-weight: bold; margin-bottom: 10px; }
.separator { border: none; border-top: 1px solid #ccc; margin: 8px 0; }
.session-box {
  background: #f0f4ff; border: 1px solid #b0c4de; border-radius: 6px;
  padding: 10px 14px; margin-bottom: 14px;
}
.session-table { width: 100%; border-collapse: collapse; }
.session-table td { padding: 4px 8px; font-size: 10pt; }
.session-table td.slbl { width: 30%; font-weight: bold; color: #1a3a6e; }
.session-table td.sval { width: 70%; color: #333; }
.candidates-title {
  font-size: 12pt; color: #1a3a6e; font-weight: bold; margin-bottom: 6px;
}
.candidates-table { width: 100%; border-collapse: collapse; margin-bottom: 10px; }
.candidates-table th {
  background: #1a3a6e; color: #fff; font-weight: bold;
  padding: 6px 8px; font-size: 10pt; text-align: center;
}
.candidates-table td {
  padding: 5px 8px; font-size: 9pt; border-bottom: 1px solid #ddd; text-align: center;
}
.candidates-table td.idx { width: 8%; }
.candidates-table td.name { width: 40%; text-align: right; }
.candidates-table td.cin { width: 27%; }
.candidates-table td.sig { width: 25%; min-height: 20px; }
.candidates-table tr:nth-child(even) { background: #f9f9ff; }
.candidates-table tr:last-child td { border-bottom: 2px solid #1a3a6e; }
.count-info { font-size: 9pt; color: #555; margin-bottom: 8px; text-align: left; }
.conditions-title { font-size: 11pt; color: #cc0000; font-weight: bold; margin-top: 16px; margin-bottom: 6px; }
.conditions { font-size: 8.5pt; color: #333; line-height: 1.7; padding-right: 12px; }
.conditions p { margin-bottom: 6px; }
.footer-note { font-size: 8pt; color: #888; text-align: center; margin-top: 16px; border-top: 1px solid #ccc; padding-top: 8px; }
</style>
</head>
<body>

<div class="header">
  ${props.logoImg ? '<img src="' + props.logoImg + '" alt="Logo" />' : '<div></div>'}
  ${props.joumImg ? '<img src="' + props.joumImg + '" alt="Joum" />' : '<div></div>'}
</div>

<div class="title">${props.examTitle}</div>
<div class="subtitle">استدعاء لاجتياز الاختبار</div>
<div class="type-label">${typeLabelAr}</div>
<hr class="separator" />

${sessionHtml}

<div class="candidates-title">قائمة المترشحين المدعوين</div>
<div class="count-info">عدد المترشحين: ${candidateCount}</div>
<table class="candidates-table">
  <thead>
    <tr>
      <th>الترقيم</th>
      <th>الإسم واللقب</th>
      <th>رقم بطاقة التعريف</th>
      <th>الإمضاء</th>
    </tr>
  </thead>
  <tbody>
    ${candidateRows || '<tr><td colspan="4" style="text-align:center;padding:12px;color:#999;">لا يوجد مترشحون</td></tr>'}
  </tbody>
</table>

<div class="conditions-title">ملاحظات هامة:</div>
<div class="conditions">
  <p>• يتعين على المترشح المدعو الحضور إلى مكان إجراء الاختبار في التاريخ والوقت المحددين أعلاه.</p>
  <p>• يجب على المترشح أن يتوفر على بطاقة التعريف الوطنية أو جواز السفر ساري المفعول للإثبات الشخصية.</p>
  <p>• يتوجب على المترشح إحضار وسائل الكتابة اللازمة (قلم أزرق، قلم أحمر، مسطرة، آلة حاسبة بسيطة عند الاقتضاء).</p>
  <p>• لا يسمح للمترشح بالدخول إلى قاعة الاختبار بعد مرور 30 دقيقة من الوقت المحدد لبداية الاختبار.</p>
  <p>• يمنع نهائيا استعمال الهاتف الجوال أو أي أجهزة اتصال أخرى داخل قاعة الاختبار.</p>
  <p>• هذا الاستدعاء شخصي ولا يمكن التنازل عنه أو تحويله إلى شخص آخر.</p>
</div>

<div class="footer-note">
  شركة النهوض بالرياضة - المركز العمراني الشمالي، شارع محمد علي عقيد - 2035 - الحي الأولمبي
</div>

</body>
</html>`;
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

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    var user = await requirePermission("manageExams");
    if (isErrorResponse(user)) return user;

    var { id } = await params;
    var { searchParams } = new URL(request.url);
    var sessionId = searchParams.get("sessionId");

    var exam = await prisma.exam.findUnique({
      where: { id },
      include: { job: true },
    });

    if (!exam) {
      return NextResponse.json({ error: "Exam not found" }, { status: 404 });
    }

    var isStaff = user.role !== "CANDIDATE";
    if (!isStaff) {
      var ownApplication = await prisma.application.findFirst({
        where: {
          candidateId: user.id,
          jobId: exam.jobId,
          status: { in: ["APPROVED", "ORAL_TEST"] },
        },
      });
      if (!ownApplication) {
        return NextResponse.json({ error: "Forbidden" }, { status: 403 });
      }
    }

    var sessionInfo: {
      date: string; startTime: string; endTime: string;
      roomName: string; sessionType: string;
    } | null = null;

    if (sessionId) {
      var session = await prisma.examSession.findUnique({
        where: { id: sessionId },
        include: { room: true },
      });
      if (session) {
        sessionInfo = {
          date: formatDate(new Date(session.date)),
          startTime: formatTime(session.startTime),
          endTime: formatTime(session.endTime),
          roomName: session.room?.name || "",
          sessionType: session.type,
        };
      }
    }

    var applications = await prisma.application.findMany({
      where: {
        jobId: exam.jobId,
        status: { in: ["APPROVED", "ORAL_TEST"] },
      },
      include: { candidate: true },
      orderBy: { candidate: { fullName: "asc" } },
    });

    var candidates = applications.map(function (app) {
      return {
        fullName: app.candidate.fullName || "",
        cin: app.candidate.cin || "",
      };
    });

    var joumImg = toBase64Png(path.join(process.cwd(), "public", "joum2.png"));
    var logoImg = toBase64Png(path.join(process.cwd(), "public", "log2.png"));

    var html = buildHtml({
      joumImg: joumImg || "",
      logoImg: logoImg || "",
      examTitle: exam.titleAr || exam.titleFr || "",
      examType: exam.type,
      sessionInfo: sessionInfo,
      candidates: candidates,
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
          "Content-Disposition": 'attachment; filename="convocation-examen.pdf"',
          "Content-Length": pdfBuf.length.toString(),
        },
      });
    } finally {
      await browser.close();
    }
  } catch (err) {
    console.error("Exam convocation PDF error:", err);
    return NextResponse.json({
      error: "Failed: " + ((err instanceof Error) ? err.message : "Unknown")
    }, { status: 500 });
  }
}
