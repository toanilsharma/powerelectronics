lines = open('src/components/PowerSimFoundationLab.tsx', encoding='utf-8').readlines()
for i in range(3918, 4100):
    l = lines[i].strip()
    if l.startswith('<div') or l.startswith('{/*') or l.startswith('<h2') or l.startswith('<button'):
        print(f"{i+1}: {l[:90]}")
