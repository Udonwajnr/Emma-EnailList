"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  MessageSquare,
  Mail,
  Send,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export function MessageSender({
  contacts,
  selectedContacts,
  onSelectionChange,
}) {
  const [smsMessage, setSmsMessage] = useState("");
  const [emailSubject, setEmailSubject] = useState("");
  const [emailMessage, setEmailMessage] = useState("");
  const [sending, setSending] = useState(null);
  const [message, setMessage] = useState(null);

  const selectedContactsData = contacts.filter((contact) =>
    selectedContacts.includes(contact._id)
  );

  const handleSendSMS = async () => {
    if (!smsMessage.trim()) {
      setMessage({ type: "error", text: "Please enter an SMS message" });
      return;
    }

    if (selectedContacts.length === 0) {
      setMessage({ type: "error", text: "Please select at least one contact" });
      return;
    }

    setSending("sms");
    setMessage(null);

    try {
      const response = await fetch("/api/send-sms", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactIds: selectedContacts,
          message: smsMessage,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `SMS sent successfully to ${result.successCount} contacts`,
        });
        setSmsMessage("");
        onSelectionChange([]);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to send SMS",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while sending SMS",
      });
    } finally {
      setSending(null);
    }
  };

  const handleSendEmail = async () => {
    if (!emailSubject.trim() || !emailMessage.trim()) {
      setMessage({
        type: "error",
        text: "Please enter both email subject and message",
      });
      return;
    }

    if (selectedContacts.length === 0) {
      setMessage({ type: "error", text: "Please select at least one contact" });
      return;
    }

    setSending("email");
    setMessage(null);

    try {
      const response = await fetch("/api/send-email", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contactIds: selectedContacts,
          subject: emailSubject,
          message: emailMessage,
        }),
      });

      const result = await response.json();

      if (response.ok) {
        setMessage({
          type: "success",
          text: `Email sent successfully to ${result.successCount} contacts`,
        });
        setEmailSubject("");
        setEmailMessage("");
        onSelectionChange([]);
      } else {
        setMessage({
          type: "error",
          text: result.error || "Failed to send email",
        });
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: "An error occurred while sending email",
      });
    } finally {
      setSending(null);
    }
  };

  return (
    <div className="space-y-6">
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

      <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="flex items-center justify-between">
          <span className="text-sm font-medium text-blue-800">
            Selected Contacts: {selectedContacts.length}
          </span>
          <Badge variant="secondary">
            {selectedContactsData.length} recipient
            {selectedContactsData.length !== 1 ? "s" : ""}
          </Badge>
        </div>
        {selectedContactsData.length > 0 && (
          <div className="mt-2 text-xs text-blue-700">
            {selectedContactsData
              .slice(0, 3)
              .map((contact) => contact.name)
              .join(", ")}
            {selectedContactsData.length > 3 &&
              ` and ${selectedContactsData.length - 3} more`}
          </div>
        )}
      </div>

      <Tabs defaultValue="sms" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="sms">SMS Messages</TabsTrigger>
          <TabsTrigger value="email">Email Messages</TabsTrigger>
        </TabsList>

        <TabsContent value="sms" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <MessageSquare className="h-5 w-5" />
                <span>Send SMS</span>
              </CardTitle>
              <CardDescription>
                Send SMS messages to selected contacts via Termii
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="sms-message">Message</Label>
                <Textarea
                  id="sms-message"
                  placeholder="Enter your SMS message..."
                  value={smsMessage}
                  onChange={(e) => setSmsMessage(e.target.value)}
                  rows={4}
                  maxLength={160}
                />
                <div className="text-xs text-gray-500 text-right">
                  {smsMessage.length}/160 characters
                </div>
              </div>

              <Button
                onClick={handleSendSMS}
                disabled={sending === "sms" || selectedContacts.length === 0}
                className="w-full"
              >
                {sending === "sms" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending SMS...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send SMS to {selectedContacts.length} contact
                    {selectedContacts.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="email" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                <Mail className="h-5 w-5" />
                <span>Send Email</span>
              </CardTitle>
              <CardDescription>
                Send email messages to selected contacts via Mailgun
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email-subject">Subject</Label>
                <input
                  id="email-subject"
                  type="text"
                  placeholder="Enter email subject..."
                  value={emailSubject}
                  onChange={(e) => setEmailSubject(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="email-message">Message</Label>
                <Textarea
                  id="email-message"
                  placeholder="Enter your email message..."
                  value={emailMessage}
                  onChange={(e) => setEmailMessage(e.target.value)}
                  rows={6}
                />
              </div>

              <Button
                onClick={handleSendEmail}
                disabled={sending === "email" || selectedContacts.length === 0}
                className="w-full"
              >
                {sending === "email" ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                    Sending Email...
                  </>
                ) : (
                  <>
                    <Send className="h-4 w-4 mr-2" />
                    Send Email to {selectedContacts.length} contact
                    {selectedContacts.length !== 1 ? "s" : ""}
                  </>
                )}
              </Button>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
}
