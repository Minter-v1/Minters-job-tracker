"use client";

import { ClipboardEvent, useEffect, useRef } from "react";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

const ALLOWED_TAGS = new Set(["B", "STRONG", "I", "EM", "U", "UL", "OL", "LI", "DIV", "P", "BR"]);

function sanitize(html: string) {
  const template = document.createElement("template");
  template.innerHTML = html;

  function clean(node: Node) {
    for (const child of Array.from(node.childNodes)) {
      if (child instanceof HTMLElement) {
        if (!ALLOWED_TAGS.has(child.tagName)) {
          child.replaceWith(document.createTextNode(child.textContent ?? ""));
          continue;
        }
        for (const attribute of Array.from(child.attributes)) child.removeAttribute(attribute.name);
      }
      clean(child);
    }
  }

  clean(template.content);
  return template.innerHTML;
}

export function RichTextEditor({ value, onChange }: RichTextEditorProps) {
  const editorRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const cleanedValue = sanitize(value);
    if (editorRef.current && editorRef.current.innerHTML !== cleanedValue) {
      editorRef.current.innerHTML = cleanedValue;
    }
  }, [value]);

  function syncValue() {
    if (editorRef.current) onChange(sanitize(editorRef.current.innerHTML));
  }

  function format(command: string) {
    editorRef.current?.focus();
    document.execCommand(command);
    syncValue();
  }

  function pastePlainText(event: ClipboardEvent<HTMLDivElement>) {
    event.preventDefault();
    document.execCommand("insertText", false, event.clipboardData.getData("text/plain"));
    syncValue();
  }

  return (
    <div className="rich-editor">
      <div className="rich-toolbar" role="toolbar" aria-label="메모 서식">
        <ToolbarButton label="굵게" onPress={() => format("bold")}><strong>B</strong></ToolbarButton>
        <ToolbarButton label="기울임" onPress={() => format("italic")}><em>I</em></ToolbarButton>
        <ToolbarButton label="밑줄" onPress={() => format("underline")}><span className="underline">U</span></ToolbarButton>
        <span className="rich-toolbar-divider" />
        <ToolbarButton label="글머리표 목록" onPress={() => format("insertUnorderedList")}>• 목록</ToolbarButton>
        <ToolbarButton label="번호 목록" onPress={() => format("insertOrderedList")}>1. 목록</ToolbarButton>
        <span className="rich-toolbar-divider" />
        <ToolbarButton label="서식 지우기" onPress={() => format("removeFormat")}>서식 지우기</ToolbarButton>
      </div>
      <div
        ref={editorRef}
        className="rich-editor-content"
        contentEditable
        role="textbox"
        aria-label="메모"
        aria-multiline="true"
        data-placeholder="지원 일정, 면접 시간, 기억할 내용을 자유롭게 적어보세요."
        suppressContentEditableWarning
        onInput={syncValue}
        onPaste={pastePlainText}
      />
      <div className="rich-editor-footer">
        <span>내용은 자동 저장돼요</span>
        <span>오른쪽 아래를 끌어 크기 조절</span>
      </div>
    </div>
  );
}

function ToolbarButton({ label, onPress, children }: { label: string; onPress: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      className="rich-toolbar-button"
      aria-label={label}
      title={label}
      onMouseDown={(event) => {
        event.preventDefault();
        onPress();
      }}
    >
      {children}
    </button>
  );
}
