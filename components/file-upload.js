"use client";

import { useState, useCallback } from "react";
import { useDropzone } from "react-dropzone";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Card, CardContent } from "@/components/ui/card";
import { Upload, FileText, CheckCircle, AlertCircle } from "lucide-react";
import { Badge } from "@/components/ui/badge";

export function FileUpload({ onUploadSuccess }) {
  const [uploading, setUploading] = useState(false);
  const [progress, setProgress] = useState(0);
  const [message, setMessage] = useState(null);
  const [selectedFiles, setSelectedFiles] = useState([]);

  const onDrop = useCallback(
    async (acceptedFiles) => {
      if (acceptedFiles.length === 0) return;

      setUploading(true);
      setProgress(10);
      setMessage(null);

      console.log(
        "Files to upload:",
        acceptedFiles.map((f) => ({ name: f.name, size: f.size, type: f.type }))
      );

      setSelectedFiles(acceptedFiles);

      const formData = new FormData();
      acceptedFiles.forEach((file) => {
        formData.append("files", file);
      });

      setProgress(30);

      try {
        setProgress(50);

        const response = await fetch("/api/extract-contacts", {
          method: "POST",
          body: formData,
        });

        setProgress(80);

        if (!response.ok) {
          const errorData = await response
            .json()
            .catch(() => ({ error: "Upload failed" }));
          throw new Error(errorData.error || "Upload failed");
        }

        const result = await response.json();
        setProgress(100);

        setMessage({
          type: "success",
          text: `Successfully extracted ${result.contacts.length} contacts from ${acceptedFiles.length} file(s)`,
        });

        // Pass extracted contacts to parent
        onUploadSuccess(result.contacts);
      } catch (error) {
        console.error("Upload error:", error);
        setMessage({
          type: "error",
          text: error.message || "Failed to upload and process files",
        });
      } finally {
        setTimeout(() => {
          setUploading(false);
          setProgress(0);
          setSelectedFiles([]);
        }, 1000);
      }
    },
    [onUploadSuccess]
  );

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document":
        [".docx"],
      "text/plain": [".txt"],
    },
    disabled: uploading,
  });

  return (
    <div className="space-y-4">
      {selectedFiles.length > 0 && !uploading && (
        <Card className="mb-4">
          <CardContent className="p-4">
            <h3 className="font-medium mb-2">Selected Files:</h3>
            <div className="space-y-2">
              {selectedFiles.map((file, index) => (
                <div
                  key={index}
                  className="flex items-center justify-between p-2 bg-gray-50 rounded"
                >
                  <div className="flex items-center gap-2">
                    <FileText className="h-4 w-4 text-gray-500" />
                    <span className="text-sm font-medium">{file.name}</span>
                    <span className="text-xs text-gray-500">
                      ({(file.size / 1024).toFixed(1)} KB)
                    </span>
                  </div>
                  <Badge variant="outline">
                    {file.type.split("/")[1]?.toUpperCase() || "FILE"}
                  </Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card
        {...getRootProps()}
        className={`border-2 border-dashed cursor-pointer transition-colors ${
          isDragActive
            ? "border-blue-500 bg-blue-50"
            : "border-gray-300 hover:border-gray-400"
        } ${uploading ? "cursor-not-allowed opacity-50" : ""}`}
      >
        <CardContent className="flex flex-col items-center justify-center py-12">
          <input {...getInputProps()} />
          <Upload className="h-12 w-12 text-gray-400 mb-4" />
          <div className="text-center">
            <p className="text-lg font-medium text-gray-900 mb-2">
              {isDragActive ? "Drop files here" : "Upload Documents"}
            </p>
            <p className="text-sm text-gray-500">
              Drag & drop PDF, DOCX, or TXT files here, or click to select
            </p>
          </div>
        </CardContent>
      </Card>

      {uploading && (
        <div className="space-y-2">
          <div className="flex items-center gap-2">
            <FileText className="h-4 w-4 animate-pulse" />
            <span className="text-sm">Processing documents...</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>
      )}

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
