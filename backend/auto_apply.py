from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import List, Dict, Any, Optional
import httpx
import json
import re
import os
import asyncio
from bs4 import BeautifulSoup
from logger import logger
from playwright.async_api import async_playwright
from local_llm import chat_completion

router = APIRouter()

def _get_browser_executable() -> Optional[str]:
    """Find installed Chrome or Edge executable on Windows."""
    candidates = [
        r"C:\Program Files\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Google\Chrome\Application\chrome.exe",
        r"C:\Program Files (x86)\Microsoft\Edge\Application\msedge.exe",
        r"C:\Program Files\Microsoft\Edge\Application\msedge.exe",
    ]
    for c in candidates:
        if os.path.exists(c):
            return c
    return None

class AnalyzeRequest(BaseModel):
    url: str
    user_details: Dict[str, Any]

class SubmitRequest(BaseModel):
    url: str
    mapping: Dict[str, Optional[str]] # Maps Form Field Name -> User Detail Key
    user_details: Dict[str, Any]
    form_fields: List[Dict[str, Any]] # Raw form fields extracted

class LaunchPortalRequest(BaseModel):
    url: str
    scheme_name: Optional[str] = "Welfare Scheme"
    user_details: Dict[str, Any] = {}

def extract_form_schema(url: str) -> List[Dict[str, Any]]:
    import requests
    try:
        r = requests.get(url, timeout=12, headers={"User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64)"})
        soup = BeautifulSoup(r.text, "html.parser")
        script_text = ""
        for script in soup.find_all("script"):
            if "FB_PUBLIC_LOAD_DATA_" in script.text:
                script_text = script.text
                break

        if script_text:
            match = re.search(r"var FB_PUBLIC_LOAD_DATA_ = (\[.*?\]);", script_text, re.DOTALL)
            if match:
                data = json.loads(match.group(1))
                raw_fields = data[1][1]
                extracted = []
                for field in raw_fields:
                    field_name = field[1]
                    field_type = field[3] # 0: text, 1: paragraph, 2: radio, 3: dropdown, 4: checkboxes, 9: date
                    options = []
                    entry_id = None
                    if len(field) > 4 and field[4]:
                        entry_id = field[4][0][0]
                        if len(field[4][0]) > 1 and field[4][0][1]:
                            options = [opt[0] for opt in field[4][0][1]]
                    extracted.append({
                        "name": field_name,
                        "type": field_type,
                        "entry_id": f"entry.{entry_id}" if entry_id else None,
                        "options": options
                    })
                return extracted

        # If not a Google Form (e.g. government portal website), extract standard HTML inputs
        inputs = soup.find_all(["input", "select", "textarea"])
        extracted = []
        for inp in inputs:
            itype = inp.get("type", "text").lower()
            if itype in ["hidden", "submit", "button", "reset", "image"]:
                continue
            name = inp.get("name") or inp.get("id") or inp.get("placeholder") or inp.get("aria-label")
            if not name:
                continue
            options = []
            if inp.name == "select":
                options = [opt.get_text(strip=True) for opt in inp.find_all("option") if opt.get_text(strip=True)]
            extracted.append({
                "name": name,
                "type": 3 if inp.name == "select" else 0,
                "entry_id": name,
                "options": options
            })

        if extracted:
            return extracted

        # Standard welfare application form fields as fallback
        return [
            {"name": "Full Name / விண்ணப்பதாரர் பெயர்", "type": 0, "entry_id": "name", "options": []},
            {"name": "Date of Birth / பிறந்த தேதி", "type": 0, "entry_id": "dob", "options": []},
            {"name": "Gender / பாலினம்", "type": 0, "entry_id": "gender", "options": ["Male", "Female", "Other"]},
            {"name": "Aadhaar Number / ஆதார் எண்", "type": 0, "entry_id": "aadhaar", "options": []},
            {"name": "Community / சமூகப் பிரிவு", "type": 0, "entry_id": "community", "options": ["OC", "BC", "BCM", "MBC", "SC", "SCA", "ST"]},
            {"name": "Family Annual Income / ஆண்டு வருமானம்", "type": 0, "entry_id": "income", "options": []},
            {"name": "Institution / School Name", "type": 0, "entry_id": "school", "options": []},
            {"name": "EMIS Number / Registration No", "type": 0, "entry_id": "emis", "options": []},
            {"name": "Bank Account Number / வங்கி கணக்கு எண்", "type": 0, "entry_id": "account", "options": []},
            {"name": "Bank IFSC Code", "type": 0, "entry_id": "ifsc", "options": []},
            {"name": "Mobile Number / தொலைபேசி எண்", "type": 0, "entry_id": "mobile", "options": []},
        ]
    except Exception as e:
        logger.error(f"[auto_apply] Form extraction error: {e}")
        return [
            {"name": "Full Name / விண்ணப்பதாரர் பெயர்", "type": 0, "entry_id": "name", "options": []},
            {"name": "Date of Birth / பிறந்த தேதி", "type": 0, "entry_id": "dob", "options": []},
            {"name": "Aadhaar Number / ஆதார் எண்", "type": 0, "entry_id": "aadhaar", "options": []},
            {"name": "Community / சமூகப் பிரிவு", "type": 0, "entry_id": "community", "options": []},
            {"name": "Family Annual Income / ஆண்டு வருமானம்", "type": 0, "entry_id": "income", "options": []},
            {"name": "Mobile Number / தொலைபேசி எண்", "type": 0, "entry_id": "mobile", "options": []},
        ]

async def map_fields_with_ai(form_fields: List[Dict[str, Any]], user_keys: List[str]) -> Dict[str, str]:
    field_names = [f["name"] for f in form_fields]
    prompt = f"""You are an API that maps form questions to a standard user profile schema.
Form Questions: {json.dumps(field_names)}
Available User Profile Keys: {json.dumps(user_keys)}

Map each form question to the closest matching user profile key. 
If a form question has no clear matching user profile key, map it to null.

Return ONLY a valid JSON object mapping the exact Form Question string to the User Profile Key string (or null). No explanations.
"""
    try:
        messages = [{"role": "user", "content": prompt}]
        ai_text, _ = await chat_completion(messages, temperature=0.1, max_tokens=512)
        ai_text = ai_text.strip()
        
        if ai_text.startswith("```"):
            ai_text = re.sub(r"^```(?:json)?", "", ai_text)
            ai_text = re.sub(r"```$", "", ai_text).strip()
        
        mapping = json.loads(ai_text)
        return mapping
    except Exception as e:
        logger.error(f"[auto_apply] AI Mapping error: {e}")
        mapping = {}
        for fname in field_names:
            fn = fname.lower().replace(" ", "").replace("_", "")
            mapped = None
            for key in user_keys:
                k_lower = key.lower().replace(" ", "").replace("_", "")
                if k_lower in fn or fn in k_lower:
                    mapped = key
                    break
            mapping[fname] = mapped
        return mapping

@router.post("/api/auto-apply/analyze")
async def analyze_form(req: AnalyzeRequest):
    try:
        form_fields = extract_form_schema(req.url)
        standard_keys = [
            "fullName", "dateOfBirth", "gender", "community", "aadhaarNumber", 
            "mobileNumber", "emailAddress", "currentStandard", "schoolName", 
            "schoolType", "mediumOfInstruction", "annualIncome"
        ]
        
        mapping = await map_fields_with_ai(form_fields, standard_keys)
        
        missing_keys = []
        for form_question, mapped_key in mapping.items():
            if mapped_key:
                if not req.user_details.get(mapped_key):
                    if mapped_key not in missing_keys:
                        missing_keys.append(mapped_key)
            else:
                pass
        
        for field in form_fields:
            fname = field["name"]
            if not mapping.get(fname):
                missing_keys.append(fname)
                mapping[fname] = fname

        return {
            "form_fields": form_fields,
            "mapping": mapping,
            "missing_keys": missing_keys
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

async def map_value_with_ai(user_val: str, form_options: List[str], question_text: str) -> str:
    """Use the local AI model to map a user profile value to the closest matching option when there is a mismatch."""
    if not form_options:
        return user_val
        
    prompt = f"""You are a form-filling assistant. A form question is: "{question_text}"
The available multiple-choice options are: {json.dumps(form_options)}
The user's profile value is: "{user_val}"

Determine which of the available options best matches the user's profile value.
Return ONLY the exact option string chosen from the available options. Do NOT add explanation or markdown."""
    try:
        messages = [{"role": "user", "content": prompt}]
        ai_choice, _ = await chat_completion(messages, temperature=0.1, max_tokens=100)
        ai_choice = ai_choice.strip()
        
        if ai_choice.startswith("```"):
            ai_choice = re.sub(r"^```(?:json|text)?", "", ai_choice)
            ai_choice = re.sub(r"```$", "", ai_choice).strip()
            
        if ai_choice in form_options:
            return ai_choice
            
        for opt in form_options:
            if opt.lower() == ai_choice.lower():
                return opt
                
        import difflib
        matches = difflib.get_close_matches(ai_choice, form_options, n=1, cutoff=0.4)
        if matches:
            return matches[0]
    except Exception as e:
        logger.error(f"[auto_apply] AI value mapping failed: {e}")
        
    return user_val

@router.post("/api/auto-apply/submit")
async def submit_form(req: SubmitRequest):
    try:
        browser_exe = _get_browser_executable()
        launch_kwargs = {}
        if browser_exe:
            launch_kwargs["executable_path"] = browser_exe

        async with async_playwright() as p:
            browser = await p.chromium.launch(
                headless=True,
                args=[
                    "--no-sandbox",
                    "--disable-setuid-sandbox",
                    "--disable-dev-shm-usage",
                    "--disable-gpu",
                    "--disable-extensions",
                    "--single-process",
                    "--no-zygote",
                    "--disable-software-rasterizer",
                    "--js-flags=--max-old-space-size=128",
                    "--disable-background-networking"
                ],
                **launch_kwargs
            )
            context = await browser.new_context(viewport={"width": 1280, "height": 800})
            page = await context.new_page()
            
            async def intercept_route(route):
                req_url = route.request.url.lower()
                resource_type = route.request.resource_type
                if resource_type in ["image", "media", "font"] or "analytics" in req_url or "google-analytics" in req_url or "googletagmanager" in req_url:
                    await route.abort()
                else:
                    await route.continue_()
            await page.route("**/*", intercept_route)
            
            await page.goto(req.url, wait_until="commit", timeout=20000)
            await page.wait_for_selector('div[role="listitem"]', timeout=10000)
            
            async def get_best_option(user_val: str, form_options: list, question_text: str) -> str:
                if not form_options:
                    return user_val
                if user_val in form_options:
                    return user_val
                for opt in form_options:
                    if opt.lower() == user_val.lower():
                        return opt
                for opt in form_options:
                    if user_val.lower() in opt.lower() or opt.lower() in user_val.lower():
                        return opt
                import difflib
                matches = difflib.get_close_matches(user_val, form_options, n=1, cutoff=0.5)
                if matches:
                    return matches[0]
                return await map_value_with_ai(user_val, form_options, question_text)
            
            for field in req.form_fields:
                fname = field["name"]
                user_key = req.mapping.get(fname)
                if not user_key:
                    continue
                
                value = req.user_details.get(user_key)
                if value is None:
                    continue
                value = str(value)
                
                question_block = page.locator(f'div[role="listitem"]:has-text("{fname}")').first
                if await question_block.count() == 0:
                    continue
                    
                if field["type"] in [0, 1]: # Short text or Paragraph
                    input_el = question_block.locator('input[type="text"], input[type="date"], textarea').first
                    if await input_el.count() > 0:
                        await input_el.fill(value)
                elif field["type"] == 2: # Radio Buttons
                    best_value = await get_best_option(value, field.get("options", []), fname)
                    radio = question_block.locator(f'div[role="radio"][data-value="{best_value}"]')
                    if await radio.count() > 0:
                        await radio.click()
                    else:
                        radio_text = question_block.locator('div[role="radio"]').filter(has_text=best_value)
                        if await radio_text.count() > 0:
                            await radio_text.click()
                elif field["type"] == 3: # Dropdown
                    best_value = await get_best_option(value, field.get("options", []), fname)
                    dropdown = question_block.locator('div[role="listbox"]').first
                    if await dropdown.count() > 0:
                        await dropdown.click()
                        await page.wait_for_timeout(400)
                        option_el = page.locator(f'div[role="option"][data-value="{best_value}"]')
                        if await option_el.count() > 0:
                            await option_el.click()
                        else:
                            option_text = page.locator('div[role="option"]:visible').filter(has_text=best_value)
                            if await option_text.count() > 0:
                                await option_text.first.click()
                elif field["type"] == 4: # Checkboxes
                    best_value = await get_best_option(value, field.get("options", []), fname)
                    checkbox = question_block.locator(f'div[role="checkbox"][data-value="{best_value}"]')
                    if await checkbox.count() > 0:
                        await checkbox.click()
                    else:
                        chk_text = question_block.locator('div[role="checkbox"]').filter(has_text=best_value)
                        if await chk_text.count() > 0:
                            await chk_text.click()
 
            # Submit the form
            submit_btn = None
            all_buttons = page.locator('div[role="button"]')
            btn_count = await all_buttons.count()
            for i in range(btn_count):
                btn = all_buttons.nth(i)
                btn_text = await btn.inner_text()
                btn_text_clean = btn_text.upper().strip()
                if any(w in btn_text_clean for w in ("SUBMIT", "சமர்ப்பி", "சமர்பி", "SEND", "NEXT", "CONTINUE")):
                    submit_btn = btn
                    if "SUBMIT" in btn_text_clean or "சமர்ப்பி" in btn_text_clean or "சமர்பி" in btn_text_clean:
                        break
            
            if not submit_btn and btn_count > 0:
                submit_btn = all_buttons.last
                
            if submit_btn:
                logger.info(f"[auto_apply] Clicking submit button: '{await submit_btn.inner_text()}'")
                await submit_btn.click()
                try:
                    await page.wait_for_selector('text="Your response has been recorded."', timeout=8000)
                except Exception:
                    pass
            
            await browser.close()
            return {"status": "success", "message": "Form submitted successfully"}
    except Exception as e:
        logger.error(f"[auto_apply] Submit error: {e}")
        raise HTTPException(status_code=500, detail=str(e))

def _generate_autofill_injection_script(user_details: dict, scheme_name: str) -> str:
    data_json = json.dumps(user_details)
    scheme_str = json.dumps(scheme_name)
    return f"""
    (() => {{
        if (window.__welfareintel_injected) return;
        window.__welfareintel_injected = true;

        const data = {data_json};
        const schemeName = {scheme_str};

        const bar = document.createElement('div');
        bar.id = 'welfareintel-assistant-bar';
        bar.style.cssText = `
            position: fixed;
            bottom: 24px;
            right: 24px;
            z-index: 2147483647;
            background: rgba(15, 23, 42, 0.95);
            backdrop-filter: blur(16px);
            color: #f8fafc;
            border: 2px solid #3b82f6;
            border-radius: 20px;
            padding: 16px 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.5), 0 0 25px rgba(59, 130, 246, 0.4);
            font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
            max-width: 420px;
            width: 380px;
            animation: wiFadeIn 0.3s ease-out;
        `;

        const style = document.createElement('style');
        style.textContent = `
            @keyframes wiFadeIn {{ from {{ opacity: 0; transform: translateY(12px); }} to {{ opacity: 1; transform: translateY(0); }} }}
            .wi-btn {{ background: linear-gradient(135deg, #2563eb, #7c3aed); color: white; border: none; padding: 10px 16px; border-radius: 12px; font-weight: 600; font-size: 13px; cursor: pointer; transition: transform 0.15s, box-shadow 0.15s; }}
            .wi-btn:hover {{ transform: scale(1.02); box-shadow: 0 4px 15px rgba(59, 130, 246, 0.5); }}
            .wi-btn-sec {{ background: rgba(255, 255, 255, 0.1); color: #e2e8f0; border: 1px solid rgba(255, 255, 255, 0.2); padding: 8px 12px; border-radius: 10px; font-size: 11px; cursor: pointer; }}
            .wi-btn-sec:hover {{ background: rgba(255, 255, 255, 0.2); }}
            .wi-field-row {{ display: flex; justify-content: space-between; align-items: center; padding: 6px 0; border-bottom: 1px solid rgba(255,255,255,0.08); font-size: 11px; }}
            .wi-highlight-filled {{ border: 2px solid #10b981 !important; background-color: rgba(16, 185, 129, 0.15) !important; transition: all 0.3s; }}
        `;
        document.head.appendChild(style);

        bar.innerHTML = `
            <div style="display:flex; justify-content:space-between; align-items:flex-start; margin-bottom: 10px;">
                <div>
                    <div style="display:flex; align-items:center; gap:6px;">
                        <span style="font-size:16px;">🤖</span>
                        <strong style="font-size:13px; color:#60a5fa; text-transform:uppercase; letter-spacing:0.5px;">WelfareIntel Auto-Fill</strong>
                    </div>
                    <div style="font-size:11px; color:#94a3b8; margin-top:2px;">Target: <b>${{schemeName}}</b></div>
                </div>
                <button id="wi-close-btn" style="background:transparent; border:none; color:#94a3b8; font-size:16px; cursor:pointer;">✕</button>
            </div>
            
            <div style="background:rgba(255,255,255,0.06); border-radius:12px; padding:10px 12px; margin-bottom:12px; border:1px solid rgba(255,255,255,0.1);">
                <div style="font-size:12px; font-weight:600; color:#f1f5f9;">👤 ${{data.fullName || 'Citizen Applicant'}}</div>
                <div style="font-size:11px; color:#cbd5e1; margin-top:2px;">
                    ${{data.aadhaarNumber ? 'Aadhaar: ' + data.aadhaarNumber + ' · ' : ''}}
                    ${{data.annualIncome ? 'Income: ₹' + data.annualIncome : ''}}
                </div>
            </div>

            <div style="display:flex; gap:8px; margin-bottom:10px;">
                <button id="wi-fill-all-btn" class="wi-btn" style="flex:1;">⚡ Auto-Fill All Form Fields</button>
                <button id="wi-toggle-fields-btn" class="wi-btn-sec">📋 View Data</button>
            </div>

            <div id="wi-fields-drawer" style="display:none; max-height:180px; overflow-y:auto; margin-top:8px; background:rgba(0,0,0,0.35); border-radius:10px; padding:8px 10px;">
            </div>
            <div id="wi-status-msg" style="font-size:11px; color:#10b981; text-align:center; min-height:16px; margin-top:4px;"></div>
        `;

        document.body.appendChild(bar);

        const drawer = bar.querySelector('#wi-fields-drawer');
        const statusMsg = bar.querySelector('#wi-status-msg');
        const entries = Object.entries(data).filter(([k, v]) => v && typeof v === 'string');
        entries.forEach(([key, val]) => {{
            const row = document.createElement('div');
            row.className = 'wi-field-row';
            row.innerHTML = `
                <span style="color:#94a3b8;">${{key}}:</span>
                <span style="font-weight:600; color:#f8fafc; max-width:170px; overflow:hidden; text-overflow:ellipsis; white-space:nowrap;">${{val}}</span>
                <button class="wi-copy-btn" data-val="${{val}}" style="background:rgba(255,255,255,0.12); border:none; color:#38bdf8; border-radius:6px; padding:2px 6px; font-size:10px; cursor:pointer;">Copy</button>
            `;
            drawer.appendChild(row);
        }});

        drawer.querySelectorAll('.wi-copy-btn').forEach(btn => {{
            btn.onclick = () => {{
                navigator.clipboard.writeText(btn.dataset.val);
                btn.textContent = 'Copied!';
                setTimeout(() => btn.textContent = 'Copy', 1500);
            }};
        }});

        bar.querySelector('#wi-close-btn').onclick = () => bar.remove();
        bar.querySelector('#wi-toggle-fields-btn').onclick = () => {{
            drawer.style.display = drawer.style.display === 'none' ? 'block' : 'none';
        }};

        const autoFillForm = () => {{
            let filledCount = 0;
            const inputs = Array.from(document.querySelectorAll('input, select, textarea'));
            
            const fieldMap = [
                {{ keys: ['fullname', 'name', 'applicant', 'student', 'candidate'], val: data.fullName }},
                {{ keys: ['aadhaar', 'aadhar', 'uid'], val: data.aadhaarNumber }},
                {{ keys: ['dob', 'dateofbirth', 'birthdate'], val: data.dateOfBirth }},
                {{ keys: ['mobile', 'phone', 'contact'], val: data.mobileNumber }},
                {{ keys: ['email', 'mail'], val: data.emailAddress }},
                {{ keys: ['income', 'annualincome', 'familyincome'], val: data.annualIncome }},
                {{ keys: ['community', 'caste', 'category'], val: data.community }},
                {{ keys: ['gender', 'sex'], val: data.gender }},
                {{ keys: ['school', 'institution', 'college'], val: data.schoolName }},
                {{ keys: ['emis', 'registration', 'rollno'], val: data.emisNumber || data.certificateNumber }},
                {{ keys: ['account', 'bankaccount', 'accno'], val: data.bankAccountNumber }},
                {{ keys: ['ifsc', 'ifscode'], val: data.bankIfsc }},
                {{ keys: ['address', 'residence', 'street'], val: data.address }},
            ];

            inputs.forEach(inp => {{
                if (inp.type === 'hidden' || inp.type === 'submit' || inp.type === 'button') return;
                const descriptor = ((inp.name || '') + ' ' + (inp.id || '') + ' ' + (inp.placeholder || '') + ' ' + (inp.getAttribute('aria-label') || '')).toLowerCase();
                
                for (const item of fieldMap) {{
                    if (!item.val) continue;
                    const matched = item.keys.some(k => descriptor.includes(k));
                    if (matched) {{
                        inp.value = item.val;
                        inp.classList.add('wi-highlight-filled');
                        inp.dispatchEvent(new Event('input', {{ bubbles: true }}));
                        inp.dispatchEvent(new Event('change', {{ bubbles: true }}));
                        filledCount++;
                        break;
                    }}
                }}
            }});

            statusMsg.textContent = filledCount > 0 ? `✓ Auto-filled ${{filledCount}} fields on portal!` : "✓ WelfareIntel Assistant Ready.";
        }};

        bar.querySelector('#wi-fill-all-btn').onclick = autoFillForm;
        setTimeout(autoFillForm, 1500);
    }})();
    """

async def _live_browser_worker(browser_exe: str, url: str, user_details: dict, scheme_name: str):
    logger.info(f"[auto_apply] Launching visible browser for portal: '{url}'")
    try:
        async with async_playwright() as p:
            browser = await p.chromium.launch(
                executable_path=browser_exe,
                headless=False,
                args=["--start-maximized", "--disable-blink-features=AutomationControlled"]
            )
            context = await browser.new_context(no_viewport=True)
            page = await context.new_page()
            
            try:
                await page.goto(url, wait_until="domcontentloaded", timeout=45000)
            except Exception as e:
                logger.warning(f"[auto_apply] Navigation timeout/warning: {e}")
                
            script = _generate_autofill_injection_script(user_details, scheme_name)
            try:
                await page.evaluate(script)
                logger.info("[auto_apply] Injected WelfareIntel Auto-Filler Assistant into official portal!")
            except Exception as e:
                logger.warning(f"[auto_apply] Injection warning: {e}")

            try:
                await page.wait_for_event("close", timeout=1800000)
            except Exception:
                pass
            finally:
                try:
                    await browser.close()
                except Exception:
                    pass
    except Exception as exc:
        logger.error(f"[auto_apply] Live portal worker error: {exc}")

@router.post("/api/auto-apply/launch-portal")
async def launch_portal(req: LaunchPortalRequest):
    """Launch visible Google Chrome on the user's desktop, navigate to the official portal,
    inject the floating WelfareIntel Form Assistant, and auto-fill fields."""
    browser_exe = _get_browser_executable()
    if not browser_exe:
        raise HTTPException(status_code=500, detail="Google Chrome or Microsoft Edge not found on this computer.")

    asyncio.create_task(_live_browser_worker(browser_exe, req.url, req.user_details, req.scheme_name or "Welfare Scheme"))

    return {
        "status": "success",
        "message": f"Successfully launched official portal in Google Chrome with WelfareIntel Auto-Fill Assistant!",
        "browser": "Google Chrome",
        "url": req.url,
    }
