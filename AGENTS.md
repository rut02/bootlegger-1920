# Bootlegger 1920 AGENTS Rules

## 1. Scope & File Operations (ขอบเขตไฟล์ภายใน Sandbox เท่านั้น)
- All file operations (read, write, create, edit, delete) MUST be strictly contained within `C:\Users\ACER\.gemini\antigravity\scratch\sandbox`.
- Do NOT access, read, or edit files outside this sandbox directory under any circumstances.
- All file modifications must only affect internal project files within this sandbox.

## 2. Terminal Command Execution & Safety (ความปลอดภัยในการรันคำสั่ง)
- **Safe & Project-Internal Commands Only:** Only execute safe terminal commands directly related to developing, building, testing, and inspecting this game project (e.g., `npm run build`, `npm test`, local file checks).
- **Strict Working Directory:** All terminal commands and executions MUST be scoped inside `C:\Users\ACER\.gemini\antigravity\scratch\sandbox` or its project subfolders (e.g. `bootlegger-1920`).
- **NO External Downloads:** Strictly FORBIDDEN from downloading unknown, unvetted, or strange external files/binaries from outside (e.g. no `curl`, `wget`, `Invoke-WebRequest` downloading external `.exe`, `.bat`, `.ps1`, or external archives).
- **NO Global Installations:** Do NOT install global packages (`npm install -g`, etc.) that affect the host OS.
- **Node & Build Restrictions:** Node.js/npm commands are permitted ONLY for building, compiling, and testing this specific game project. Do NOT run arbitrary Node scripts or launch background services unrelated to this project.
- **Host System Isolation:** Do NOT execute commands that modify system settings, registry, user home directory, or anything outside the sandbox.

## 3. Autonomous Execution & Pre-Approved Operations (การอนุญาตคำสั่งล่วงหน้าแบบอัตโนมัติ)
- **Explicit Pre-Approval for Project Operations (อนุญาตล่วงหน้า ไม่ต้องรอถามยืนยัน):**
  - The user has explicitly pre-approved all safe, project-internal operations. The AI MUST execute these proactively and autonomously WITHOUT stopping to ask for user permission:
    1. **File Edits & Code Generation:** Reading, creating, and editing files inside `C:\Users\ACER\.gemini\antigravity\scratch\sandbox`.
    2. **Project Builds & Verification:** Running `npm run build`, `npm test`, `npm run dev`, and local inspection commands.
    3. **Local Testing & Server Checks:** Inspecting local ports, checking health endpoints, and running game dev tasks.
- **Ask Permission ONLY for High-Risk / External Actions:**
  - AI only needs to stop and confirm with the user if a command poses a genuine security risk (e.g. actions outside the sandbox, deleting core directories, or external network calls). For internal project development, act immediately.
