"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import {
  Upload,
  FileText,
  CheckCircle,
  AlertCircle,
  Table,
  Users,
  Download,
} from "lucide-react";

export function DocxTableParser({ onContactsExtracted }) {
  const [uploading, setUploading] = useState(false);
  const [message, setMessage] = useState(null);
  const [extractedContacts, setExtractedContacts] = useState([]);
  const [tableInfo, setTableInfo] = useState(null);

  const createSampleDocx = () => {
    // Create a simple sample DOCX content description
    const sampleData = `Sample DOCX Content for Testing:

Create a Word document with a table like this:

| Name          | Phone         | Email                |
|---------------|---------------|----------------------|
| John Smith    | 555-123-4567  | john@example.com     |
| Jane Doe      | 555-987-6543  | jane@example.com     |
| Mike Johnson  | 555-111-2222  | mike@example.com     |
| Sarah Wilson  | 555-333-4444  | sarah@example.com    |

Or create a document with contact information in any format:

Name: John Smith
Phone: 555-123-4567
Email: john@example.com

Name: Jane Doe
Phone: 555-987-6543
Email: jane@example.com

The parser will extract contacts from both table and text formats.`;

    const blob = new Blob([sampleData], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = "sample-docx-format.txt";
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  };

  const handleFileUpload = async (event) => {
    event.preventDefault();
    const formData = new FormData(event.currentTarget);
    const file = formData.get("file");

    if (!file) {
      setMessage({
        type: "error",
        text: "Please select a DOCX file to upload",
      });
      return;
    }

    // Validate file type
    if (!file.name.toLowerCase().endsWith(".docx")) {
      setMessage({ type: "error", text: "Please upload a .docx file only" });
      return;
    }

    // Validate file size (10MB limit)
    if (file.size > 10 * 1024 * 1024) {
      setMessage({ type: "error", text: "File size must be less than 10MB" });
      return;
    }

    setUploading(true);
    setMessage(null);
    setExtractedContacts([]);
    setTableInfo(null);

    try {
      const response = await fetch("/api/parse-docx", {
        method: "POST",
        body: formData,
      });

      // Check if response is JSON
      const contentType = response.headers.get("content-type");
      if (!contentType || !contentType.includes("application/json")) {
        const text = await response.text();
        console.error("Non-JSON response:", text);
        setMessage({
          type: "error",
          text: "Server returned an invalid response",
        });
        return;
      }

      const result = await response.json();

      if (response.ok) {
        setExtractedContacts(result.contacts || []);
        setTableInfo(result.tableInfo);
        setMessage({
          type: "success",
          text: `Successfully extracted ${
            result.contacts?.length || 0
          } contacts from the DOCX document`,
        });

        // Call parent callback if provided
        if (onContactsExtracted && result.contacts) {
          onContactsExtracted(result.contacts);
        }

        // Reset form
        event.currentTarget.reset();
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to parse DOCX file",
        });
        if (result.details) {
          console.error("DOCX parsing details:", result.details);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
      setMessage({
        type: "error",
        text: "An error occurred during upload: " + error.message,
      });
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Table className="h-5 w-5" />
            <span>DOCX Document Parser</span>
          </CardTitle>
          <CardDescription>
            Upload a Word document (.docx) to extract contact information from
            tables or text
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="docx-file">Select DOCX File</Label>
              <div className="flex items-center space-x-2">
                <Input
                  id="docx-file"
                  name="file"
                  type="file"
                  accept=".docx"
                  disabled={uploading}
                  className="flex-1"
                />
                <Button type="submit" disabled={uploading}>
                  {uploading ? (
                    <>
                      <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Parse Document
                    </>
                  )}
                </Button>
              </div>
            </div>
          </form>

          <div className="flex justify-center">
            <Button variant="outline" size="sm" onClick={createSampleDocx}>
              <Download className="h-4 w-4 mr-2" />
              Download Sample Format Guide
            </Button>
          </div>

          {message && (
            <Alert
              className={
                message.type === "error"
                  ? "border-red-200 bg-red-50"
                  : "border-green-200 bg-green-50"
              }
            >
              {message.type === "error" ? (
                <AlertCircle className="h-4 w-4 text-red-600" />
              ) : (
                <CheckCircle className="h-4 w-4 text-green-600" />
              )}
              <AlertDescription
                className={
                  message.type === "error" ? "text-red-800" : "text-green-800"
                }
              >
                {message.text}
              </AlertDescription>
            </Alert>
          )}

          {tableInfo && (
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
              <div className="flex items-center space-x-2 mb-2">
                <Table className="h-4 w-4 text-blue-600" />
                <span className="text-sm font-medium text-blue-800">
                  Document Information
                </span>
              </div>
              <div className="grid grid-cols-2 gap-4 text-sm text-blue-700">
                <div>Tables Found: {tableInfo.tablesFound}</div>
                <div>Contacts Extracted: {tableInfo.contactsExtracted}</div>
                {tableInfo.conversionMessages > 0 && (
                  <div className="col-span-2 text-xs text-blue-600">
                    Note: {tableInfo.conversionMessages} conversion messages
                    (check console for details)
                  </div>
                )}
              </div>
            </div>
          )}

          <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
            <div className="flex items-start space-x-2">
              <FileText className="h-5 w-5 text-gray-600 mt-0.5" />
              <div className="text-sm text-gray-700">
                <p className="font-medium mb-1">Supported formats:</p>
                <ul className="list-disc list-inside space-y-1">
                  <li>
                    <strong>Tables:</strong> Any table with name, phone, and
                    email columns
                  </li>
                  <li>
                    <strong>Structured Text:</strong> Name:, Phone:, Email:
                    format
                  </li>
                  <li>
                    <strong>Mixed Content:</strong> Combination of tables and
                    text
                  </li>
                  <li>
                    Parser automatically detects and extracts contact
                    information
                  </li>
                </ul>
                <p className="mt-2 text-xs text-gray-500">
                  File size limit: 10MB. Only .docx files are supported.
                  Password-protected files are not supported.
                </p>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {extractedContacts.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center space-x-2">
              <Users className="h-5 w-5" />
              <span>Extracted Contacts</span>
              <Badge variant="secondary">
                {extractedContacts.length} contacts
              </Badge>
            </CardTitle>
            <CardDescription>
              Contact information extracted from the DOCX document
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-2 max-h-96 overflow-y-auto">
              {extractedContacts.map((contact, index) => (
                <div
                  key={index}
                  className="flex items-center space-x-4 p-3 bg-gray-50 rounded-lg"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-3 gap-2">
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4 text-gray-400" />
                      <span className="font-medium">{contact.name}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {contact.phone || "No phone"}
                      </span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <span className="text-sm text-gray-600">
                        {contact.email || "No email"}
                      </span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
