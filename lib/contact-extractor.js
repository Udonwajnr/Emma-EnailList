export function extractContactsFromText(text) {
  const contacts = [];

  // Clean up the text and split into lines
  const lines = text
    .split(/\n+/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);

  console.log("Total lines:", lines.length);
  console.log("First 20 lines:", lines.slice(0, 20));

  // Email regex
  const emailRegex = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/;

  // Phone regex - Nigerian phone numbers (10-11 digits)
  const phoneRegex = /^[0-9]{10,11}$/;

  // Member ID pattern (FL00XXX format)
  const memberIdRegex = /^FL\d{5}$/;

  // Process lines in chunks - each contact seems to have multiple lines
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];

    // Look for member ID pattern to start a new contact
    if (memberIdRegex.test(line)) {
      const contact = {
        name: "",
        email: "",
        phone: "",
        memberId: line,
      };

      // Look ahead for the next few lines to extract contact info
      for (let j = i + 1; j < Math.min(i + 2, lines.length); j++) {
        const nextLine = lines[j];

        // Stop if we hit another member ID
        if (memberIdRegex.test(nextLine)) {
          break;
        }

        // Check if it's an email
        if (emailRegex.test(nextLine)) {
          contact.email = nextLine;
          continue;
        }

        // Check if it's a phone number
        if (phoneRegex.test(nextLine)) {
          contact.phone = nextLine;
          continue;
        }

        // Check if it's a name (not FELLOW, not a location, not a number)
        if (
          !contact.name &&
          nextLine.length > 3 &&
          nextLine !== "FELLOW" &&
          !phoneRegex.test(nextLine) &&
          !emailRegex.test(nextLine) &&
          !/^[0-9]+$/.test(nextLine) &&
          /^[A-Z\s.'-]+$/.test(nextLine) &&
          ![
            "Lagos",
            "Edo",
            "Rivers",
            "Abuja",
            "Kano",
            "Ogun",
            "Oyo",
            "Delta",
            "Anambra",
            "Kaduna",
          ].includes(nextLine)
        ) {
          contact.name = nextLine;
        }
      }

      // Only add contact if we have at least name and (email or phone)
      if (contact.name && (contact.email || contact.phone)) {
        contacts.push({
          name: cleanName(contact.name),
          email: contact.email,
          phone: contact.phone,
        });
      }
    }
  }

  // Alternative approach: Look for patterns in sequence
  if (contacts.length === 0) {
    console.log("Trying alternative extraction method...");

    // Try to find patterns where we have Name, Phone, Email in sequence
    for (let i = 0; i < lines.length - 2; i++) {
      const line1 = lines[i];
      const line2 = lines[i + 1];
      const line3 = lines[i + 2];

      // Look for name pattern (all caps, multiple words)
      if (
        /^[A-Z\s.'-]{5,}$/.test(line1) &&
        !["FELLOW", "MEMBER", "NAME", "CATEGORY", "EMAIL", "TEL1"].includes(
          line1
        ) &&
        !memberIdRegex.test(line1)
      ) {
        const contact = {
          name: line1,
          email: "",
          phone: "",
        };

        // Look for phone and email in next few lines
        for (let j = i + 1; j < Math.min(i + 6, lines.length); j++) {
          const checkLine = lines[j];

          if (phoneRegex.test(checkLine) && !contact.phone) {
            contact.phone = checkLine;
          }

          if (emailRegex.test(checkLine) && !contact.email) {
            contact.email = checkLine;
          }
        }

        // Add if we have phone or email
        if (contact.phone || contact.email) {
          contacts.push({
            name: cleanName(contact.name),
            email: contact.email,
            phone: contact.phone,
          });
        }
      }
    }
  }

  // Third approach: Split by numbers and process chunks
  if (contacts.length === 0) {
    console.log("Trying chunk-based extraction...");

    // Split text by serial numbers (1, 2, 3, etc.) or member IDs
    const chunks = text.split(/\n(?=\d+\n|FL\d{5})/g);

    chunks.forEach((chunk, index) => {
      const chunkLines = chunk
        .split("\n")
        .map((l) => l.trim())
        .filter((l) => l.length > 0);

      if (chunkLines.length < 3) return;

      const contact = {
        name: "",
        email: "",
        phone: "",
      };

      chunkLines.forEach((line) => {
        if (emailRegex.test(line)) {
          contact.email = line;
        } else if (phoneRegex.test(line)) {
          contact.phone = line;
        } else if (
          !contact.name &&
          line.length > 3 &&
          /^[A-Z\s.'-]+$/.test(line) &&
          line !== "FELLOW" &&
          !memberIdRegex.test(line) &&
          !/^[0-9]+$/.test(line)
        ) {
          contact.name = line;
        }
      });

      if (contact.name && (contact.email || contact.phone)) {
        contacts.push({
          name: cleanName(contact.name),
          email: contact.email,
          phone: contact.phone,
        });
      }
    });
  }

  console.log(`Extracted ${contacts.length} contacts`);
  console.log("Sample contacts:", contacts.slice(0, 5));

  // Remove duplicates based on email or phone
  const uniqueContacts = contacts.filter((contact, index, self) => {
    return (
      index ===
      self.findIndex(
        (c) =>
          (c.email && c.email === contact.email) ||
          (c.phone && c.phone === contact.phone)
      )
    );
  });

  console.log(`After deduplication: ${uniqueContacts.length} contacts`);

  return uniqueContacts;
}

// Helper function for better name cleaning
function cleanName(name) {
  return name
    .replace(/\s+/g, " ")
    .trim()
    .split(" ")
    .map((word) => word.charAt(0) + word.slice(1).toLowerCase())
    .join(" ");
}

// Helper function to validate phone numbers
function isValidPhone(phone) {
  // Nigerian phone numbers: 11 digits starting with 0, or 10 digits starting with 7,8,9
  return /^(0[789][01]\d{8}|[789][01]\d{7})$/.test(phone);
}

// Helper function to validate email
function isValidEmail(email) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}
