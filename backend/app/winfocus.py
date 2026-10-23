import time
import os
import ctypes
from ctypes import wintypes

user32 = ctypes.windll.user32
kernel32 = ctypes.windll.kernel32

WNDENUMPROC = ctypes.WINFUNCTYPE(ctypes.c_int, ctypes.c_void_p, ctypes.c_void_p)

def _find_window(class_name: str, title_substring: str = "", fallback_any: bool = False, hdesk=None):
    windows = []

    def enum_cb(hwnd, lparam):
        cls_buf = ctypes.create_unicode_buffer(256)
        user32.GetClassNameW(hwnd, cls_buf, 256)
        length = user32.GetWindowTextLengthW(hwnd)
        title_buf = ctypes.create_unicode_buffer(length + 1)
        if length > 0:
            user32.GetWindowTextW(hwnd, title_buf, length + 1)
        windows.append((hwnd, cls_buf.value, title_buf.value))
        return 1

    cb = WNDENUMPROC(enum_cb)
    if hdesk:
        user32.EnumDesktopWindows(hdesk, cb, 0)
    else:
        user32.EnumWindows(cb, 0)

    target_class = class_name.lower() if class_name else ""
    target_title = title_substring.lower() if title_substring else ""

    # 1. Primary substring match
    for hwnd, c_name, t_name in windows:
        if target_class and c_name.lower() != target_class:
            continue
        if target_title and target_title not in t_name.lower():
            continue
        return hwnd, c_name, t_name

    # 2. Fallback to any window of matching class
    if fallback_any and target_class:
        for hwnd, c_name, t_name in windows:
            if c_name.lower() == target_class:
                return hwnd, c_name, t_name

    return None, "", ""

def focus_window(class_name: str, title_substring: str = "", timeout: float = 15.0, fallback_any: bool = False):
    """
    Polls for a window matching class_name and title_substring (case-insensitive substring match).
    If fallback_any is True and title substring is not found after 6s, falls back to any window of class_name.
    Brings the window to foreground and logs whether it was found and SetForegroundWindow return value.
    On failure, prints '[winfocus] NOT FOUND ...' followed by a dump of all visible windows.
    """
    start_time = time.time()
    found_hwnd = None
    found_class = ""
    found_title = ""

    while time.time() - start_time < timeout:
        elapsed = time.time() - start_time
        use_fallback = fallback_any and (elapsed >= 6.0)
        hwnd, c_name, t_name = _find_window(class_name, title_substring, fallback_any=use_fallback, hdesk=None)
        if hwnd:
            found_hwnd = hwnd
            found_class = c_name
            found_title = t_name
            break
        time.sleep(0.2)

    if not found_hwnd:
        # Collect and dump all visible windows on failure
        visible_windows = []

        def dump_cb(hwnd, lparam):
            if user32.IsWindowVisible(hwnd):
                cls_buf = ctypes.create_unicode_buffer(256)
                user32.GetClassNameW(hwnd, cls_buf, 256)
                length = user32.GetWindowTextLengthW(hwnd)
                title_buf = ctypes.create_unicode_buffer(length + 1)
                if length > 0:
                    user32.GetWindowTextW(hwnd, title_buf, length + 1)
                visible_windows.append((hwnd, cls_buf.value, title_buf.value))
            return 1

        dump_proc = WNDENUMPROC(dump_cb)
        user32.EnumWindows(dump_proc, 0)

        print(f"[winfocus] NOT FOUND (class={class_name!r}, title_substring={title_substring!r}) after {timeout:.1f}s")
        print(f"[winfocus] Dumping all visible windows ({len(visible_windows)} total):")
        for h, c, t in visible_windows:
            print(f"[winfocus]   {h} | {c} | {t}")
        return False

    print(f"[winfocus] Window FOUND: HWND={found_hwnd}, Class={found_class!r}, Title={found_title!r}")

    # Bring to foreground using Win32 API with ALT-key bypass
    try:
        # 1. Restore if minimized, or ensure shown
        if user32.IsIconic(found_hwnd):
            user32.ShowWindow(found_hwnd, 9)  # SW_RESTORE
        else:
            user32.ShowWindow(found_hwnd, 5)  # SW_SHOW

        user32.BringWindowToTop(found_hwnd)

        # 2. Alt-key bypass for Windows SetForegroundWindow lock
        VK_MENU = 0x12
        KEYEVENTF_KEYUP = 0x0002
        user32.keybd_event(VK_MENU, 0, 0, 0)
        ret = user32.SetForegroundWindow(found_hwnd)
        user32.keybd_event(VK_MENU, 0, KEYEVENTF_KEYUP, 0)

        # 3. Fallback: SwitchToThisWindow forces task switch
        if not ret and hasattr(user32, "SwitchToThisWindow"):
            user32.SwitchToThisWindow(found_hwnd, True)
            ret = 1
    except Exception as e:
        print(f"[winfocus] Exception while setting foreground: {e}")
        ret = 0

    print(f"[winfocus] SetForegroundWindow returned: {ret} ({'SUCCESS (nonzero)' if ret != 0 else 'ZERO (failed)'})")
    return bool(ret)
