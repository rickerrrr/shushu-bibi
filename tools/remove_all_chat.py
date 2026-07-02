"""
Remove all chatroom code from the project.
Safe, targeted removal - only chat-related code is deleted.
"""
import os
import re

BASE = r'C:\Users\A2813\WorkBuddy\2026-06-23-14-34-26'

# ============================================================
# STEP 1: index.html - Remove chat button
# ============================================================
print("[1/4] Removing chat button from index.html...")
with open(os.path.join(BASE, 'index.html'), 'r', encoding='utf-8') as f:
    html = f.read()

old_btn = '''      <button class="btn-guide" id="btn-chatroom" onclick="window.ChatRoom && window.ChatRoom.toggle()" title="聊天室">💬<span class="nav-badge" id="chatroom-nav-badge" style="display:none">0</span></button>\n'''
if old_btn in html:
    html = html.replace(old_btn, '')
    print('  [OK] Chat button removed')
else:
    print('  [WARN] Chat button NOT found')

# ============================================================
# STEP 2: index.html - Remove chat script tags
# ============================================================
print("[2/4] Removing chat script tags from index.html...")
old_script1 = '<script src="js/realtime-chat-v3.js?v=7.3"></script>\n'
old_script2 = '<script src="js/chatroom-v1.js?v=8.2"></script>\n'
for old_s, name in [(old_script1, 'realtime-chat-v3.js'), (old_script2, 'chatroom-v1.js')]:
    if old_s in html:
        html = html.replace(old_s, '')
        print(f'  [OK] {name} script tag removed')
    else:
        print(f'  [WARN] {name} script tag NOT found')

# ============================================================
# STEP 3: index.html - Remove inline chat CSS block
# ============================================================
print("[3/4] Removing inline chat CSS block from index.html...")
# The chat CSS starts with "/* ========== 聊天室样式 ========== */"
# and ends right before the closing </style> tag
# Pattern: match from the comment through all chat CSS until just before </style>
start_marker = '        /* ========== 聊天室样式 ========== */'
end_marker = '    </style>'

start_pos = html.find(start_marker)
end_pos = html.find(end_marker, start_pos)

if start_pos > 0 and end_pos > start_pos:
    # Include the blank line(s) before end_marker
    before = html[:start_pos]
    # Find the newline right before </style> to remove trailing blank lines too
    after_start = html.rfind('\n', start_pos, end_pos)
    if after_start > start_pos:
        # Remove everything from the comment up to (but not including) </style>
        # Keep </style> tag itself
        html = before + '\n' + html[end_pos:]
        print(f'  [OK] Inline chat CSS removed ({end_pos - start_pos} chars)')
    else:
        print('  [WARN] Could not determine CSS block boundary')
else:
    print(f'  [WARN] Inline chat CSS markers not found: start={start_pos}, end={end_pos}')

# Bump version
html = html.replace('css/style.css?v=8.1', 'css/style.css?v=8.3')
html = html.replace('css/style.css?v=8.2', 'css/style.css?v=8.3')
print('  [OK] CSS version bumped to v=8.3')

with open(os.path.join(BASE, 'index.html'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(html)
print('  [OK] index.html saved')

# ============================================================
# STEP 4: style.css - Remove all chat-related CSS
# ============================================================
print("[4/4] Removing chat CSS from style.css...")
with open(os.path.join(BASE, 'css', 'style.css'), 'r', encoding='utf-8') as f:
    css = f.read()

original_len = len(css)

# Identify and remove CSS rule blocks containing "chatroom" or ".btn-chat"
# A CSS rule block is from selector to the closing }
# Strategy: find all lines containing chat-related selectors, then extract the full rule block

lines = css.split('\n')
lines_to_remove = set()
in_chat_block = False
brace_depth = 0
chat_block_start = -1
i = 0

while i < len(lines):
    line = lines[i].strip()
    is_chat_line = ('chatroom' in line.lower() or '.btn-chat' in line.lower() or 
                    'fadeinscale' in line.lower() or 'nav-badge' in line.lower() or
                    '#chatroom-' in line.lower() or 'chatroom-' in line.lower())
    
    if is_chat_line and not line.startswith('@media'):
        # Check if this is the start of a selector
        if '{' in line:
            if not line.startswith('@'):
                chat_block_start = i
                in_chat_block = True
                # Count braces
                open_count = line.count('{')
                close_count = line.count('}')
                brace_depth = open_count - close_count
                if brace_depth == 0:
                    # Single-line rule
                    lines_to_remove.add(i)
                    in_chat_block = False
                i += 1
                continue
        elif in_chat_block and chat_block_start >= 0:
            # Already inside a chat block
            pass
    
    if in_chat_block:
        lines_to_remove.add(i)
        open_count = line.count('{')
        close_count = line.count('}')
        brace_depth += open_count - close_count
        if brace_depth <= 0:
            # Block ended
            in_chat_block = False
    elif is_chat_line and line.startswith('@keyframes'):
        # @keyframes fadeInScale - used only by chat
        chat_block_start = i
        in_chat_block = True
        if '{' in line:
            open_count = line.count('{')
            close_count = line.count('}')
            brace_depth = open_count - close_count
            if brace_depth <= 0:
                lines_to_remove.add(i)
                in_chat_block = False
        i += 1
        continue
    elif line.startswith('.chatroom-') or line.startswith('#chatroom-') or line.startswith('.reaction-') or line.startswith('.btn-chat') or line.startswith('.nav-badge') or line.startswith('@keyframes fadeInScale') or line.startswith('.chatroom-') or line.startswith('.typing-'):
        # Simple selector lines without braces on same line
        chat_block_start = i
        in_chat_block = True
        if '{' in line:
            open_count = line.count('{')
            close_count = line.count('}')
            brace_depth = open_count - close_count
            if brace_depth <= 0:
                lines_to_remove.add(i)
                in_chat_block = False
        elif i + 1 < len(lines) and '{' in lines[i+1]:
            lines_to_remove.add(i)
            i += 1
            continue
        i += 1
        continue

    i += 1

# Rebuild CSS without removed lines
new_lines = [lines[i] for i in range(len(lines)) if i not in lines_to_remove]
new_css = '\n'.join(new_lines)

removed = original_len - len(new_css)
print(f'  [OK] Removed {removed} chars ({len(lines_to_remove)} lines) of chat CSS')

# Clean up multiple consecutive blank lines
while '\n\n\n' in new_css:
    new_css = new_css.replace('\n\n\n', '\n\n')

with open(os.path.join(BASE, 'css', 'style.css'), 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_css)
print('  [OK] style.css saved')

# ============================================================
# STEP 5: Delete chat JS files
# ============================================================
print("[5/5] Deleting chat JS files...")
chat_files = [
    'js/realtime-chat-v1.js',
    'js/realtime-chat-v2.js',
    'js/realtime-chat-v3.js',
    'js/chatroom-v1.js',
    'js/chatroom-v2.js',
    'js/chatroom-effects-v8.3.js',
    'js/e2ee-integration-v8.4.js',
]
for f_rel in chat_files:
    f_path = os.path.join(BASE, f_rel)
    if os.path.exists(f_path):
        os.remove(f_path)
        print(f'  [OK] Deleted {f_rel}')
    else:
        print(f'  [INFO] {f_rel} not found (already deleted?)')

print('\n=== ALL CHATROOM CODE REMOVED ===')
