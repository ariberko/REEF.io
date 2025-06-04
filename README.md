REEF.io is a lightweight browser extension designed to enhance organizational cybersecurity by monitoring and controlling browser activities. It proactively blocks access to specified malicious websites and logs various user actions, ensuring a secure browsing environment without disrupting the user experience.

🛡️ Features
Real-Time Website Blocking: Prevents access to predefined malicious or unauthorized websites using Chrome's declarativeNetRequest API.

Activity Monitoring: Tracks user actions such as site visits, copy/paste/cut operations, and download attempts.

Session Management: Allows users to start and stop monitoring sessions via a user-friendly popup interface.

Data Logging: Collects and sends structured JSON logs to a FastAPI backend for analysis and oversight.

Extension Inventory: Logs the list of installed browser extensions upon startup or installation for additional context.

Manifest V3 Compliance: Built using Chrome's Manifest V3 architecture, utilizing service workers for background processing and content scripts for page interaction.

📁 Project Structure
bash
Copy
Edit
REEF.io/
├── backend/
│   ├── main.py               # FastAPI backend server
│   └── config.json           # Database configuration
├── extension/
│   ├── manifest.json         # Chrome extension manifest
│   ├── background.js         # Background script
│   ├── content.js            # Content script
│   ├── popup.html            # Popup UI
│   └── popup.js              # Popup script
├── assets/
│   └── icon.png              # Extension icon
├── README.md                 # Project documentation
└── LICENSE                   # Project license
