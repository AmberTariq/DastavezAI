# Threat Model: Dastavez AI

**Document Version:** 1.0  
**Scope:** Dastavez AI (Bilingual Document Localizer, Voice Transcriber, and PDF Export Engine)  
**Target Audience:** Security Reviewers, Engineering Leads, and Evaluators  

---

## 1. System Overview & Architecture
Dastavez AI is a client-side single-page application (SPA) built using HTML5, CSS3, and ES6+ JavaScript. It interfaces directly with the **Google Gemini API** via client-side requests using user-provided API credentials, processes live speech via the **Web Speech API**, and generates publication-grade documents with local print rendering.

* **Data Flow:** User Input (Keyboard / Microphone / Docket Selection) $\rightarrow$ Client-Side Validation $\rightarrow$ Gemini API Call $\rightarrow$ Local State Rendering $\rightarrow$ DOM Mutation & Print Engine (`window.print()`).
* **Trust Boundaries:** 
  1. *Client Browser Environment* vs. *External APIs* (Google Gemini API).
  2. *User Input* vs. *DOM Rendering Engine* (XSS vulnerability surface).

---

## 2. Asset Identification
* **API Keys & Credentials:** User-managed Gemini API keys stored in client session/local storage.
* **Sensitive Document Content:** Unredacted business notes, draft legal contracts, financial invoices, and voice dictation transcripts processed in-memory.
* **Application Integrity:** The single-file static HTML/JS structure executed within the browser.

---

## 3. STRIDE Threat Analysis

| Threat Category | Potential Vulnerability / Attack Vector | Risk Level | Mitigation Strategy |
| :--- | :--- | :--- | :--- |
| **Spoofing** | Interception or unauthorized impersonation of API requests to Gemini. | **Medium** | Enforce HTTPS-only transport and require explicit client-side API token authorization headers for all remote LLM calls. |
| **Tampering** | Modification of local storage state or manipulation of prompt payload structures in transit. | **Low** | Implement rigorous client-side input sanitization and schema validation before dispatching payloads to the Gemini API. |
| **Repudiation** | Lack of audit logging for localized document generation and legal contract drafting. | **Low** | Since Dastavez AI operates client-side without a persistent backend database, accountability relies on local export logs and native browser print history. |
| **Information Disclosure** | Exposure of API keys or sensitive document drafts via browser local storage leakage or cross-site scripting (XSS). | **Medium** | Avoid persistent plain-text storage of API keys where possible; utilize volatile session storage or prompt users to supply keys securely per session. Do not log sensitive text to console. |
| **Denial of Service** | API quota exhaustion or rate-limiting caused by malicious script loops or oversized voice transcripts. | **Medium** | Implement client-side debounce timers on transcription inputs and strict character/token count length limits on document submission payloads. |
| **Elevation of Privilege** | Malicious prompt injection via crafted voice audio or imported text to bypass system instructions. | **High** | Separate system prompt boundaries from user-supplied input strings; apply strict contextual register wrapping and output sanitization before rendering markdown to the DOM. |

---

## 4. Security Recommendations & Mitigations
1. **Client-Side Token Handling:** Ensure API keys are never hardcoded into the source distribution and advise users regarding browser session hygiene when utilizing shared workstations.
2. **XSS & DOM Sanitization:** Ensure dynamic markdown rendering properly sanitizes HTML tags to prevent injected script execution within localized output panes.
3. **Secure Transport:** Host the application exclusively on secure, encrypted endpoints (TLS 1.3) to protect data in transit between the client browser and Google AI endpoints.