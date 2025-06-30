"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Progress } from "@/components/ui/progress";
import {
  User,
  Mail,
  Phone,
  Edit2,
  Trash2,
  Save,
  ArrowLeft,
  CheckCircle,
  AlertCircle,
} from "lucide-react";

export function ContactReview({ contacts, onSave, onBack }) {
  const [reviewContacts, setReviewContacts] = useState(
    contacts.map((contact, index) => ({
      ...contact,
      id: index,
      selected: true,
      editing: false,
    }))
  );
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState(null);
  const [saveProgress, setSaveProgress] = useState({ current: 0, total: 0 });

  const updateContact = (id, field, value) => {
    setReviewContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, [field]: value } : contact
      )
    );
  };

  const toggleEdit = (id) => {
    setReviewContacts((prev) =>
      prev.map((contact) =>
        contact.id === id ? { ...contact, editing: !contact.editing } : contact
      )
    );
  };

  const toggleSelect = (id) => {
    setReviewContacts((prev) =>
      prev.map((contact) =>
        contact.id === id
          ? { ...contact, selected: !contact.selected }
          : contact
      )
    );
  };

  const deleteContact = (id) => {
    setReviewContacts((prev) => prev.filter((contact) => contact.id !== id));
  };

  const selectAll = () => {
    const allSelected = reviewContacts.every((contact) => contact.selected);
    setReviewContacts((prev) =>
      prev.map((contact) => ({ ...contact, selected: !allSelected }))
    );
  };

  const saveContacts = async () => {
    const selectedContacts = reviewContacts.filter(
      (contact) => contact.selected
    );

    if (selectedContacts.length === 0) {
      setMessage({
        type: "error",
        text: "Please select at least one contact to save",
      });
      return;
    }

    setSaving(true);
    setMessage(null);
    setSaveProgress({ current: 0, total: selectedContacts.length });

    try {
      const response = await fetch("/api/contacts/bulk-create", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          contacts: selectedContacts.map(
            ({ id, selected, editing, ...contact }) => contact
          ),
        }),
      });

      if (!response.ok) {
        throw new Error("Failed to save contacts");
      }

      // Read the response as a stream to get progress updates
      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let buffer = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop(); // Keep incomplete line in buffer

        for (const line of lines) {
          if (line.trim()) {
            try {
              const data = JSON.parse(line);
              if (data.progress) {
                setSaveProgress({
                  current: data.progress.current,
                  total: data.progress.total,
                });
              } else if (data.completed) {
                setMessage({
                  type: "success",
                  text: `Successfully saved ${data.saved} out of ${data.total} contacts to database`,
                });
                setTimeout(() => {
                  onSave();
                }, 2000);
              }
            } catch (e) {
              // Ignore JSON parse errors for incomplete chunks
            }
          }
        }
      }
    } catch (error) {
      setMessage({
        type: "error",
        text: error.message || "Failed to save contacts",
      });
    } finally {
      setSaving(false);
      setSaveProgress({ current: 0, total: 0 });
    }
  };

  const selectedCount = reviewContacts.filter(
    (contact) => contact.selected
  ).length;

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div className="flex items-center gap-4">
          <Button
            variant="outline"
            onClick={onBack}
            className="flex items-center gap-2 bg-transparent"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Upload
          </Button>
          <div className="flex items-center gap-2">
            <Badge variant="secondary">{reviewContacts.length} extracted</Badge>
            <Badge variant="default">{selectedCount} selected</Badge>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" onClick={selectAll}>
            {selectedCount === reviewContacts.length
              ? "Deselect All"
              : "Select All"}
          </Button>
          <Button
            onClick={saveContacts}
            disabled={saving || selectedCount === 0}
            className="flex items-center gap-2"
          >
            <Save className="h-4 w-4" />
            {saving ? "Saving..." : `Save ${selectedCount} Contacts`}
          </Button>
        </div>
      </div>

      {/* Progress Bar */}
      {saving && saveProgress.total > 0 && (
        <Card>
          <CardContent className="p-4">
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span>Saving contacts to database...</span>
                <span>
                  {saveProgress.current} of {saveProgress.total}
                </span>
              </div>
              <Progress
                value={(saveProgress.current / saveProgress.total) * 100}
                className="w-full"
              />
            </div>
          </CardContent>
        </Card>
      )}

      {/* Contacts Grid */}
      <div className="grid gap-4 max-h-96 overflow-y-auto">
        {reviewContacts.slice(0, 50).map((contact) => (
          <Card
            key={contact.id}
            className={`transition-all ${
              contact.selected ? "ring-2 ring-blue-500" : ""
            }`}
          >
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={contact.selected}
                    onCheckedChange={() => toggleSelect(contact.id)}
                  />
                  <CardTitle className="text-lg">
                    {contact.memberId} - Contact #{contact.id + 1}
                  </CardTitle>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => toggleEdit(contact.id)}
                  >
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => deleteContact(contact.id)}
                    className="text-red-600"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              {/* Name Field */}
              <div className="flex items-center gap-3">
                <User className="h-4 w-4 text-gray-500 flex-shrink-0" />
                {contact.editing ? (
                  <Input
                    value={contact.name}
                    onChange={(e) =>
                      updateContact(contact.id, "name", e.target.value)
                    }
                    placeholder="Enter name"
                    className="flex-1"
                  />
                ) : (
                  <span className="flex-1 font-medium">
                    {contact.name || "No name"}
                  </span>
                )}
              </div>

              {/* Email Field */}
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-gray-500 flex-shrink-0" />
                {contact.editing ? (
                  <Input
                    type="email"
                    value={contact.email}
                    onChange={(e) =>
                      updateContact(contact.id, "email", e.target.value)
                    }
                    placeholder="Enter email"
                    className="flex-1"
                  />
                ) : (
                  <span className="flex-1 text-gray-600">
                    {contact.email || "No email"}
                  </span>
                )}
              </div>

              {/* Phone Field */}
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-gray-500 flex-shrink-0" />
                {contact.editing ? (
                  <Input
                    type="tel"
                    value={contact.phone}
                    onChange={(e) =>
                      updateContact(contact.id, "phone", e.target.value)
                    }
                    placeholder="Enter phone number"
                    className="flex-1"
                  />
                ) : (
                  <span className="flex-1 text-gray-600">
                    {contact.phone || "No phone"}
                  </span>
                )}
              </div>

              {/* Validation Badges */}
              <div className="flex gap-2 flex-wrap">
                {contact.name && contact.name !== "Unknown" && (
                  <Badge variant="outline" className="text-green-600">
                    Has Name
                  </Badge>
                )}
                {contact.email && (
                  <Badge variant="outline" className="text-blue-600">
                    Has Email
                  </Badge>
                )}
                {contact.phone && (
                  <Badge variant="outline" className="text-purple-600">
                    Has Phone
                  </Badge>
                )}
                {(!contact.name || contact.name === "Unknown") &&
                  !contact.email &&
                  !contact.phone && (
                    <Badge variant="destructive">Incomplete</Badge>
                  )}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {reviewContacts.length > 50 && (
        <Card>
          <CardContent className="text-center py-4">
            <p className="text-gray-500">
              Showing first 50 contacts. Total: {reviewContacts.length} contacts
              will be processed.
            </p>
          </CardContent>
        </Card>
      )}

      {reviewContacts.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <User className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className="text-gray-500">No contacts to review</p>
          </CardContent>
        </Card>
      )}

      {/* Result Message */}
      {message && (
        <Alert
          className={
            message.type === "success"
              ? "border-green-200 bg-green-50"
              : "border-red-200 bg-red-50"
          }
        >
          {message.type === "success" ? (
            <CheckCircle className="h-4 w-4 text-green-600" />
          ) : (
            <AlertCircle className="h-4 w-4 text-red-600" />
          )}
          <AlertDescription
            className={
              message.type === "success" ? "text-green-800" : "text-red-800"
            }
          >
            {message.text}
          </AlertDescription>
        </Alert>
      )}
    </div>
  );
}
