import { NextResponse } from "next/server"
import { parseOfficeAsync } from "officeparser"
import { getDatabase } from "@/lib/mongodb"
import { extractContactsFromText } from "@/lib/contact-extractor"

export async function POST(request) {
  try {
    const formData = await request.formData()
    const files = formData.getAll("files")

    if (files.length === 0) {
      return NextResponse.json({ error: "No files provided" }, { status: 400 })
    }

    const db = await getDatabase()
    const contactsCollection = db.collection("contacts")

    let totalContactsExtracted = 0

    for (const file of files) {
      let text = ""

      if (file.type === "text/plain") {
        text = await file.text()
      } else if (
        file.type === "application/pdf" ||
        file.type === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
      ) {
        const buffer = await file.arrayBuffer()
        try {
          text = await parseOfficeAsync(Buffer.from(buffer))
        } catch (error) {
          console.error("Error parsing file:", error)
          continue
        }
      } else {
        continue // Skip unsupported file types
      }

      if (text) {
        const extractedContacts = extractContactsFromText(text)

        // Insert contacts into database
        for (const contact of extractedContacts) {
          try {
            // Check if contact already exists (by email or phone)
            const existingContact = await contactsCollection.findOne({
              $or: [
                { email: contact.email, email: { $ne: "" } },
                { phone: contact.phone, phone: { $ne: "" } },
              ],
            })

            if (!existingContact) {
              await contactsCollection.insertOne({
                ...contact,
                createdAt: new Date(),
                updatedAt: new Date(),
              })
              totalContactsExtracted++
            }
          } catch (error) {
            console.error("Error inserting contact:", error)
          }
        }
      }
    }

    return NextResponse.json({
      success: true,
      contactsExtracted: totalContactsExtracted,
    })
  } catch (error) {
    console.error("Upload error:", error)
    return NextResponse.json({ error: "Failed to process files" }, { status: 500 })
  }
}
