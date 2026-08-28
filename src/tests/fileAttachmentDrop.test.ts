import { describe, expect, it, vi } from "vitest";

const { onDragDropEvent } = vi.hoisted(() => ({ onDragDropEvent: vi.fn() }));
vi.mock("@tauri-apps/api/webview", () => ({ getCurrentWebview: () => ({ onDragDropEvent }) }));

import { listenForFileAttachments } from "../app/fileAttachmentDrop";

describe("native file drag and drop", () => {
  it("turns a drop into pending paths without sending", async () => {
    let handler: (event: { payload: unknown }) => void = () => undefined;
    const unlisten = vi.fn();
    onDragDropEvent.mockImplementation(async (value) => { handler = value; return unlisten; });
    const onDrop = vi.fn();
    const onActiveChange = vi.fn();
    await expect(listenForFileAttachments({ onDrop, onActiveChange })).resolves.toBe(unlisten);
    handler({ payload: { type: "enter", paths: ["/tmp/file.pdf"], position: { x: 1, y: 1 } } });
    handler({ payload: { type: "drop", paths: ["/tmp/file.pdf"], position: { x: 1, y: 1 } } });
    expect(onActiveChange.mock.calls).toEqual([[true], [false]]);
    expect(onDrop).toHaveBeenCalledWith(["/tmp/file.pdf"]);
  });
});
