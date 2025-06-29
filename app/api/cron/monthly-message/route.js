import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function POST() {
  try {
    // Verify cron secret to prevent unauthorized access
    const cronSecret = process.env.CRON_SECRET
    if (!cronSecret) {
      return NextResponse.json({ error: "Cron secret not configured" }, { status: 500 })
    }

    const db = await getDatabase()
    const contacts = await db.collection("contacts").find({}).toArray()
    const messageLogsCollection = db.collection("messageLogs")

    const monthlyMessage = process.env.MONTHLY_MESSAGE || "Hello! This is your monthly update from Contact Manager Pro."
    const monthlyEmailSubject = process.env.MONTHLY_EMAIL_SUBJECT || "Monthly Update"

    let smsSent = 0
    let emailsSent = 0

    for (const contact of contacts) {
      // Send SMS if phone number exists
      if (contact.phone) {
        try {
          const smsResponse = await fetch("https://api.ng.termii.com/api/sms/send", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              to: contact.phone,
              from: process.env.TERMII_SENDER_ID || "ContactMgr",
              sms: monthlyMessage,
              type: "plain",
              api_key: process.env.TERMII_API_KEY,
              channel: "generic",
            }),
          })

          const smsResult = await smsResponse.json()
          const smsSuccess = smsResponse.ok && smsResult.message_id

          await messageLogsCollection.insertOne({
            contactId: contact._id,
            type: "sms",
            status: smsSuccess ? "sent" : "failed",
            message: monthlyMessage,
            dateSent: new Date(),
            automated: true,
            response: smsResult,
          })

          if (smsSuccess) smsSent++
        } catch (error) {
          await messageLogsCollection.insertOne({
            contactId: contact._id,
            type: "sms",
            status: "failed",
            message: monthlyMessage,
            dateSent: new Date(),
            automated: true,
            error: error.message || "Unknown error",
          })
        }
      }

      // Send email if email exists
      if (contact.email) {
        try {
          const formData = new FormData()
          formData.append("from", process.env.MAILGUN_FROM_EMAIL || "Contact Manager <noreply@yourdomain.com>")
          formData.append("to", contact.email)
          formData.append("subject", monthlyEmailSubject)
          formData.append("text", monthlyMessage)

          const emailResponse = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
            method: "POST",
            headers: {
              Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}`,
            },
            body: formData,
          })

          const emailResult = await emailResponse.json()
          const emailSuccess = emailResponse.ok && emailResult.id

          await messageLogsCollection.insertOne({
            contactId: contact._id,
            type: "email",
            status: emailSuccess ? "sent" : "failed",
            subject: monthlyEmailSubject,
            message: monthlyMessage,
            dateSent: new Date(),
            automated: true,
            response: emailResult,
          })

          if (emailSuccess) emailsSent++
        } catch (error) {
          await messageLogsCollection.insertOne({
            contactId: contact._id,
            type: "email",
            status: "failed",
            subject: monthlyEmailSubject,
            message: monthlyMessage,
            dateSent: new Date(),
            automated: true,
            error: error.message || "Unknown error",
          })
        }
      }
    }

    return NextResponse.json({
      success: true,
      smsSent,
      emailsSent,
      totalContacts: contacts.length,
    })
  } catch (error) {
    console.error("Monthly cron job error:", error)
    return NextResponse.json({ error: "Failed to send monthly messages" }, { status: 500 })
  }
}
