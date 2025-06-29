import { NextResponse } from "next/server"
import mammoth from "mammoth"
import fs from "fs"
import path from "path"

// Disable the default body parser for this route
export const config = {
  api: {
    bodyParser: false,
  },
}

// Helper function to ensure tmp directory exists
const ensureTmpDir = () => {
  const tmpDir = path.join(process.cwd(), "tmp")
  if (!fs.existsSync(tmpDir)) {
    fs.mkdirSync(tmpDir, { recursive: true })
  }
}

// Helper function to clean up temporary files
const cleanupFile = (filePath) => {
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath)
    }
  } catch (error) {
    console.error("Error cleaning up file:", error)
  }
}

// Helper function to extract table data from HTML
const extractTablesFromHtml = (html) => {
  const tables = []

  // Simple regex to find table content
  const tableRegex = /<table[^>]*>(.*?)<\/table>/gis
  const rowRegex = /<tr[^>]*>(.*?)<\/tr>/gis
  const cellRegex = /<t[hd][^>]*>(.*?)<\/t[hd]>/gis

  let tableMatch
  while ((tableMatch = tableRegex.exec(html)) !== null) {
    const tableContent = tableMatch[1]
    const rows = []

    let rowMatch
    while ((rowMatch = rowRegex.exec(tableContent)) !== null) {
      const rowContent = rowMatch[1]
      const cells = []

      let cellMatch
      while ((cellMatch = cellRegex.exec(rowContent)) !== null) {
        // Clean up HTML tags and get text content
        const cellText = cellMatch[1]
          .replace(/<[^>]*>/g, "") // Remove HTML tags
          .replace(/&nbsp;/g, " ") // Replace &nbsp; with space
          .replace(/&amp;/g, "&") // Replace &amp; with &
          .replace(/&lt;/g, "<") // Replace &lt; with <
          .replace(/&gt;/g, ">") // Replace &gt; with >
          .trim()

        cells.push(cellText)
      }

      if (cells.length > 0) {
        rows.push(cells)
      }
    }

    if (rows.length > 0) {
      tables.push(rows)
    }
  }

  return tables
}

// Helper function to extract contacts from plain text (fallback)
const extractContactsFromText = (text) => {
  const contacts = []
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0)

  // Email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g

  // Phone regex
  const phoneRegex = /(?:\+?1[-.\s]?)?$$?([0-9]{3})$$?[-.\s]?([0-9]{3})[-.\s]?([0-9]{4})/g

  let currentContact = {}

  for (const line of lines) {
    // Skip empty lines or lines that are too short
    if (line.length < 3) continue

    // Extract emails
    const emails = line.match(emailRegex)
    if (emails) {
      emails.forEach((email) => {
        if (!currentContact.email) {
          currentContact.email = email
        }
      })
    }

    // Extract phones
    const phones = line.match(phoneRegex)
    if (phones) {
      phones.forEach((phone) => {
        if (!currentContact.phone) {
          currentContact.phone = phone
        }
      })
    }

    // If line doesn't contain email or phone, treat as potential name
    if (!emails && !phones && line.length > 2) {
      // Simple name detection (contains letters and possibly spaces)
      if (/^[A-Za-z\s]{2,50}$/.test(line) && !currentContact.name) {
        currentContact.name = line
      }
    }

    // If we have enough info, save the contact
    if (currentContact.name && (currentContact.email || currentContact.phone)) {
      contacts.push({
        name: currentContact.name,
        phone: currentContact.phone || "",
        email: currentContact.email || "",
      })
      currentContact = {}
    }
  }

  return contacts
}

// Helper function to extract contact information from table rows
const extractContactsFromTable = (tableData) => {
  const contacts = []

  if (!tableData || !Array.isArray(tableData) || tableData.length === 0) {
    return contacts
  }

  // Get the first table
  const firstTable = tableData[0]
  if (!firstTable || !Array.isArray(firstTable) || firstTable.length < 2) {
    return contacts
  }

  // Skip header row (assuming first row is header)
  const dataRows = firstTable.slice(1)

  dataRows.forEach((row, index) => {
    try {
      if (!Array.isArray(row) || row.length === 0) {
        return // Skip invalid rows
      }

      let name = "",
        phone = "",
        email = ""

      // Try to identify columns by content
      row.forEach((cell) => {
        const cellContent = cell.trim()
        if (!cellContent) return

        // Check if it's an email
        if (cellContent.includes("@") && !email) {
          email = cellContent
        }
        // Check if it's a phone number
        else if (/[\d\-$$$$+\s]{10,}/.test(cellContent) && !phone) {
          phone = cellContent
        }
        // Otherwise, treat as name if we don't have one yet
        else if (!name && cellContent.length > 1) {
          name = cellContent
        }
      })

      // Validate that we have at least name and either phone or email
      if (name && (phone || email)) {
        // Basic email validation
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
        const isValidEmail = !email || emailRegex.test(email)

        // Basic phone validation (at least 10 digits)
        const phoneDigits = phone.replace(/\D/g, "")
        const isValidPhone = !phone || phoneDigits.length >= 10

        if (isValidEmail && isValidPhone) {
          contacts.push({
            name,
            phone,
            email,
          })
        }
      }
    } catch (error) {
      console.error(`Error processing row ${index}:`, error)
    }
  })

  return contacts
}

export async function POST(request) {
  let tempFilePath = null

  try {
    // Ensure tmp directory exists
    ensureTmpDir()

    // Convert Next.js request to handle file upload
    const chunks = []
    const reader = request.body?.getReader()

    if (reader) {
      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        chunks.push(value)
      }
    }

    const buffer = Buffer.concat(chunks)

    // Create a temporary file
    const tempFileName = `upload_${Date.now()}_${Math.random().toString(36).substring(7)}.docx`
    tempFilePath = path.join(process.cwd(), "tmp", tempFileName)

    // Write buffer to temporary file
    fs.writeFileSync(tempFilePath, buffer)

    // Validate file exists
    if (!fs.existsSync(tempFilePath)) {
      return NextResponse.json({ error: "File upload failed" }, { status: 400 })
    }

    // Extract content from DOCX using mammoth
    let result
    try {
      result = await mammoth.convertToHtml({ path: tempFilePath })
    } catch (extractError) {
      console.error("Error extracting DOCX content:", extractError)
      return NextResponse.json(
        {
          error: "Failed to parse DOCX file",
          details: "The document may be corrupted or password protected",
        },
        { status: 400 },
      )
    }

    const html = result.value
    const messages = result.messages

    // Log any conversion messages
    if (messages.length > 0) {
      console.log("Mammoth conversion messages:", messages)
    }

    // Try to extract tables from HTML
    const tables = extractTablesFromHtml(html)
    let contacts = []

    if (tables.length > 0) {
      // Extract contacts from tables
      contacts = extractContactsFromTable(tables)
    }

    // If no contacts found from tables, try plain text extraction
    if (contacts.length === 0) {
      // Convert HTML to plain text for fallback extraction
      const plainText = html
        .replace(/<[^>]*>/g, " ") // Remove HTML tags
        .replace(/\s+/g, " ") // Normalize whitespace
        .trim()

      contacts = extractContactsFromText(plainText)
    }

    if (contacts.length === 0) {
      return NextResponse.json(
        {
          error: "No valid contacts found",
          message: "Please ensure your document contains contact information in a table or structured format",
          tableInfo: {
            tablesFound: tables.length,
            htmlLength: html.length,
          },
        },
        { status: 400 },
      )
    }

    // Return successful response
    return NextResponse.json({
      success: true,
      message: `Successfully extracted ${contacts.length} contacts from the document`,
      contacts,
      tableInfo: {
        tablesFound: tables.length,
        contactsExtracted: contacts.length,
        conversionMessages: messages.length,
      },
    })
  } catch (error) {
    console.error("DOCX parsing error:", error)

    // Return appropriate error response
    if (error.code === "ENOENT") {
      return NextResponse.json({ error: "File not found or inaccessible" }, { status: 400 })
    }

    return NextResponse.json(
      {
        error: "Failed to process DOCX file",
        details: error.message || "Unknown error occurred",
      },
      { status: 500 },
    )
  } finally {
    // Clean up temporary file
    if (tempFilePath) {
      cleanupFile(tempFilePath)
    }
  }
}

// Handle unsupported methods
export async function GET() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function PUT() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}

export async function DELETE() {
  return NextResponse.json({ error: "Method not allowed" }, { status: 405 })
}
