lines = open('src/components/PowerSimFoundationLab.tsx', encoding='utf-8').readlines()
for i, l in enumerate(lines):
    if i > 3920 and ("activeTopic === 'controlled'" in l or 'controlledSubView' in l):
        print(f"{i+1}: {l.strip()}")
