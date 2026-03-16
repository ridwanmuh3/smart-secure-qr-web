import { extractSecureIdFromPDF } from "~~/server/utils/pdf";
import { verifySecureId } from "~~/server/api/verifier/verify.post";

export default defineEventHandler(async (event) => {
  const formData = await readMultipartFormData(event);
  const fileField = formData?.find((f) => f.name === "file");
  if (!fileField?.data) return fail("PDF file is required");

  // Extract secure_id from PDF metadata
  const secureId = await extractSecureIdFromPDF(Buffer.from(fileField.data));
  if (!secureId)
    return fail("Could not find a QR code in the PDF document", 422);

  const sourceIP = getClientIP(event);
  return await verifySecureId(event, secureId, sourceIP);
});
