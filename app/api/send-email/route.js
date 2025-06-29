import { NextResponse } from "next/server"
import { ObjectId } from "mongodb"
import { getDatabase } from "@/lib/mongodb"

export async function POST(request) {
  try {
    const { contactIds, subject, message } = await request.json()

    if (!contactIds || !subject || !message) {
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
      if (!contact.email) continue

      try {
        // Send email via Mailgun API
        const formData = new FormData()
        formData.append("from", process.env.MAILGUN_FROM_EMAIL || "Contact Manager <noreply@yourdomain.com>")
        formData.append("to", contact.email)
        formData.append("subject", subject)
        formData.append("text", message)

        const response = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
          method: "POST",
          headers: {
            Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}`,
          },
          body: formData,
        })

        const result = await response.json()
        const success = response.ok && result.id

        // Log the message
        await messageLogsCollection.insertOne({
          contactId: contact._id,
          type: "email",
          status: success ? "sent" : "failed",
          subject: subject,
          message: message,
          dateSent: new Date(),
          response: result,
        })

        if (success) {
          sentCount++
        }
      } catch (error) {
        console.error("Error sending email to", contact.email, error)

        // Log the failed attempt
        await messageLogsCollection.insertOne({
          contactId: contact._id,
          type: "email",
          status: "failed",
          subject: subject,
          message: message,
          dateSent: new Date(),
          error: error.message || "Unknown error",
        })
      }
    }

    return NextResponse.json({ sent: sentCount })
  } catch (error) {
    console.error("Email sending error:", error)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }
}
