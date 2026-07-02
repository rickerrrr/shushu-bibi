"""
Safely remove all chatroom CSS from a clean style.css.
Uses brace-counting to find complete CSS rule blocks.
"""
import os, re

BASE = r'C:\Users\A2813\WorkBuddy\2026-06-23-14-34-26'
CSS_FILE = os.path.join(BASE, 'css', 'style.css')

with open(CSS_FILE, 'r', encoding='utf-8') as f:
    lines = f.readlines()

# First restore from clean git version
import subprocess
result = subprocess.run(
    ['git', 'show', 'HEAD~1:css/style.css'],
    cwd=BASE,
    capture_output=True
)
if result.returncode != 0:
    print(f"ERROR: git show failed: {result.stderr.decode()}")
    exit(1)

clean_bytes = result.stdout
clean_css = clean_bytes.decode('utf-8')
clean_lines = clean_css.split('\n')
print(f"Loaded clean CSS: {len(clean_lines)} lines")

# Find chat-related rule blocks and mark their line ranges for removal
remove_ranges = []
i = 0
while i < len(clean_lines):
    line = clean_lines[i]
    stripped = line.strip()
    
    # Check if this selector line starts a chat-related block
    is_chat = (
        stripped.startswith('.chatroom-') or stripped.startswith('#chatroom-') or
        stripped.startswith('.btn-chat') or stripped.startswith('.reaction-picker') or
        stripped.startswith('.nav-badge') or stripped.startswith('.typing-') or
        stripped.startswith('.chatroom-') or stripped.startswith('@keyframes fadeInScale')
    )
    
    # Also check for selectors starting with chatroom at any point
    if not is_chat:
        is_chat = bool(re.match(r'^\.chatroom-|^#chatroom-|^\.btn-chat[^-]|^\.reaction-picker|^\.nav-badge|^\.typing-', stripped))
    
    # Also check comments that indicate chat sections
    if not is_chat and ('聊天室' in stripped and stripped.startswith('/*')):
        is_chat = True
    
    if is_chat and '{' in line:
        # This is a selector that starts a block - find the matching closing brace
        start_line = i
        brace_count = 0
        
        # Count braces in the selector line itself
        brace_count += line.count('{') - line.count('}')
        
        j = i + 1
        while j < len(clean_lines) and brace_count > 0:
            brace_count += clean_lines[j].count('{') - clean_lines[j].count('}')
            j += 1
        
        if brace_count == 0:
            remove_ranges.append((start_line, j))
            i = j
            continue
        else:
            print(f"  WARN: Unmatched braces at line {start_line}: '{stripped[:60]}...'")
    
    i += 1

print(f"Found {len(remove_ranges)} chat CSS blocks to remove:")
for start, end in remove_ranges:
    print(f"  Lines {start+1}-{end}: {clean_lines[start].strip()[:60]}...")

# Build new CSS with removed blocks
keep_lines = []
remove_set = set()
for start, end in remove_ranges:
    for k in range(start, end):
        remove_set.add(k)

total_removed = len(remove_set)
new_lines = [clean_lines[k] for k in range(len(clean_lines)) if k not in remove_set]

# Clean up: remove blank lines before closing } of adjacent non-chat blocks
# and remove triple+ blank lines
new_css = '\n'.join(new_lines)
while '\n\n\n' in new_css:
    new_css = new_css.replace('\n\n\n', '\n\n')

with open(CSS_FILE, 'w', encoding='utf-8', newline='\n') as f:
    f.write(new_css)

print(f"\nRemoved {total_removed} lines of chat CSS")
print(f"New file: {len(new_css.split(chr(10)))} lines")
print("Done!")
