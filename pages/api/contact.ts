import type { NextApiRequest, NextApiResponse } from "next";
import formidable from "formidable";
import nodemailer from "nodemailer";
// Use global fetch (Node.js v18+)

export const config = {
  api: {
    bodyParser: false, // Needed for file uploads
  },
};

// Helper to parse multipart/form-data (including file upload)
const parseForm = async (req: NextApiRequest): Promise<{
  fields: formidable.Fields;
  files: formidable.Files;
}> => {
  return new Promise((resolve, reject) => {
    const form = formidable({ keepExtensions: true });
    form.parse(req, (err, fields, files) => {
      if (err) reject(err);
      else resolve({ fields, files });
    });
  });
};

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== "POST") return res.status(405).json({ message: "Method not allowed" });

  try {
    const { fields, files } = await parseForm(req);
    const { name, email, phone, subject, inquiryType, message, ["g-recaptcha-response"]: token } = fields;

    // 1. ✅ reCAPTCHA Validation
    const secret = process.env.RECAPTCHA_SECRET_KEY!;
    const verifyRes = await fetch(`https://www.google.com/recaptcha/api/siteverify`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `secret=${secret}&response=${token}`,
    });
    const verification = await verifyRes.json();

    if (!verification.success) {
      return res.status(400).json({ message: "Failed reCAPTCHA verification" });
    }

    // 2. ✅ Log the data (for now) — optionally save to a DB here
    console.log("Form Submission:", { name, email, phone, subject, inquiryType, message });
    if (files?.file) {
      console.log("File uploaded:", files.file);
    }

    // 3. ✅ Send auto-reply using Nodemailer
    const transporter = nodemailer.createTransport({
      service: "Gmail",
      auth: {
        user: process.env.EMAIL_USER,
        pass: process.env.EMAIL_PASS,
      },
    });

    await transporter.sendMail({
      from: process.env.EMAIL_USER,
      to: email,
      subject: "Thanks for contacting us!",
      text: `Hi ${name},\n\nThanks for your ${inquiryType?.toString().toLowerCase()}.\n\nWe received your message:\n"${message}"\n\nWe'll respond as soon as possible.\n\n- Your Company`,
    });

    return res.status(200).json({ success: true });
  } catch (err) {
    console.error("Contact form error:", err);
    return res.status(500).json({ message: "Internal server error" });
  }
}
