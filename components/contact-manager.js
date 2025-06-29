"use client";

import { useState } from "react";
import { FileUpload } from "./file-upload";
import { ContactList } from "./contact-list";
import { MessagingPanel } from "./messaging-panel";
import { ContactReview } from "./contact-review";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Upload, Users, MessageSquare, Eye } from "lucide-react";

export default function ContactManager() {
  const [refreshContacts, setRefreshContacts] = useState(0);
  const [extractedContacts, setExtractedContacts] = useState([]);
  const [activeTab, setActiveTab] = useState("upload");

  const handleUploadSuccess = (contacts) => {
    setExtractedContacts(contacts);
    setActiveTab("review"); // Switch to review tab
  };

  const handleContactsSaved = () => {
    setRefreshContacts((prev) => prev + 1);
    setExtractedContacts([]);
    setActiveTab("contacts"); // Switch to contacts tab
  };

  const handleBackToUpload = () => {
    setExtractedContacts([]);
    setActiveTab("upload");
  };

  return (
    <div className="max-w-7xl mx-auto">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 mb-8">
          <TabsTrigger value="upload" className="flex items-center gap-2">
            <Upload className="h-4 w-4" />
            Upload Documents
          </TabsTrigger>
          <TabsTrigger
            value="review"
            className="flex items-center gap-2"
            disabled={extractedContacts.length === 0}
          >
            <Eye className="h-4 w-4" />
            Review Contacts
          </TabsTrigger>
          <TabsTrigger value="contacts" className="flex items-center gap-2">
            <Users className="h-4 w-4" />
            Manage Contacts
          </TabsTrigger>
          <TabsTrigger value="messaging" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            Send Messages
          </TabsTrigger>
        </TabsList>

        <TabsContent value="upload">
          <Card>
            <CardHeader>
              <CardTitle>Document Upload</CardTitle>
              <CardDescription>
                Upload PDF, DOCX, or TXT files to extract contact information
              </CardDescription>
            </CardHeader>
            <CardContent>
              <FileUpload onUploadSuccess={handleUploadSuccess} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="review">
          <Card>
            <CardHeader>
              <CardTitle>Review Extracted Contacts</CardTitle>
              <CardDescription>
                Review, edit, and organize contacts before saving to database
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactReview
                contacts={extractedContacts}
                onSave={handleContactsSaved}
                onBack={handleBackToUpload}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="contacts">
          <Card>
            <CardHeader>
              <CardTitle>Contact Management</CardTitle>
              <CardDescription>
                View, search, and manage your saved contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <ContactList key={refreshContacts} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="messaging">
          <Card>
            <CardHeader>
              <CardTitle>Bulk Messaging</CardTitle>
              <CardDescription>
                Send SMS and email messages to selected contacts
              </CardDescription>
            </CardHeader>
            <CardContent>
              <MessagingPanel />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
