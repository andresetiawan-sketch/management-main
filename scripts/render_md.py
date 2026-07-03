#!/usr/bin/env python3
import os
import sys
import subprocess

try:
    import markdown
except Exception:
    subprocess.check_call([sys.executable, "-m", "pip", "install", "markdown"])
    import markdown

md_path = os.path.join(os.getcwd(), "DELIVERABLES_SUMMARY.md")
out_path = os.path.join(os.getcwd(), "DELIVERABLES_SUMMARY.html")

if not os.path.exists(md_path):
    print(f"File not found: {md_path}")
    sys.exit(1)

with open(md_path, "r", encoding="utf-8") as f:
    text = f.read()

html_body = markdown.markdown(text, extensions=["fenced_code", "tables", "toc"])

template = f"""<!doctype html>
<html>
<head>
<meta charset="utf-8">
<title>DELIVERABLES_SUMMARY</title>
<link rel="stylesheet" href="https://cdnjs.cloudflare.com/ajax/libs/github-markdown-css/5.2.0/github-markdown.min.css">
<style>body{{box-sizing:border-box; padding:40px;}} .markdown-body{{max-width: 980px;margin:0 auto;}}</style>
</head>
<body>
<article class="markdown-body">
{html_body}
</article>
</body>
</html>"""

with open(out_path, "w", encoding="utf-8") as f:
    f.write(template)

print("Wrote", out_path)
