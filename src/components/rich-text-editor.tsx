"use client";

import FileHandler from "@tiptap/extension-file-handler";
import Image from "@tiptap/extension-image";
import Placeholder from "@tiptap/extension-placeholder";
import Underline from "@tiptap/extension-underline";
import { EditorContent, useEditor, type Editor } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import { useCallback, useEffect, useRef, useState } from "react";

import { createClient } from "@/lib/supabase/client";

type RichTextEditorProps = {
  applicationId: string;
  value: string;
  onChange: (value: string) => void;
};

const ALLOWED_IMAGE_TYPES = ["image/jpeg", "image/png", "image/gif", "image/webp"];
const MAX_IMAGE_SIZE = 5 * 1024 * 1024;

function storageUrl(path: string) {
  return `/api/memo-images/${path.split("/").map(encodeURIComponent).join("/")}`;
}

export function RichTextEditor({ applicationId, value, onChange }: RichTextEditorProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [uploadError, setUploadError] = useState("");

  const uploadImages = useCallback(async (editor: Editor, files: File[], position?: number) => {
    const images = files.filter((file) => ALLOWED_IMAGE_TYPES.includes(file.type));
    if (!images.length) return;

    const oversized = images.find((file) => file.size > MAX_IMAGE_SIZE);
    if (oversized) {
      setUploadError("이미지는 파일당 5MB 이하만 올릴 수 있어요.");
      return;
    }

    setUploading(true);
    setUploadError("");
    try {
      const supabase = createClient();
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("로그인 정보를 확인할 수 없습니다.");

      let insertAt = position;
      for (const file of images) {
        const extension = file.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "image";
        const path = `${user.id}/${applicationId}/${crypto.randomUUID()}.${extension}`;
        const { error } = await supabase.storage.from("memo-images").upload(path, file, {
          cacheControl: "3600",
          contentType: file.type,
          upsert: false,
        });
        if (error) throw error;

        const image = { type: "image", attrs: { src: storageUrl(path), alt: file.name, title: file.name } };
        if (insertAt === undefined) {
          editor.chain().focus().setImage(image.attrs).run();
        } else {
          editor.chain().focus().insertContentAt(insertAt, image).run();
          insertAt += 1;
        }
      }
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : "이미지를 올리지 못했습니다.");
    } finally {
      setUploading(false);
    }
  }, [applicationId]);

  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit,
      Underline,
      Image.configure({ allowBase64: false }),
      Placeholder.configure({ placeholder: "지원 일정, 면접 시간, 기억할 내용을 자유롭게 적어보세요." }),
      FileHandler.configure({
        allowedMimeTypes: ALLOWED_IMAGE_TYPES,
        onDrop: (currentEditor, files, position) => void uploadImages(currentEditor, files, position),
        onPaste: (currentEditor, files) => void uploadImages(currentEditor, files),
      }),
    ],
    content: value || "",
    editorProps: {
      attributes: {
        class: "rich-editor-content",
        "aria-label": "메모",
      },
    },
    onUpdate: ({ editor: currentEditor }) => onChange(currentEditor.isEmpty ? "" : currentEditor.getHTML()),
  }, [uploadImages]);

  useEffect(() => {
    if (!editor || editor.isFocused) return;
    const nextValue = value || "";
    const currentValue = editor.isEmpty ? "" : editor.getHTML();
    if (currentValue !== nextValue) editor.commands.setContent(nextValue, { emitUpdate: false });
  }, [editor, value]);

  if (!editor) return <div className="rich-editor min-h-[348px] animate-pulse bg-slate-50" />;

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="메모 서식">
        <ToolbarButton label="굵게 (⌘B)" active={editor.isActive("bold")} onPress={() => editor.chain().focus().toggleBold().run()}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="기울임 (⌘I)" active={editor.isActive("italic")} onPress={() => editor.chain().focus().toggleItalic().run()}><em>I</em></ToolbarButton>
        <ToolbarButton label="밑줄 (⌘U)" active={editor.isActive("underline")} onPress={() => editor.chain().focus().toggleUnderline().run()}><span className="underline">U</span></ToolbarButton>
        <span className="rich-toolbar-divider" />
        <ToolbarButton label="글머리표 목록" active={editor.isActive("bulletList")} onPress={() => editor.chain().focus().toggleBulletList().run()}>• 목록</ToolbarButton>
        <ToolbarButton label="번호 목록" active={editor.isActive("orderedList")} onPress={() => editor.chain().focus().toggleOrderedList().run()}>1. 목록</ToolbarButton>
        <span className="rich-toolbar-divider" />
        <ToolbarButton label="이미지 추가" disabled={uploading} onPress={() => fileInputRef.current?.click()}>{uploading ? "업로드 중" : <><ImageIcon />이미지</>}</ToolbarButton>
        <ToolbarButton label="서식 지우기" onPress={() => editor.chain().focus().unsetAllMarks().clearNodes().run()}>서식 지우기</ToolbarButton>
        <input ref={fileInputRef} type="file" accept={ALLOWED_IMAGE_TYPES.join(",")} multiple hidden onChange={(event) => { const files = Array.from(event.target.files ?? []); if (files.length) void uploadImages(editor, files); event.currentTarget.value = ""; }}/>
      </div>
      <div className="rich-editor-canvas">
        <EditorContent editor={editor} />
        {uploading && <div className="rich-upload-overlay">이미지 업로드 중…</div>}
      </div>
      <div className="rich-editor-footer">
        <span className={uploadError ? "text-rose-500" : undefined}>{uploadError || "- 또는 1. + Space · **굵게** · ⌘/Ctrl+B"}</span>
        <span>이미지를 붙여넣거나 드래그</span>
      </div>
    </div>
  );
}

function ImageIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="mr-1 size-3.5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
      <rect x="3" y="4" width="18" height="16" rx="2" />
      <circle cx="8.5" cy="9" r="1.5" />
      <path d="m4 17 5-5 4 4 2-2 5 5" />
    </svg>
  );
}

function ToolbarButton({ label, active = false, disabled = false, onPress, children }: { label: string; active?: boolean; disabled?: boolean; onPress: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rich-toolbar-button"
      data-active={active || undefined}
      aria-label={label}
      aria-pressed={active}
      title={label}
      disabled={disabled}
      onMouseDown={(event) => {
        event.preventDefault();
        onPress();
      }}
    >
      {children}
    </button>
  );
}
