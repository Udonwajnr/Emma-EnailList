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
    const total = contacts.length

    // Create a readable stream for progress updates
    const encoder = new TextEncoder()
    const stream = new ReadableStream({
      async start(controller) {
        try {
          // Process contacts in batches of 10 for better performance
          const batchSize = 10

          for (let i = 0; i < contacts.length; i += batchSize) {
            const batch = contacts.slice(i, i + batchSize)

            // Process each contact in the batch
            for (const contact of batch) {
              try {
                // Check if contact already exists (by email, phone, or memberId)
                const existingContact = await contactsCollection.findOne({
                  $or: [
                    { email: contact.email, email: { $ne: "" } },
                    { phone: contact.phone, phone: { $ne: "" } },
                    { memberId: contact.memberId },
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

                // Send progress update
                const progressData =
                  JSON.stringify({
                    progress: {
                      current: Math.min(i + batch.indexOf(contact) + 1, total),
                      total: total,
                    },
                  }) + "\n"

                controller.enqueue(encoder.encode(progressData))
              } catch (error) {
                console.error("Error inserting contact:", error)
              }
            }

            // Small delay to prevent overwhelming the database
            await new Promise((resolve) => setTimeout(resolve, 100))
          }

          // Send completion message
          const completionData =
            JSON.stringify({
              completed: true,
              saved: savedCount,
              total: total,
            }) + "\n"

          controller.enqueue(encoder.encode(completionData))
          controller.close()
        } catch (error) {
          console.error("Bulk create error:", error)
          const errorData =
            JSON.stringify({
              error: "Failed to save contacts",
              details: error.message,
            }) + "\n"
          controller.enqueue(encoder.encode(errorData))
          controller.close()
        }
      },
    })

    return new Response(stream, {
      headers: {
        "Content-Type": "application/json",
        "Transfer-Encoding": "chunked",
      },
    })
  } catch (error) {
    console.error("Bulk create error:", error)
    return NextResponse.json({ error: "Failed to save contacts" }, { status: 500 })
  }
}
