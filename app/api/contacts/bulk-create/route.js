import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request) {
  try {
    const { contacts } = await request.json()

    if (!contacts || contacts.length === 0) {
      return NextResponse.json({ error: "No contacts provided" }, { status: 400 })
    }

    const db = await getDatabase()
    const contactsCollection = db.collection("contacts")

    let savedCount = 0

    for (const contact of contacts) {
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
          savedCount++
        }
      } catch (error) {
        console.error("Error inserting contact:", error)
      }
    }

    return NextResponse.json({
      success: true,
      saved: savedCount,
      total: contacts.length,
    })
  } catch (error) {
    console.error("Bulk create error:", error)
    return NextResponse.json({ error: "Failed to save contacts" }, { status: 500 })
  }
}
