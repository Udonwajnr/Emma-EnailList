"use client";

import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Checkbox } from "@/components/ui/checkbox";
import {
  MessageSquare,
  Mail,
  Send,
  Users,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export function MessagingPanel() {
  const [contacts, setContacts] = useState([]);
  const [selectedContacts, setSelectedContacts] = useState([]);
  const [smsMessage, setSmsMessage] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [sending, setSending] = useState(false);
  const [result, setResult] = useState(null);

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    try {
      const response = await fetch("/api/contacts");
      const data = await response.json();
      setContacts(data);
    } catch (error) {
      console.error("Failed to fetch contacts:", error);
    }
  };

  const toggleContactSelection = (id) => {
    setSelectedContacts((prev) =>
      prev.includes(id) ? prev.filter((cId) => cId !== id) : [...prev, id]
    );
  };

  const selectAllContacts = () => {
    setSelectedContacts(
      selectedContacts.length === contacts.length
        ? []
        : contacts.map((c) => c._id)
    );
  };

  const sendSMS = async () => {
    if (!smsMessage.trim() || selectedContacts.length === 0) return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          message: smsMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: `SMS sent to ${data.sent} contacts successfully`,
        });
        setSmsMessage("");
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to send SMS",
        });
      }
    } catch (error) {
      setResult({ type: "error", message: "Failed to send SMS" });
    } finally {
      setSending(false);
    }
  };

  const sendEmail = async () => {
    if (
      !emailMessage.trim() ||
      !emailSubject.trim() ||
      selectedContacts.length === 0
    )
      return;

    setSending(true);
    setResult(null);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          contactIds: selectedContacts,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const data = await response.json();

      if (response.ok) {
        setResult({
          type: "success",
          message: `Email sent to ${data.sent} contacts successfully`,
        });
        setEmailMessage("");
        setEmailSubject("");
      } else {
        setResult({
          type: "error",
          message: data.error || "Failed to send email",
        });
      }
    } catch (error) {
      setResult({ type: "error", message: "Failed to send email" });
    } finally {
      setSending(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Contact Selection */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Select Recipients
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between mb-4">
            <Button
              variant="outline"
              onClick={selectAllContacts}
              disabled={contacts.length === 0}
            >
              {selectedContacts.length === contacts.length
                ? "Deselect All"
                : "Select All"}
            </Button>
            <Badge variant="secondary">
              {selectedContacts.length} of {contacts.length} selected
            </Badge>
          </div>

          <div className="grid gap-2 max-h-60 overflow-y-auto">
            {contacts.map((contact) => (
              <div
                key={contact._id}
                className="flex items-center space-x-2 p-2 rounded hover:bg-gray-50"
              >
                <Checkbox
                  checked={selectedContacts.includes(contact._id)}
                  onCheckedChange={() => toggleContactSelection(contact._id)}
                />
                <div className="flex-1">
                  <span className="font-medium">{contact.name}</span>
                  <div className="text-sm text-gray-500">
                    {contact.email && <span>{contact.email}</span>}
                    {contact.email && contact.phone && <span> • </span>}
                    {contact.phone && <span>{contact.phone}</span>}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Messaging Tabs */}
      <Tabs defaultValue="sms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sms" className="flex items-center gap-2">
            <MessageSquare className="h-4 w-4" />
            SMS
          </TabsTrigger>
          <TabsTrigger value="email" className="flex items-center gap-2">
            <Mail className="h-4 w-4" />
            Email
          </TabsTrigger>
        </TabsList>

        <TabsContent value="sms">
          <Card>
            <CardHeader>
              <CardTitle>Send SMS</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder="Enter your SMS message..."
                value={smsMessage}
                onChange={(e) => setSmsMessage(e.target.value)}
                rows={4}
              />
              <div className="flex justify-between items-center">
                <span className="text-sm text-gray-500">
                  {smsMessage.length}/160 characters
                </span>
                <Button
                  onClick={sendSMS}
                  disabled={
                    !smsMessage.trim() ||
                    selectedContacts.length === 0 ||
                    sending
                  }
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending
                    ? "Sending..."
                    : `Send to ${selectedContacts.length} contacts`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email">
          <Card>
            <CardHeader>
              <CardTitle>Send Email</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <input
                type="text"
                placeholder="Email subject..."
                value={emailSubject}
                onChange={(e) => setEmailSubject(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              <Textarea
                placeholder="Enter your email message..."
                value={emailMessage}
                onChange={(e) => setEmailMessage(e.target.value)}
                rows={6}
              />
              <div className="flex justify-end">
                <Button
                  onClick={sendEmail}
                  disabled={
                    !emailMessage.trim() ||
                    !emailSubject.trim() ||
                    selectedContacts.length === 0 ||
                    sending
                  }
                  className="flex items-center gap-2"
                >
                  <Send className="h-4 w-4" />
                  {sending
                    ? "Sending..."
                    : `Send to ${selectedContacts.length} contacts`}
                </Button>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Result Alert */}
      {result && (
        <Alert
          className={
            result.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          {result.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              result.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {result.message}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
