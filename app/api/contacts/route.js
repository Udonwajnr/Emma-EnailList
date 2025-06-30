import { NextResponse } from "next/server"
import { getDatabase } from "@/lib/mongodb"

export async function GET() {
  try {
    console.log("Fetching contacts from database...")

    const db = await getDatabase()
    const contacts = await db.collection("contacts").find({}).sort({ createdAt: -1 }).toArray()

    console.log(`Found ${contacts.length} contacts in database`)

    return NextResponse.json(contacts)
  } catch (error) {
    console.error("Error fetching contacts:", error)
    return NextResponse.json({ error: "Failed to fetch contacts" }, { status: 500 })
  }
}
