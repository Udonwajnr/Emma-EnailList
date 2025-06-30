import { NextResponse } from "next/server";
import { getDatabase } from "@/lib/mongodb";

export async function POST(request) {
  try {
    const { contacts } = await request.json();

    if (!contacts || contacts.length === 0) {
      return NextResponse.json(
        { error: "No contacts provided" },
        { status: 400 }
      );
    }

    console.log(`Processing batch of ${contacts.length} contacts`);

    const db = await getDatabase();
    const contactsCollection = db.collection("contacts");

    // Create sets of unique identifiers
    const emails = contacts.map((c) => c.email).filter(Boolean);
    const phones = contacts.map((c) => c.phone).filter(Boolean);
    const memberIds = contacts.map((c) => c.memberId).filter(Boolean);

    // Find existing contacts
    const existing = await contactsCollection
      .find({
        $or: [
          { email: { $in: emails } },
          { phone: { $in: phones } },
          { memberId: { $in: memberIds } },
        ],
      })
      .toArray();

    console.log(`Found ${existing.length} existing contacts`);

    // Create a set of existing contact identifiers
    const existingSet = new Set(
      existing.map(
        (c) => `${c.email || ""}-${c.phone || ""}-${c.memberId || ""}`
      )
    );

    // Filter out existing contacts
    const newContacts = contacts.filter((contact) => {
      const key = `${contact.email || ""}-${contact.phone || ""}-${
        contact.memberId || ""
      }`;
      return !existingSet.has(key);
    });

    console.log(`${newContacts.length} new contacts to insert`);

    // Prepare contacts for insertion
    const contactsToInsert = newContacts.map((contact) => ({
      name: contact.name || "Unknown",
      email: contact.email || "",
      phone: contact.phone || "",
      memberId: contact.memberId || "",
      createdAt: new Date(),
      updatedAt: new Date(),
    }));

    let inserted = 0;
    if (contactsToInsert.length > 0) {
      const result = await contactsCollection.insertMany(contactsToInsert, {
        ordered: false,
      });
      inserted = result.insertedCount;
      console.log(`Successfully inserted ${inserted} contacts`);
    }

    return NextResponse.json({
      inserted,
      skipped: contacts.length - inserted,
      total: contacts.length,
    });
  } catch (error) {
    console.error("Bulk insert error:", error);
    return NextResponse.json(
      {
        error: "Failed to save contacts",
        details: error.message,
      },
      { status: 500 }
    );
  }
}
