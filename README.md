# E-Paper WYSIWYG Layout Editor

A **Home Assistant Add-on** that provides a **WYSIWYG editor** for designing layouts for **e‑paper displays**, primarily for use with **OpenEPaperLink**.

The goal of this project is to make e‑paper layouts **visual, fast, and safe** to design – without manually calculating coordinates or writing large YAML blocks by hand.

---

## ✨ What this add-on does

- Visual (WYSIWYG) editor for e‑paper layouts
- Exact canvas size matching tag/display resolution
- Add text, icons, shapes and lines visually
- Bind elements to **real Home Assistant entities**
- Live preview using actual sensor values
- Save and reopen layout projects
- Generate clean YAML code for use in Home Assistant

---

## ⚠️ What this add-on does NOT do

This add-on is intentionally a **design and code‑generation tool only**.

- It does **not** automatically modify automations
- It does **not** write to `/config`
- It does **not** push images or layouts to tags directly
- It does **not** replace OpenEPaperLink logic

You stay fully in control of:
- when and how updates are triggered
- where generated code is placed
- how OpenEPaperLink services are called

---

## 🧠 Design philosophy

This project follows core Home Assistant principles:

- Transparency – you always see the generated code
- Explicit configuration – no hidden runtime behaviour
- Version‑friendly – generated YAML can live in Git or packages
- Safe by default – read‑only towards Home Assistant configuration

Think of it as:

> **“An ESPHome‑style visual editor, but for OpenEPaperLink layouts.”**

---

## 🗂 Layout storage

- Layouts are saved as JSON project files
- Stored internally inside the add-on (`/data`)
- Used only for editing, previewing and reloading layouts

Saved layouts are **not active** until you manually use the generated code inside Home Assistant.

---

## 🔄 Typical workflow

1. Open **E-Paper WYSIWYG Layout Editor** from the Home Assistant sidebar
2. Select tag/display resolution
3. Design the layout visually
4. Bind layout elements to Home Assistant sensors
5. Preview the result with live data
6. Copy the generated YAML
7. Paste it into:
   - an automation
   - a script
   - a template sensor
8. Let OpenEPaperLink handle the actual display update

---

## 📦 Installation

This add-on is currently installed via a **custom add-on repository**.

### Add repository

1. Home Assistant → **Settings**
2. **Add-ons**
3. **Add-on Store**
4. Menu (⋮) → **Repositories**
5. Add the following URL:
