export async function sendSMS(to, message) {
  if (!process.env.TERMII_API_KEY) {
    throw new Error("TERMII_API_KEY is not configured")
  }

  const response = await fetch("https://api.ng.termii.com/api/sms/send", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      to,
      from: process.env.TERMII_SENDER_ID || "ContactMgr",
      sms: message,
      type: "plain",
      api_key: process.env.TERMII_API_KEY,
      channel: "generic",
    }),
  })

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Termii API error: ${error}`)
  }

  return response.json()
}

export async function sendBulkSMS(contacts, message) {
  const results = []

  for (const contact of contacts) {
    try {
      // Clean phone number (remove non-digits and ensure it starts with country code)
      let cleanPhone = contact.phone.replace(/\D/g, "")

      // Add country code if missing (assuming Nigeria +234 as default)
      if (cleanPhone.length === 11 && cleanPhone.startsWith("0")) {
        cleanPhone = "234" + cleanPhone.substring(1)
      } else if (cleanPhone.length === 10) {
        cleanPhone = "234" + cleanPhone
      }

      const result = await sendSMS(cleanPhone, message)
      results.push({
        contact: contact.name,
        phone: contact.phone,
        success: true,
        messageId: result.message_id,
      })
    } catch (error) {
      results.push({
        contact: contact.name,
        phone: contact.phone,
        success: false,
        error: error instanceof Error ? error.message : "Unknown error",
      })
    }
  }

  return results
}
