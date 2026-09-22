"""Write plugin galleries independently of terminal image capture."""

import json
from pathlib import Path


def write_gallery(output: Path, entries: list[dict]) -> None:
    for family in sorted({Path(entry["theme"]).parts[1] for entry in entries}):
        lines = [
            f"# {family} theme previews",
            "",
            "> [!TIP]",
            "> Open a preview for a larger view. Expand **Capture details** for "
            "rendering information and palette sources.",
            "",
        ]
        variants = {
            Path(entry["theme"]).stem: entry
            for entry in entries
            if Path(entry["theme"]).parts[1] == family
        }
        for slug in sorted({name.removesuffix("-ansi") for name in variants}):
            pair = {
                "Regular": variants.get(slug),
                "ANSI": variants.get(slug + "-ansi"),
            }
            entry = next(item for item in pair.values() if item is not None)
            previews = []
            for item in pair.values():
                if item is None:
                    previews.append("Not supplied")
                else:
                    image = f"renders/{Path(item['image']).name}"
                    previews.append(f"[![{item['name']}]({image})]({image})")
            syntax = "; ".join(
                f"{label}: `{item['syntax_theme']}`"
                for label, item in pair.items()
                if item is not None
            )
            lines += [
                f"## {entry['name'].removesuffix(' (ANSI)')}",
                "",
                "| Regular | ANSI |",
                "| --- | --- |",
                f"| {' | '.join(previews)} |",
                "",
                "<details>",
                "<summary>Capture details</summary>",
                "",
                f"Combined screenshot crops from **Claude Code {entry['claude_code']}**, "
                "using **Geist Mono**.",
                "",
                "- **Pixels:** Preserved from the original screenshots.",
                "- **Swatches:** Agent colours.",
                f"- **Syntax highlighting:** {syntax}.",
                "- **Examples:** Auto mode and a shell prompt.",
                "",
                f"[Terminal palette source]({entry['source']['url']}).",
                "",
                "</details>",
                "",
            ]
        destination = output / "plugins" / family / "PREVIEWS.md"
        destination.parent.mkdir(parents=True, exist_ok=True)
        destination.write_text("\n".join(lines))
    (output / "manifest.json").write_text(
        json.dumps({"format": 1, "themes": entries}, indent=2) + "\n"
    )
