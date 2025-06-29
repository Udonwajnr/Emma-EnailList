export function extractContactsFromText(text) {
  const contacts = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Email regex (global flag removed for single match, used inside loop)
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/;

// Phone regex - matches optional country code, optional area code, and 7-10 digit number with separators
const phoneRegex = /(\+?\d{1,3}[-.\s]?)?(\(?\d{3}\)?[-.\s]?)?\d{3}[-.\s]?\d{4}/g;


  // Name patterns - supports several common name formats
  const namePatterns = [
    /^Name:\s*(.+)$/i,
    /^Full Name:\s*(.+)$/i,
    /^Contact:\s*(.+)$/i,
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // First Last format
    /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+$/, // First M. Last format
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/, // First Middle Last format
  ];

  let currentContact = {};

  for (const line of lines) {
    // Extract emails (can be multiple)
    const emails = [...line.matchAll(emailRegex)];
    if (emails.length > 0) {
      for (const emailMatch of emails) {
        const email = emailMatch[0];
        if (!currentContact.email) {
          currentContact.email = email;
        } else {
          // If already have email and name or phone, save current contact and start new
          if (currentContact.name || currentContact.phone) {
            contacts.push({
              name: currentContact.name || "Unknown",
              email: currentContact.email || "",
              phone: currentContact.phone || "",
            });
          }
          currentContact = { email };
        }
      }
    }

    // Extract phones (can be multiple)
    const phones = [...line.matchAll(phoneRegex)];
    if (phones.length > 0) {
      for (const phoneMatch of phones) {
        const phone = phoneMatch[0];
        const cleanPhone = phone.replace(/\D/g, "");
        if (cleanPhone.length >= 10) {
          if (!currentContact.phone) {
            currentContact.phone = phone;
          }
        }
      }
    }

    // Extract names from patterns
    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1] || match[0];
        if (name && name.length > 1 && !currentContact.name) {
          currentContact.name = name.trim();
          break;
        }
      }
    }

    // If all three found, save and reset
    if (currentContact.name && currentContact.email && currentContact.phone) {
      contacts.push({
        name: currentContact.name,
        email: currentContact.email,
        phone: currentContact.phone,
      });
      currentContact = {};
    }
  }

  // Push any remaining partial contact
  if (currentContact.email || currentContact.phone) {
    contacts.push({
      name: currentContact.name || "Unknown",
      email: currentContact.email || "",
      phone: currentContact.phone || "",
    });
  }

  // Remove duplicates by email or phone (keep first occurrence)
  const uniqueContacts = contacts
    .filter(
      (contact, index, self) =>
        index ===
        self.findIndex(
          (c) =>
            (c.email && c.email === contact.email) ||
            (c.phone && c.phone === contact.phone)
        )
    )
    .filter((contact) => contact.email || contact.phone); // Keep only contacts with email or phone

  return uniqueContacts;
}

export function extractNamesOnly(text) {
  const names = [];
  const lines = text
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  // Name patterns (same as above plus Last, First format)
  const namePatterns = [
    /^Name:\s*(.+)$/i,
    /^Full Name:\s*(.+)$/i,
    /^Contact:\s*(.+)$/i,
    /^[A-Z][a-z]+\s+[A-Z][a-z]+$/, // First Last
    /^[A-Z][a-z]+\s+[A-Z]\.\s+[A-Z][a-z]+$/, // First M. Last
    /^[A-Z][a-z]+\s+[A-Z][a-z]+\s+[A-Z][a-z]+$/, // First Middle Last
    /^[A-Z][a-z]+,\s+[A-Z][a-z]+$/, // Last, First
  ];

  for (const line of lines) {
    // Skip lines with emails or phones
    if (line.includes("@") || /\d{3}[-.\s]?\d{3}[-.\s]?\d{4}/.test(line)) {
      continue;
    }

    for (const pattern of namePatterns) {
      const match = line.match(pattern);
      if (match) {
        const name = match[1] || match[0];
        if (name && name.length > 1) {
          names.push({
            name: name.trim(),
            email: "",
            phone: "",
          });
          break;
        }
      }
    }
  }

  // Remove duplicate names
  const uniqueNames = names.filter(
    (contact, index, self) =>
      index === self.findIndex((c) => c.name === contact.name)
  );

  return uniqueNames;
}
