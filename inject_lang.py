import re

files = [
    r"C:\Users\yakup\OneDrive\Masaüstü\Kafe\admin.html",
    r"C:\Users\yakup\OneDrive\Masaüstü\Kafe\barista.html",
    r"C:\Users\yakup\OneDrive\Masaüstü\Kafe\index.html"
]

for file in files:
    with open(file, "r", encoding="utf-8") as f:
        content = f.read()
    
    if '<script src="lang.js"></script>' not in content:
        # insert it right before the last script tag or before </body>
        content = content.replace("</body>", '<script src="lang.js"></script>\n</body>')
        with open(file, "w", encoding="utf-8") as f:
            f.write(content)
        print(f"Injected into {file}")
