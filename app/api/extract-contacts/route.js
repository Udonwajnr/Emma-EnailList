import { NextResponse } from "next/server";
import { parseOfficeAsync } from "officeparser";
import { extractContactsFromText } from "@/lib/contact-extractor";

export async function POST(request) {
  try {
    const formData = await request.formData();
    const files = formData.getAll("files");

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 });
    }

    let allContacts = [];

    for (const file of files) {
      let text = "";

      console.log(`Processing file: ${file.name}, type: ${file.type}`);

      if (file.type === "text/plain") {
        text = await file.text();
      } else if (
        file.type === "application/pdf" ||
        file.type ===
          "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
        file.type === "application/msword"
      ) {
        const buffer = await file.arrayBuffer();
        try {
          text = await parseOfficeAsync(Buffer.from(buffer));
          console.log(`Extracted text length: ${text.length}`);
          console.log("First 500 characters:", text.substring(0, 500));
        } catch (error) {
          console.error("Error parsing file:", error);
          continue;
        }
      } else {
        console.log(`Skipping unsupported file type: ${file.type}`);
        continue;
      }

      if (text && text.length > 0) {
        console.log("Extracting contacts from text...");
        const extractedContacts = extractContactsFromText(text);
        console.log(
          `Extracted ${extractedContacts.length} contacts from ${file.name}`
        );
        allContacts = [...allContacts, ...extractedContacts];
      }
    }

    // Final deduplication across all files
    const uniqueContacts = allContacts.filter((contact, index, self) => {
      return (
        index ===
        self.findIndex(
          (c) =>
            (c.email && c.email === contact.email) ||
            (c.phone && c.phone === contact.phone)
        )
      );
    });

    console.log(`Total unique contacts: ${uniqueContacts.length}`);

    return NextResponse.json({
      success: true,
      contacts: uniqueContacts,
      totalProcessed: allContacts.length,
      filesProcessed: files.length,
    });
  } catch (error) {
    console.error("Extract contacts error:", error);
    return NextResponse.json(
      {
        error: "Failed to process files",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
