export async function sendEmail(to, subject, text, html) {
  if (!process.env.MAILGUN_API_KEY || !process.env.MAILGUN_DOMAIN) {
    throw new Error("Mailgun API key or domain is not configured")
  }

  const formData = new FormData()
  formData.append("from", `Contact Manager <noreply@${process.env.MAILGUN_DOMAIN}>`)
  formData.append("to", to)
  formData.append("subject", subject)
  formData.append("text", text)
  if (html) {
    formData.append("html", html)
  }

  const response = await fetch(`https://api.mailgun.net/v3/${process.env.MAILGUN_DOMAIN}/messages`, {
    method: "POST",
    headers: {
      Authorization: `Basic ${Buffer.from(`api:${process.env.MAILGUN_API_KEY}`).toString("base64")}`,
    },
    body: formData,
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Mailgun API error: ${error}`)
  }

  return response.json()
}

export async function sendBulkEmail(contacts, subject, message) {
  const results = []

  for (const contact of contacts) {
    try {
      const personalizedMessage = message.replace(/\{name\}/g, contact.name)
      const result = await sendEmail(contact.email, subject, personalizedMessage)

      results.push({
        contact: contact.name,
        email: contact.email,
        success: true,
        messageId: result.id,
      })
    } catch (error) {
      results.push({
        contact: contact.name,
        email: contact.email,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return results
}
