
import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { Buffer } from "node:buffer";


const brandColor = rgb(0.46, 0.26, 0.43);
const darkColor = rgb(0.20, 0.14, 0.20);
const mutedColor = rgb(0.48, 0.42, 0.48);
const lightColor = rgb(0.98, 0.95, 0.97);
const borderColor = rgb(0.91, 0.85, 0.90);
const greenColor = rgb(0.18, 0.48, 0.30);

function safeText(value: unknown): string {
  return String(value ?? "")
    .replace(/[^\x20-\x7E]/g, "")
    .trim();
}

function formatMoney(amount: number, currency = "NGN"): string {
  const value = Number(amount || 0);

  return `${currency} ${value.toLocaleString("en-US", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

function formatDate(value: string | null | undefined): string {
  if (!value) return "Not available";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Not available";

  return date.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
}

function drawWrappedText(
  text: string,
  x: number,
  y: number,
  maxWidth: number,
  font: any,
  fontSize: number,
  page: any,
  color = darkColor,
  lineHeight = 14
): number {
  const words = safeText(text).split(/\s+/).filter(Boolean);

  let line = "";
  let currentY = y;

  for (const word of words) {
    const testLine = line ? `${line} ${word}` : word;
    const width = font.widthOfTextAtSize(testLine, fontSize);

    if (width > maxWidth && line) {
      page.drawText(line, {
        x,
        y: currentY,
        size: fontSize,
        font,
        color,
      });

      currentY -= lineHeight;
      line = word;
    } else {
      line = testLine;
    }
  }

  if (line) {
    page.drawText(line, {
      x,
      y: currentY,
      size: fontSize,
      font,
      color,
    });

    currentY -= lineHeight;
  }

  return currentY;
}

function drawPageHeader(
  page: any,
  boldFont: any,
  regularFont: any,
  continued = false
) {
  const width = 595.28;
  const height = 841.89;

  page.drawRectangle({
    x: 0,
    y: height - 145,
    width,
    height: 145,
    color: lightColor,
  });

  page.drawText("ORAIA", {
    x: 45,
    y: height - 70,
    size: 29,
    font: boldFont,
    color: brandColor,
  });

  page.drawText("BY DARA", {
    x: 47,
    y: height - 89,
    size: 9,
    font: boldFont,
    color: mutedColor,
  });

  page.drawText("PAYMENT RECEIPT", {
    x: 350,
    y: height - 70,
    size: 15,
    font: boldFont,
    color: darkColor,
  });

  page.drawText(
    continued ? "CONTINUED" : "Official payment record",
    {
      x: 350,
      y: height - 89,
      size: 9,
      font: regularFont,
      color: mutedColor,
    }
  );

  page.drawLine({
    start: { x: 45, y: height - 145 },
    end: { x: width - 45, y: height - 145 },
    thickness: 1,
    color: borderColor,
  });
}

function drawPageFooter(
  page: any,
  pageNumber: number,
  totalPages: number,
  regularFont: any
) {
  page.drawLine({
    start: { x: 45, y: 55 },
    end: { x: 550, y: 55 },
    thickness: 0.8,
    color: borderColor,
  });

  page.drawText("Thank you for shopping with Oraia by Dara.", {
    x: 45,
    y: 37,
    size: 8,
    font: regularFont,
    color: mutedColor,
  });

  page.drawText(`Page ${pageNumber} of ${totalPages}`, {
    x: 480,
    y: 37,
    size: 8,
    font: regularFont,
    color: mutedColor,
  });
}

export async function GET(
  request: NextRequest,
  context: { params: Promise<{ receiptId: string }> }
) {
  try {
    const authorization = request.headers.get("authorization");
    const token = authorization?.replace(/^Bearer\s+/i, "").trim();

    if (!token) {
      return NextResponse.json(
        { error: "Please log in to download your receipt." },
        { status: 401 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !supabaseAnonKey || !serviceRoleKey) {
      console.error("Receipt API environment variables are missing.");

      return NextResponse.json(
        { error: "Receipt service is temporarily unavailable." },
        { status: 500 }
      );
    }

    const authClient = createClient(
      supabaseUrl,
      supabaseAnonKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    const {
      data: { user },
      error: authError,
    } = await authClient.auth.getUser(token);

    if (authError || !user) {
      return NextResponse.json(
        { error: "Your session is invalid. Please log in again." },
        { status: 401 }
      );
    }

    const { receiptId } = await context.params;

    if (!receiptId) {
      return NextResponse.json(
        { error: "Receipt ID is required." },
        { status: 400 }
      );
    }

    const adminClient = createClient(
      supabaseUrl,
      serviceRoleKey,
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    // Only retrieve a receipt belonging to the authenticated customer.
    const { data: receipt, error: receiptError } = await adminClient
      .from("customer_receipts")
      .select("*")
      .eq("id", receiptId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (receiptError) {
      console.error("Receipt lookup error:", receiptError);

      return NextResponse.json(
        { error: "Unable to retrieve your receipt." },
        { status: 500 }
      );
    }

    if (!receipt) {
      return NextResponse.json(
        { error: "Receipt not found." },
        { status: 404 }
      );
    }

    if (!receipt.order_id) {
      return NextResponse.json(
        { error: "This receipt is not linked to an order." },
        { status: 404 }
      );
    }

    // Retrieve the order and verify its ownership.
    const { data: order, error: orderError } = await adminClient
      .from("customer_orders")
      .select(
        "id, order_number, user_id, customer_name, customer_email, subtotal, total_amount, currency, discount_amount, created_at, paid_at"
      )
      .eq("id", receipt.order_id)
      .eq("user_id", user.id)
      .maybeSingle();

    if (orderError) {
      console.error("Order lookup error:", orderError);

      return NextResponse.json(
        { error: "Unable to retrieve the order for this receipt." },
        { status: 500 }
      );
    }

    if (!order) {
      return NextResponse.json(
        { error: "The order linked to this receipt could not be found." },
        { status: 404 }
      );
    }

    // Retrieve the products belonging to this order.
    const { data: orderItems, error: itemsError } = await adminClient
      .from("order_items")
      .select(
        "id, order_id, product_name, quantity, unit_price, total_price"
      )
      .eq("order_id", order.id)
      .order("created_at", { ascending: true });

    if (itemsError) {
      console.error("Order items lookup error:", itemsError);

      return NextResponse.json(
        { error: "Unable to retrieve the items for this receipt." },
        { status: 500 }
      );
    }

    // Generate the PDF.
    const pdfDoc = await PDFDocument.create();

    pdfDoc.setTitle(`Oraia Receipt ${receipt.receipt_number}`);
    pdfDoc.setAuthor("Oraia by Dara");
    pdfDoc.setSubject("Customer payment receipt");
    pdfDoc.setCreator("Oraia by Dara");
    pdfDoc.setCreationDate(new Date());

    const regularFont = await pdfDoc.embedFont(StandardFonts.Helvetica);
    const boldFont = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

    const pageWidth = 595.28;
    const pageHeight = 841.89;
    const left = 45;
    const right = 550;
    const contentWidth = right - left;

    let page = pdfDoc.addPage([pageWidth, pageHeight]);
    let y = pageHeight - 175;

    drawPageHeader(page, boldFont, regularFont);

    // Receipt details.
    page.drawText("RECEIPT DETAILS", {
      x: left,
      y,
      size: 10,
      font: boldFont,
      color: brandColor,
    });

    y -= 25;

    const receiptDetails = [
      ["Receipt Number", safeText(receipt.receipt_number)],
      ["Order Number", safeText(order.order_number)],
      ["Payment Reference", safeText(receipt.payment_reference || "Not available")],
      ["Payment Date", formatDate(receipt.created_at)],
      ["Payment Method", safeText(receipt.payment_method || "Not specified")],
    ];

    for (const [label, value] of receiptDetails) {
      page.drawText(label, {
        x: left,
        y,
        size: 9,
        font: regularFont,
        color: mutedColor,
      });

      page.drawText(value || "Not available", {
        x: 205,
        y,
        size: 9,
        font: boldFont,
        color: darkColor,
        maxWidth: 340,
      });

      y -= 20;
    }

    y -= 8;

    page.drawLine({
      start: { x: left, y },
      end: { x: right, y },
      thickness: 0.8,
      color: borderColor,
    });

    y -= 25;

    // Customer details.
    page.drawText("CUSTOMER INFORMATION", {
      x: left,
      y,
      size: 10,
      font: boldFont,
      color: brandColor,
    });

    y -= 22;

    page.drawText(
      safeText(order.customer_name || "Customer"),
      {
        x: left,
        y,
        size: 11,
        font: boldFont,
        color: darkColor,
      }
    );

    y -= 17;

    page.drawText(
      safeText(order.customer_email || user.email || ""),
      {
        x: left,
        y,
        size: 9,
        font: regularFont,
        color: mutedColor,
      }
    );

    y -= 28;

    // Items table heading.
    page.drawText("ORDER ITEMS", {
      x: left,
      y,
      size: 10,
      font: boldFont,
      color: brandColor,
    });

    y -= 22;

    const drawItemsHeader = () => {
      page.drawRectangle({
        x: left,
        y: y - 8,
        width: contentWidth,
        height: 25,
        color: lightColor,
      });

      page.drawText("Product", {
        x: left + 8,
        y,
        size: 8,
        font: boldFont,
        color: darkColor,
      });

      page.drawText("Qty", {
        x: 355,
        y,
        size: 8,
        font: boldFont,
        color: darkColor,
      });

      page.drawText("Unit Price", {
        x: 395,
        y,
        size: 8,
        font: boldFont,
        color: darkColor,
      });

      page.drawText("Total", {
        x: 490,
        y,
        size: 8,
        font: boldFont,
        color: darkColor,
      });

      y -= 30;
    };

    drawItemsHeader();

    const currency = safeText(order.currency || "NGN");

    if (!orderItems || orderItems.length === 0) {
      page.drawText("No order items were recorded.", {
        x: left + 8,
        y,
        size: 9,
        font: regularFont,
        color: mutedColor,
      });

      y -= 25;
    } else {
      for (const item of orderItems) {
        const productName = safeText(item.product_name || "Product");
        const productLines: string[] = [];
        const words = productName.split(/\s+/).filter(Boolean);
        let currentLine = "";

        for (const word of words) {
          const testLine = currentLine
            ? `${currentLine} ${word}`
            : word;

          if (
            regularFont.widthOfTextAtSize(testLine, 8) > 190 &&
            currentLine
          ) {
            productLines.push(currentLine);
            currentLine = word;
          } else {
            currentLine = testLine;
          }
        }

        if (currentLine) productLines.push(currentLine);

        const rowHeight = Math.max(30, productLines.length * 11 + 12);

        if (y - rowHeight < 100) {
          page = pdfDoc.addPage([pageWidth, pageHeight]);
          drawPageHeader(page, boldFont, regularFont, true);

          y = pageHeight - 180;

          page.drawText("ORDER ITEMS (CONTINUED)", {
            x: left,
            y,
            size: 10,
            font: boldFont,
            color: brandColor,
          });

          y -= 25;
          drawItemsHeader();
        }

        let productY = y;

        for (const line of productLines) {
          page.drawText(line, {
            x: left + 8,
            y: productY,
            size: 8,
            font: regularFont,
            color: darkColor,
          });

          productY -= 11;
        }

        page.drawText(String(item.quantity ?? 0), {
          x: 355,
          y,
          size: 8,
          font: regularFont,
          color: darkColor,
        });

        page.drawText(
          formatMoney(Number(item.unit_price || 0), currency),
          {
            x: 395,
            y,
            size: 7,
            font: regularFont,
            color: darkColor,
          }
        );

        page.drawText(
          formatMoney(Number(item.total_price || 0), currency),
          {
            x: 490,
            y,
            size: 7,
            font: regularFont,
            color: darkColor,
          }
        );

        y -= rowHeight;

        page.drawLine({
          start: { x: left, y: y + 5 },
          end: { x: right, y: y + 5 },
          thickness: 0.5,
          color: borderColor,
        });
      }
    }

    // Payment summary.
    if (y < 180) {
      page = pdfDoc.addPage([pageWidth, pageHeight]);
      drawPageHeader(page, boldFont, regularFont, true);
      y = pageHeight - 190;
    }

    y -= 10;

    page.drawText("PAYMENT SUMMARY", {
      x: left,
      y,
      size: 10,
      font: boldFont,
      color: brandColor,
    });

    y -= 25;

    const subtotal = Number(order.subtotal || 0);
    const discount = Number(order.discount_amount || 0);
    const orderTotal = Number(order.total_amount || 0);
    const amountPaid = Number(receipt.amount || 0);

    const summaryRows = [
      ["Subtotal", formatMoney(subtotal, currency)],
      ["Discount", formatMoney(discount, currency)],
      ["Order Total", formatMoney(orderTotal, currency)],
    ];

    for (const [label, value] of summaryRows) {
      page.drawText(label, {
        x: 330,
        y,
        size: 9,
        font: regularFont,
        color: mutedColor,
      });

      page.drawText(value, {
        x: 440,
        y,
        size: 9,
        font: boldFont,
        color: darkColor,
      });

      y -= 19;
    }

    y -= 5;

    page.drawRectangle({
      x: 320,
      y: y - 12,
      width: 230,
      height: 38,
      color: lightColor,
      borderColor,
      borderWidth: 0.8,
    });

    page.drawText("AMOUNT PAID", {
      x: 332,
      y: y + 1,
      size: 9,
      font: boldFont,
      color: brandColor,
    });

    page.drawText(formatMoney(amountPaid, currency), {
      x: 430,
      y: y + 1,
      size: 11,
      font: boldFont,
      color: greenColor,
    });

    y -= 55;

    if (receipt.notes) {
      if (y < 100) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        drawPageHeader(page, boldFont, regularFont, true);
        y = pageHeight - 190;
      }

      page.drawText("NOTES", {
        x: left,
        y,
        size: 9,
        font: boldFont,
        color: brandColor,
      });

      y -= 17;

      drawWrappedText(
        receipt.notes,
        left,
        y,
        contentWidth,
        regularFont,
        8,
        page,
        mutedColor,
        12
      );
    }

    // Add page numbers and footer to every page.
    const pages = pdfDoc.getPages();

    pages.forEach((pdfPage, index) => {
      drawPageFooter(
        pdfPage,
        index + 1,
        pages.length,
        regularFont
      );
    });

    const pdfBytes = await pdfDoc.save();

    const safeReceiptNumber =
      safeText(receipt.receipt_number).replace(/[^a-zA-Z0-9_-]/g, "") ||
      "Receipt";

    return new Response(Buffer.from(pdfBytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Disposition": `attachment; filename="Oraia-Receipt-${safeReceiptNumber}.pdf"`,
        "Cache-Control": "private, no-store, max-age=0",
        "X-Content-Type-Options": "nosniff",
      },
    });
  } catch (error) {
    console.error("Receipt PDF generation error:", error);

    return NextResponse.json(
      { error: "Unable to generate your receipt. Please try again." },
      { status: 500 }
    );
  }
}
