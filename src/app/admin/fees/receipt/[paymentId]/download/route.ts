import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NextRequest, NextResponse } from "next/server";
import { buildApiUrl } from "@/lib/api-client";

type ReceiptResponse = {
  payment: {
    id: string;
    invoiceNo: string;
    amount: number;
    method: string;
    reference: string | null;
    paidAt: string;
    studentName: string;
    className: string;
    scheduleName: string | null;
    termName: string | null;
    academicYear: string | null;
  };
  school: {
    name: string;
    currency: string;
    address: string | null;
    city: string | null;
    phone: string | null;
    email: string | null;
  } | null;
};

const toPdfText = (value: string) =>
  value.normalize("NFKD").replace(/[\u0300-\u036f]/g, "").replace(/[^\x20-\x7E]/g, "?");

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ paymentId: string }> }
) {
  try {
    const { paymentId } = await params;
    const backendResponse = await fetch(
      buildApiUrl(`/admin/fees/payments/${encodeURIComponent(paymentId)}/receipt`),
      { headers: { cookie: request.headers.get("cookie") || "" } }
    );

    if (!backendResponse.ok) {
      const errorData = await backendResponse.json().catch(() => ({ error: "Unable to retrieve receipt" }));
      return NextResponse.json(errorData, { status: backendResponse.status });
    }

    const { payment, school }: ReceiptResponse = await backendResponse.json();
    const pdf = await PDFDocument.create();
    const page = pdf.addPage([595.28, 841.89]);
    const regular = await pdf.embedFont(StandardFonts.Helvetica);
    const bold = await pdf.embedFont(StandardFonts.HelveticaBold);
    const left = 52;
    let y = 780;

    const draw = (text: string, size = 11, strong = false, color = rgb(0.12, 0.16, 0.22)) => {
      page.drawText(toPdfText(text), { x: left, y, size, font: strong ? bold : regular, color, maxWidth: 490 });
      y -= size + 12;
    };

    draw(school?.name || "School", 19, true);
    if (school?.address || school?.city) draw([school.address, school.city].filter(Boolean).join(", "));
    if (school?.phone) draw(`Phone: ${school.phone}`);
    if (school?.email) draw(`Email: ${school.email}`);
    y -= 18;
    page.drawLine({ start: { x: left, y }, end: { x: 543, y }, thickness: 1, color: rgb(0.82, 0.85, 0.89) });
    y -= 34;
    draw("OFFICIAL PAYMENT RECEIPT", 16, true, rgb(0.04, 0.32, 0.61));
    draw(`Receipt reference: ${payment.reference || payment.id}`);
    draw(`Invoice number: ${payment.invoiceNo}`);
    draw(`Date: ${new Date(payment.paidAt).toLocaleString("en-GB")}`);
    y -= 12;
    draw("PAYMENT RECEIVED FROM", 10, true, rgb(0.35, 0.4, 0.47));
    draw(payment.studentName, 13, true);
    draw(`Class: ${payment.className || "Not listed"}`);
    draw(`Fee: ${payment.scheduleName || "School fees"}`);
    draw(`Term: ${[payment.termName, payment.academicYear].filter(Boolean).join(" ") || "Not listed"}`);
    draw(`Payment method: ${payment.method.replace(/_/g, " ")}`);
    y -= 10;
    page.drawLine({ start: { x: left, y }, end: { x: 543, y }, thickness: 1, color: rgb(0.82, 0.85, 0.89) });
    y -= 36;
    draw(`AMOUNT RECEIVED: ${school?.currency || "NGN"} ${(payment.amount / 100).toFixed(2)}`, 16, true);
    y -= 32;
    page.drawText("Thank you. Please keep this receipt for your records.", {
      x: left,
      y,
      size: 10,
      font: regular,
      color: rgb(0.4, 0.44, 0.5),
      maxWidth: 490,
    });

    const pdfBytes = await pdf.save();
    const bytes = new ArrayBuffer(pdfBytes.byteLength);
    new Uint8Array(bytes).set(pdfBytes);
    const safePaymentId = payment.id.replace(/[^\w-]/g, "_");
    return new NextResponse(bytes, {
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="schoolbase-receipt-${safePaymentId}.pdf"`,
        "Cache-Control": "private, no-store",
      },
    });
  } catch (error) {
    console.error("Failed to generate payment receipt PDF:", error);
    return NextResponse.json({ error: "Failed to generate payment receipt PDF" }, { status: 500 });
  }
}
