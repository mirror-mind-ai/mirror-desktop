# CV-013.DS-007 step 7: rewrite the app's and the framework's .mirror-journey.json for their new
# folders. Each file's own path decides its folder; key order is kept.
import json, os, sys

def rewrite(path, changes):
    with open(path) as f:
        data = json.load(f)
    folder = os.path.dirname(os.path.abspath(path))
    data.update(changes(folder))
    data["journey_home"] = folder
    data["target_project_path"] = folder
    tmp = path + ".tmp"
    with open(tmp, "w") as f:
        json.dump(data, f, indent=2, ensure_ascii=False)
        f.write("\n")
    os.replace(tmp, path)
    print("  ok:", path, "->", data["journey"], "/", data["name"])

app, framework = sys.argv[1], sys.argv[2]
assert json.load(open(app))["journey"] == "mirror-desktop", app
assert json.load(open(framework))["journey"] == "nautilus", framework
family = ["vida-tecnica", "ia-agentica", "mirror-mind", "nautilus"]
rewrite(app, lambda folder: {
    "name": "Nautilus App",
    "parent_journey": "nautilus",
    "hierarchy": family + ["mirror-desktop"],
})
rewrite(framework, lambda folder: {
    "journey": "nautilus-agentic-method",
    "name": "Nautilus Agentic Framework",
    "parent_journey": "nautilus",
    "hierarchy": family + ["nautilus-agentic-method"],
})
