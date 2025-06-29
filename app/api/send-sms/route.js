import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request) {
  try {
    const { contactIds, message } = await request.json()

    if (!contactIds || !message) {
      return NextResponse.json({ error: "Missing required fields" }, { status: 400 })
    }

    const db = await getDatabase()
    const contacts = await db
      .collection("contacts")
      .find({ _id: { $in: contactIds.map((id) => new ObjectId(id)) } })
      .toArray()

    let sentCount = 0
    const messageLogsCollection = db.collection("messageLogs")

    for (const contact of contacts) {
      if (!contact.phone) continue

      try {
        // Send SMS via Termii API
        const response = await fetch("https://api.ng.termii.com/api/sms/send", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            to: contact.phone,
            from: process.env.TERMII_SENDER_ID || "ContactMgr",
            sms: message,
            type: "plain",
            api_key: process.env.TERMII_API_KEY,
            channel: "generic",
          }),
        })

        const result = await response.json()
        const success = response.ok && result.message_id

        // Log the message
        await messageLogsCollection.insertOne({
          contactId: contact._id,
          type: "sms",
          status: success ? "sent" : "failed",
          message: message,
          dateSent: new Date(),
          response: result,
        })

        if (success) {
          sentCount++
        }
      } catch (error) {
        console.error("Error sending SMS to", contact.phone, error)

        // Log the failed attempt
        await messageLogsCollection.insertOne({
          contactId: contact._id,
          type: "sms",
          status: "failed",
          message: message,
          dateSent: new Date(),
          error: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({ sent: sentCount })
  } catch (error) {
    console.error("SMS sending error:", error)
    return NextResponse.json({ error: "Failed to send SMS" }, { status: 500 })
  }
}
