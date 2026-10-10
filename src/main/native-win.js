'use strict';
// Thin Win32 bridge (via koffi, prebuilt - no compiler needed).
// Gives us what Electron lacks: global mouse-button state and the system cursor shape.
const koffi = require('koffi');

const user32 = koffi.load('user32.dll');
const POINT = koffi.struct('POINT', { x: 'int32', y: 'int32' });
const CURSORINFO = koffi.struct('CURSORINFO', {
  cbSize: 'uint32',
  flags: 'uint32',
  hCursor: 'void *',
  ptScreenPos: POINT,
});

const GetCursorInfo = user32.func('bool __stdcall GetCursorInfo(_Inout_ CURSORINFO *pci)');
const GetAsyncKeyState = user32.func('int16 __stdcall GetAsyncKeyState(int vKey)');
const LoadCursorW = user32.func('void * __stdcall LoadCursorW(void *hInstance, uintptr_t lpCursorName)');
const GetDoubleClickTime = user32.func('uint32 __stdcall GetDoubleClickTime()');
const GetSystemMetrics = user32.func('int __stdcall GetSystemMetrics(int nIndex)');

// Standard system cursors -> our cursor type names.
const IDC = {
  32512: 'arrow',       // IDC_ARROW
  32513: 'text',        // IDC_IBEAM
  32514: 'wait',        // IDC_WAIT
  32515: 'crosshair',   // IDC_CROSS
  32642: 'resize-d1',   // IDC_SIZENWSE
  32643: 'resize-d2',   // IDC_SIZENESW
  32644: 'resize-h',    // IDC_SIZEWE
  32645: 'resize-v',    // IDC_SIZENS
  32646: 'move',        // IDC_SIZEALL
  32648: 'not-allowed', // IDC_NO
  32649: 'pointer',     // IDC_HAND
  32650: 'wait',        // IDC_APPSTARTING
};
const TYPE_BY_HANDLE = new Map();
for (const [id, type] of Object.entries(IDC)) {
  const h = LoadCursorW(null, Number(id));
  if (h) TYPE_BY_HANDLE.set(koffi.address(h), type);
}

const SM_SWAPBUTTON = 23;
const VK_LBUTTON = 0x01;
const VK_RBUTTON = 0x02;

function primaryButtonDown() {
  // GetAsyncKeyState reads *physical* buttons, so honour swapped-button setups.
  const vk = GetSystemMetrics(SM_SWAPBUTTON) ? VK_RBUTTON : VK_LBUTTON;
  return (GetAsyncKeyState(vk) & 0x8000) !== 0;
}

const info = { cbSize: koffi.sizeof(CURSORINFO), flags: 0, hCursor: null, ptScreenPos: { x: 0, y: 0 } };
function getCursorType() {
  info.cbSize = koffi.sizeof(CURSORINFO);
  info.flags = 0;
  info.hCursor = null;
  if (!GetCursorInfo(info)) return 'arrow';
  if (!(info.flags & 1)) return 'hidden'; // CURSOR_SHOWING
  const h = info.hCursor ? koffi.address(info.hCursor) : 0n;
  return TYPE_BY_HANDLE.get(h) || 'arrow';
}

module.exports = {
  primaryButtonDown,
  getCursorType,
  getDoubleClickTime: () => GetDoubleClickTime() || 500,
};
