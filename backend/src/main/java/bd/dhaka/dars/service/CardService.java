package bd.dhaka.dars.service;

import bd.dhaka.dars.config.DarsProperties;
import bd.dhaka.dars.entity.Photo;
import bd.dhaka.dars.entity.Rickshaw;
import com.google.zxing.BarcodeFormat;
import com.google.zxing.WriterException;
import com.google.zxing.client.j2se.MatrixToImageWriter;
import com.google.zxing.common.BitMatrix;
import com.google.zxing.qrcode.QRCodeWriter;
import java.awt.Color;
import java.io.ByteArrayOutputStream;
import java.io.IOException;
import java.time.format.DateTimeFormatter;
import org.openpdf.text.Document;
import org.openpdf.text.Element;
import org.openpdf.text.Font;
import org.openpdf.text.Image;
import org.openpdf.text.Paragraph;
import org.openpdf.text.Phrase;
import org.openpdf.text.Rectangle;
import org.openpdf.text.pdf.PdfPCell;
import org.openpdf.text.pdf.PdfPTable;
import org.openpdf.text.pdf.PdfWriter;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

/**
 * Renders the printable registration card (FR-9) and the vehicle QR code (FR-17). The QR code encodes the web
 * app's scan page, which opens the rickshaw's detail page for a signed-in officer.
 */
@Service
public class CardService {

    private static final Logger log = LoggerFactory.getLogger(CardService.class);

    private static final DateTimeFormatter DATE = DateTimeFormatter.ofPattern("dd MMM yyyy")
            .withZone(RickshawService.DHAKA);

    private final PhotoService photos;
    private final DarsProperties props;

    public CardService(PhotoService photos, DarsProperties props) {
        this.photos = photos;
        this.props = props;
    }

    public String qrUrl(Rickshaw r) {
        return props.publicBaseUrl() + "/r/" + r.getRickshawNumber();
    }

    /** The vehicle's QR code as a square PNG of {@code size} pixels. */
    public byte[] qrPng(Rickshaw r, int size) {
        try {
            BitMatrix matrix = new QRCodeWriter().encode(qrUrl(r), BarcodeFormat.QR_CODE, size, size);
            ByteArrayOutputStream png = new ByteArrayOutputStream();
            MatrixToImageWriter.writeToStream(matrix, "PNG", png);
            return png.toByteArray();
        } catch (WriterException | IOException e) {
            throw new IllegalStateException("QR generation failed", e);
        }
    }

    public byte[] render(Rickshaw r) {
        // Card size: A6 landscape.
        Document doc = new Document(new Rectangle(420, 298), 18, 18, 18, 18);
        ByteArrayOutputStream out = new ByteArrayOutputStream();
        PdfWriter.getInstance(doc, out);
        doc.open();

        Font title = new Font(Font.HELVETICA, 13, Font.BOLD, new Color(0, 90, 60));
        Font big = new Font(Font.HELVETICA, 20, Font.BOLD);
        Font label = new Font(Font.HELVETICA, 8, Font.NORMAL, Color.GRAY);
        Font value = new Font(Font.HELVETICA, 10, Font.BOLD);

        Paragraph heading = new Paragraph("Dhaka Auto-Rickshaw Registration", title);
        heading.setAlignment(Element.ALIGN_CENTER);
        doc.add(heading);
        Paragraph number = new Paragraph(r.getRickshawNumber(), big);
        number.setAlignment(Element.ALIGN_CENTER);
        number.setSpacingAfter(8);
        doc.add(number);

        PdfPTable table = new PdfPTable(new float[]{1.1f, 2f, 1.1f});
        table.setWidthPercentage(100);

        table.addCell(imageCell(r.getPhoto()));

        PdfPTable info = new PdfPTable(1);
        addField(info, "Owner", r.getOwner().getFullName(), label, value);
        addField(info, "Thana", r.getThana(), label, value);
        addField(info, "Status", r.getStatus().name(), label, value);
        addField(info, "Registered", DATE.format(r.getRegisteredAt()), label, value);
        PdfPCell infoCell = new PdfPCell(info);
        infoCell.setBorder(Rectangle.NO_BORDER);
        table.addCell(infoCell);

        table.addCell(qrCell(qrPng(r, 200)));

        doc.add(table);
        doc.close();
        return out.toByteArray();
    }

    private PdfPCell imageCell(Photo photo) {
        PdfPCell cell;
        if (photo == null) {
            cell = new PdfPCell(new Phrase("No photo"));
        } else {
            try {
                Image img = Image.getInstance(photos.content(photo));
                img.scaleToFit(92, 92);
                cell = new PdfPCell(img, false);
            } catch (Exception e) {
                // A corrupt or unreadable stored image must not prevent printing the card.
                log.warn("Cannot render photo {} on card: {}", photo.getId(), e.getMessage());
                cell = new PdfPCell(new Phrase("Photo unavailable"));
            }
        }
        cell.setBorder(Rectangle.NO_BORDER);
        cell.setPadding(4);
        cell.setPaddingRight(8);
        cell.setHorizontalAlignment(Element.ALIGN_CENTER);
        return cell;
    }

    private static PdfPCell qrCell(byte[] png) {
        try {
            Image img = Image.getInstance(png);
            img.scaleToFit(80, 80);
            PdfPCell cell = new PdfPCell(img, false);
            cell.setBorder(Rectangle.NO_BORDER);
            cell.setHorizontalAlignment(Element.ALIGN_CENTER);
            return cell;
        } catch (IOException e) {
            throw new IllegalStateException("QR image failed", e);
        }
    }

    private static void addField(PdfPTable t, String name, String val, Font label, Font value) {
        Paragraph p = new Paragraph();
        p.add(new Phrase(name + "\n", label));
        p.add(new Phrase(val, value));
        PdfPCell c = new PdfPCell(p);
        c.setBorder(Rectangle.NO_BORDER);
        c.setPaddingBottom(4);
        t.addCell(c);
    }
}
