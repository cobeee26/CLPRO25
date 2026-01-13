
import os
import re

file_path = r"c:\Users\admin\Classtrack\Classtrack\frontend\src\contexts\UserContext.tsx"

def resolve_file(path):
    with open(path, 'r', encoding='utf-8') as f:
        lines = f.readlines()

    new_lines = []
    in_conflict = False
    in_incoming = False
    
    conflict_count = 0

    for line in lines:
        if line.strip().startswith('<<<<<<< HEAD'):
            in_conflict = True
            in_incoming = False
            conflict_count += 1
            continue
        
        if line.strip().startswith('======='):
            if in_conflict:
                in_incoming = True
                continue
        
        if line.strip().startswith('>>>>>>>'):
            if in_conflict:
                in_conflict = False
                in_incoming = False
                continue

        if in_conflict:
            if in_incoming:
                new_lines.append(line)
            else:
                # Discard HEAD changes
                pass
        else:
            new_lines.append(line)

    with open(path, 'w', encoding='utf-8') as f:
        f.writelines(new_lines)
    
    print(f"Resolved {conflict_count} conflicts in {path}")

resolve_file(file_path)
