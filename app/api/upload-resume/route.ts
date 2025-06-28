import { v2 as cloudinary } from "cloudinary";
import { getCurrentUser } from "@/lib/actions/auth.action";
import { db } from "@/firebase/admin";
import { NextResponse } from "next/server";
import formidable, { IncomingForm } from "formidable";
import fs from "fs";

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

export async function POST(req: Request) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ success: false, error: "Unauthorized" }, { status: 401 });
  }

  const form = new IncomingForm();
  const formData = await req.formData();
  const file = formData.get("file") as File;

  if (!file) {
    return NextResponse.json({ success: false, error: "No file uploaded" }, { status: 400 });
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  const tempPath = `/tmp/${file.name}`;
  fs.writeFileSync(tempPath, buffer);

  try {
    // Upload to Cloudinary
    const result = await cloudinary.uploader.upload(tempPath, {
      folder: `resumes/${user.id}`,
      resource_type: "raw",
    });

    // Store resume URL in Firestore
    await db.collection("users").doc(user.id).set(
      {
        resume: {
          url: result.secure_url,
          uploadedAt: new Date().toISOString(),
        },
      },
      { merge: true }
    );

    return NextResponse.json({ success: true, url: result.secure_url });
  } catch (error) {
    console.error("Upload error:", error);
    return NextResponse.json({ success: false, error: "Upload failed" }, { status: 500 });
  } finally {
    // Clean up temporary file
    if (fs.existsSync(tempPath)) {
      fs.unlinkSync(tempPath);
    }
  }
}